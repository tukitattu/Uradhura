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
import { formatTokens, formatMultiplier } from '@/lib/utils';
import { Package, Trophy, History } from 'lucide-react';

const PACKAGES = [
  { id:'pkg1', name:'Starter Bundle', options:['Noodles','Dumpling'], multiplier:2.0, price:2000 },
  { id:'pkg2', name:'Hot & Spicy Pack', options:['Hot Pot','BBQ'], multiplier:3.5, price:5000 },
  { id:'pkg3', name:'Premium Selection', options:['Seafood','Premium'], multiplier:5.0, price:10000 },
];

export default function FoodWheelPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game|null>(null);
  const [selectedOption, setSelectedOption] = useState<string|null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [myBetThisRound, setMyBetThisRound] = useState<string|null>(null);
  const [betResult, setBetResult] = useState<{won:boolean;payout?:number}|null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string|null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [bigWinners, setBigWinners] = useState([
    { name:'Player***123', amount:45000 },{ name:'Lucky***99', amount:120000 },{ name:'Fire***7', amount:28000 },
  ]);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('food-wheel').then(setGame).catch(()=>{}); }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id||'' });

  useEffect(() => { if (round?.status==='BETTING_OPEN') setBetResult(null); }, [round?.id]);

  useEffect(() => {
    if (round?.status==='SETTLED' && myBetThisRound===round.id) {
      const didWin = selectedOption===round.winnerId;
      const opt = game?.options.find(o=>o.id===round.winnerId);
      const payout = didWin?betAmount*(opt?.multiplier||1):0;
      setBetResult({ won:didWin, payout });
      if (didWin && payout>5000) setBigWinners(p=>[{name:`${player?.username?.slice(0,4)}***`,amount:payout},...p].slice(0,5));
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handlePackageBet(pkg: typeof PACKAGES[0]) {
    if (!round||!game) return;
    const firstOpt = game.options.find(o=>pkg.options.includes(o.label));
    if (!firstOpt) return;
    setSelectedPackage(pkg.id); setSelectedOption(firstOpt.id); setBetAmount(pkg.price);
    try { await placeBet(firstOpt.id,pkg.price); setMyBetThisRound(round.id); await refreshBalance(); }
    catch (err:unknown) { alert((err as Error).message); }
  }

  async function handleBet() {
    if (!selectedOption||!round) return;
    try { await placeBet(selectedOption,betAmount); setMyBetThisRound(round.id); await refreshBalance(); }
    catch (err:unknown) { alert((err as Error).message); }
  }

  const balance = player?.balance ?? 0;
  const winnerOption = game?.options.find(o=>o.id===round?.winnerId);
  const canBet = round?.status==='BETTING_OPEN' && selectedOption && !betting && myBetThisRound!==round?.id;
  if (!player||!game) return null;

  return (
    <GameLayout title={game.branding?.displayName || 'Food Wheel'} branding={game.branding} balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1">
        <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
          {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={winnerOption?.label}/>}
          {betResult && (
            <div className={`w-full rounded-2xl p-4 text-center border result-pop ${betResult.won?'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.3)]':'bg-[rgba(255,61,87,0.08)] border-[rgba(255,61,87,0.3)]'}`}>
              <div className={`text-2xl font-black ${betResult.won?'text-[#ffd700] text-glow-gold':'text-[#ff3d57]'}`}>
                {betResult.won?`🍜 WIN! +🪙${formatTokens(betResult.payout!)}`:'🍽️ No luck this time!'}
              </div>
            </div>
          )}

          <div className="mt-2 mb-8">
            <BettingWheel options={game.options} totals={totals} selectedOptionId={selectedOption}
              onSelect={setSelectedOption} disabled={round?.status!=='BETTING_OPEN'||myBetThisRound===round?.id}
              winnerId={round?.status==='SETTLED'?round.winnerId:null}
              spinning={round?.status==='RESULT_PROCESSING'} centerEmoji="🍜" centerLabel="FOOD"/>
          </div>

          {round && <div className="w-full max-w-[260px]"><CountdownTimer seconds={countdown} status={round.status}/></div>}

          <div className="w-full max-w-[420px] dl-card rounded-2xl p-4 space-y-3">
            <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={round?.status!=='BETTING_OPEN'}/>
            <Button onClick={handleBet} disabled={!canBet} loading={betting} variant="gold" className="w-full" size="lg">
              {myBetThisRound===round?.id?'✓ Placed':selectedOption?`Bet 🪙${formatTokens(betAmount)}`:'Select an option'}
            </Button>
          </div>
        </div>

        <div className="w-full lg:w-64 space-y-3">
          <div className="dl-card rounded-2xl p-4">
            <h3 className="font-black text-sm mb-3 flex items-center gap-2 text-[rgba(255,255,255,0.7)]">
              <Package size={14} className="text-[#ffd700]"/> Packages
            </h3>
            <div className="space-y-2">
              {PACKAGES.map(pkg=>(
                <button key={pkg.id} onClick={()=>round?.status==='BETTING_OPEN'&&myBetThisRound!==round?.id&&handlePackageBet(pkg)}
                  disabled={round?.status!=='BETTING_OPEN'||!!myBetThisRound}
                  className={`w-full p-3 rounded-xl border text-left transition-all
                    ${selectedPackage===pkg.id?'border-[rgba(255,215,0,0.5)] bg-[rgba(255,215,0,0.08)]':'border-[rgba(61,17,85,0.6)] hover:border-[rgba(255,215,0,0.3)]'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-black text-white">{pkg.name}</div>
                      <div className="text-[10px] text-[rgba(255,255,255,0.35)] mt-0.5">{pkg.options.join(' + ')}</div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <div className="text-xs font-black text-[#ffd700]">{formatMultiplier(pkg.multiplier)}</div>
                      <div className="text-[10px] text-[rgba(255,255,255,0.35)]">🪙{formatTokens(pkg.price)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="dl-card rounded-2xl p-4">
            <h3 className="font-black text-sm mb-3 flex items-center gap-2 text-[rgba(255,255,255,0.7)]">
              <Trophy size={14} className="text-[#ffd700]"/> Big Winners
            </h3>
            <div className="space-y-2">
              {bigWinners.map((w,i)=>(
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[rgba(255,255,255,0.5)]">{w.name}</span>
                  <span className="font-black text-[#ffd700]">+{formatTokens(w.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={()=>setShowHistory(!showHistory)} className="w-full flex items-center gap-2 text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">
            <History size={13}/> {showHistory?'Hide':'Show'} History
          </button>
          {showHistory && <div className="dl-card rounded-2xl p-4"><BetHistory gameId={game.id} compact/></div>}
        </div>
      </div>
    </GameLayout>
  );
}
