import express from 'express';
import { handlePaystackWebhook } from '../controllers/paystackWebhook.js';

const router = express.Router();

// The Paystack webhook endpoint. The full path will be /webhook/
// The raw body is handled by the middleware in server.js, so we just call the controller.
router.post('/', handlePaystackWebhook);

export default router;