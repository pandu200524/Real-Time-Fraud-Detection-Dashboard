require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// SIMPLE CORS FIX - Allow all origins for now
app.use(cors({
  origin: '*', // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicit preflight handler
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
    service: "Fraud Detection API"
  });
});

// CORS test endpoint
app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS is working!",
    origin: req.headers.origin || "No origin header",
    timestamp: new Date().toISOString()
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.path 
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
    console.log("CORS: Enabled (all origins allowed)");
  });
}

module.exports = app;
