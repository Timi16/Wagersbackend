import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { invalidateToken } from '../middleware/authMiddleware.js';

/**
 * Sign up a new user
 */
export const signup = async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required: username, email, password' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    const user = await User.create({ username, email, password });
    
    // Generate JWT token with 7 days expiration
    const secret = process.env.JWT_SECRET || 'mysecretkey';
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
    
    // Return user details with token
    return res.status(201).json({ 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      token 
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Sign in existing user
 */
export const signin = async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password (assuming your User model hashes passwords)
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token with 7 days expiration
    const secret = process.env.JWT_SECRET || 'mysecretkey';
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
    
    // Return user details with token (matching frontend expectations)
    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (err) {
    console.error('Sign in error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify token - handles the /api/auth/verify route that your frontend calls
 */
export const verifyToken = async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Check if token is invalidated
    const { isTokenInvalidated } = await import('../middleware/authMiddleware.js');
    if (isTokenInvalidated(token)) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    // Verify JWT token
    const secret = process.env.JWT_SECRET || 'mysecretkey';
    const decoded = jwt.verify(token, secret);
    
    // Get user from database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Return user data (matching frontend expectations)
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Token verification error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Sign out user
 */
export const signout = async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Add token to invalidated list using middleware function
      invalidateToken(token);
      
      console.log('Token invalidated for signout');
    }
    
    // Return success response
    return res.status(200).json({ message: 'Signed out successfully' });
  } catch (err) {
    console.error('Sign out error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};