import { upload } from '../middlewares/multerMiddleware.js'
import Product from '../models/Product.js'

// CREATE
export const addProduct = async (req, res) => {
	upload.single('image')(req, res, async (err) => {
		if (err) {
			return res.status(400).json({ message: err.message })
		}

		const {
			name,
			description,
			price,
			offer_price,
			category,
			sub_category,
			brand,
			best_selling,
			new_arrival,
		} = req.body

		// Image file
		if (!req.file) {
			return res.status(400).json({ message: 'Image file is required' })
		}

		// Name
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return res.status(400).json({ message: 'Product name is required' })
		}

		// Description
		if (
			!description ||
			typeof description !== 'string' ||
			description.trim().length === 0
		) {
			return res
				.status(400)
				.json({ message: 'Product description is required' })
		}

		// Price
		const parsedPrice = Number(price)
		if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
			return res
				.status(400)
				.json({ message: 'Valid price is required (greater than 0)' })
		}

		// Offer Price (optional)
		let parsedOfferPrice = null
		if (offer_price !== undefined && offer_price !== '') {
			parsedOfferPrice = Number(offer_price)
			if (isNaN(parsedOfferPrice) || parsedOfferPrice <= 0) {
				return res
					.status(400)
					.json({ message: 'Offer price must be a number greater than 0' })
			}
			if (parsedOfferPrice >= parsedPrice) {
				return res
					.status(400)
					.json({ message: 'Offer price must be less than the regular price' })
			}
		}

		// Category
		if (
			!category ||
			typeof category !== 'string' ||
			category.trim().length === 0
		) {
			return res.status(400).json({ message: 'Product category is required' })
		}

		// Sub-category
		if (
			!sub_category ||
			typeof sub_category !== 'string' ||
			sub_category.trim().length === 0
		) {
			return res.status(400).json({ message: 'Sub-category is required' })
		}

		// Brand
		if (!brand || typeof brand !== 'string' || brand.trim().length === 0) {
			return res.status(400).json({ message: 'Brand is required' })
		}

		// Stock parsing
		const stockArray = []
		Object.keys(req.body).forEach((key) => {
			const match = key.match(/^stock\[(\d+)\]\.(size|quantity)$/)
			if (match) {
				const index = Number(match[1])
				const field = match[2]

				if (!stockArray[index]) {
					stockArray[index] = {}
				}

				stockArray[index][field] =
					field === 'quantity' ? Number(req.body[key]) : req.body[key]
			}
		})

		if (!stockArray.length) {
			return res
				.status(400)
				.json({ message: 'At least one stock entry is required' })
		}

		// Validate each stock entry
		for (const item of stockArray) {
			if (
				!item.size ||
				typeof item.size !== 'string' ||
				item.size.trim().length === 0
			) {
				return res
					.status(400)
					.json({ message: 'Each stock entry must have a size' })
			}
			if (
				item.quantity === undefined ||
				isNaN(item.quantity) ||
				!Number.isInteger(item.quantity) ||
				item.quantity < 0
			) {
				return res.status(400).json({
					message:
						'Each stock entry must have a valid non-negative integer quantity',
				})
			}
		}

		// Unique sizes check
		const uniqueSizes = new Set(
			stockArray.map((item) => item.size.toLowerCase()),
		)
		if (uniqueSizes.size !== stockArray.length) {
			return res.status(400).json({
				message: 'Duplicate sizes found in stock entries',
			})
		}

		// Construct full image URL
		const image = `${req.protocol}://${req.get('host')}/uploads/${
			req.file.filename
		}`

		try {
			const newProduct = new Product({
				name,
				description,
				price: parsedPrice,
				offer_price: parsedOfferPrice,
				stock: stockArray,
				category,
				sub_category,
				brand,
				best_selling: best_selling === 'true',
				new_arrival: new_arrival === 'true',
				image,
			})

			await newProduct.save()
			res.status(201).json(newProduct)
		} catch (error) {
			res.status(500).json({ message: error.message || 'Server error' })
		}
	})
}

// READ
export const getProducts = async (req, res) => {
	try {
		const products = await Product.find()
		res.status(200).json(products)
	} catch (error) {
		res.status(500).json({ message: 'Server error' })
	}
}

export const getProductById = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id)
		if (!product) {
			return res.status(404).json({ message: 'Product not found' })
		}
		res.status(200).json(product)
	} catch (error) {
		res.status(500).json({ message: 'Server error' })
	}
}

export const getProductBySearch = async (req, res, next) => {
	try {
		const { query } = req.query
		if (!query) {
			return res.status(400).json({ error: 'Query is required' })
		}

		const products = await Product.find({
			name: { $regex: query, $options: 'i' },
		})

		res.status(200).json({ products })
	} catch (error) {
		res.status(500).json({ message: error.message || 'Server Error' })
	}
}

