import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';

const router = Router();

router.get('/', getProfile);
router.put('/', updateProfile);

export default router;
