require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');

// Import your modules
const FraudDetectionService = require('./src/services/fraud.service');
const { initSocket, setFraudService } = require('./src/sockets/socket');

// Create Express app
const app = express();

// IMPORTANT: Handle preflight requests FIRST, before CORS middleware
app.options('*', (req, res) => {
  console.log('Preflight request received:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-HTTP-Method-Override');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).send(); // No content for OPTIONS
});

// CORS Configuration - SIMPLIFIED VERSION
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins for testing, or specify your domains
    const allowedOrigins = [
      'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
      'https://real-time-fraud-detection-dashboard.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      undefined // Allow requests with no origin (like Postman)
    ];
    
    console.log('CORS Origin check:', origin);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-HTTP-Method-Override'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Additional headers middleware for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Always set CORS headers
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-HTTP-Method-Override');
  res.header('Access-Control-Max-Age', '86400');
  
  // Log CORS headers for debugging
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request headers set for:', origin);
  }
  
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
const io = initSocket(server);

// Initialize fraud detection service
const fraudService = new FraudDetectionService(io);

// Pass fraud service reference to socket module
setFraudService(fraudService);

// Store instances globally for route access
app.set('io', io);
app.set('fraudService', fraudService);

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Fraud Detection API',
    version: '1.0.0',
    status: 'online',
    cors: 'enabled',
    preflight: 'handled',
    endpoints: {
      health: '/health',
      corsTest: '/api/cors-test',
      transactions: '/api/transactions',
      auth: '/api/auth'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'fraud-detection-api',
    cors: 'enabled',
    preflight: 'handled'
  });
});

// Test CORS endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin || 'No origin header',
    method: req.method,
    timestamp: new Date().toISOString(),
    corsHeaders: {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
});

// Test preflight endpoint specifically
app.options('/api/cors-test', (req, res) => {
  console.log('CORS test preflight received');
  res.status(204).send();
});

// Import and use your routes
const authRoutes = require('./src/routes/auth.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');

// Handle preflight for all auth routes
app.options('/api/auth/*', (req, res) => {
  console.log('Auth preflight for:', req.url);
  res.status(204).send();
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS')) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    return res.status(403).json({
      error: 'CORS Error',
      message: err.message,
      yourOrigin: req.headers.origin,
      allowedOrigins: [
        'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
        'http://localhost:3000'
      ]
    });
  }
  
  // Set CORS headers even on errors
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler with CORS headers
app.use('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  
  // Start server after DB connection
  server.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('Fraud Detection API Started');
    console.log('='.repeat(60));
    console.log(`REST API: http://localhost:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('CORS: ENABLED');
    console.log('Preflight: HANDLED');
    console.log('Allowed Origins:');
    console.log('  • https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app');
    console.log('  • https://real-time-fraud-detection-dashboard.vercel.app');
    console.log('  • http://localhost:3000');
    console.log('  • http://localhost:3001');
    console.log('='.repeat(60));
    
    // Test URL for debugging
    console.log('\nTest CORS with:');
    console.log(`  curl -X OPTIONS -H "Origin: https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app" -H "Access-Control-Request-Method: POST" http://localhost:${PORT}/api/auth/login`);
    console.log('='.repeat(60));
    
    // Clean up old transactions on startup
    setTimeout(async () => {
      try {
        await fraudService.cleanupOldTransactions();
        console.log('Database cleanup complete');
        
        const stats = await fraudService.getStats();
        console.log(`Current: ${stats.totalTransactions} transactions, ${stats.highRiskTransactions} flagged`);
      } catch (error) {
        console.error('Startup cleanup error:', error.message);
      }
    }, 2000);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io, fraudService };
