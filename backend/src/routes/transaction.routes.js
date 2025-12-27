const express = require('express');
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// IMPORTANT: Specific routes BEFORE generic routes to avoid conflicts

// Get transaction statistics - MUST BE BEFORE /:id route
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
    }
    
    // Get basic stats
    const totalTransactions = await Transaction.countDocuments(dateFilter);
    
    if (totalTransactions === 0) {
      return res.json({
        totalTransactions: 0,
        highRiskTransactions: 0,
        avgRiskScore: '0',
        totalAmount: '0',
        highRiskPercentage: '0',
        riskDistribution: [],
        hourlyPattern: []
      });
    }
    
    const stats = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          avgRiskScore: { $avg: '$riskScore' },
          highRiskCount: { 
            $sum: { 
              $cond: [{ $gte: ['$riskScore', 70] }, 1, 0] 
            } 
          },
          flaggedCount: { 
            $sum: { 
              $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] 
            } 
          }
        }
      }
    ]);
    
    const statsData = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      avgAmount: 0,
      avgRiskScore: 0,
      highRiskCount: 0,
      flaggedCount: 0
    };
    
    // Get risk distribution
    const riskDistribution = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $bucket: {
          groupBy: '$riskScore',
          boundaries: [0, 30, 70, 85, 101],
          default: 'other',
          output: {
            count: { $sum: 1 }
          }
        }
      },
      {
        $project: {
          riskRange: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: 'Low (0-29)' },
                { case: { $eq: ['$_id', 30] }, then: 'Medium (30-69)' },
                { case: { $eq: ['$_id', 70] }, then: 'High (70-84)' },
                { case: { $eq: ['$_id', 85] }, then: 'Critical (85-100)' }
              ],
              default: 'Unknown'
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Get hourly transaction pattern
    const hourlyPattern = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $project: {
          hour: { $hour: { date: '$timestamp', timezone: 'UTC' } },
          riskScore: 1
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 },
          totalRisk: { $sum: '$riskScore' }
        }
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          hour: '$_id',
          count: 1,
          avgRisk: { 
            $round: [{ $divide: ['$totalRisk', '$count'] }, 0] 
          },
          _id: 0
        }
      }
    ]);
    
    // Fill in missing hours with 0
    const completeHourlyPattern = Array.from({ length: 24 }, (_, i) => {
      const hourData = hourlyPattern.find(h => h.hour === i);
      return hourData || { hour: i, count: 0, avgRisk: 0 };
    });
    
    // Calculate high risk percentage
    const highRiskPercentage = statsData.totalTransactions > 0
      ? ((statsData.highRiskCount / statsData.totalTransactions) * 100).toFixed(1)
      : '0';
    
    res.json({
      totalTransactions: statsData.totalTransactions,
      highRiskTransactions: statsData.highRiskCount,
      avgRiskScore: statsData.avgRiskScore.toFixed(2),
      totalAmount: statsData.totalAmount.toFixed(2),
      highRiskPercentage,
      riskDistribution,
      hourlyPattern: completeHourlyPattern
    });
    
  } catch (error) {
    console.error(' Error fetching stats:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

// Export transactions (admin only) - MUST BE BEFORE /:id
router.post('/export', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.body;
    
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .lean();
    
    console.log(` Exporting ${transactions.length} transactions in ${format} format`);
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = ['ID', 'Timestamp', 'Amount', 'Currency', 'Customer', 'Location', 'Merchant', 'Payment Method', 'Risk Score', 'Flagged', 'Status', 'Reviewed'];
      const csvRows = transactions.map(t => [
        t.transactionId,
        new Date(t.timestamp).toISOString(),
        t.amount,
        t.currency || 'USD',
        t.customer?.name || '',
        t.customer?.location || '',
        t.merchant,
        t.paymentMethod,
        t.riskScore,
        t.isFlagged ? 'Yes' : 'No',
        t.status,
        t.isReviewed ? 'Yes' : 'No'
      ].map(field => `"${field}"`).join(','));
      
      const csv = [headers.join(','), ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      return res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.json');
      return res.json(transactions);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Get all transactions with pagination and filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sortBy = 'timestamp', 
      sortOrder = 'desc',
      riskThreshold,
      startDate,
      endDate,
      flaggedOnly = false
    } = req.query;
    
    // Build query
    const query = {};
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    if (riskThreshold) {
      query.riskScore = { $gte: parseInt(riskThreshold) };
    }
    
    if (flaggedOnly === 'true') {
      query.isFlagged = true;
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    let transactions = await Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Hide sensitive data for viewers
    if (req.user.role === 'viewer') {
      transactions = transactions.map(tx => ({
        ...tx,
        customer: {
          ...tx.customer,
          name: 'Anonymous Customer',
          email: '***@***.**',
          location: tx.customer?.location, // Keep location
          id: tx.customer?.id // Keep ID for tracking
        }
      }));
    }
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    let transaction = await Transaction.findById(req.params.id).lean();
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Hide sensitive data for viewers
    if (req.user.role === 'viewer') {
      transaction = {
        ...transaction,
        customer: {
          ...transaction.customer,
          name: 'Anonymous Customer',
          email: '***@***.**',
          location: transaction.customer?.location, // Keep location
          id: transaction.customer?.id // Keep ID
        }
      };
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Mark transaction as reviewed (admin only)
router.patch('/:id/review', authenticate, authorize('admin'), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.isReviewed) {
      return res.status(400).json({ error: 'Transaction already reviewed' });
    }
    
    transaction.isReviewed = true;
    transaction.reviewedBy = req.user.userId;
    transaction.reviewedAt = new Date();
    
    await transaction.save();
    
    console.log(`Transaction ${transaction._id} marked as reviewed by ${req.user.name}`);
    
    // Notify all connected clients via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('transactionReviewed', {
        transactionId: transaction._id,
        reviewedBy: req.user.name,
        reviewedAt: transaction.reviewedAt
      });
    }
    
    res.json({ 
      message: 'Transaction marked as reviewed',
      transaction 
    });
  } catch (error) {
    console.error('Error reviewing transaction:', error);
    res.status(500).json({ error: 'Failed to mark transaction as reviewed' });
  }
});

module.exports = router;