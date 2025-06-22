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
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getWagers);
router.get('/category/:category', getWagersByCategory);
router.get('/:id', getWager);

// Protected routes (require authentication)
router.post('/', authenticateToken, createWager);
router.put('/:id', authenticateToken, updateWager);
router.delete('/:id', authenticateToken, deleteWager);

export default router;