import mongoose from 'mongoose'

const { Schema } = mongoose

const userSchema = new Schema(
	{
		name: { type: String, required: true },
		email: {
			type: String,
			required: true,
			unique: true,
			match: [/.+\@.+\..+/, 'Please enter a valid email address'],
		}, // Email validation regex
		password: { type: String, required: true },
		role: {
			type: String,
			required: true,
			enum: ['admin', 'user'],
			default: 'user',
		},
	},
	{
		timestamps: true,
	},
)

const User = mongoose.model('User', userSchema)

export default User
