const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// Import models
const Admin = require('./models/Admin');
const ContentCreator = require('./models/ContentCreator');
const { upload } = require('./config/cloudinary');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Admin Signup route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists with this email' });
    }

    const newAdmin = new Admin({ email, password });
    await newAdmin.save();

    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Admin Login route to get JWT
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '1h' }
    );
    
    res.json({ token, message: 'Logged in successfully' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Add New Content Creator (Protected Route with Multiple Image Uploads)
app.post('/api/creators', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const { name } = req.body;
    let following = {};
    
    if (req.body.following) {
      try {
        // following might be sent as a JSON string in FormData
        following = typeof req.body.following === 'string' ? JSON.parse(req.body.following) : req.body.following;
      } catch (err) {
        console.warn('Could not parse following data', err);
      }
    }

    if (!name) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required.' });
    }

    // Extract Cloudinary URLs from multer-storage-cloudinary
    const imageUrls = req.files.map(file => file.path);

    const newCreator = new ContentCreator({
      name,
      images: imageUrls,
      following
    });

    await newCreator.save();
    res.status(201).json({ message: 'Content creator added successfully', creator: newCreator });
  } catch (error) {
    console.error('Error adding creator:', error);
    res.status(500).json({ message: 'Server error while adding content creator' });
  }
});

// Protected Dashboard route
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  res.json({
    message: 'Welcome to the Admin Dashboard',
    user: req.user,
    stats: {
      totalUsers: 150,
      activeSubscriptions: 42,
      revenue: 5000
    }
  });
});

// Health check route
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', dbConnected: mongoose.connection.readyState === 1 });
});

// Database connection
const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('No DATABASE_URL provided. Running without database connection.');
      return;
    }
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
