import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import User from '../models/User.js'

export const registerUser = async (req, res) => {
	const { name, email, password, role = 'user' } = req.body

	try {
		const userExists = await User.findOne({ email })
		if (userExists) {
			return res.status(400).json({ message: 'User already exists' })
		}

		// Validate password length (optional)
		if (password.length < 6) {
			return res
				.status(400)
				.json({ message: 'Password must be at least 6 characters long' })
		}

		const salt = await bcrypt.genSalt(10)
		const hashedPassword = await bcrypt.hash(password, salt)

		const newUser = new User({
			name,
			email,
			password: hashedPassword,
			role,
		})

		await newUser.save()

		// Create a JWT token
		const token = jwt.sign(
			{ id: newUser._id, role: newUser.role },
			process.env.JWT_SECRET,
			{
				expiresIn: '1d',
			},
		)

		res.status(201).json({ token, user: newUser })
	} catch (error) {
		res.status(500).json({ message: 'Server error', details: error.message })
	}
}

export const loginUser = async (req, res) => {
	const { email, password } = req.body

	try {
		const user = await User.findOne({ email })
		if (!user) {
			return res.status(400).json({ message: 'Invalid credentials' })
		}

		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) {
			return res.status(400).json({ message: 'Invalid credentials' })
		}

		const token = jwt.sign(
			{ id: user._id, role: user.role },
			process.env.JWT_SECRET,
			{ expiresIn: '1d' },
		)

		res.status(200).json({ token, user })
	} catch (error) {
		res.status(500).json({ message: 'Server error', details: error.message })
	}
}

export const registerAdmin = async (req, res) => {
	const { name, email, password, role = 'admin' } = req.body

	try {
		const userExists = await User.findOne({ email })
		if (userExists) {
			return res.status(400).json({ message: 'User already exists' })
		}

		// Validate password length (optional)
		if (password.length < 6) {
			return res
				.status(400)
				.json({ message: 'Password must be at least 6 characters long' })
		}

		const salt = await bcrypt.genSalt(10)
		const hashedPassword = await bcrypt.hash(password, salt)

		const newUser = new User({
			name,
			email,
			password: hashedPassword,
			role,
		})

		await newUser.save()

		// Create a JWT token
		const token = jwt.sign(
			{ id: newUser._id, role: newUser.role },
			process.env.JWT_SECRET,
			{
				expiresIn: '1d',
			},
		)

		res.status(201).json({ token, user: newUser })
	} catch (error) {
		res.status(500).json({ message: 'Server error', details: error.message })
	}
}

export const loginAdmin = async (req, res) => {
	const { email, password } = req.body

	try {
		const user = await User.findOne({ email })
		if (!user) {
			return res.status(400).json({ message: 'Invalid credentials' })
		}

		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Access denied: Admins only' })
		}

		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) {
			return res.status(400).json({ message: 'Invalid credentials' })
		}

		const token = jwt.sign(
			{ id: user._id, role: user.role },
			process.env.JWT_SECRET,
			{ expiresIn: '1d' },
		)

		res.status(200).json({ token, user })
	} catch (error) {
		res.status(500).json({ message: 'Server error', details: error.message })
	}
}

export const forgetPassword = async (req, res) => {
	try {
		const { email } = req.body

		if (!email) {
			return res.status(400).send({ message: 'Please provide email' })
		}

		const user = await User.findOne({ email })

		if (!user) {
			return res.status(400).send({ message: 'User not found please register' })
		}

		const token = jwt.sign({ email }, process.env.JWT_SECRET, {
			expiresIn: '1h',
		})

		// const token = jwt.sign(
		// 	{ id: user._id, role: user.role },
		// 	process.env.JWT_SECRET,
		// 	{ expiresIn: '1d' },
		// )

		const transporter = nodemailer.createTransport({
			service: 'gmail',
			secure: true,
			auth: {
				user: process.env.MY_GMAIL,
				pass: process.env.MY_PASSWORD,
			},
		})

		const resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`

		const receiver = {
			from: 'abdullahtanim007@gmail.com',
			to: email,
			subject: 'Password Reset Request',
			text: `Click on this link to generate your new password: ${resetURL}`,
		}

		await transporter.sendMail(receiver)

		return res.status(200).send({
			message: 'Password reset link send successfully on your email account',
		})
	} catch (error) {
		console.error(error)
		return res.status(500).send({ message: 'Something went wrong' })
	}
}

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params
		const { newPassword } = req.body

		if (!newPassword) {
			return res.status(400).send({ message: 'Please provide password' })
		}

		const decode = jwt.verify(token, process.env.JWT_SECRET)

		const user = await User.findOne({ email: decode.email })

		const salt = await bcrypt.genSalt(10)
		const newHashedPassword = await bcrypt.hash(newPassword, salt)

		user.password = newHashedPassword
		await user.save()

		return res.status(200).send({ message: 'Password reset successfully' })
	} catch (error) {
		console.error(error)
		return res.status(500).send({ message: 'Something went wrong' })
	}
}

export const changePassword = async (req, res) => {
	try {
		const { email, currentPassword, newPassword } = req.body

		if (!email || !currentPassword || !newPassword) {
			return res
				.status(400)
				.send({ message: 'Please provide all required fields' })
		}

		const checkUser = await User.findOne({ email })

		if (!checkUser) {
			return res.status(400).send({ message: 'User not found please register' })
		}

		const isMatchPassword = await bcrypt.compare(
			currentPassword,
			checkUser.password,
		)

		if (!isMatchPassword) {
			return res
				.status(400)
				.send({ message: 'Current password does not match' })
		}

		const salt = await bcrypt.genSalt(10)
		const newHashedPassword = await bcrypt.hash(newPassword, salt)

		await User.updateOne({ email }, { password: newHashedPassword })

		return res.status(200).send({ message: 'Password change successfully' })
	} catch (error) {
		console.error(error)
		return res.status(500).send({ message: 'Something went wrong' })
	}
}
