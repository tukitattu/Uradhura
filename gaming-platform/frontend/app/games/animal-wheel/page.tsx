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
import { Badge } from '@/components/ui/Badge';
import { cn, formatTokens, formatMultiplier } from '@/lib/utils';
import { Flame, TrendingUp, History } from 'lucide-react';

export default function AnimalWheelPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number; winnerLabel?: string } | null>(null);
  const [autoBet, setAutoBet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !player) router.push('/login');
  }, [player, loading, router]);

  useEffect(() => {
    gamesApi.get('animal-wheel').then(setGame).catch(() => {});
  }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({
    gameId: game?.id || '',
  });

  useEffect(() => {
    if (round?.status === 'BETTING_OPEN') {
      setBetResult(null);
      if (!autoBet) setSelectedOption(null);
    }
  }, [round?.id]);

  useEffect(() => {
    if (round?.status === 'SETTLED' && round.winnerId) {
      const option = game?.options.find((o) => o.id === round.winnerId);
      if (option) {
        setRecentResults((prev) => [option.label, ...prev].slice(0, 10));
      }
      if (myBetThisRound === round.id) {
        const didWin = selectedOption === round.winnerId;
        const payout = didWin ? betAmount * (option?.multiplier || 1) : 0;
        setBetResult({ won: didWin, payout, winnerLabel: option?.label });
        refreshBalance();
      }
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

  useEffect(() => {
    if (autoBet && round?.status === 'BETTING_OPEN' && selectedOption && myBetThisRound !== round.id) {
      handleBet();
    }
  }, [round?.id, round?.status, autoBet]);

  const balance = player?.balance ?? 0;
  const winnerOption = game?.options.find((o) => o.id === round?.winnerId);
  const canBet = round?.status === 'BETTING_OPEN' && selectedOption && !betting && myBetThisRound !== round?.id;

  if (!player || !game) return null;

  return (
    <GameLayout title="Animal Wheel" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1">
        <div className="flex-1 flex flex-col items-center gap-4">
          {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={winnerOption?.label} />}

          {betResult && (
            <div className={cn('w-full rounded-xl p-4 text-center border result-pop',
              betResult.won ? 'bg-game-green/20 border-game-green text-game-green' : 'bg-game-red/20 border-game-red text-game-red')}>
              <div className="text-3xl font-black">
                {betResult.won ? `🏆 WON! +${formatTokens(betResult.payout!)}` : '💔 Try again!'}
              </div>
              <div className="text-sm mt-1">Winner: {betResult.winnerLabel}</div>
            </div>
          )}

          {/* Recent results strip */}
          {recentResults.length > 0 && (
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-gray-400 shrink-0">Recent:</span>
              <div className="flex gap-1 overflow-x-auto">
                {recentResults.map((r, i) => (
                  <span key={i} className="shrink-0 text-xs bg-game-card border border-game-border rounded px-2 py-0.5">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          <BettingWheel
            options={game.options}
            totals={totals}
            selectedOptionId={selectedOption}
            onSelect={setSelectedOption}
            disabled={round?.status !== 'BETTING_OPEN' || myBetThisRound === round?.id}
            winnerId={round?.status === 'SETTLED' ? round.winnerId : null}
            spinning={round?.status === 'RESULT_PROCESSING'}
            centerEmoji="🐾"
            centerLabel="WILD"
          />

          {round && (
            <div className="w-full max-w-[300px]">
              <CountdownTimer seconds={countdown} status={round.status} />
            </div>
          )}

          {/* Bet controls */}
          <div className="w-full max-w-[400px] bg-game-card border border-game-border rounded-xl p-4 space-y-3">
            <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={round?.status !== 'BETTING_OPEN'} />
            <div className="flex gap-2">
              <Button onClick={handleBet} disabled={!canBet} loading={betting} variant="gold" className="flex-1" size="lg">
                {myBetThisRound === round?.id ? '✓ Bet Placed' : selectedOption ? `Bet ${formatTokens(betAmount)}` : 'Select option'}
              </Button>
              <Button onClick={() => setAutoBet(!autoBet)} variant={autoBet ? 'primary' : 'secondary'} size="lg">
                Auto {autoBet ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Side */}
        <div className="w-full lg:w-72 space-y-3">
          {/* Hot options */}
          <div className="bg-game-card border border-game-border rounded-xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Flame size={16} className="text-orange-400" /> Hot Options</h3>
            <div className="space-y-2">
              {game.options.filter(o => o.isHot).map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOption(o.id)}
                  className={cn('w-full flex items-center justify-between p-2 rounded-lg border transition-all',
                    selectedOption === o.id ? 'border-game-gold bg-game-gold/10' : 'border-game-border hover:border-game-gold/30')}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: o.colorHex }} />
                    <span className="text-sm font-medium">{o.label}</span>
                    <Badge variant="hot">HOT</Badge>
                  </div>
                  <span className="text-sm font-bold text-game-gold">{formatMultiplier(o.multiplier)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Today's earnings */}
          <div className="bg-game-card border border-game-border rounded-xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} /> Today&apos;s Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Balance</span><span className="font-bold text-game-gold">🪙 {formatTokens(balance)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Pool</span><span className="font-bold">🪙 {formatTokens(round?.totalBetAmount || 0)}</span></div>
            </div>
          </div>

          <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <History size={14} /> {showHistory ? 'Hide' : 'Show'} History
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
