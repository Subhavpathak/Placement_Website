const express = require('express');
const router = express.Router();

const authController = require('../controller/auth');

// POST /api/auth/login
router.post('/login', authController.loginStudent);

module.exports = router;