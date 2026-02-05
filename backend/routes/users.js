const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const allowRoles = require('../middleware/authorization');

// Validation rules
const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYS_ADMIN']).withMessage('Invalid role')
];

// Routes
router.get('/', 
  authMiddleware,
  allowRoles('HR_ADMIN', 'SYS_ADMIN'),
  userController.getAllUsers
);

router.get('/team/:teamId',
  authMiddleware,
  userController.getTeamMembers
);

router.put('/change-password',
  authMiddleware,
  userController.changePassword
);

router.get('/:id',
  authMiddleware,
  userController.getUserById
);

router.put('/:id',
  authMiddleware,
  allowRoles('HR_ADMIN', 'SYS_ADMIN'),
  updateUserValidation,
  userController.updateUser
);

router.delete('/:id',
  authMiddleware,
  allowRoles('HR_ADMIN', 'SYS_ADMIN'),
  userController.deleteUser
);

module.exports = router;

