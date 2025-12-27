require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ==================== CORS CONFIGURATION ====================
// List of allowed origins
const allowedOrigins = [
  'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
  'https://real-time-fraud-detection-dashboard.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173'
];

// CORS middleware function
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Also use cors package as backup
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ==================== BODY PARSING ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== MONGODB CONNECTION ====================
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
  console.log('MongoDB URI:', MONGODB_URI ? 'Set' : 'Not set');
  process.exit(1);
});

// MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// ==================== ROUTES ====================

// CORS Test Endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working correctly!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin header',
    method: req.method,
    corsHeaders: {
      'Access-Control-Allow-Origin': req.headers.origin || 'Not set',
      'Access-Control-Allow-Credentials': 'true'
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
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile'
      },
      transactions: {
        create: 'POST /api/transactions',
        list: 'GET /api/transactions',
        stats: 'GET /api/transactions/stats'
      }
    },
    allowedOrigins: allowedOrigins
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
      allowedOrigins: allowedOrigins.length
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
    }
  });
});

// ==================== API ROUTES ====================
try {
  // Load and use auth routes
  const authRoutes = require('./src/routes/auth.routes');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes loaded');
} catch (error) {
  console.error('Failed to load auth routes:', error.message);
}

try {
  // Load and use transaction routes
  const transactionRoutes = require('./src/routes/transaction.routes');
  app.use('/api/transactions', transactionRoutes);
  console.log('Transaction routes loaded');
} catch (error) {
  console.error('Failed to load transaction routes:', error.message);
}

try {
  // Load and use dashboard routes
  const dashboardRoutes = require('./src/routes/dashboard.routes');
  app.use('/api/dashboard', dashboardRoutes);
  console.log('Dashboard routes loaded');
} catch (error) {
  console.error('Failed to load dashboard routes:', error.message);
}

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/cors-test',
      'POST /api/auth/login',
      'POST /api/transactions'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.message);
  console.error('Error Stack:', err.stack);
  
  // Set CORS headers even on errors
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  const statusCode = err.status || 500;
  const errorResponse = {
    error: true,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
});

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Fraud Detection API Server Started');
  console.log('='.repeat(60));
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  console.log('CORS: Enabled');
  console.log('Allowed Origins:');
  allowedOrigins.forEach(origin => {
    console.log(`  - ${origin}`);
  });
  console.log('='.repeat(60));
  console.log('\nTest Endpoints:');
  console.log(`  Health: curl http://localhost:${PORT}/health`);
  console.log(`  CORS Test: curl -H "Origin: ${allowedOrigins[0]}" http://localhost:${PORT}/api/cors-test`);
  console.log('='.repeat(60));
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
