const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/auth');
const allowRoles = require('../middleware/authorization');

// Validation rules
const applyLeaveValidation = [
  body('type').isIn(['leave', 'wfh']).withMessage('Type must be either "leave" or "wfh"'),
  body('fromDate').isISO8601().withMessage('Valid from date is required'),
  body('toDate').isISO8601().withMessage('Valid to date is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required')
];

// Routes
router.post('/',
  authMiddleware,
  applyLeaveValidation,
  leaveController.applyLeave
);

router.get('/my',
  authMiddleware,
  leaveController.getMyLeaveRequests
);

router.get('/pending',
  authMiddleware,
  allowRoles('MANAGER', 'HR_ADMIN', 'SYS_ADMIN'),
  leaveController.getPendingLeaveRequests
);

router.put('/:id/approve',
  authMiddleware,
  allowRoles('MANAGER', 'HR_ADMIN', 'SYS_ADMIN'),
  leaveController.approveLeave
);

router.put('/:id/reject',
  authMiddleware,
  allowRoles('MANAGER', 'HR_ADMIN', 'SYS_ADMIN'),
  leaveController.rejectLeave
);

module.exports = router;

