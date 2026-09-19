import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  getDesignTokens, upsertDesignToken, bulkUpsertTokens, deleteDesignToken,
  getGameBrandings, upsertGameBranding,
  getFeatureFlags, upsertFeatureFlag, deleteFeatureFlag,
  getPlatformStats,
  // Account management
  listAdminAccounts, createAccount, setPlayerRole, setPlayerStatus,
  approveAdminRequest, rejectAdminRequest, listAdminRequests,
  // Game CRUD
  createGame, deleteGame, updateGameSortOrder,
  getGameDenominations, upsertGameDenominations,
  listGamePackages, upsertGamePackage, deleteGamePackage,
  // Health
  getServiceHealth, getHealthHistory,
  // Payment
  listPaymentConfigs, upsertPaymentConfig, listPaymentOrders,
  // Video call
  listVideoCallAccess, grantVideoCallAccess, revokeVideoCallAccess,
} from '../controllers/superadmin.controller';

const router = Router();
router.use(authenticate, requireSuperAdmin);

// Design system
router.get('/design-tokens', getDesignTokens);
router.post('/design-tokens', upsertDesignToken);
router.post('/design-tokens/bulk', bulkUpsertTokens);
router.delete('/design-tokens/:id', deleteDesignToken);

// Game branding
router.get('/game-branding', getGameBrandings);
router.put('/game-branding/:gameSlug', upsertGameBranding);

// Feature flags
router.get('/feature-flags', getFeatureFlags);
router.post('/feature-flags', upsertFeatureFlag);
router.delete('/feature-flags/:id', deleteFeatureFlag);

// Stats
router.get('/stats', getPlatformStats);

// Account management
router.get('/accounts', listAdminAccounts);
router.post('/accounts', createAccount);
router.patch('/accounts/:playerId/role', setPlayerRole);
router.patch('/accounts/:playerId/status', setPlayerStatus);
router.get('/admin-requests', listAdminRequests);
router.post('/admin-requests/:requestId/approve', approveAdminRequest);
router.post('/admin-requests/:requestId/reject', rejectAdminRequest);

// Game CRUD
router.post('/games', createGame);
router.delete('/games/:gameId', deleteGame);
router.patch('/games/:gameId/sort-order', updateGameSortOrder);
router.get('/games/:gameId/denominations', getGameDenominations);
router.put('/games/:gameId/denominations', upsertGameDenominations);
router.get('/games/:gameId/packages', listGamePackages);
router.post('/games/:gameId/packages', upsertGamePackage);
router.delete('/games/:gameId/packages/:packageId', deleteGamePackage);

// Health
router.get('/health', getServiceHealth);
router.get('/health/history', getHealthHistory);

// Payment
router.get('/payment-configs', listPaymentConfigs);
router.post('/payment-configs', upsertPaymentConfig);
router.get('/payment-orders', listPaymentOrders);

// Video call
router.get('/video-access', listVideoCallAccess);
router.post('/video-access', grantVideoCallAccess);
router.delete('/video-access/:playerId', revokeVideoCallAccess);

export default router;
