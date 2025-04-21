import express from 'express'
import {
	createOrder,
	getAllOrders,
	sslCancel,
	sslFail,
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

router.post('/ssl-success', sslSuccess)
router.post('/ssl-fail', sslFail)
router.post('/ssl-cancel', sslCancel)

// Track an order by Order ID & Phone Number (No auth required)
router.get('/track-order', trackOrder)

// Get all orders (Admin only)
router.get('/', protectRoute, isAdmin, getAllOrders)

// Update Order Status (Admin only)
router.put('/:order_id', protectRoute, isAdmin, updateOrderStatus)

// Update Payment Status (Admin only)
router.put('/:order_id/payment', protectRoute, isAdmin, updatePaymentStatus)

export default router
