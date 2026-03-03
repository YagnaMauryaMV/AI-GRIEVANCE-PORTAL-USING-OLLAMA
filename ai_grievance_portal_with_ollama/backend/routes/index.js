// backend/routes/index.js
const express = require('express');
const router = express.Router();

try {
  // Import route files
  const authRoutes = require('./auth');
  const adminRoutes = require('./admin');
  const complaintRoutes = require('./complaints');

  // Use routes with error handling
  router.use('/auth', authRoutes);
  router.use('/admin', adminRoutes);
  router.use('/complaints', complaintRoutes);
  
  console.log('✅ All routes loaded successfully');
} catch (err) {
  console.error('❌ Error loading routes:', err.message);
  process.exit(1); // Exit if routes can't be loaded
}

module.exports = router;