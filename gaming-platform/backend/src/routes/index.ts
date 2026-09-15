import { Router } from 'express';
import authRoutes from './auth.routes';
import gameRoutes from './game.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/admin', adminRoutes);

export default router;
