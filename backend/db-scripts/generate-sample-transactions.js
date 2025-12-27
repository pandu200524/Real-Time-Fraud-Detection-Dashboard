require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const { faker } = require('@faker-js/faker');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(' MONGODB_URI is not defined in .env file');
  process.exit(1);
}

const generateSampleTransactions = async (count = 100) => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing transactions
    await Transaction.deleteMany({});
    console.log('Cleared existing transactions');

    const merchants = [
      'Amazon', 'eBay', 'Walmart', 'Target', 'Best Buy', 
      'Apple Store', 'Microsoft', 'Netflix', 'Spotify', 'Uber',
      'Airbnb', 'Starbucks', 'McDonald\'s', 'Home Depot', 'Costco'
    ];
    
    const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer'];
    const locations = [
      'New York, USA', 'London, UK', 'Tokyo, Japan', 'Sydney, Australia',
      'Berlin, Germany', 'Paris, France', 'Toronto, Canada', 'Singapore',
      'Mumbai, India', 'São Paulo, Brazil', 'Lagos, Nigeria', 'Moscow, Russia'
    ];

    const transactions = [];
    const now = new Date();

    console.log(`Generating ${count} sample transactions...`);

    for (let i = 0; i < count; i++) {
      // Create random date within last 7 days
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(timestamp.getHours() - hoursAgo);
      timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60));

      // Generate random amount with realistic distribution
      let amount;
      const rand = Math.random();
      if (rand < 0.6) {
        amount = faker.number.float({ min: 1, max: 100, precision: 0.01 });
      } else if (rand < 0.9) {
        amount = faker.number.float({ min: 100, max: 500, precision: 0.01 });
      } else {
        amount = faker.number.float({ min: 500, max: 5000, precision: 0.01 });
      }

      // Calculate risk score (simulate AI analysis)
      let riskScore = Math.floor(Math.random() * 30); // Base 0-30
      
      // Add risk factors
      if (amount > 1000) riskScore += 40;
      if (amount > 5000) riskScore += 30;
      
      // High-risk locations
      const location = faker.helpers.arrayElement(locations);
      if (location.includes('Nigeria') || location.includes('Russia')) {
        riskScore += 35;
      }
      
      // Late night transactions are riskier
      const hour = timestamp.getHours();
      if (hour >= 0 && hour <= 5) {
        riskScore += 25;
      }
      
      // Crypto payments are riskier
      const paymentMethod = faker.helpers.arrayElement(paymentMethods);
      if (paymentMethod === 'crypto') {
        riskScore += 30;
      }
      
      // New customers are riskier
      if (Math.random() > 0.7) {
        riskScore += 20;
      }

      // Cap at 100
      riskScore = Math.min(Math.max(riskScore, 0), 100);

      const transaction = {
        transactionId: `TXN${timestamp.getTime()}${faker.string.numeric(6)}`,
        timestamp,
        amount: parseFloat(amount.toFixed(2)),
        currency: 'USD',
        customer: {
          id: `CUST${faker.string.numeric(8)}`,
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          location,
          isNew: Math.random() > 0.7
        },
        merchant: faker.helpers.arrayElement(merchants),
        paymentMethod,
        status: 'completed',
        riskScore,
        isFlagged: riskScore > 70,
        riskReasons: riskScore > 70 ? ['High risk transaction detected'] : [],
        metadata: {
          device: faker.helpers.arrayElement(['mobile', 'desktop', 'tablet']),
          browser: faker.helpers.arrayElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
          ip: faker.internet.ip()
        }
      };

      transactions.push(transaction);

      // Show progress
      if ((i + 1) % 10 === 0) {
        console.log(`   Generated ${i + 1}/${count} transactions...`);
      }
    }

    // Insert all transactions
    await Transaction.insertMany(transactions);
    console.log(`Successfully created ${transactions.length} sample transactions`);

    // Show summary
    const flaggedCount = await Transaction.countDocuments({ isFlagged: true });
    const avgRisk = await Transaction.aggregate([
      { $group: { _id: null, avgRisk: { $avg: '$riskScore' } } }
    ]);

    console.log('\n Sample Data Summary:');
    console.log('----------------------------------------');
    console.log(`Total Transactions: ${transactions.length}`);
    console.log(`Flagged Transactions: ${flaggedCount}`);
    console.log(`Average Risk Score: ${avgRisk[0]?.avgRisk?.toFixed(2) || 0}`);
    console.log('----------------------------------------\n');

    console.log('Database is ready with sample data!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating sample transactions:', error.message);
    process.exit(1);
  }
};

// Get count from command line or default to 100
const count = process.argv[2] ? parseInt(process.argv[2]) : 100;
generateSampleTransactions(count);