require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

/* =========================
   ✅ CORS FIX (RENDER ONLY)
   =========================
   - Frontend & Backend on Render
   - No cookies used
   - JWT returned in JSON
   - Safe to allow all origins
*/
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// REQUIRED for browser preflight
app.options('*', cors());

/* =========================
   MIDDLEWARE
   ========================= */
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
   USER MODEL
   ========================= */
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'viewer' },
});

const User =
  mongoose.models.User ||
  mongoose.model('User', userSchema);

/* =========================
   CREATE DEFAULT USERS
   ========================= */
async function createDefaultUsers() {
  try {
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

    for (const userData of users) {
      const existingUser = await User.findOne({
        email: userData.email,
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(
          userData.password,
          10
        );

        await User.create({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
        });

        console.log(
          `Created user: ${userData.email}`
        );
      }
    }
  } catch (error) {
    console.error(
      'User creation error:',
      error.message
    );
  }
}

/* =========================
   AUTH LOGIN
   ========================= */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        hint: 'Try admin@fraud.com / admin123',
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid email or password',
        hint: 'Try admin@fraud.com / admin123',
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/* =========================
   TEST ROUTES
   ========================= */
app.get('/', (req, res) => {
  res.json({
    message: 'Fraud Detection API',
    status: 'online',
  });
});

app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS working',
  });
});

/* =========================
   START SERVER
   ========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
