require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('='.repeat(50));
console.log('Fraud Detection Database Setup');
console.log('='.repeat(50));

console.log('Debug: Checking environment variables...');
console.log('Current directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 'NOT FOUND');
console.log('MONGODB_URI starts with mongodb:', process.env.MONGODB_URI ? process.env.MONGODB_URI.startsWith('mongodb') : false);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in .env');
  console.log(' Current .env content:');
  try {
    const fs = require('fs');
    const envContent = fs.readFileSync('../.env', 'utf8');
    console.log(envContent);
  } catch (err) {
    console.log('Cannot read .env file');
  }
  process.exit(1);
}



// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  timestamp: { type: Date, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  customer: {
    id: String,
    name: String,
    email: String,
    location: String,
    isNew: Boolean
  },
  merchant: { type: String, required: true },
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
  riskScore: { type: Number, min: 0, max: 100, required: true },
  isFlagged: { type: Boolean, default: false },
  riskReasons: [String],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);

const setupDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(' Connected to MongoDB!');

    // Clear existing data (optional)
    await User.deleteMany({});
    await Transaction.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      email: 'admin@fraud.com',
      password: adminPassword,
      name: 'Administrator',
      role: 'admin'
    });
    await adminUser.save();
    console.log(' Admin user created: admin@fraud.com / admin123');

    // Create viewer user
    const viewerPassword = await bcrypt.hash('viewer123', 10);
    const viewerUser = new User({
      email: 'viewer@fraud.com',
      password: viewerPassword,
      name: 'Viewer User',
      role: 'viewer'
    });
    await viewerUser.save();
    console.log('Viewer user created: viewer@fraud.com / viewer123');

    console.log('\n Database setup completed!');
    console.log('\n Login Credentials:');
    console.log('='.repeat(40));
    console.log('Admin:');
    console.log('  Email: admin@fraud.com');
    console.log('  Password: admin123');
    console.log('\nViewer:');
    console.log('  Email: viewer@fraud.com');
    console.log('  Password: viewer123');
    console.log('='.repeat(40));

    await mongoose.connection.close();
    console.log('\n Database connection closed');
    console.log('Now run: npm run dev');

  } catch (error) {
    console.error('Setup error:', error.message);
    process.exit(1);
  }
};

setupDatabase();