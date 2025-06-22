// routes/webhook.js
import express from 'express';
import { handlePaystackWebhook } from '../controllers/paystackWebhook.js';

const router = express.Router();

// Paystack webhook endpoint
// Important: This should NOT have authentication middleware
// Use express.raw to get the raw body for signature verification
router.post('/paystack', 
  express.raw({ type: 'application/json' }), 
  (req, res, next) => {
    // Convert raw body back to JSON for processing
    try {
      req.body = JSON.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  },
  handlePaystackWebhook
);

export default router;