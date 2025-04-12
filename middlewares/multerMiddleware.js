import multer from 'multer'
import path from 'path'

// Configure multer storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/') // Where files will be saved
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname)) // Generate unique filename
	},
})

// Create the upload instance
export const upload = multer({ storage: storage })
