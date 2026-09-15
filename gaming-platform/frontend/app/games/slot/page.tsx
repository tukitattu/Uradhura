'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game, type GameOption } from '@/lib/api';
import GameLayout, { CountdownTimer, StatusBanner } from '@/components/games/GameLayout';
import Button from '@/components/ui/Button';
import { cn, formatTokens, randomInt } from '@/lib/utils';
import { Zap } from 'lucide-react';

const REEL_SYMBOLS = ['🍒', '🍋', '🔔', '💎', '⭐', '🎰', '7️⃣', '🃏'];
const BET_AMOUNTS = [1000, 5000, 10000, 50000];

function Reel({ spinning, finalSymbol, delay = 0 }: { spinning: boolean; finalSymbol: string; delay?: number }) {
  const [symbols, setSymbols] = useState(Array.from({ length: 3 }, () => REEL_SYMBOLS[randomInt(0, REEL_SYMBOLS.length - 1)]));
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => {
        setSymbols([
          REEL_SYMBOLS[randomInt(0, REEL_SYMBOLS.length - 1)],
          REEL_SYMBOLS[randomInt(0, REEL_SYMBOLS.length - 1)],
          REEL_SYMBOLS[randomInt(0, REEL_SYMBOLS.length - 1)],
        ]);
      }, 80);
    } else {
      clearInterval(intervalRef.current);
      setTimeout(() => {
        setSymbols([
          REEL_SYMBOLS[randomInt(0, REEL_SYMBOLS.length - 1)],
          finalSymbol,
          REEL_SYMBOLS[randomInt(0, REEL_SYMBOLS.length - 1)],
        ]);
      }, delay);
    }
    return () => clearInterval(intervalRef.current);
  }, [spinning, finalSymbol, delay]);

  return (
    <div className="flex flex-col items-center justify-center bg-black/40 border border-game-border rounded-lg w-24 h-36 overflow-hidden">
      {symbols.map((sym, i) => (
        <div
          key={i}
          className={cn('text-4xl flex items-center justify-center w-full h-12', i === 1 && 'border-y-2 border-game-gold bg-game-gold/10 text-5xl')}
        >
          {sym}
        </div>
      ))}
    </div>
  );
}