// UPDATE
export const updateProduct = async (req, res) => {
	upload.single('image')(req, res, async (err) => {
		if (err) {
			return res.status(400).json({ message: err.message })
		}

		const { id } = req.params
		const {
			name,
			description,
			price,
			offer_price,
			category,
			sub_category,
			brand,
			best_selling,
			new_arrival,
		} = req.body

		// Parse stock from req.body
		const stockArray = []
		Object.keys(req.body).forEach((key) => {
			const match = key.match(/^stock\[(\d+)\]\.(size|quantity)$/)
			if (match) {
				const index = Number(match[1])
				const field = match[2]

				if (!stockArray[index]) {
					stockArray[index] = {}
				}

				stockArray[index][field] =
					field === 'quantity' ? Number(req.body[key]) : req.body[key]
			}
		})

		if (!stockArray.length) {
			return res.status(400).json({ message: 'Stock is required' })
		}

		// Validate stock entries
		for (const item of stockArray) {
			if (
				!item.size ||
				typeof item.size !== 'string' ||
				item.size.trim().length === 0
			) {
				return res
					.status(400)
					.json({ message: 'Each stock entry must have a size' })
			}
			if (
				item.quantity === undefined ||
				isNaN(item.quantity) ||
				!Number.isInteger(item.quantity) ||
				item.quantity < 0
			) {
				return res.status(400).json({
					message: 'Each stock entry must have a non-negative integer quantity',
				})
			}
		}

		const uniqueSizes = new Set(
			stockArray.map((item) => item.size.toLowerCase()),
		)
		if (uniqueSizes.size !== stockArray.length) {
			return res
				.status(400)
				.json({ message: 'Duplicate sizes found in stock entries' })
		}

		try {
			const product = await Product.findById(id)
			if (!product) {
				return res.status(404).json({ message: 'Product not found' })
			}

			// Validate individual fields if present (only validate fields being updated)
			if (name && typeof name !== 'string') {
				return res.status(400).json({ message: 'Invalid product name' })
			}
			if (description && typeof description !== 'string') {
				return res.status(400).json({ message: 'Invalid product description' })
			}
			if (category && typeof category !== 'string') {
				return res.status(400).json({ message: 'Invalid category' })
			}
			if (sub_category && typeof sub_category !== 'string') {
				return res.status(400).json({ message: 'Invalid sub-category' })
			}
			if (brand && typeof brand !== 'string') {
				return res.status(400).json({ message: 'Invalid brand' })
			}

			// Price validation
			let parsedPrice = product.price
			if (price !== undefined) {
				parsedPrice = Number(price)
				if (isNaN(parsedPrice) || parsedPrice <= 0) {
					return res
						.status(400)
						.json({ message: 'Price must be a number greater than 0' })
				}
			}

			// Offer price validation
			let parsedOfferPrice = product.offer_price
			if (offer_price !== undefined && offer_price !== '') {
				parsedOfferPrice = Number(offer_price)
				if (isNaN(parsedOfferPrice) || parsedOfferPrice <= 0) {
					return res
						.status(400)
						.json({ message: 'Offer price must be a number greater than 0' })
				}
				if (parsedOfferPrice >= parsedPrice) {
					return res.status(400).json({
						message: 'Offer price must be less than the regular price',
					})
				}
			}

			// Image handling
			const image = req.file
				? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
				: product.image

			// Convert best_selling and new_arrival to boolean if provided
			const updatedBestSelling =
				best_selling !== undefined
					? best_selling === 'true'
					: product.best_selling
			const updatedNewArrival =
				new_arrival !== undefined ? new_arrival === 'true' : product.new_arrival

			// Update product fields
			product.name = name || product.name
			product.description = description || product.description
			product.price = parsedPrice
			product.offer_price = parsedOfferPrice
			product.category = category || product.category
			product.sub_category = sub_category || product.sub_category
			product.brand = brand || product.brand
			product.best_selling = updatedBestSelling
			product.new_arrival = updatedNewArrival
			product.stock = stockArray
			product.image = image

			await product.save()

			console.log('Updated Product:', product) // Log the updated product for debugging

			res.status(200).json(product)
		} catch (error) {
			console.error('Error updating product:', error.message) // Log error for debugging
			res.status(500).json({ message: error.message || 'Server error' })
		}
	})
}

// DELETE
export const deleteProduct = async (req, res) => {
	try {
		const product = await Product.findByIdAndDelete(req.params.id)
		if (!product) {
			return res.status(404).json({ message: 'Product not found' })
		}
		res.status(200).json({ message: 'Product deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Server error' })
	}
}
