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
} from '../controllers/game.controller';

const router = Router();

// Public game info
router.get('/', listGames);
router.get('/:slug', getGame);

// Round management (player reads, admin writes)
router.get('/:gameId/round', authenticate, getActiveRound);
router.get('/:gameId/history', authenticate, getHistory);
router.post('/:gameId/round', authenticate, requireAdmin, startRound);
router.post('/rounds/:roundId/close-betting', authenticate, requireAdmin, closeRoundBetting);
router.post('/rounds/:roundId/result', authenticate, requireAdmin, processRoundResult);
router.post('/rounds/:roundId/settle', authenticate, requireAdmin, triggerSettlement);
router.get('/rounds/:roundId/totals', authenticate, getRoundOptionTotals);

// Bets
router.post('/bets', authenticate, submitBet);
router.get('/player/bets', authenticate, getMyBets);

// Wallet
router.get('/player/wallet', authenticate, getWallet);

export default router;
