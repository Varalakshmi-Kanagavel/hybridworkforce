const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcastController');
const authMiddleware = require('../middleware/auth');

// Routes
router.post('/',
  authMiddleware,
  broadcastController.sendBroadcast
);

router.get('/',
  authMiddleware,
  broadcastController.getBroadcasts
);

module.exports = router;

