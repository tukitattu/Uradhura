import { Router } from 'express';
import authRoutes from './auth.routes';
import gameRoutes from './game.routes';
import adminRoutes from './admin.routes';
import superadminRoutes from './superadmin.routes';
import socialRoutes from './social.routes';
import adminAuthorizationRoutes from './admin-authorization.routes';

const router = Router();
router.use('/auth',       authRoutes);
router.use('/games',      gameRoutes);
router.use('/admin',      adminRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/admin-authorization', adminAuthorizationRoutes);
router.use('/social', socialRoutes);

export default router;
