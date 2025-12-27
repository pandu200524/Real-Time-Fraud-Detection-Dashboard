const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  customer: {
    id: String,
    name: String,
    email: String,
    location: String,
    isNew: Boolean
  },
  merchant: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer'],
    default: 'credit_card'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'flagged'],
    default: 'completed'
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  riskReasons: [String],
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  isReviewed: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
transactionSchema.index({ timestamp: -1, riskScore: -1 });
transactionSchema.index({ isFlagged: 1, timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);