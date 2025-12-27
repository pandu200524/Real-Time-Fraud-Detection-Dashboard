const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS Configuration - CRITICAL: Add your Vercel URL
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app'
    ];
    
    // Check if origin is allowed or is a Vercel preview deployment
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection')
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Connection Error:", err.message));

// Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "Fraud Detection API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api/*"
    }
  });
});

app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ 
    status: "OK",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: "Fraud Detection API"
  });
});

// API Routes
try {
  app.use("/api/auth", require("./src/routes/auth.routes"));
  app.use("/api/transactions", require("./src/routes/transaction.routes"));
} catch (error) {
  console.log("Warning: Some routes could not be loaded:", error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Fallback route
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.path 
  });
});

module.exports = app;
