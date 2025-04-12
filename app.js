import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import connectDB from './config/db.js'

import authRoutes from './routes/authRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import productRoutes from './routes/productRoutes.js'
import searchRoutes from './routes/searchRoutes.js'

dotenv.config()

const app = express()

// Connect to MongoDB
connectDB()

// Allowed origins
const allowedOrigins = [
	'http://localhost:3000',
	'https://clothy-fe.onrender.com',
	'https://clothy-admin.onrender.com',
]

// CORS middleware
app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true)
			} else {
				callback(new Error('Not allowed by CORS'))
			}
		},
		credentials: true,
	}),
)

// Automatically respond to preflight requests
app.options('*', cors())

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files
app.use('/uploads', express.static('uploads'))

// Request logging middleware
app.use((req, res, next) => {
	console.log(`[${req.method}] ${req.originalUrl}`)
	next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/orders', orderRoutes)

// 404 Not Found handler
app.use((req, res, next) => {
	res.status(404).json({ message: 'Route not found' })
})

// Centralized error handler
app.use((err, req, res, next) => {
	console.error('Error:', err)
	res.status(500).json({
		message: 'Internal Server Error',
		error: err.message || 'Unknown error',
	})
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
