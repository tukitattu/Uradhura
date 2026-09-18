import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getVideoCallToken } from '../controllers/videocall.controller';

const router = Router();
// Only admins with VideoCallAccess can get a token
router.get('/token', authenticate, requireAdmin, getVideoCallToken);
export default router;
