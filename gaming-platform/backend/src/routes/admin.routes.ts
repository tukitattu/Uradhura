import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getDashboard,
  getProfitRiskConfig,
  saveProfitRiskConfig,
  simulateProfitScenario,
  listPlayers,
  getPlayerDetails,
  applyPlayerOverride,
  listTokenPackages,
  saveTokenPackage,
  deleteTokenPackage,
  getBetReport,
  getSettlementReport,
  getAuditLogs,
  adminListGames,
  updateGameConfig,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboard);

router.get('/profit-risk', getProfitRiskConfig);
router.post('/profit-risk', saveProfitRiskConfig);
router.post('/profit-risk/simulate', simulateProfitScenario);

router.get('/players', listPlayers);
router.get('/players/:playerId', getPlayerDetails);
router.post('/players/:playerId/override', applyPlayerOverride);

router.get('/token-packages', listTokenPackages);
router.post('/token-packages', saveTokenPackage);
router.delete('/token-packages/:id', deleteTokenPackage);

router.get('/reports/bets', getBetReport);
router.get('/reports/settlements', getSettlementReport);

router.get('/audit-logs', getAuditLogs);

router.get('/games', adminListGames);
router.put('/games/:gameId/config', updateGameConfig);

export default router;
