import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch'; // Make sure to install node-fetch
import { paystackConfig, getPaystackHeaders } from '../config/paystack.js'; // Adjust path as needed
import { invalidateToken } from '../middleware/authMiddleware.js';

/**
 * Sign up a new user and create Paystack customer + virtual account
 */
export const signup = async (req, res) => {
  const { username, email, password } = req.body;

  // Generate lastName from first 5 characters of email
  const lastName = email.split('@')[0].substring(0, 5) || 'User';

  // Generate random Nigerian phone number
  const generateRandomPhone = () => {
    const prefixes = ['070', '080', '090', '081', '071', '091'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    // Generate 8 random digits for the remaining part
    let remainingDigits = '';
    for (let i = 0; i < 8; i++) {
      remainingDigits += Math.floor(Math.random() * 10);
    }
    
    return randomPrefix + remainingDigits;
  };

  const phoneNumber = generateRandomPhone();

  try {
    // Create user in database
    const user = await User.create({ username, email, password });

    // Create Paystack customer with generated lastName and phone number
    const customerResponse = await fetch('https://api.paystack.co/customer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        first_name: username, // Using username as first name
        last_name: lastName,
        phone: phoneNumber, // Add the generated phone number
      }),
    });
    const customerData = await customerResponse.json();
    if (!customerData.status) {
      throw new Error(`Failed to create Paystack customer: ${customerData.message}`);
    }
    const customerCode = customerData.data.customer_code;

    // Create dedicated virtual account
    const dvaResponse = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerCode,
      }),
    });
    const dvaData = await dvaResponse.json();
    if (!dvaData.status) {
      throw new Error(`Failed to create dedicated virtual account: ${dvaData.message}`);
    }

    // Extract virtual account details
    const virtualAccountNumber = dvaData.data.account_number;
    const virtualAccountBank = dvaData.data.bank.name;
    const virtualAccountName = dvaData.data.account_name;

    // Update user with Paystack customer code and virtual account details
    await user.update({
      paystackCustomerCode: customerCode,
      virtualAccountNumber: virtualAccountNumber,
      virtualAccountBank: virtualAccountBank,
      virtualAccountName: virtualAccountName,
    });

    // Send success response
    return res.status(201).json({
      message: 'Signup successful',
      user: { 
        id: user.id, 
        username, 
        email, 
        customerCode,
        virtualAccountNumber,
        virtualAccountBank,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: `Server error: ${err.message}` });
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

export const getProfile = async (req, res) => {
  try {
    const user = req.user; 
    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      virtualAccount: {
        accountNumber: user.virtualAccountNumber,
        bankName: user.virtualAccountBank,
        accountName: user.virtualAccountName,
      },
    });
  } catch (err) {
    console.error('Get profile error:', err);
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
export const setAdmin = async (req, res) => {
  const { userId } = req.body;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  await user.update({ role: "admin" });
  res.status(200).json({ message: "User set as admin" });
};

export const getBalance = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ balance: user.balance });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};