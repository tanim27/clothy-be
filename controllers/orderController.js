import axios from 'axios'
import qs from 'qs'
import Order from '../models/Order.js'
import Product from '../models/Product.js'

// Create an order with payment support (SSLCOMMERZ or Cash on Delivery)
export const createOrder = async (req, res) => {
	try {
		const {
			phone_number,
			products: clientProducts, // sent from client
			shipping_address,
			payment_method,
		} = req.body

		const user = req.user?._id

		if (!user) return res.status(400).json({ message: 'User is required' })
		if (!phone_number)
			return res.status(400).json({ message: 'Phone number is required' })

		const existingOrder = await Order.findOne({ phone_number })

		if (existingOrder) {
			return res.status(400).json({
				message: 'An order has already been placed using this phone number',
			})
		}
		if (!Array.isArray(clientProducts) || clientProducts.length === 0)
			return res.status(400).json({ message: 'Products array is required' })
		if (
			!shipping_address?.street ||
			!shipping_address?.city ||
			!shipping_address?.state ||
			!shipping_address?.postal_code ||
			!shipping_address?.country
		) {
			return res
				.status(400)
				.json({ message: 'Complete shipping address is required' })
		}
		if (payment_method !== 'Online' && payment_method !== 'Cash On Delivery')
			return res.status(400).json({ message: 'Invalid payment method' })

		let total_price = 0
		const finalProducts = []

		for (const item of clientProducts) {
			const { product: productId, size, quantity } = item

			if (!productId || !size || !quantity) {
				return res.status(400).json({
					message: 'Each product must include product ID, size, and quantity',
				})
			}

			const dbProduct = await Product.findById(productId)

			if (!dbProduct) {
				return res
					.status(404)
					.json({ message: `Product with ID ${productId} not found` })
			}

			const sizeEntry = dbProduct.stock.find(
				(s) => s.size.toLowerCase() === size.toLowerCase(),
			)
			if (!sizeEntry) {
				return res.status(400).json({
					message: `Size '${size}' not available for product '${dbProduct.name}'`,
				})
			}

			if (sizeEntry.quantity < quantity) {
				return res.status(400).json({
					message: `Not enough stock for '${dbProduct.name}' in size '${size}'`,
				})
			}

			const finalPrice = dbProduct.offer_price ?? dbProduct.price
			total_price += finalPrice * quantity

			finalProducts.push({
				product: dbProduct._id,
				name: dbProduct.name,
				size,
				quantity,
				price: dbProduct.price,
				offer_price: dbProduct.offer_price ?? null,
			})
		}

		const order = new Order({
			user,
			phone_number,
			products: finalProducts,
			total_price,
			shipping_address,
			order_status: 'Pending',
			payment_method,
			payment_status: 'Pending',
		})

		await order.save()

		console.log(order)

		let payment_url = ''
		if (payment_method === 'Online') {
			const sslData = {
				store_id: process.env.SSLCOMMERZ_STORE_ID,
				store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
				total_amount: total_price,
				currency: 'BDT',
				tran_id: order.order_id,
				success_url: `${process.env.FRONTEND_URL}/api/orders/ssl-success`,
				fail_url: `${process.env.FRONTEND_URL}/ssl-fail`,
				cancel_url: `${process.env.FRONTEND_URL}/ssl-cancel`,
				cus_name: req.user?.name || 'Customer',
				cus_email: req.user?.email || 'example@email.com',
				cus_add1: shipping_address.street || 'Not provided',
				cus_city: shipping_address.city || 'Not provided',
				cus_state: shipping_address.state || '',
				cus_postcode: shipping_address.postal_code || '',
				cus_country: shipping_address.country || 'Bangladesh',
				cus_phone: phone_number,
				shipping_method: 'Courier',
				product_name: 'Clothing Items',
				product_category: 'Fashion',
				product_profile: 'general',
			}

			const sslRes = await axios.post(
				'https://sandbox.sslcommerz.com/gwprocess/v3/api.php',
				qs.stringify(sslData),
				{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
			)

			if (!sslRes.data?.GatewayPageURL) {
				return res
					.status(400)
					.json({ message: 'SSLCOMMERZ payment initiation failed' })
			}

			payment_url = sslRes.data.GatewayPageURL
		}

		res.status(201).json({
			message: 'Order created successfully',
			order: {
				...order._doc,
				order_id: order.order_id,
			},
			payment_url,
		})
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Server error', error: error.message })
	}
}

// Handle SSLCOMMERZ success callback
export const sslSuccess = async (req, res) => {
	try {
		const { tran_id, val_id } = req.body

		if (!tran_id || !val_id) {
			return res.status(400).json({ message: 'Invalid request body' })
		}

		// Verify payment with SSLCOMMERZ API
		const verifyUrl = `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${process.env.SSLCOMMERZ_STORE_ID}&store_passwd=${process.env.SSLCOMMERZ_STORE_PASSWORD}&v=1&format=json`

		const verifyRes = await axios.post(verifyUrl)

		if (verifyRes.data.status === 'VALID') {
			// Update order payment status
			const order = await Order.findOneAndUpdate(
				{ order_id: tran_id },
				{ payment_status: 'Paid', payment_info: verifyRes.data },
				{ new: true },
			)

			if (!order) {
				return res.status(404).json({ message: 'Order not found' })
			}

			return res.status(200).json({
				message: 'SSLCOMMERZ Payment Successful',
				order,
			})
		}

		// If payment status is not VALID
		res.status(400).json({ message: 'SSLCOMMERZ Payment Verification Failed' })
	} catch (error) {
		console.error('SSLCOMMERZ Success Route Error:', error.message)
		res.status(500).json({ message: 'Server error' })
	}
}

export const sslFail = async (req, res) => {
	try {
		const { tran_id } = req.body
		if (!tran_id)
			return res.status(400).json({ message: 'Transaction ID required' })

		// Optionally update order to mark payment failed
		await Order.findOneAndUpdate(
			{ order_id: tran_id },
			{ payment_status: 'Failed' },
		)

		return res.status(200).json({ message: 'Payment Failed' })
	} catch (error) {
		console.error('SSLCOMMERZ Fail Route Error:', error.message)
		res.status(500).json({ message: 'Server error' })
	}
}

export const sslCancel = async (req, res) => {
	try {
		const { tran_id } = req.body
		if (!tran_id)
			return res.status(400).json({ message: 'Transaction ID required' })

		// Optionally update order to mark payment cancelled
		await Order.findOneAndUpdate(
			{ order_id: tran_id },
			{ payment_status: 'Cancelled' },
		)

		return res.status(200).json({ message: 'Payment Cancelled' })
	} catch (error) {
		console.error('SSLCOMMERZ Cancel Route Error:', error.message)
		res.status(500).json({ message: 'Server error' })
	}
}

// Track an order by Order ID and Phone Number
export const trackOrder = async (req, res) => {
	try {
		const { phone_number } = req.query

		if (!phone_number) {
			return res.status(400).json({ message: 'Phone Number required' })
		}

		const order = await Order.findOne({ phone_number })

		if (!order) {
			return res.status(404).json({ message: 'Order not found' })
		}

		res.status(200).json({ order })
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Server error' })
	}
}

// Admin: Get all orders
export const getAllOrders = async (req, res) => {
	try {
		const orders = await Order.find().populate('user').sort({ created_at: -1 })
		res.status(200).json({ orders })
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Server error' })
	}
}

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
	try {
		const { order_id } = req.params
		const { order_status } = req.body

		const validStatuses = [
			'Pending',
			'Processing',
			'Shipped',
			'Delivered',
			'Cancelled',
		]
		if (!order_status || !validStatuses.includes(order_status)) {
			return res.status(400).json({ message: 'Invalid order status' })
		}

		// console.log(`Updating order status with order_id: ${order_id}`)

		const order = await Order.findOneAndUpdate(
			{ order_id },
			{ order_status, updated_at: Date.now() },
			{ new: true },
		)

		if (!order) {
			console.log(`Order with order_id: ${order_id} not found.`)
			return res.status(404).json({ message: 'Order not found' })
		}

		res.status(200).json({ message: 'Order status updated', order })
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Server error' })
	}
}

// Admin: Update payment status
export const updatePaymentStatus = async (req, res) => {
	try {
		const { order_id } = req.params
		const { payment_status } = req.body

		const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded']
		if (!payment_status || !validStatuses.includes(payment_status)) {
			return res.status(400).json({ message: 'Invalid payment status' })
		}

		// console.log(`Updating payment status for order_id: ${order_id}`)

		const order = await Order.findOneAndUpdate(
			{ order_id },
			{ payment_status, updated_at: Date.now() },
			{ new: true },
		)

		if (!order) {
			console.log(`Order with order_id: ${order_id} not found.`)
			return res.status(404).json({ message: 'Order not found' })
		}

		res.status(200).json({ message: 'Payment status updated', order })
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Server error' })
	}
}
