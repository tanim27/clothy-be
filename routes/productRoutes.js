import express from 'express'
import {
	addProduct,
	deleteProduct,
	getProductById,
	getProducts,
	updateProduct,
} from '../controllers/productController.js'
import protectRoute from '../middlewares/authMiddleware.js'
import isAdmin from '../middlewares/roleMiddleware.js'

const router = express.Router()

//CREATE
// Protect and allow only admins to add products
router.post('/create', protectRoute, isAdmin, addProduct)

//READ
// Allow anyone to get products
router.get('/', getProducts)

// Allow anyone to get a single product by ID
router.get('/:id', getProductById)

//UPDATE
// Protect and allow only admins to update products
router.put('/:id', protectRoute, isAdmin, updateProduct)

//DELETE
// Protect and allow only admins to delete products
router.delete('/:id', protectRoute, isAdmin, deleteProduct)

export default router
