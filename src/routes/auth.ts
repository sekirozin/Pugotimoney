import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/sso', authController.sso);
router.get('/me', authMiddleware, authController.me);

export default router;
