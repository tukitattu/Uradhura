'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game } from '@/lib/api';
import GameLayout, { CountdownTimer, BetDenominations, StatusBanner } from '@/components/games/GameLayout';
import BetHistory from '@/components/games/BetHistory';
import Button from '@/components/ui/Button';
import { cn, formatTokens, formatMultiplier } from '@/lib/utils';
import { History, Gift } from 'lucide-react';

// Each bag shows a question mark until the round settles, then reveals the multiplier.
function LuckBag({
  label,
  multiplier,
  colorHex,
  isSelected,
  isWinner,
  revealed,
  disabled,
  onClick,
}: {
  label: string;
  multiplier: number;
  colorHex: string;
  isSelected: boolean;
  isWinner: boolean;
  revealed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
        isWinner  && 'scale-110 border-[#ffd700] bg-[rgba(255,215,0,0.1)]',
        isSelected && !isWinner && 'border-[rgba(255,31,166,0.7)] bg-[rgba(255,31,166,0.08)]',
        !isSelected && !isWinner && 'border-[rgba(61,17,85,0.6)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,31,166,0.4)]',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      style={isWinner ? { boxShadow: `0 0 24px ${colorHex}66` } : undefined}
    >
      {/* Bag icon */}
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500',
          revealed ? 'scale-110' : '',
        )}
        style={{ background: `${colorHex}22`, border: `2px solid ${colorHex}55` }}
      >
        {revealed ? (
          <span className="text-2xl font-black" style={{ color: colorHex }}>
            {formatMultiplier(multiplier)}
          </span>
        ) : (
          <Gift size={28} style={{ color: colorHex }} />
        )}
      </div>

      <span className="text-xs font-black text-white">{label}</span>

      {isWinner && revealed && (
        <span className="text-[10px] font-black text-[#ffd700] animate-bounce">🎉 WINNER!</span>
      )}
      {isSelected && !isWinner && (
        <span className="text-[10px] text-[rgba(255,31,166,0.8)] font-bold">Your pick</span>
      )}
    </button>
  );
}

export default function LuckBagPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('luck-bag').then(setGame).catch(() => {}); }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id || '' });

  useEffect(() => {
    if (round?.status === 'RESULT_PROCESSING') {
      // Reveal bags after a brief dramatic pause
      setTimeout(() => setRevealed(true), 800);
    }
    if (round?.status === 'BETTING_OPEN') {
      setBetResult(null);
      setRevealed(false);
      setSelectedOption(null);
    }
  }, [round?.status, round?.id]);

  useEffect(() => {
    if (round?.status === 'SETTLED' && myBetThisRound === round.id) {
      const winOpt = game?.options.find(o => o.id === round.winnerId);
      const didWin = selectedOption === round.winnerId;
      setBetResult({ won: didWin, payout: didWin ? betAmount * (winOpt?.multiplier || 1) : 0 });
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handleBet(optionId: string) {
    if (!round) return;
    if ((player?.balance ?? 0) < betAmount) { alert('Insufficient balance.'); return; }
    try {
      await placeBet(optionId, betAmount);
      setMyBetThisRound(round.id);
      setSelectedOption(optionId);
      await refreshBalance();
    } catch (err: unknown) { alert((err as Error).message); }
  }

  const canBet = round?.status === 'BETTING_OPEN' && !betting && myBetThisRound !== round?.id;
  const balance = player?.balance ?? 0;
  const winnerOption = game?.options.find(o => o.id === round?.winnerId);

  // Graceful placeholder when game not yet seeded in DB
  if (!player) return null;
  if (!game) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #3d0060 0%, #1a0028 40%, #0a0010 100%)' }}>
      <div className="text-center space-y-3">
        <div className="text-5xl">🎁</div>
        <p className="text-white font-black text-lg">Luck Bag</p>
        <p className="text-[rgba(255,255,255,0.45)] text-sm">
          This game isn&apos;t live yet — ask an admin to add it in the Games panel.
        </p>
        <button onClick={() => router.push('/games')}
          className="mt-2 text-sm text-[rgba(255,31,166,0.8)] hover:text-white underline">
          ← Back to lobby
        </button>
      </div>
    </div>
  );

  return (
    <GameLayout title={game.branding?.displayName || 'Luck Bag'} branding={game.branding} balance={balance} roundNumber={round?.roundNumber} gameSlug="luck-bag">
      <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto w-full flex-1">
        {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={winnerOption?.label}/>}

        {betResult && (
          <div className={`w-full rounded-2xl p-4 text-center border result-pop ${betResult.won ? 'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.3)]' : 'bg-[rgba(255,61,87,0.08)] border-[rgba(255,61,87,0.3)]'}`}>
            <div className={`text-2xl font-black ${betResult.won ? 'text-[#ffd700] text-glow-gold' : 'text-[#ff3d57]'}`}>
              {betResult.won ? `🎁 Lucky! +🪙${formatTokens(betResult.payout!)}` : '🎁 Unlucky — try the next bag!'}
            </div>
          </div>
        )}

        {/* Bags grid */}
        <div className="w-full">
          <p className="text-xs text-center text-[rgba(255,255,255,0.35)] mb-4 uppercase tracking-widest">
            {round?.status === 'BETTING_OPEN' ? 'Pick a lucky bag' : revealed ? 'Bags revealed!' : 'Bags being opened…'}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 justify-items-center">
            {game.options.map(option => {
              const optTotal = totals.find(t => t.optionId === option.id);
              return (
                <div key={option.id} className="flex flex-col items-center gap-1">
                  <LuckBag
                    label={option.label}
                    multiplier={option.multiplier}
                    colorHex={option.colorHex}
                    isSelected={selectedOption === option.id}
                    isWinner={revealed && round?.winnerId === option.id}
                    revealed={revealed}
                    disabled={!canBet}
                    onClick={() => canBet && handleBet(option.id)}
                  />
                  {/* Pool amount under each bag */}
                  {optTotal && optTotal.totalAmount > 0 && (
                    <span className="text-[10px] text-[rgba(255,255,255,0.3)]">
                      🪙{formatTokens(optTotal.totalAmount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {round && <div className="w-full max-w-[200px]"><CountdownTimer seconds={countdown} status={round.status}/></div>}

        <div className="w-full dl-card rounded-2xl p-4 space-y-3">
          <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={round?.status !== 'BETTING_OPEN'}/>
          {myBetThisRound === round?.id && (
            <p className="text-xs text-center text-[rgba(255,255,255,0.35)]">✓ Bet placed — waiting for reveal…</p>
          )}
        </div>

        <button onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center gap-2 text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">
          <History size={13}/> {showHistory ? 'Hide' : 'Show'} History
        </button>
        {showHistory && <div className="dl-card rounded-2xl p-4 w-full"><BetHistory gameId={game.id} compact/></div>}
      </div>
    </GameLayout>
  );
}
