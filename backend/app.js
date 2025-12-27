require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
    'https://real-time-fraud-detection-dashboard.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicit preflight handler for all routes
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB Connected");
})
.catch(err => {
  console.log("MongoDB Connection Error:", err.message);
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin header',
    allowedOrigins: [
      'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
      'https://real-time-fraud-detection-dashboard.vercel.app',
      'http://localhost:3000'
    ]
  });
});

// Basic routes
app.get("/", (req, res) => {
  res.json({ 
    message: "Fraud Detection API",
    version: "1.0.0",
    status: "online",
    cors: "enabled",
    endpoints: {
      health: "/health",
      corsTest: "/api/cors-test",
      auth: "/api/auth/*",
      transactions: "/api/transactions/*"
    }
  });
});

app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ 
    status: "OK",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: "Fraud Detection API",
    cors: "enabled"
  });
});

// API Routes
try {
  const authRoutes = require("./src/routes/auth.routes");
  const transactionRoutes = require("./src/routes/transaction.routes");
  const dashboardRoutes = require("./src/routes/dashboard.routes");
  
  app.use("/api/auth", authRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  
  console.log("Routes loaded successfully");
} catch (error) {
  console.log("Warning: Some routes could not be loaded:", error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  
  // Set CORS headers on errors too
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: "CORS Error",
      message: "Not allowed by CORS policy",
      yourOrigin: req.headers.origin,
      allowedOrigins: [
        'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
        'http://localhost:3000'
      ]
    });
  }
  
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error"
  });
});

// 404 handler with CORS headers
app.use((req, res) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log("=".repeat(50));
    console.log("Server running on port", PORT);
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("CORS: Enabled");
    console.log("Allowed Origins:");
    console.log("  - https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app");
    console.log("  - https://real-time-fraud-detection-dashboard.vercel.app");
    console.log("  - http://localhost:3000");
    console.log("  - http://localhost:3001");
    console.log("=".repeat(50));
  });
}

module.exports = app;
