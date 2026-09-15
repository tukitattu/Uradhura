import { Router } from 'express';
import authRoutes from './auth.routes';
import gameRoutes from './game.routes';
import adminRoutes from './admin.routes';
import superadminRoutes from './superadmin.routes';

const router = Router();
router.use('/auth',       authRoutes);
router.use('/games',      gameRoutes);
router.use('/admin',      adminRoutes);
router.use('/superadmin', superadminRoutes);

export default router;
