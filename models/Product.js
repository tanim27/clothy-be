import mongoose from 'mongoose'

const { Schema } = mongoose

const productSchema = new Schema({
	name: { type: String, required: true },
	price: {
		type: Number,
		required: true,
		min: 1,
		validate: {
			validator: function (v) {
				return v > 0
			},
			message: 'Product price must be greater than 0',
		},
	},
	description: { type: String, required: true },
	offer_price: {
		type: Number,
		default: null,
		min: 1,
		validate: {
			validator: function (v) {
				return v === null || v > 0
			},
			message: 'Offer price must be greater than 0',
		},
	},
	image: { type: String, required: true },
	stock: [
		{
			// _id: false,
			size: { type: String, required: true },
			quantity: {
				type: Number,
				required: true,
				min: 0,
				validate: {
					validator: function (v) {
						return Number.isInteger(v) && v >= 0
					},
					message: 'Stock quantity must be a non-negative integer',
				},
			},
		},
	],
	category: { type: String, required: true },
	sub_category: { type: String, required: true },
	brand: { type: String, required: true },
	best_selling: { type: Boolean },
	new_arrival: { type: Boolean },
})

// Custom Validation: Ensure stock contains unique sizes
productSchema.pre('save', function (next) {
	const product = this
	const stockSizes = product.stock.map((item) => item.size.toLowerCase())

	// Ensure no duplicate sizes in stock
	if (new Set(stockSizes).size !== stockSizes.length) {
		return next(new Error('Stock sizes must be unique'))
	}

	next()
})

const Product = mongoose.model('Product', productSchema)

export default Product
