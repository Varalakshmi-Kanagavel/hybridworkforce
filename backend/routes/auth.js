const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const allowRoles = require('../middleware/authorization');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYS_ADMIN']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', 
  authMiddleware,
  allowRoles('HR_ADMIN', 'SYS_ADMIN'),
  registerValidation,
  authController.register
);

router.post('/login', loginValidation, authController.login);

router.get('/me', authMiddleware, authController.getMe);

module.exports = router;

