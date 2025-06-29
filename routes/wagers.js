import express from 'express';
import { 
  createWager, 
  getWagers, 
  getWager, 
  updateWager, 
  deleteWager, 
  getWagersByCategory,
  resolveWager
} from '../controllers/wagerController.js';
import { placeBet } from '../controllers/betController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getWagers);
router.get('/category/:category', getWagersByCategory);
router.get('/:id(\\d+)', getWager);

// Protected routes
router.post('/', authenticateToken, createWager);
router.put('/:id(\\d+)', authenticateToken, updateWager);
router.delete('/:id(\\d+)', authenticateToken, deleteWager);
router.post('/:id(\\d+)/bet', authenticateToken, placeBet);
router.post('/:id(\\d+)/resolve', authenticateToken, resolveWager);

export default router;