require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ============ CRITICAL: Handle OPTIONS requests FIRST ============
app.options('*', (req, res) => {
  console.log('OPTIONS preflight request received');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Additional headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB Connected Successfully');
})
.catch((err) => {
  console.error('MongoDB Connection Error:', err.message);
});

// Test endpoints
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin',
    cors: 'enabled'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Fraud Detection API',
    version: '1.0.0',
    status: 'online',
    cors: 'enabled',
    timestamp: new Date().toISOString()
  });
});

// API Routes
try {
  const authRoutes = require('./src/routes/auth.routes');
  const transactionRoutes = require('./src/routes/transaction.routes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  
  console.log('API routes loaded');
} catch (error) {
  console.error('Error loading routes:', error.message);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
  console.log('CORS: Enabled for all origins');
});

module.exports = app;
