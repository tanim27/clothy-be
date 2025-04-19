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
		},
		password: { type: String },
		role: {
			type: String,
			enum: ['admin', 'user'],
			default: 'user',
		},
		provider: {
			type: String,
			enum: ['local', 'google'],
			default: 'local',
		},
	},
	{ timestamps: true },
)

const User = mongoose.model('User', userSchema)

export default User
