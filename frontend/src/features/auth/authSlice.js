require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// SIMPLE CORS FIX - Allow all origins
app.use(cors({
  origin: '*', // Allow ALL origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle preflight requests for ALL routes
app.options('*', cors());

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

// CORS Test Endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin header',
    server: 'Render Backend',
    cors: 'enabled'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fraud Detection API',
    version: '1.0.0',
    status: 'online',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      corsTest: '/api/cors-test',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    cors: 'enabled'
  });
});

// API Routes
try {
  const authRoutes = require('./src/routes/auth.routes');
  const transactionRoutes = require('./src/routes/transaction.routes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  
  console.log('API routes loaded successfully');
} catch (error) {
  console.error('Error loading routes:', error.message);
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Fraud Detection API Server Started');
  console.log('='.repeat(60));
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log(`Live URL: https://real-time-fraud-detection-dashboard.onrender.com`);
  console.log(`CORS: Enabled (all origins allowed)`);
  console.log('='.repeat(60));
  console.log('\nTest the API:');
  console.log(`  curl https://real-time-fraud-detection-dashboard.onrender.com/api/cors-test`);
  console.log('='.repeat(60));
});

module.exports = app;
