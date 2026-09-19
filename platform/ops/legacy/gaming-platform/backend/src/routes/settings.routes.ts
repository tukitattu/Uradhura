import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAllSettings,
  getSettingsByCategory,
  updateSettings,
  resetSettings,
} from '../controllers/settings.controller';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', getAllSettings);
router.get('/:category', getSettingsByCategory);
router.put('/', updateSettings);
router.post('/reset', resetSettings);

export default router;
