import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// In-memory token store for logout (in production, use Redis or database)
const invalidatedTokens = new Set();

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    
    // Check if token is invalidated
    if (invalidatedTokens.has(token)) {
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

    // Add user to request object - INCLUDE ROLE
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role // This was missing!
    };
    
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Authentication error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify token endpoint for frontend auth service
 */
export const verify = async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Check if token is invalidated
    if (invalidatedTokens.has(token)) {
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

    // Return user data (matching frontend expectations) - INCLUDE ROLE
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role // Include role in response too
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
 * Add token to invalidated list
 */
export const invalidateToken = (token) => {
  invalidatedTokens.add(token);
};

/**
 * Check if token is invalidated
 */
export const isTokenInvalidated = (token) => {
  return invalidatedTokens.has(token);
};