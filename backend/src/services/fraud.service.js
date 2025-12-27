const Transaction = require('../models/Transaction');
const aiService = require('../config/openai');
const transactionGenerator = require('./transaction.generator');

class FraudDetectionService {
  constructor(io) {
    this.io = io;
    this.isGenerating = false;
    this.generationInterval = null;
  }

  async startTransactionGeneration(intervalMs = 3000) {
    if (this.isGenerating) {
      console.log('Transaction generation already running');
      return;
    }

    this.isGenerating = true;
    console.log(` Starting transaction generation every ${intervalMs}ms`);
    
    let transactionCount = 0;

    this.generationInterval = setInterval(async () => {
      try {
        // Generate a new transaction
        const rawTransaction = transactionGenerator.generateTransaction();
        
        // Analyze with AI
        const analysis = await aiService.analyzeTransaction(rawTransaction);
        
        // Create full transaction object
        const transaction = {
          ...rawTransaction,
          riskScore: analysis.riskScore,
          isFlagged: analysis.isFlagged,
          riskReasons: analysis.reasons || [],
          status: analysis.isFlagged ? 'flagged' : 'completed'
        };

        // Save to database
        const savedTransaction = new Transaction(transaction);
        await savedTransaction.save();

        console.log(` Generated: ${transaction.transactionId} - $${transaction.amount} - Risk: ${transaction.riskScore}`);

        // Emit to clients
        if (this.io) {
          this.io.emit('newTransaction', {
            ...transaction,
            _id: savedTransaction._id,
            createdAt: savedTransaction.createdAt
          });

          if (analysis.isFlagged) {
            this.io.emit('highRiskAlert', {
              transactionId: savedTransaction._id,
              amount: transaction.amount,
              customerId: transaction.customer.id,
              riskScore: transaction.riskScore,
              reasons: transaction.riskReasons,
              timestamp: new Date()
            });
          }
        }
        
        // Auto-cleanup every 10 transactions
        transactionCount++;
        if (transactionCount % 10 === 0) {
          await this.cleanupOldTransactions(100);
        }

      } catch (error) {
        console.error('Error generating transaction:', error);
      }
    }, intervalMs);
  }

  stopTransactionGeneration() {
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = null;
      this.isGenerating = false;
      console.log('Transaction generation stopped');
    }
  }

  async getStats() {
    try {
      // Get total transactions
      const totalTransactions = await Transaction.countDocuments();
      
      // Get high-risk transactions
      const highRiskTransactions = await Transaction.countDocuments({ 
        isFlagged: true 
      });
      
      // Calculate average risk score
      const result = await Transaction.aggregate([
        {
          $group: {
            _id: null,
            avgRiskScore: { $avg: '$riskScore' },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);
      
      const avgRiskScore = result.length > 0 ? result[0].avgRiskScore : 0;
      const totalAmount = result.length > 0 ? result[0].totalAmount : 0;
      
      // Get previous hour stats for comparison
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const previousHourTransactions = await Transaction.countDocuments({
        createdAt: { $lt: oneHourAgo }
      });
      
      return {
        totalTransactions,
        highRiskTransactions,
        highRiskPercentage: totalTransactions > 0 
          ? ((highRiskTransactions / totalTransactions) * 100).toFixed(1)
          : 0,
        avgRiskScore: avgRiskScore.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        // Calculate percentage changes (placeholder logic)
        totalChange: previousHourTransactions > 0 
          ? (((totalTransactions - previousHourTransactions) / previousHourTransactions) * 100).toFixed(0)
          : 0,
        highRiskChange: 5, // Placeholder
        avgRiskChange: -2, // Placeholder
        amountChange: 8 // Placeholder
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalTransactions: 0,
        highRiskTransactions: 0,
        highRiskPercentage: 0,
        avgRiskScore: 0,
        totalAmount: 0,
        totalChange: 0,
        highRiskChange: 0,
        avgRiskChange: 0,
        amountChange: 0
      };
    }
  }

  async cleanupOldTransactions(maxTransactions = 100) {
    try {
      // Count total transactions
      const count = await Transaction.countDocuments();
      
      if (count > maxTransactions) {
        // Calculate how many to delete
        const toDelete = count - maxTransactions;
        
        // Get oldest transactions to delete
        const oldestTransactions = await Transaction.find()
          .sort({ createdAt: 1 })
          .limit(toDelete)
          .select('_id');
        
        const idsToDelete = oldestTransactions.map(t => t._id);
        
        // Delete them
        const result = await Transaction.deleteMany({
          _id: { $in: idsToDelete }
        });
        
        console.log(`🧹 Cleaned up ${result.deletedCount} old transactions (kept newest ${maxTransactions})`);
      } else {
        console.log(`🧹 Cleanup: ${count} transactions (under limit of ${maxTransactions})`);
      }
    } catch (error) {
      console.error("Cleanup error:", error.message);
    }
  }

  // Additional methods you might need
  async getRecentTransactions(limit = 50) {
    try {
      return await Transaction.find()
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  async getHighRiskTransactions() {
    try {
      return await Transaction.find({ isFlagged: true })
        .sort({ createdAt: -1 })
        .limit(20);
    } catch (error) {
      console.error('Error getting high risk transactions:', error);
      return [];
    }
  }
}

// Export as default (CommonJS style)
module.exports = FraudDetectionService;