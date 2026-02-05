const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const allowRoles = require('../middleware/authorization');

// Routes
router.get('/employee',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  dashboardController.getEmployeeDashboard
);

router.get('/manager',
  authMiddleware,
  allowRoles('MANAGER'),
  dashboardController.getManagerDashboard
);

router.get('/hr',
  authMiddleware,
  allowRoles('HR_ADMIN'),
  dashboardController.getHRDashboard
);

router.get('/system',
  authMiddleware,
  allowRoles('SYS_ADMIN'),
  dashboardController.getSystemDashboard
);

module.exports = router;

