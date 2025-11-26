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

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     security:
 *       - adminPassword: []
 *     responses:
 *       200:
 *         description: List of all reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   phone_number:
 *                     type: string
 *                   category:
 *                     type: string
 *                   subcategory:
 *                     type: string
 *                   description:
 *                     type: string
 *                   location:
 *                     type: string
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Database error
 */
// Get all reports
router.get('/reports', authenticate, (req, res) => {
  Report.findAll((err, reports) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(reports);
  });
});

/**
 * @swagger
 * /api/admin/reports/{id}:
 *   get:
 *     summary: Get a specific report by ID
 *     tags: [Reports]
 *     security:
 *       - adminPassword: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/admin/reports/{id}/status:
 *   patch:
 *     summary: Update report status
 *     tags: [Reports]
 *     security:
 *       - adminPassword: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, resolved, closed]
 *                 description: New status for the report
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get statistics about reports
 *     tags: [Statistics]
 *     security:
 *       - adminPassword: []
 *     responses:
 *       200:
 *         description: Statistics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 pending:
 *                   type: integer
 *                 in_progress:
 *                   type: integer
 *                 resolved:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
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