export default function SlotPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [extraBet, setExtraBet] = useState(false);
  const [selectedOption, setSelectedOption] = useState<GameOption | null>(null);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number; multiplier?: number } | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('slot').then(setGame).catch(() => {}); }, []);

  const { round, countdown, betting, placeBet } = useRound({ gameId: game?.id || '' });

  useEffect(() => {
    if (round?.status === 'RESULT_PROCESSING') {
      setSpinning(true);
      setTimeout(() => setSpinning(false), 3000);
    }
    if (round?.status === 'BETTING_OPEN') {
      setBetResult(null);
      setSpinning(false);
    }
  }, [round?.status, round?.id]);

  useEffect(() => {
    if (round?.status === 'SETTLED' && myBetThisRound === round.id) {
      const winOption = game?.options.find(o => o.id === round.winnerId);
      const didWin = selectedOption?.id === round.winnerId;
      const total = extraBet ? betAmount * 1.5 : betAmount;
      const payout = didWin ? total * (winOption?.multiplier || 1) : 0;
      setBetResult({ won: didWin, payout, multiplier: winOption?.multiplier });
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handleSpin(quick = false) {
    if (!round || !game) return;
    const option = selectedOption || game.options[randomInt(0, game.options.length - 1)];
    const amount = extraBet ? Math.floor(betAmount * 1.5) : betAmount;
    try {
      setSpinning(true);
      await placeBet(option.id, amount);
      setMyBetThisRound(round.id);
      setSelectedOption(option);
      await refreshBalance();
      if (!quick) setTimeout(() => setSpinning(false), 3000);
    } catch (err: unknown) {
      setSpinning(false);
      alert((err as Error).message);
    }
  }

  useEffect(() => {
    if (autoPlay && round?.status === 'BETTING_OPEN' && myBetThisRound !== round?.id) {
      handleSpin();
    }
  }, [round?.id, round?.status, autoPlay]);

  const balance = player?.balance ?? 0;
  const winOption = game?.options.find(o => o.id === round?.winnerId);
  const canSpin = round?.status === 'BETTING_OPEN' && !betting && !spinning && myBetThisRound !== round?.id;
  if (!player || !game) return null;

  return (
    <GameLayout title="Slot Machine" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col items-center gap-4 p-4 max-w-lg mx-auto w-full flex-1">
        {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={winOption?.label} />}

        {betResult && (
          <div className={cn('w-full rounded-xl p-4 text-center result-pop border',
            betResult.won ? 'bg-game-green/20 border-game-green text-game-green' : 'bg-game-red/20 border-game-red text-game-red')}>
            <div className="text-2xl font-black">
              {betResult.won ? `🎰 JACKPOT! +${formatTokens(betResult.payout!)} (x${betResult.multiplier})` : '🎰 No match — spin again!'}
            </div>
          </div>
        )}

        {/* Slot machine body */}
        <div className="w-full bg-gradient-to-b from-gray-800 to-gray-900 border-4 border-gray-600 rounded-2xl p-6 shadow-2xl">
          {/* Title */}
          <div className="text-center mb-4">
            <div className="text-2xl font-black text-game-gold">🎰 SLOTS 🎰</div>
            {round?.status === 'SETTLED' && winOption && (
              <div className="text-sm text-game-gold mt-1">Winning: {winOption.label}</div>
            )}
          </div>

          {/* Reels */}
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2].map((i) => (
              <Reel
                key={i}
                spinning={spinning}
                finalSymbol={REEL_SYMBOLS[game.options.findIndex(o => o.id === round?.winnerId) % REEL_SYMBOLS.length] || '🍒'}
                delay={i * 300}
              />
            ))}
          </div>

          {/* Payline indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400 justify-center mb-3">
            <div className="h-px flex-1 bg-game-gold/30" />
            <span>— PAYLINE —</span>
            <div className="h-px flex-1 bg-game-gold/30" />
          </div>

          {/* Multiplier display */}
          <div className="flex gap-2 justify-center flex-wrap">
            {game.options.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOption(o)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-bold border transition-all',
                  selectedOption?.id === o.id ? 'bg-game-gold text-black border-game-gold' :
                  round?.winnerId === o.id ? 'bg-game-green/20 text-game-green border-game-green' :
                  'bg-black/30 text-gray-300 border-gray-600 hover:border-game-gold/50'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {round && <div className="w-full max-w-[200px]"><CountdownTimer seconds={countdown} status={round.status} /></div>}

        {/* Controls */}
        <div className="w-full bg-game-card border border-game-border rounded-xl p-4 space-y-3">
          {/* Bet amounts */}
          <div className="flex gap-2 flex-wrap">
            {BET_AMOUNTS.map(a => (
              <button key={a} onClick={() => setBetAmount(a)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-bold border transition-all',
                  betAmount === a ? 'bg-game-gold text-black border-game-gold' : 'bg-game-card border-game-border text-gray-300 hover:border-game-gold/50')}>
                {formatTokens(a)}
              </button>
            ))}
          </div>

          {/* Extra bet toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setExtraBet(!extraBet)} className={cn('w-10 h-5 rounded-full transition-colors relative', extraBet ? 'bg-game-gold' : 'bg-gray-600')}>
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform', extraBet ? 'translate-x-5' : 'translate-x-0.5')} />
              </div>
              <span className="text-sm text-gray-300">Extra Bet (+50%)</span>
            </label>
            <span className="text-sm font-bold text-game-gold">
              {extraBet ? `${formatTokens(Math.floor(betAmount * 1.5))}` : formatTokens(betAmount)}
            </span>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleSpin(true)} disabled={!canSpin} loading={spinning || betting} variant="gold" className="flex-1" size="lg">
              <Zap size={18} /> Quick Spin
            </Button>
            <Button onClick={() => handleSpin()} disabled={!canSpin} variant="primary" size="lg">
              SPIN
            </Button>
            <Button onClick={() => setAutoPlay(!autoPlay)} variant={autoPlay ? 'primary' : 'secondary'} size="lg">
              Auto
            </Button>
          </div>

          {myBetThisRound === round?.id && (
            <p className="text-xs text-center text-gray-400">✓ Bet placed for this round. Waiting for result...</p>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
