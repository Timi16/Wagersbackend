import express from 'express';
import { handlePaystackWebhook } from '../controllers/paystackWebhook.js';

const router = express.Router();

// Paystack webhook endpoint
// Important: This should NOT have authentication middleware
router.post('/paystack', 
  express.raw({ type: 'application/json' }), 
  (req, res, next) => {
    // Store raw body for signature verification
    req.rawBody = req.body.toString('utf8');
    
    // Convert raw body to JSON for processing
    try {
      req.body = JSON.parse(req.rawBody);
      next();
    } catch (error) {
      console.error('JSON parsing error:', error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  },
  handlePaystackWebhook
);

export default router;
