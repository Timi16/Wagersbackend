import express from 'express';
import { signup, signin, signout, verifyToken,getProfile,setAdmin,getBalance } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/signout', signout);
router.get("/profile",authenticateToken, getProfile);

// Token verification route (used by frontend auth service)
router.get('/verify', verifyToken);
router.post('/set-admin',setAdmin)
router.get('/balance', authenticateToken, getBalance);
// Example of protected route using the middleware
// router.get('/profile', authenticateToken, (req, res) => {
//   res.json({ message: 'Protected route', user: req.user });
// });

export default router;