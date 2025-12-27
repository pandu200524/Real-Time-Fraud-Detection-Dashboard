require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// SIMPLE CORS SOLUTION
// Handle OPTIONS preflight requests FIRST
app.options('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] OPTIONS preflight for: ${req.url}`);
  console.log(`Origin header: ${req.headers.origin || 'No origin'}`);
  
  // Allow ALL origins
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('Access-Control-Max-Age', '86400');
  
  return res.sendStatus(200);
});

// CORS middleware for all requests
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Additional CORS headers for all responses
app.use((req, res, next) => {
  // Log every request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`Origin: ${req.headers.origin || 'No origin header'}`);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MONGODB CONNECTION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection';

console.log('Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('MongoDB Connected Successfully');
  console.log(`Database: ${mongoose.connection.name}`);
})
.catch((err) => {
  console.error('MongoDB Connection Error:', err.message);
  console.log('Starting server without database connection...');
});

// TEST ENDPOINTS

// CORS Test Endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('CORS test endpoint called');
  res.json({
    success: true,
    message: 'CORS is working correctly!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin header',
    method: req.method,
    server: 'Render Backend',
    corsHeaders: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    }
  });
});

// Fake Login Endpoint for testing
app.post('/api/auth/login-test', (req, res) => {
  console.log('Login test called with:', req.body);
  res.json({
    success: true,
    message: 'Login successful (TEST MODE)',
    token: 'test-jwt-token-12345',
    user: {
      id: '123',
      email: req.body.email || 'test@test.com',
      name: 'Test User',
      role: 'user'
    }
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
      root: '/',
      health: '/health',
      corsTest: '/api/cors-test',
      loginTest: 'POST /api/auth/login-test',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      transactions: {
        create: 'POST /api/transactions',
        list: 'GET /api/transactions',
        stats: 'GET /api/transactions/stats'
      }
    },
    note: 'CORS is enabled for ALL origins (*)'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusText = dbStatus === 1 ? 'connected' : 'disconnected';
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Fraud Detection API',
    database: {
      status: statusText,
      readyState: dbStatus
    },
    cors: {
      enabled: true,
      policy: 'Allow all origins (*)'
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
    }
  });
});

// REAL API ROUTES
try {
  const authRoutes = require('./src/routes/auth.routes');
  const transactionRoutes = require('./src/routes/transaction.routes');
  const dashboardRoutes = require('./src/routes/dashboard.routes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  
  console.log('API routes loaded successfully');
} catch (error) {
  console.error('Error loading API routes:', error.message);
  console.error('Stack trace:', error.stack);
}

// ERROR HANDLING

// 404 Handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/cors-test',
      'POST /api/auth/login-test',
      'POST /api/auth/login',
      'POST /api/transactions'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err.message);
  console.error('Error stack:', err.stack);
  
  // Ensure CORS headers even on errors
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// START SERVER
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('FRAUD DETECTION API SERVER STARTED');
  console.log('='.repeat(70));
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`Live URL: https://real-time-fraud-detection-dashboard.onrender.com`);
  console.log(`CORS: Enabled for ALL origins (*)`);
  console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  console.log('\n' + '='.repeat(70));
  console.log('TEST ENDPOINTS:');
  console.log('='.repeat(70));
  console.log(`  1. Health check:`);
  console.log(`     curl https://real-time-fraud-detection-dashboard.onrender.com/health`);
  console.log(`\n  2. CORS test:`);
  console.log(`     curl https://real-time-fraud-detection-dashboard.onrender.com/api/cors-test`);
  console.log(`\n  3. Test login (always works):`);
  console.log(`     curl -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test123"}' https://real-time-fraud-detection-dashboard.onrender.com/api/auth/login-test`);
  console.log('='.repeat(70));
  console.log('If CORS still fails, test with:');
  console.log('   curl -X OPTIONS https://real-time-fraud-detection-dashboard.onrender.com/api/auth/login -v');
  console.log('='.repeat(70) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

module.exports = app;
