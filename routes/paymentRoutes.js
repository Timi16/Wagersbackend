// paymentRoutes.js
import express from 'express';
import { 
  getBanks, 
  withdraw, 
  getPaystackBalance, 
  initiateSettlement, 
  getSettlementHistory, 
  getDetailedBalance 
} from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.post('/withdraw', authenticateToken, withdraw);
router.get('/banks', getBanks);

// Admin routes (add proper admin middleware if needed)
router.get('/admin/balance', authenticateToken, getPaystackBalance);
router.get('/admin/detailed-balance', authenticateToken, getDetailedBalance);
router.post('/admin/settle', authenticateToken, initiateSettlement);
router.get('/admin/settlements', authenticateToken, getSettlementHistory);

export default router;