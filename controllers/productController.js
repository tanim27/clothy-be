import streamifier from 'streamifier'
import { upload } from '../middlewares/multerMiddleware.js'
import Product from '../models/Product.js'
import cloudinary from '../utils/cloudinary.js'

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

		// Upload image to Cloudinary
		try {
			const streamUpload = (buffer) => {
				return new Promise((resolve, reject) => {
					const stream = cloudinary.uploader.upload_stream(
						{ folder: 'clothy-products' },
						(error, result) => {
							if (result) resolve(result)
							else reject(error)
						},
					)
					streamifier.createReadStream(buffer).pipe(stream)
				})
			}

			const cloudinaryResult = await streamUpload(req.file.buffer)

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
				image: cloudinaryResult.secure_url,
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

		// Parse stock array from flat FormData fields
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

			// Validate optional fields
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

			// Upload image to Cloudinary if new image is provided
			let imageUrl = product.image
			if (req.file) {
				const streamUpload = () => {
					return new Promise((resolve, reject) => {
						const stream = cloudinary.uploader.upload_stream(
							{
								resource_type: 'image',
								folder: 'clothy-products',
							},
							(error, result) => {
								if (error) return reject(error)
								resolve(result)
							},
						)
						streamifier.createReadStream(req.file.buffer).pipe(stream)
					})
				}

				try {
					const result = await streamUpload()
					imageUrl = result.secure_url // ← use this URL to update your product
					console.log('Uploaded to Cloudinary:', imageUrl)
				} catch (err) {
					console.error('Cloudinary Upload Error:', err)
					return res.status(500).json({ message: 'Image upload failed' })
				}
			}

			// If no image upload, save directly
			await saveAndRespond()

			// Save and respond function
			async function saveAndRespond() {
				product.name = name || product.name
				product.description = description || product.description
				product.price = parsedPrice
				product.offer_price = parsedOfferPrice
				product.category = category || product.category
				product.sub_category = sub_category || product.sub_category
				product.brand = brand || product.brand
				product.stock = stockArray
				product.image = imageUrl
				product.best_selling =
					best_selling !== undefined
						? best_selling === 'true'
						: product.best_selling
				product.new_arrival =
					new_arrival !== undefined
						? new_arrival === 'true'
						: product.new_arrival

				await product.save()
				res.status(200).json(product)
			}
		} catch (error) {
			console.error('Error updating product:', error.message)
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
