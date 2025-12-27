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

// CORS Configuration - FIXED
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
      'https://real-time-fraud-detection-dashboard.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173' // Vite dev server
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.includes('vercel.app') || 
        origin.includes('localhost')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware BEFORE other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Additional headers middleware
app.use((req, res, next) => {
  // Set CORS headers for all responses
  const origin = req.headers.origin;
  if (origin && (
      origin.includes('vercel.app') || 
      origin.includes('localhost') || 
      origin.includes('real-time-fraud-detection')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  next();
});

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
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      transactions: '/api/transactions',
      auth: '/api/auth'
    },
    allowedOrigins: [
      'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
      'https://real-time-fraud-detection-dashboard.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'fraud-detection-api',
    version: '1.0.0',
    cors: 'enabled'
  });
});

// Test CORS endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
  });
});

// Import and use your routes
const authRoutes = require('./src/routes/auth.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: err.message,
      allowedOrigins: [
        'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
        'http://localhost:3000'
      ]
    });
  }
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
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
    console.log('='.repeat(50));
    console.log('Fraud Detection API Started');
    console.log('='.repeat(50));
    console.log(`REST API: http://localhost:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`AI Provider: ${process.env.AI_PROVIDER || 'not set'}`);
    console.log('CORS Enabled: YES');
    console.log('Allowed Origins:');
    console.log('- https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app');
    console.log('- https://real-time-fraud-detection-dashboard.vercel.app');
    console.log('- http://localhost:3000');
    console.log('- http://localhost:3001');
    console.log('='.repeat(50));
    
    // Clean up old transactions on startup
    setTimeout(async () => {
      try {
        await fraudService.cleanupOldTransactions();
        console.log('Database cleanup complete');
        
        // Get current stats
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
