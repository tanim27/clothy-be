const isAdmin = (req, res, next) => {
	if (req.user.role !== 'admin') {
		return res.status(403).json({ message: 'Forbidden: Admins only' })
	}
	next() // If user is admin, proceed to the next middleware or route handler
}

export default isAdmin
