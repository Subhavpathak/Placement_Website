// Authentication middleware for JWT tokens
const jwt = require('jsonwebtoken');
const Student = require('../models/students');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set. Set process.env.JWT_SECRET and restart.');
    // Throw so app won't start silently with insecure default
    throw new Error('Missing required environment variable: JWT_SECRET');
}

// Generic authenticate middleware — accepts any role (student or coordinator)
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No valid token provided."
            });
        }

        const token = authHeader.replace('Bearer ', '');

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Token expired"
                });
            }
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        // Fetch fresh user from DB to ensure role and profile state are current
        const user = await Student.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Invalid user."
            });
        }

        // Attach minimal user info to req.user
        req.user = {
            id: user._id.toString(),
            role: user.role,
            isProfileCompleted: !!user.profileIsCompleted
        };

        next();
    } catch (error) {
        console.error('Server error during authentication:', error);
        res.status(500).json({
            success: false,
            message: "Server error during authentication"
        });
    }
};

// Student-only middleware that reuses authenticate
const authenticateStudent = (req, res, next) => {
    // call authenticate, then enforce role check
    authenticate(req, res, () => {
        if (!req.user || req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Student access only."
            });
        }
        next();
    });
};

// Optional middleware to check if profile is completed (expects req.user set by authenticate/authenticateStudent)
const requireCompleteProfile = (req, res, next) => {
    if (!req.user || !req.user.isProfileCompleted) {
        return res.status(403).json({
            success: false,
            message: "Please complete your profile to access this feature"
        });
    }
    next();
};

// Middleware to check if user is a coordinator (expects req.user set by authenticate)
const requireCoordinator = (req, res, next) => {
    if (!req.user || req.user.role !== 'coordinator') {
        return res.status(403).json({ error: 'Forbidden: coordinator access only' });
    }
    next();
};

module.exports = { 
    authenticate,
    authenticateStudent,
    requireCompleteProfile,
    requireCoordinator 
};