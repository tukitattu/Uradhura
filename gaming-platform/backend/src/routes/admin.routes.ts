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
  getActiveRoundsAll,
  // new
  toggleGame,
  upsertGameOption,
  deleteGameOption,
  updateGameDurations,
  adminForceCloseRound,
  adminForceSetResult,
  adminSettle,
} from '../controllers/admin.controller';

const router = Router();
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

// Game management
router.get('/games', adminListGames);
router.put('/games/:gameId/config', updateGameConfig);
router.patch('/games/:gameId/toggle', toggleGame);
router.post('/games/:gameId/options', upsertGameOption);
router.delete('/games/:gameId/options/:optionId', deleteGameOption);
router.put('/games/:gameId/durations', updateGameDurations);

// Live round monitor
router.get('/rounds/active', getActiveRoundsAll);

// Round force controls
router.post('/rounds/:roundId/force-close', adminForceCloseRound);
router.post('/rounds/:roundId/force-result', adminForceSetResult);
router.post('/rounds/:roundId/force-settle', adminSettle);

export default router;
