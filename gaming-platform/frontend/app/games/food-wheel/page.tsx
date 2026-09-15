'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game } from '@/lib/api';
import GameLayout, { CountdownTimer, BetDenominations, StatusBanner } from '@/components/games/GameLayout';
import BettingWheel from '@/components/games/BettingWheel';
import Button from '@/components/ui/Button';
import { cn, formatTokens, formatMultiplier } from '@/lib/utils';
import { Package, Trophy, History } from 'lucide-react';
import BetHistory from '@/components/games/BetHistory';

const PACKAGES = [
  { id: 'pkg1', name: 'Starter Bundle', options: ['Noodles', 'Dumpling'], multiplier: 2.0, price: 2000 },
  { id: 'pkg2', name: 'Hot & Spicy Pack', options: ['Hot Pot', 'BBQ'], multiplier: 3.5, price: 5000 },
  { id: 'pkg3', name: 'Premium Selection', options: ['Seafood', 'Premium'], multiplier: 5.0, price: 10000 },
];

export default function FoodWheelPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [bigWinners, setBigWinners] = useState<Array<{ name: string; amount: number }>>([
    { name: 'Player***123', amount: 45000 },
    { name: 'Lucky***99', amount: 120000 },
    { name: 'Fire***7', amount: 28000 },
  ]);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('food-wheel').then(setGame).catch(() => {}); }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id || '' });

  useEffect(() => {
    if (round?.status === 'BETTING_OPEN') { setBetResult(null); }
  }, [round?.id]);

  useEffect(() => {
    if (round?.status === 'SETTLED' && myBetThisRound === round.id) {
      const didWin = selectedOption === round.winnerId;
      const option = game?.options.find((o) => o.id === round.winnerId);
      const payout = didWin ? betAmount * (option?.multiplier || 1) : 0;
      setBetResult({ won: didWin, payout });
      if (didWin && payout > 5000) {
        setBigWinners(prev => [{ name: `${player?.username?.slice(0, 4)}***`, amount: payout }, ...prev].slice(0, 5));
      }
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handlePackageBet(pkg: typeof PACKAGES[0]) {
    if (!round || !game) return;
    const firstOption = game.options.find(o => pkg.options.includes(o.label));
    if (!firstOption) return;
    setSelectedPackage(pkg.id);
    setSelectedOption(firstOption.id);
    setBetAmount(pkg.price);
    try {
      await placeBet(firstOption.id, pkg.price);
      setMyBetThisRound(round.id);
      await refreshBalance();
    } catch (err: unknown) { alert((err as Error).message); }
  }

  async function handleBet() {
    if (!selectedOption || !round) return;
    try {
      await placeBet(selectedOption, betAmount);
      setMyBetThisRound(round.id);
      await refreshBalance();
    } catch (err: unknown) { alert((err as Error).message); }
  }

  const balance = player?.balance ?? 0;
  const winnerOption = game?.options.find((o) => o.id === round?.winnerId);
  const canBet = round?.status === 'BETTING_OPEN' && selectedOption && !betting && myBetThisRound !== round?.id;
  if (!player || !game) return null;

  return (
    <GameLayout title="Food Wheel" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1">
        <div className="flex-1 flex flex-col items-center gap-4">
          {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={winnerOption?.label} />}
          {betResult && (
            <div className={cn('w-full rounded-xl p-4 text-center border result-pop',
              betResult.won ? 'bg-game-green/20 border-game-green' : 'bg-game-red/20 border-game-red')}>
              <div className={cn('text-2xl font-black', betResult.won ? 'text-game-green' : 'text-game-red')}>
                {betResult.won ? `🍜 Delicious WIN! +${formatTokens(betResult.payout!)}` : '🍽️ No luck this time!'}
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
            centerEmoji="🍜"
            centerLabel="FOOD"
          />

          {round && <div className="w-full max-w-[300px]"><CountdownTimer seconds={countdown} status={round.status} /></div>}

          <div className="w-full max-w-[400px] bg-game-card border border-game-border rounded-xl p-4 space-y-3">
            <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={round?.status !== 'BETTING_OPEN'} />
            <Button onClick={handleBet} disabled={!canBet} loading={betting} variant="gold" className="w-full" size="lg">
              {myBetThisRound === round?.id ? '✓ Bet Placed' : selectedOption ? `Bet ${formatTokens(betAmount)}` : 'Select an option'}
            </Button>
          </div>
        </div>

        {/* Side */}
        <div className="w-full lg:w-72 space-y-3">
          {/* Package betting */}
          <div className="bg-game-card border border-game-border rounded-xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Package size={16} className="text-game-gold" /> Recommended Packages</h3>
            <div className="space-y-2">
              {PACKAGES.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => round?.status === 'BETTING_OPEN' && myBetThisRound !== round?.id && handlePackageBet(pkg)}
                  disabled={round?.status !== 'BETTING_OPEN' || myBetThisRound === round?.id}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all',
                    selectedPackage === pkg.id ? 'border-game-gold bg-game-gold/10' : 'border-game-border hover:border-game-gold/30',
                    (round?.status !== 'BETTING_OPEN') && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-white">{pkg.name}</div>
                      <div className="text-xs text-gray-400">{pkg.options.join(' + ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-game-gold">{formatMultiplier(pkg.multiplier)}</div>
                      <div className="text-xs text-gray-400">🪙{formatTokens(pkg.price)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Big winners */}
          <div className="bg-game-card border border-game-border rounded-xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Trophy size={16} className="text-game-gold" /> Big Winners</h3>
            <div className="space-y-2">
              {bigWinners.map((w, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">{w.name}</span>
                  <span className="text-game-gold font-bold">+{formatTokens(w.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
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
