const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Get all reports
router.get('/reports', authenticate, (req, res) => {
  Report.findAll((err, reports) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(reports);
  });
});

// Get report by ID
router.get('/reports/:id', authenticate, (req, res) => {
  Report.findById(req.params.id, (err, report) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  });
});

// Update report status
router.patch('/reports/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  Report.updateStatus(req.params.id, status, (err, changes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (changes === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Status updated successfully' });
  });
});

// Get statistics
router.get('/stats', authenticate, (req, res) => {
  Report.getStats((err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

module.exports = router;

