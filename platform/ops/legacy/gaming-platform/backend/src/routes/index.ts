import { Router } from 'express';
import authRoutes from './auth.routes';
import gameRoutes from './game.routes';
import adminRoutes from './admin.routes';
import superadminRoutes from './superadmin.routes';
import socialRoutes from './social.routes';
import adminAuthorizationRoutes from './admin-authorization.routes';
import videoCallRoutes from './videocall.routes';
import paymentRoutes from './payment.routes';
import paymentCustomRoutes from './payment-custom.routes';
import supportRoutes from './support.routes';
import permissionRoutes from './permission.routes';
import settingsRoutes from './settings.routes';

const router = Router();
router.use('/auth',       authRoutes);
router.use('/games',      gameRoutes);
router.use('/admin',      adminRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/admin-authorization', adminAuthorizationRoutes);
router.use('/social', socialRoutes);
router.use('/video', videoCallRoutes);
router.use('/payments', paymentRoutes);
router.use('/payments/custom', paymentCustomRoutes);
router.use('/support', supportRoutes);
router.use('/permissions', permissionRoutes);
router.use('/settings', settingsRoutes);

export default router;
