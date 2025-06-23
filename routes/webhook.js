// routes/webhook.js - FIXED VERSION
import express from 'express';
import { handlePaystackWebhook } from '../controllers/paystackWebhook.js';

const router = express.Router();

// Paystack webhook endpoint with proper raw body handling
router.post('/paystack', 
  express.raw({ type: 'application/json' }), 
  (req, res, next) => {
    console.log('🔍 Raw body type:', typeof req.body);
    console.log('🔍 Raw body constructor:', req.body.constructor.name);
    
    // Store raw body as string for signature verification
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body.toString('utf8');
      console.log('✅ Raw body stored (from Buffer):', req.rawBody.substring(0, 100) + '...');
    } else if (typeof req.body === 'string') {
      req.rawBody = req.body;
      console.log('✅ Raw body stored (from String):', req.rawBody.substring(0, 100) + '...');
    } else {
      console.log('⚠️ Unexpected body type, attempting toString()');
      req.rawBody = req.body.toString();
    }
    
    // Parse JSON for easier processing
    try {
      if (typeof req.body === 'string') {
        req.body = JSON.parse(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString('utf8'));
      } else {
        // Body might already be parsed
        console.log('📋 Body already appears to be an object');
      }
      
      console.log('✅ JSON parsed successfully');
      console.log('📦 Event:', req.body.event);
      
      next();
    } catch (error) {
      console.error('💥 JSON parsing error:', error);
      console.error('📄 Raw body that failed to parse:', req.rawBody);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  },
  handlePaystackWebhook
);

export default router;