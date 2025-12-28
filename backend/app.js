require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ============ EMERGENCY CORS FIX ============
app.use((req, res, next) => {
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB Connected');
  createDefaultUsers();
})
.catch(err => console.log('MongoDB Error:', err.message));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'viewer' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createDefaultUsers() {
  try {
    const users = [
      { name: 'Admin User', email: 'admin@fraud.com', password: 'admin123', role: 'admin' },
      { name: 'Viewer User', email: 'viewer@fraud.com', password: 'viewer123', role: 'viewer' }
    ];
    
    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        });
        await user.save();
        console.log(`Created user: ${userData.email}`);
      }
    }
  } catch (error) {
    console.log('User creation error:', error.message);
  }
}

// ============ LOGIN ENDPOINT ============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        hint: 'Try: admin@fraud.com / admin123'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        hint: 'Try: admin@fraud.com / admin123'
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
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
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ OTHER ENDPOINTS ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'Fraud Detection API',
    status: 'online',
    login: 'POST /api/auth/login'
  });
});

app.get('/api/cors-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CORS working',
    origin: req.headers.origin 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
