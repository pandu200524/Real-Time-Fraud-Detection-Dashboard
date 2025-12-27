require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// 1. LOG ALL REQUESTS FIRST
app.use((req, res, next) => {
  console.log('=== REQUEST RECEIVED ===');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', req.body);
  console.log('=========================');
  next();
});

// 2. MANUAL CORS HANDLING - NO cors PACKAGE
app.use((req, res, next) => {
  // ALWAYS set these headers for EVERY request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle OPTIONS preflight IMMEDIATELY
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS preflight handled');
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
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Error:', err.message));

// ====== TEST ENDPOINTS ======

// Test 1: Simple GET
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Test 2: CORS Test
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS TEST PASSED',
    origin: req.headers.origin || 'No Origin header',
    timestamp: new Date().toISOString()
  });
});

// Test 3: Always-successful login
app.post('/api/auth/test-login', (req, res) => {
  console.log('Test login called with:', req.body);
  res.json({
    success: true,
    message: 'Login successful (TEST)',
    token: 'test-jwt-token-' + Date.now(),
    user: {
      id: '123',
      email: req.body.email || 'test@example.com',
      name: 'Test User'
    }
  });
});

// ====== REAL ENDPOINTS ======
try {
  const authRoutes = require('./src/routes/auth.routes');
  const transactionRoutes = require('./src/routes/transaction.routes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  
  console.log('Real routes loaded');
} catch (error) {
  console.log('Route loading error:', error.message);
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.url
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('SERVER STARTED ON PORT ' + PORT);
  console.log('CORS: MANUALLY HANDLED (ALL ORIGINS ALLOWED)');
  console.log('='.repeat(60));
  console.log('\nTEST ENDPOINTS:');
  console.log('1. GET  /api/test');
  console.log('2. GET  /api/cors-test');
  console.log('3. POST /api/auth/test-login');
  console.log('\n' + '='.repeat(60));
});
