
import { Router } from 'express';
import { signup } from '../controllers/authController.js';
import bodyParser from 'body-parser';

const router = Router();
router.use(bodyParser.json());

// POST /api/auth/signup
router.post('/signup', signup);

export default router;