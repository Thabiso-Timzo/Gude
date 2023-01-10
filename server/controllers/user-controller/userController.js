const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')

const User = require('../../models/user-model/userModel')
const { generateToken } = require('../../utils/jwtToken')
const { generateRefreshToken } = require('../../utils/refreshToken')
const { jwt_secret } = require('../../config/env/index')

// Register a user
exports.register = asyncHandler(
    async (req, res) => {
        const email = req.body.email

        const findUser = await User.findOne({email})
        if (!findUser) {
            // Create a new user
            const newUser = await User.create(req.body)
            res.status(200).json(newUser)
        } else {
            // User already exists
            res.status(409).json({ message :"User already exists" })
        }
    }
)

// Login  a user
exports.login = asyncHandler(
    async (req, res) => {
        const { email, password } = req.body

        // Check if user exists
        const findUser = await User.findOne({ email })
        if (findUser && findUser.isPasswordMatched(password)) {
            const refreshToken = await generateRefreshToken(findUser?._id)
            const updateUser = await User.findByIdAndUpdate(
                findUser.id, 
                {
                    refreshToken: refreshToken
                },{ new: true }
            )
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                maxAge: 72 * 60 * 60 * 1000,
            })
            res.json({
                _id: findUser?._id,
                firstName: findUser?.firstName,
                lastName: findUser?.lastName,
                email: findUser?.email,
                mobile: findUser?.mobile,
                token: generateToken(findUser?._id)
            })
        } else {
            throw new Error("Invalid credentials")
        }
    }
)

// Logout a user
exports.logout = asyncHandler(
    async (req, res) => {
        const cookie = req.cookies
        if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies")
        const refreshToken = cookie.refreshToken
        const user = await User.findOne({ refreshToken })
        if (!user) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: true
            })
            return res.sendStatus(204)
        }
        await User.findOneAndUpdate(refreshToken, {
            refreshToken: ""
        })
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true
        })
        return res.sendStatus(204)
    }
)

// Refresh token
exports.handleRefreshToken = asyncHandler(
    async (req, res) => {
        const cookie = req.cookies
        if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies")
        const refreshToken = cookie.refreshToken
        const user = await User.findOne({ refreshToken })
        if (!user) return res.json({ message: "No refresh token is present in the database" })
        jwt.verify(refreshToken, jwt_secret, (err, decoded) => {
            if (err || user.id !== decoded.id) {
                res.json({ message: "There is something wrong with refresh token." })
            }
            const accessToken = generateToken(user?._id)
            res.json({ accessToken })
        })
    }
)

// Get all users
exports.getAllUsers = asyncHandler(
    async (req, res) => {
        try {
            const getUsers = await User.find()
            res.status(200).json(getUsers)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    } 
)

// Get single user
exports.getSingleUser = asyncHandler(
    async (req, res) => {
        const { id } = req.params
        try {
            const getUser = await User.findById(id)
            res.status(200).json({getUser})
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
)

// Delete a  user
exports.deleteSingleUser = asyncHandler(
    async (req, res) => {
        const { id } = req.params
        try {
            const deleteUser = await User.findByIdAndDelete(id)
            res.status(200).json({deleteUser})
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
)

// Update a user
exports.updateUser = asyncHandler(
    async (req, res) => {
        //const { id } = req.params
        const { _id } = req.user
        try {
            const updateUser = await User.findByIdAndUpdate(
                id,
                {
                    firstName: req.body?.firstName,
                    lastName: req.body?.lastName,
                    email: req.body?.email,
                    mobile: req.body?.mobile
                },{ new: true }
            )
            res.status(200).json(updateUser)
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
)

// Block user
exports.blockUser = asyncHandler(
    async (req, res) => {
        const { id } = req.params
        try {
            const block = await User.findByIdAndUpdate(
                id,
                {
                    isBlocked: true
                },{ new: true }
            )
            res.status(200).json({
                message: "User blocked",
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
)

// Unblock user
exports.unblockUser = asyncHandler( 
    async (req, res) => {
        const { id } = req.params
        try {
            const unblock = await User.findByIdAndUpdate(
                id,
                {
                    isBlocked: false
                },{ new: true }
            )
            res.status(200).json({
                message: "User unblocked",
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
)