import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  listGames,
  getGame,
  getActiveRound,
  startRound,
  closeRoundBetting,
  processRoundResult,
  triggerSettlement,
  getHistory,
  submitBet,
  getMyBets,
  getRoundOptionTotals,
  getWallet,
  getPublicPackages,
  demoTopUp,
} from '../controllers/game.controller';

const router = Router();

// Specific sub-routes FIRST to avoid /:slug swallowing them
router.get('/rounds/:roundId/totals', authenticate, getRoundOptionTotals);
router.post('/rounds/:roundId/close-betting', authenticate, requireAdmin, closeRoundBetting);
router.post('/rounds/:roundId/result', authenticate, requireAdmin, processRoundResult);
router.post('/rounds/:roundId/settle', authenticate, requireAdmin, triggerSettlement);
router.post('/bets', authenticate, submitBet);
router.get('/player/bets', authenticate, getMyBets);
router.get('/player/wallet', authenticate, getWallet);
router.get('/player/packages', getPublicPackages);
router.post('/player/topup', authenticate, demoTopUp);

// Public game info
router.get('/', listGames);

// Round management (player reads, admin writes)
router.get('/:gameId/round', authenticate, getActiveRound);
router.get('/:gameId/history', authenticate, getHistory);
router.post('/:gameId/round', authenticate, requireAdmin, startRound);

// Wildcard LAST — must come after all specific routes
router.get('/:slug', getGame);

export default router;
