import express from 'express'

import { getProductBySearch } from '../controllers/productController.js'

const router = express.Router()

router.get('/', getProductBySearch)

export default router
