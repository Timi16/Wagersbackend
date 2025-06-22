// routes/wagers.js
import express from 'express';
import { 
  createWager, 
  getWagers, 
  getWager, 
  updateWager, 
  deleteWager, 
  getWagersByCategory 
} from '../controllers/wagerController.js';
import { placeBet } from '../controllers/betController.js'; // Add this
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getWagers);
router.get('/category/:category', getWagersByCategory);
router.get('/:id', getWager);

// Protected routes
router.post('/', authenticateToken, createWager);
router.put('/:id', authenticateToken, updateWager);
router.delete('/:id', authenticateToken, deleteWager);
router.post('/:id/bet', authenticateToken, placeBet); // Add this

export default router;