require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ============ ULTIMATE CORS FIX ============
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin || 'No origin');
  
  // SET CORS HEADERS FOR EVERY SINGLE REQUEST
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle OPTIONS preflight IMMEDIATELY
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return res.status(200).end();
  }
  
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB Connected');
  // Create default users if they don't exist
  createDefaultUsers();
})
.catch(err => console.log('MongoDB Error:', err.message));

// User Schema (if you don't have models/user.model.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'viewer' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createDefaultUsers() {
  try {
    const users = [
      { name: 'Admin User', email: 'admin@fraud.com', password: 'admin123', role: 'admin' },
      { name: 'Viewer User', email: 'viewer@fraud.com', password: 'viewer123', role: 'viewer' }
    ];
    
    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        });
        await user.save();
        console.log(`Created user: ${userData.email}`);
      }
    }
  } catch (error) {
    console.log('User creation error:', error.message);
  }
}

// ============ LOGIN ENDPOINT ============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        error: 'Invalid email or password',
        hint: 'Try: admin@fraud.com / admin123 or viewer@fraud.com / viewer123'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ 
        error: 'Invalid email or password',
        hint: 'Try: admin@fraud.com / admin123 or viewer@fraud.com / viewer123'
      });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    console.log('Login successful for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// ============ TEST ENDPOINTS ============
app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is working',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS IS WORKING',
    origin: req.headers.origin || 'No Origin',
    timestamp: new Date().toISOString()
  });
});

// ============ OTHER ROUTES ============
try {
  const transactionRoutes = require('./src/routes/transaction.routes');
  app.use('/api/transactions', transactionRoutes);
  console.log('Transaction routes loaded');
} catch (error) {
  console.log('Transaction routes error:', error.message);
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.url,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('SERVER STARTED ON PORT ' + PORT);
  console.log('='.repeat(60));
  console.log('\nLOGIN CREDENTIALS:');
  console.log('1. admin@fraud.com / admin123');
  console.log('2. viewer@fraud.com / viewer123');
  console.log('\nTEST ENDPOINTS:');
  console.log('1. GET  /test');
  console.log('2. GET  /api/cors-test');
  console.log('3. POST /api/auth/login');
  console.log('\n' + '='.repeat(60));
});

module.exports = app;
