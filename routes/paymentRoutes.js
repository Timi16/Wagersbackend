// paymentRoutes.js
import express from 'express';
import { getBanks, withdraw } from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/withdraw', authenticateToken, withdraw);
router.get('/banks', getBanks);

export default router;
