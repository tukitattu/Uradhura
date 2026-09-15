'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game } from '@/lib/api';
import GameLayout, { CountdownTimer, BetDenominations, StatusBanner } from '@/components/games/GameLayout';
import BettingWheel from '@/components/games/BettingWheel';
import BetHistory from '@/components/games/BetHistory';
import Button from '@/components/ui/Button';
import { cn, formatTokens } from '@/lib/utils';
import { RefreshCw, History, BarChart2 } from 'lucide-react';

export default function GreedyPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number } | null>(null);
  const [autoBet, setAutoBet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !player) router.push('/login');
  }, [player, loading, router]);

  useEffect(() => {
    gamesApi.get('greedy').then(setGame).catch(() => {});
  }, []);

  const { round, totals, countdown, betting, lastWinner, placeBet } = useRound({
    gameId: game?.id || '',
  });

  // Reset on new round
  useEffect(() => {
    if (round?.status === 'BETTING_OPEN' && myBetThisRound !== round.id) {
      setBetResult(null);
      if (!autoBet) setSelectedOption(null);
    }
  }, [round?.id, round?.status]);

  // Auto-settle notification
  useEffect(() => {
    if (round?.status === 'SETTLED' && round.winnerId && myBetThisRound === round.id) {
      const didWin = selectedOption === round.winnerId;
      const option = game?.options.find((o) => o.id === round.winnerId);
      const payout = didWin ? betAmount * (option?.multiplier || 1) : 0;
      setBetResult({ won: didWin, payout });
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handleBet() {
    if (!selectedOption || !round) return;
    try {
      await placeBet(selectedOption, betAmount);
      setMyBetThisRound(round.id);
      await refreshBalance();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  }

  // Auto-bet trigger
  useEffect(() => {
    if (autoBet && round?.status === 'BETTING_OPEN' && selectedOption && myBetThisRound !== round.id) {
      handleBet();
    }
  }, [round?.id, round?.status, autoBet]);

  const winnerOption = game?.options.find((o) => o.id === round?.winnerId);
  const canBet = round?.status === 'BETTING_OPEN' && selectedOption && !betting && myBetThisRound !== round?.id;
  const balance = player?.balance ?? 0;

  if (!player || !game) return null;

  return (
    <GameLayout title="Greedy" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1">
        {/* Main game area */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Status banner */}
          {round && (
            <StatusBanner
              status={round.status}
              winnerId={round.winnerId}
              winnerLabel={winnerOption?.label}
            />
          )}

          {/* Result overlay */}
          {betResult && (
            <div className={cn(
              'w-full rounded-xl p-4 text-center border result-pop',
              betResult.won ? 'bg-game-green/20 border-game-green text-game-green' : 'bg-game-red/20 border-game-red text-game-red'
            )}>
              <div className="text-3xl font-black">
                {betResult.won ? `🏆 WON! +${formatTokens(betResult.payout!)}` : '💔 Better luck next round!'}
              </div>
              {betResult.won && <div className="text-sm mt-1">Winner: {winnerOption?.label}</div>}
            </div>
          )}

          {/* Wheel */}
          <div className="relative">
            <BettingWheel
              options={game.options}
              totals={totals}
              selectedOptionId={selectedOption}
              onSelect={setSelectedOption}
              disabled={round?.status !== 'BETTING_OPEN' || myBetThisRound === round?.id}
              winnerId={round?.status === 'SETTLED' ? round.winnerId : null}
              spinning={round?.status === 'RESULT_PROCESSING'}
              centerEmoji="🐷"
              centerLabel="GREEDY"
            />
          </div>

          {/* Countdown */}
          {round && (
            <div className="w-full max-w-[300px]">
              <CountdownTimer seconds={countdown} status={round.status} />
            </div>
          )}

          {/* Bet controls */}
          <div className="w-full max-w-[400px] bg-game-card border border-game-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Bet Amount</span>
              <span className="text-sm font-bold text-game-gold">🪙 {formatTokens(betAmount)}</span>
            </div>

            <BetDenominations
              selected={betAmount}
              onSelect={setBetAmount}
              disabled={round?.status !== 'BETTING_OPEN'}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleBet}
                disabled={!canBet}
                loading={betting}
                variant="gold"
                className="flex-1"
                size="lg"
              >
                {myBetThisRound === round?.id ? '✓ Bet Placed' : selectedOption ? `Bet on ${game.options.find(o => o.id === selectedOption)?.label}` : 'Select an option'}
              </Button>
              <Button
                onClick={() => setAutoBet(!autoBet)}
                variant={autoBet ? 'primary' : 'secondary'}
                size="lg"
              >
                <RefreshCw size={16} className={autoBet ? 'animate-spin' : ''} />
                Auto
              </Button>
            </div>

            {selectedOption && (
              <p className="text-xs text-center text-gray-400">
                Potential win: 🪙 {formatTokens(betAmount * (game.options.find(o => o.id === selectedOption)?.multiplier || 1))}
              </p>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-72 space-y-3">
          {/* Round stats */}
          <div className="bg-game-card border border-game-border rounded-xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><BarChart2 size={16} /> Round Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Total Pool</span><span className="font-bold">🪙 {formatTokens(round?.totalBetAmount || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Round #</span><span className="font-bold">{round?.roundNumber || '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Balance</span><span className="font-bold text-game-gold">{formatTokens(balance)}</span></div>
            </div>
          </div>

          {/* Option totals */}
          <div className="bg-game-card border border-game-border rounded-xl p-4">
            <h3 className="font-bold mb-3">Current Bets</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {totals.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 8).map((t) => {
                const option = game.options.find((o) => o.id === t.optionId);
                const pct = round?.totalBetAmount ? (t.totalAmount / round.totalBetAmount) * 100 : 0;
                return (
                  <div key={t.optionId} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: option?.colorHex || '#ccc' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs">
                        <span className="truncate text-gray-300">{t.label}</span>
                        <span className="text-gray-400">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1 bg-game-border rounded-full overflow-hidden mt-0.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: option?.colorHex || '#fff' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {totals.length === 0 && <p className="text-xs text-gray-500">No bets yet</p>}
            </div>
          </div>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <History size={14} /> {showHistory ? 'Hide' : 'Show'} My History
          </button>
          {showHistory && (
            <div className="bg-game-card border border-game-border rounded-xl p-4">
              <BetHistory gameId={game.id} compact />
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
