import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  getDesignTokens, upsertDesignToken, bulkUpsertTokens, deleteDesignToken,
  getGameBrandings, upsertGameBranding,
  getFeatureFlags, upsertFeatureFlag, deleteFeatureFlag,
  getPlatformStats,
} from '../controllers/superadmin.controller';

const router = Router();
router.use(authenticate, requireSuperAdmin);

// Design system
router.get('/design-tokens',            getDesignTokens);
router.post('/design-tokens',           upsertDesignToken);
router.post('/design-tokens/bulk',      bulkUpsertTokens);
router.delete('/design-tokens/:id',     deleteDesignToken);

// Game branding
router.get('/game-branding',            getGameBrandings);
router.put('/game-branding/:gameSlug',  upsertGameBranding);

// Feature flags
router.get('/feature-flags',            getFeatureFlags);
router.post('/feature-flags',           upsertFeatureFlag);
router.delete('/feature-flags/:id',     deleteFeatureFlag);

// Stats
router.get('/stats',                    getPlatformStats);

export default router;
