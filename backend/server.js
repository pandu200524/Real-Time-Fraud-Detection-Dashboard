require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');

// 🔥 IMPORT SOCKET INITIALIZER
const { initSocket, setFraudService } = require('./socket');

const app = express();

/* =========================
   CORS (RENDER SAFE)
   ========================= */
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());

app.use(express.json());

/* =========================
   DATABASE
   ========================= */
mongoose
  .connect(
    process.env.MONGODB_URI ||
      'mongodb://localhost:27017/fraud-detection',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log('MongoDB Connected');
    createDefaultUsers();
  })
  .catch((err) =>
    console.error('MongoDB Error:', err.message)
  );

/* =========================
   MODELS
   ========================= */
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'viewer' },
});

const transactionSchema = new mongoose.Schema({
  amount: Number,
  riskScore: Number,
  status: String,
  isFlagged: Boolean,
  createdAt: { type: Date, default: Date.now },
});

const User =
  mongoose.models.User ||
  mongoose.model('User', userSchema);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model('Transaction', transactionSchema);

/* =========================
   DEFAULT USERS
   ========================= */
async function createDefaultUsers() {
  const users = [
    {
      name: 'Admin User',
      email: 'admin@fraud.com',
      password: 'admin123',
      role: 'admin',
    },
    {
      name: 'Viewer User',
      email: 'viewer@fraud.com',
      password: 'viewer123',
      role: 'viewer',
    },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      const hashed = await bcrypt.hash(u.password, 10);
      await User.create({ ...u, password: hashed });
      console.log(`Created user: ${u.email}`);
    }
  }
}

/* =========================
   AUTH LOGIN
   ========================= */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({
        error: 'Invalid email or password',
      });

    const match = await bcrypt.compare(
      password,
      user.password
    );
    if (!match)
      return res.status(401).json({
        error: 'Invalid email or password',
      });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   TRANSACTIONS API
   ========================= */
app.get('/api/transactions', async (req, res) => {
  const txns = await Transaction.find()
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(txns);
});

app.get('/api/transactions/stats', async (req, res) => {
  const total = await Transaction.countDocuments();
  const highRisk = await Transaction.countDocuments({
    riskScore: { $gte: 70 },
  });

  res.json({
    total,
    highRisk,
    flagged: highRisk,
  });
});

/* =========================
   HEALTH CHECK
   ========================= */
app.get('/', (req, res) => {
  res.json({ status: 'Fraud Detection API running' });
});

/* =========================
   SOCKET.IO SERVER
   ========================= */
const server = http.createServer(app);

// 🔥 Initialize Socket.IO using your socket.js
const io = initSocket(server);

/* =========================
   FRAUD SERVICE (OPTIONAL)
   ========================= */
const fraudService = {
  isGenerating: false,
  interval: null,

  startTransactionGeneration(ms = 3000) {
    if (this.isGenerating) return;

    this.isGenerating = true;
    this.interval = setInterval(async () => {
      const txn = await Transaction.create({
        amount: Math.floor(Math.random() * 5000),
        riskScore: Math.floor(Math.random() * 100),
        isFlagged: Math.random() > 0.7,
        status: 'completed',
      });

      io.emit('newTransaction', txn);
    }, ms);
  },

  stopTransactionGeneration() {
    clearInterval(this.interval);
    this.isGenerating = false;
  },

  async getStats() {
    const total = await Transaction.countDocuments();
    const highRisk = await Transaction.countDocuments({
      riskScore: { $gte: 70 },
    });

    return {
      total,
      highRisk,
      flagged: highRisk,
    };
  },
};

// Inject fraud service into socket layer
setFraudService(fraudService);

/* =========================
   START SERVER
   ========================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
