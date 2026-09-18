import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  grantAdminPermission,
  revokeAdminPermission,
  getAdminPermissionsList,
  grantPresetPermissions,
  checkMyPermission,
  listPermissionPresets,
} from '../controllers/permission.controller';

const router = Router();

// Admin: check own permission
router.get('/check', authenticate, checkMyPermission);
router.get('/presets', authenticate, listPermissionPresets);

// Superadmin only
router.use(authenticate, requireSuperAdmin);

router.post('/grant', grantAdminPermission);
router.delete('/:adminId/:permission', revokeAdminPermission);
router.get('/:adminId', getAdminPermissionsList);
router.post('/preset', grantPresetPermissions);

export default router;
