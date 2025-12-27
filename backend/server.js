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

// Configure CORS - UPDATE THIS WITH YOUR ACTUAL VERCEL URL!
const corsOptions = {
  origin: [
    'https://your-project.vercel.app',  
    'https://fraud-detection-dashboard.vercel.app', 
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

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
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
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
    version: '1.0.0'
  });
});

// Import and use your routes
const authRoutes = require('./src/routes/auth.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
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
    path: req.originalUrl
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
