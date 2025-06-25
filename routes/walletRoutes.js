import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

/**
 * Fetch all transactions for the authenticated user
 * GET /api/wallet/transactions
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id },
      order: [['date', 'DESC']], // Most recent first
    });
    res.status(200).json(transactions);
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;