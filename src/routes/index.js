const express = require('express');
const router = express.Router();
const v1Routes = require('./v1');
const adminRoutes = require('./admin');

// OpenAI v1 API routes
router.use('/v1', v1Routes);

// Admin routes
router.use('/admin', adminRoutes);

module.exports = router;
