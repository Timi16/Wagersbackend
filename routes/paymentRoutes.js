// paymentRoutes.js
import express from 'express';
import { withdraw } from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/withdraw', authenticateToken, withdraw);

export default router;
