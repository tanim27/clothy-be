import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI)
		console.log('MongoDB connected')
	} catch (err) {
		console.error(err)
		process.exit(1) // Exit the process with failure
	}
}

export default connectDB
