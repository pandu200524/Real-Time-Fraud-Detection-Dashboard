require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// ============ ULTIMATE CORS FIX ============
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin || 'No origin');
  console.log('User-Agent:', req.headers['user-agent']?.substring(0, 50));
  
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

// Remove ALL other CORS middleware imports and configurations

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

// ============ TEST ENDPOINTS ============

// Test 1: Simple endpoint
app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is working',
    timestamp: new Date().toISOString()
  });
});

// Test 2: CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS IS WORKING',
    origin: req.headers.origin || 'No Origin',
    timestamp: new Date().toISOString(),
    corsHeaders: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    }
  });
});

// Test 3: Login test endpoint (ALWAYS works)
app.post('/api/auth/test-login', (req, res) => {
  console.log('Test login request:', req.body);
  res.json({
    success: true,
    message: 'Login successful (TEST)',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3MzUzNjc3MjB9.test-jwt-token',
    user: {
      id: '123',
      email: req.body.email || 'test@test.com',
      name: 'Test User',
      role: 'admin'
    }
  });
});

// ============ REAL ROUTES ============
try {
  const authRoutes = require('./src/routes/auth.routes');
  const transactionRoutes = require('./src/routes/transaction.routes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  
  console.log('Real routes loaded');
} catch (error) {
  console.log('Routes error:', error.message);
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.url });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('SERVER STARTED ON PORT ' + PORT);
  console.log('CORS: ALL ORIGINS ALLOWED (*)');
  console.log('='.repeat(60));
  console.log('\nTEST ENDPOINTS:');
  console.log('1. GET  /test');
  console.log('2. GET  /api/cors-test');
  console.log('3. POST /api/auth/test-login');
  console.log('\n' + '='.repeat(60));
});

module.exports = app;
