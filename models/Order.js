import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

const { Schema } = mongoose

const orderSchema = new Schema({
	order_id: {
		type: String,
		default: uuidv4,
		unique: true,
		immutable: true,
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	phone_number: { type: String, required: true },
	products: [
		{
			product: {
				type: Schema.Types.ObjectId,
				ref: 'Product',
				required: true,
			},
			name: { type: String, required: true },
			size: { type: String, required: true }, // From selected stock
			quantity: {
				type: Number,
				required: true,
				min: 1,
				validate: {
					validator: (v) => v > 0,
					message: 'Quantity must be greater than 0',
				},
			},
			price: { type: Number, required: true },
			offer_price: { type: Number, default: null },
		},
	],
	total_price: {
		type: Number,
		required: true,
		min: 0,
		validate: {
			validator: (v) => v > 0,
			message: 'Total price must be greater than 0',
		},
	},
	shipping_address: {
		street: { type: String, required: true },
		city: { type: String, required: true },
		state: { type: String, required: true },
		postal_code: { type: String, required: true },
		country: { type: String, required: true },
	},
	order_status: {
		type: String,
		enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
		default: 'Pending',
	},
	payment_method: {
		type: String,
		enum: ['Cash On Delivery', 'Online'],
		required: true,
	},
	payment_status: {
		type: String,
		enum: ['Pending', 'Paid'],
		default: function () {
			return this.payment_method === 'Cash On Delivery' && 'Pending'
		},
	},
	payment_info: {
		type: Object,
		default: {},
	},
	created_at: {
		type: Date,
		default: Date.now,
	},
	updated_at: {
		type: Date,
		default: Date.now,
	},
})

orderSchema.pre('save', function (next) {
	this.updated_at = Date.now()
	next()
})

const Order = mongoose.model('Order', orderSchema)

export default Order
