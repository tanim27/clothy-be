import express from 'express'
import {
	createOrder,
	getAllOrders,
	sslSuccess,
	trackOrder,
	updateOrderStatus,
	updatePaymentStatus,
} from '../controllers/orderController.js'
import protectRoute from '../middlewares/authMiddleware.js'
import isAdmin from '../middlewares/roleMiddleware.js'

const router = express.Router()

// Place an order (Hybrid Payment: Stripe for Cards, SSLCOMMERZ for Mobile Banking, COD)
router.post('/', protectRoute, createOrder)

// Handle SSLCOMMERZ successful payment
router.post('/ssl-success', sslSuccess)

// Track an order by Order ID & Phone Number (No auth required)
router.get('/track-order', trackOrder)

// Get all orders (Admin only)
router.get('/', protectRoute, isAdmin, getAllOrders)

// Update Order Status (Admin only)
router.put('/:order_id', protectRoute, isAdmin, updateOrderStatus)

// Update Payment Status (Admin only)
router.put('/:order_id/payment', protectRoute, isAdmin, updatePaymentStatus)

export default router
