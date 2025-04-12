import express from 'express'
import {
	changePassword,
	forgetPassword,
	loginAdmin,
	loginUser,
	registerAdmin,
	registerUser,
	resetPassword,
} from '../controllers/authController.js'
import protectRoute from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)

router.post('/admin/register', registerAdmin)
router.post('/admin/login', loginAdmin)

router.post('/forget-password', forgetPassword)
router.post('/reset-password/:token', resetPassword)
router.post('/change-password', changePassword)
router.post('/token', protectRoute)

export default router
