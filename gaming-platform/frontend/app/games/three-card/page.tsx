'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game } from '@/lib/api';
import GameLayout, { CountdownTimer, BetDenominations, StatusBanner } from '@/components/games/GameLayout';
import Button from '@/components/ui/Button';
import { cn, formatTokens, dealCards } from '@/lib/utils';

const POSITION_CONFIG = [
  { key: 'Red', emoji: '🔴', gradient: 'from-red-900/80 to-red-800/80', border: 'border-red-600' },
  { key: 'Blue', emoji: '🔵', gradient: 'from-blue-900/80 to-blue-800/80', border: 'border-blue-600' },
  { key: 'Green', emoji: '🟢', gradient: 'from-green-900/80 to-green-800/80', border: 'border-green-600' },
];

export default function ThreeCardPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number } | null>(null);
  const [dealtCards, setDealtCards] = useState<Record<string, string[]>>({});
  const [revealed, setRevealed] = useState(false);
  const [lastBet, setLastBet] = useState<{ optionId: string; amount: number } | null>(null);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('three-card').then(setGame).catch(() => {}); }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id || '' });

  useEffect(() => {
    if (round?.status === 'RESULT_PROCESSING' && game) {
      const cards: Record<string, string[]> = {};
      game.options.forEach((o) => { cards[o.id] = dealCards(3); });
      setDealtCards(cards);
      setTimeout(() => setRevealed(true), 600);
    } else if (round?.status === 'BETTING_OPEN') {
      setDealtCards({}); setRevealed(false); setBetResult(null);
    }
  }, [round?.status, round?.id, game]);

  useEffect(() => {
    if (round?.status === 'SETTLED' && myBetThisRound === round.id) {
      const didWin = selectedOption === round.winnerId;
      const option = game?.options.find(o => o.id === round.winnerId);
      const payout = didWin ? betAmount * (option?.multiplier || 1) : 0;
      setBetResult({ won: didWin, payout });
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handleBet(optionId?: string) {
    const oid = optionId || selectedOption;
    if (!oid || !round) return;
    try {
      await placeBet(oid, betAmount);
      setMyBetThisRound(round.id); setSelectedOption(oid);
      setLastBet({ optionId: oid, amount: betAmount });
      await refreshBalance();
    } catch (err: unknown) { alert((err as Error).message); }
  }

  const SUITS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const balance = player?.balance ?? 0;
  const canBet = round?.status === 'BETTING_OPEN' && !betting && myBetThisRound !== round?.id;
  if (!player || !game) return null;

  return (
    <GameLayout title="Three Card" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto w-full flex-1">
        {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={game.options.find(o => o.id === round.winnerId)?.label} />}
        {betResult && (
          <div className={cn('w-full rounded-xl p-4 text-center result-pop border',
            betResult.won ? 'bg-game-green/20 border-game-green text-game-green' : 'bg-game-red/20 border-game-red text-game-red')}>
            <div className="text-2xl font-black">
              {betResult.won ? `🎴 You Won! +${formatTokens(betResult.payout!)}` : '🎴 Lost this hand'}
            </div>
          </div>
        )}

        {/* Three players */}
        <div className="w-full grid grid-cols-3 gap-3">
          {game.options.map((option, i) => {
            const config = POSITION_CONFIG.find(p => p.key === option.label) || POSITION_CONFIG[i % 3];
            const cards = dealtCards[option.id] || [];
            const optTotal = totals.find(t => t.optionId === option.id);
            const isSelected = selectedOption === option.id;
            const isWinner = round?.winnerId === option.id;

            return (
              <button
                key={option.id}
                onClick={() => canBet && handleBet(option.id)}
                disabled={!canBet}
                className={cn(
                  'rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all',
                  `bg-gradient-to-b ${config.gradient}`,
                  config.border,
                  isWinner && 'ring-2 ring-game-gold scale-105',
                  isSelected && 'ring-2 ring-white',
                  canBet && 'hover:scale-105 cursor-pointer',
                  !canBet && 'cursor-not-allowed'
                )}
              >
                <div className="text-2xl">{config.emoji}</div>
                <div className="text-sm font-black text-white">{option.label}</div>

                {/* Cards display */}
                <div className="flex gap-1">
                  {(cards.length > 0 ? cards : ['?', '?', '?']).map((card, ci) => {
                    const isRed = card.endsWith('H') || card.endsWith('D');
                    const isBack = card === '?';
                    return (
                      <div key={ci} className={cn(
                        'w-8 h-11 rounded border flex items-center justify-center text-xs font-black',
                        isBack ? 'bg-blue-800 border-blue-600 text-blue-400' : cn('bg-white border-gray-200', isRed ? 'text-red-600' : 'text-gray-900'),
                        revealed && !isBack && `card-reveal-${ci}`
                      )}>
                        {isBack ? '🂠' : (
                          <span className="leading-none">{card.slice(0, -1)}{SUITS[card.slice(-1)]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-center">
                  <div className="text-xs text-gray-300 font-bold">x{option.multiplier}</div>
                  <div className="text-xs text-gray-400">🪙{formatTokens(optTotal?.totalAmount || 0)}</div>
                </div>
                {isWinner && <div className="text-xs font-black text-game-gold animate-bounce">WINNER! 🏆</div>}
              </button>
            );
          })}
        </div>

        {round && <div className="w-full max-w-[200px]"><CountdownTimer seconds={countdown} status={round.status} /></div>}

        {/* Controls */}
        <div className="w-full bg-game-card border border-game-border rounded-xl p-4 space-y-3">
          <div className="text-sm text-gray-400 text-center">x2.9 multiplier on win · Click position to bet</div>
          <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={!canBet} />
          <div className="flex gap-2">
            {selectedOption && (
              <Button onClick={() => handleBet()} disabled={!canBet} loading={betting} variant="gold" className="flex-1">
                Confirm Bet ({game.options.find(o => o.id === selectedOption)?.label})
              </Button>
            )}
            {lastBet && (
              <Button onClick={() => handleBet(lastBet.optionId)} disabled={!canBet} variant="secondary">
                🔄 Repeat
              </Button>
            )}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
