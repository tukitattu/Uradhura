'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game } from '@/lib/api';
import GameLayout, { CountdownTimer, StatusBanner } from '@/components/games/GameLayout';
import Button from '@/components/ui/Button';
import { cn, formatTokens, dealCards } from '@/lib/utils';

const CHIP_AMOUNTS = [20, 100, 500, 1000];

const POSITION_COLORS = {
  'Player A': { bg: 'from-red-900 to-red-800', border: 'border-red-600', accent: '#ef4444' },
  'Player B': { bg: 'from-blue-900 to-blue-800', border: 'border-blue-600', accent: '#3b82f6' },
  'Player C': { bg: 'from-green-900 to-green-800', border: 'border-green-600', accent: '#22c55e' },
};

function CardDisplay({ cards, revealed }: { cards: string[]; revealed: boolean }) {
  const SUITS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const isRed = (card: string) => card.endsWith('H') || card.endsWith('D');

  return (
    <div className="flex gap-1 justify-center">
      {cards.map((card, i) => (
        <div
          key={i}
          className={cn(
            'w-10 h-14 rounded border-2 flex items-center justify-center text-xs font-black',
            revealed
              ? cn('bg-white border-gray-200', isRed(card) ? 'text-red-600' : 'text-gray-900')
              : 'bg-blue-800 border-blue-600 text-blue-400',
            revealed && `card-reveal-${i}`
          )}
        >
          {revealed ? (
            <div className="text-center leading-none">
              <div>{card.slice(0, -1)}</div>
              <div>{SUITS[card.slice(-1)] || card.slice(-1)}</div>
            </div>
          ) : (
            <div className="text-lg">🂠</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TeenPattiPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [dealtCards, setDealtCards] = useState<Record<string, string[]>>({});
  const [revealed, setRevealed] = useState(false);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number } | null>(null);
  const [lastBet, setLastBet] = useState<{ optionId: string; amount: number } | null>(null);

  useEffect(() => {
    if (!loading && !player) router.push('/login');
  }, [player, loading, router]);

  useEffect(() => {
    gamesApi.get('teen-patti').then(setGame).catch(() => {});
  }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id || '' });

  // Deal cards when result processing
  useEffect(() => {
    if (round?.status === 'RESULT_PROCESSING') {
      const cards: Record<string, string[]> = {};
      game?.options.forEach((o) => {
        cards[o.id] = dealCards(3);
      });
      setDealtCards(cards);
      setTimeout(() => setRevealed(true), 800);
    } else if (round?.status === 'BETTING_OPEN') {
      setDealtCards({});
      setRevealed(false);
      setBetResult(null);
      if (!lastBet) setSelectedPosition(null);
    }
  }, [round?.status, round?.id]);

  // Settle notification
  useEffect(() => {
    if (round?.status === 'SETTLED' && myBetThisRound === round.id) {
      const didWin = selectedPosition === round.winnerId;
      const option = game?.options.find((o) => o.id === round.winnerId);
      const payout = didWin ? betAmount * (option?.multiplier || 1) : 0;
      setBetResult({ won: didWin, payout });
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handleBet(optionId: string) {
    if (!round) return;
    try {
      await placeBet(optionId, betAmount);
      setMyBetThisRound(round.id);
      setSelectedPosition(optionId);
      setLastBet({ optionId, amount: betAmount });
      await refreshBalance();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  }

  async function handleRepeat() {
    if (!lastBet || !round || round.status !== 'BETTING_OPEN') return;
    handleBet(lastBet.optionId);
  }

  const balance = player?.balance ?? 0;
  if (!player || !game) return null;

  return (
    <GameLayout title="Teen Patti" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto w-full flex-1">
        {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={game.options.find(o => o.id === round.winnerId)?.label} />}

        {betResult && (
          <div className={cn('w-full rounded-xl p-4 text-center border result-pop',
            betResult.won ? 'bg-game-green/20 border-game-green text-game-green' : 'bg-game-red/20 border-game-red text-game-red')}>
            <div className="text-2xl font-black">
              {betResult.won ? `🃏 WIN! +${formatTokens(betResult.payout!)}` : '🃏 Lost this round'}
            </div>
          </div>
        )}

        {/* Card table */}
        <div className="w-full bg-[#1a4a2e] border-4 border-[#2d7a4e] rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-sm text-green-400 font-bold uppercase tracking-widest">Teen Patti</div>
            <div className="text-xs text-green-600">Round #{round?.roundNumber || '—'}</div>
          </div>

          {/* Three positions */}
          <div className="grid grid-cols-3 gap-3">
            {game.options.map((option) => {
              const colors = POSITION_COLORS[option.label as keyof typeof POSITION_COLORS] ||
                { bg: 'from-gray-900 to-gray-800', border: 'border-gray-600', accent: '#9ca3af' };
              const optionTotal = totals.find((t) => t.optionId === option.id);
              const isSelected = selectedPosition === option.id;
              const isWinner = round?.winnerId === option.id;
              const cards = dealtCards[option.id] || [];
              const canBetHere = round?.status === 'BETTING_OPEN' && myBetThisRound !== round?.id;

              return (
                <div
                  key={option.id}
                  className={cn(
                    'rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all',
                    `bg-gradient-to-b ${colors.bg}`,
                    colors.border,
                    isWinner && 'ring-2 ring-game-gold scale-105',
                    isSelected && !isWinner && 'ring-2 scale-102',
                    canBetHere && 'cursor-pointer hover:scale-105'
                  )}
                  style={{ ['--tw-ring-color' as string]: isSelected ? colors.accent : undefined }}
                  onClick={() => canBetHere && handleBet(option.id)}
                >
                  <div className="text-xs font-black text-white">{option.label}</div>

                  {/* Cards */}
                  <CardDisplay cards={cards.length ? cards : ['back', 'back', 'back']} revealed={revealed && cards.length > 0} />

                  {/* Pot */}
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Pot</div>
                    <div className="text-sm font-bold" style={{ color: colors.accent }}>
                      🪙 {formatTokens(optionTotal?.totalAmount || 0)}
                    </div>
                  </div>

                  {isWinner && <div className="text-xs font-black text-game-gold animate-bounce">WINNER!</div>}

                  {/* x2.9 multiplier */}
                  <div className="text-xs text-gray-400">{option.multiplier}x</div>
                </div>
              );
            })}
          </div>

          {/* Countdown */}
          {round && (
            <div className="mt-4 max-w-[200px] mx-auto">
              <CountdownTimer seconds={countdown} status={round.status} />
            </div>
          )}
        </div>

        {/* Chip selection */}
        <div className="w-full bg-game-card border border-game-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Select Chip</span>
            <span className="text-sm font-bold text-game-gold">Selected: {betAmount}</span>
          </div>
          <div className="flex gap-3 justify-center">
            {CHIP_AMOUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setBetAmount(c)}
                className={cn(
                  'w-14 h-14 rounded-full border-4 font-black text-xs transition-all',
                  betAmount === c
                    ? 'border-game-gold bg-game-gold text-black scale-110'
                    : 'border-gray-600 bg-gray-800 text-white hover:border-game-gold/50'
                )}
              >
                {c >= 1000 ? `${c / 1000}K` : c}
              </button>
            ))}
          </div>
          {lastBet && (
            <Button
              onClick={handleRepeat}
              disabled={round?.status !== 'BETTING_OPEN' || myBetThisRound === round?.id}
              variant="secondary"
              className="w-full"
            >
              🔄 Repeat Bet ({game.options.find(o => o.id === lastBet.optionId)?.label}, {lastBet.amount})
            </Button>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
