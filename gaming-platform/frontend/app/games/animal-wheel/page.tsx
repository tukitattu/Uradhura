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
import { formatTokens, formatMultiplier } from '@/lib/utils';
import { Flame, History } from 'lucide-react';

export default function AnimalWheelPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [betResult, setBetResult] = useState<{won:boolean;payout?:number;winnerLabel?:string}|null>(null);
  const [autoBet, setAutoBet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [myBetThisRound, setMyBetThisRound] = useState<string|null>(null);
  const [recentResults, setRecentResults] = useState<string[]>([]);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('animal-wheel').then(setGame).catch(()=>{}); }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id || '' });

  useEffect(() => {
    if (round?.status === 'BETTING_OPEN') { setBetResult(null); if (!autoBet) setSelectedOption(null); }
  }, [round?.id]);

  useEffect(() => {
    if (round?.status === 'SETTLED' && round.winnerId) {
      const opt = game?.options.find(o=>o.id===round.winnerId);
      if (opt) setRecentResults(p=>[opt.label,...p].slice(0,10));
      if (myBetThisRound === round.id) {
        const didWin = selectedOption === round.winnerId;
        setBetResult({ won:didWin, payout:didWin?betAmount*(opt?.multiplier||1):0, winnerLabel:opt?.label });
        refreshBalance();
      }
    }
  }, [round?.status, round?.winnerId]);

  async function handleBet() {
    if (!selectedOption || !round) return;
    try { await placeBet(selectedOption, betAmount); setMyBetThisRound(round.id); await refreshBalance(); }
    catch (err: unknown) { alert((err as Error).message); }
  }

  useEffect(() => {
    if (autoBet && round?.status==='BETTING_OPEN' && selectedOption && myBetThisRound!==round.id) handleBet();
  }, [round?.id, round?.status, autoBet]);

  const canBet = round?.status==='BETTING_OPEN' && selectedOption && !betting && myBetThisRound!==round?.id;
  const balance = player?.balance ?? 0;
  if (!player || !game) return null;

  return (
    <GameLayout title="Animal Wheel" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1">
        <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
          {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={game.options.find(o=>o.id===round.winnerId)?.label}/>}

          {betResult && (
            <div className={`w-full rounded-2xl p-4 text-center border result-pop ${betResult.won?'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.3)]':'bg-[rgba(255,61,87,0.08)] border-[rgba(255,61,87,0.3)]'}`}>
              <div className={`text-2xl font-black ${betResult.won?'text-[#ffd700] text-glow-gold':'text-[#ff3d57]'}`}>
                {betResult.won?`🏆 WIN! +🪙${formatTokens(betResult.payout!)}`:'💔 Try again!'}
              </div>
              {betResult.winnerLabel && <div className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Winner: {betResult.winnerLabel}</div>}
            </div>
          )}

          {recentResults.length > 0 && (
            <div className="flex items-center gap-2 w-full max-w-[420px]">
              <span className="text-[10px] text-[rgba(255,255,255,0.35)] shrink-0 uppercase tracking-wide">Recent</span>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {recentResults.map((r,i)=>(
                  <span key={i} className="shrink-0 text-[10px] dl-badge-purple rounded-lg px-2 py-0.5">{r}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 mb-8">
            <BettingWheel options={game.options} totals={totals} selectedOptionId={selectedOption}
              onSelect={setSelectedOption} disabled={round?.status!=='BETTING_OPEN'||myBetThisRound===round?.id}
              winnerId={round?.status==='SETTLED'?round.winnerId:null}
              spinning={round?.status==='RESULT_PROCESSING'} centerEmoji="🐾" centerLabel="WILD"/>
          </div>

          {round && <div className="w-full max-w-[260px]"><CountdownTimer seconds={countdown} status={round.status}/></div>}

          <div className="w-full max-w-[420px] dl-card rounded-2xl p-4 space-y-3">
            <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={round?.status!=='BETTING_OPEN'}/>
            <div className="flex gap-2">
              <Button onClick={handleBet} disabled={!canBet} loading={betting} variant="gold" className="flex-1" size="lg">
                {myBetThisRound===round?.id?'✓ Placed':selectedOption?`Bet 🪙${formatTokens(betAmount)}`:'Select option'}
              </Button>
              <Button onClick={()=>setAutoBet(!autoBet)} variant={autoBet?'primary':'ghost'} size="lg">
                Auto {autoBet?'ON':'OFF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Side */}
        <div className="w-full lg:w-64 space-y-3">
          <div className="dl-card rounded-2xl p-4">
            <h3 className="font-black text-sm mb-3 flex items-center gap-1.5 text-[rgba(255,255,255,0.7)]">
              <Flame size={14} className="text-orange-400"/> Hot Options
            </h3>
            <div className="space-y-1.5">
              {game.options.filter(o=>o.isHot).map(o=>(
                <button key={o.id} onClick={()=>setSelectedOption(o.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all
                    ${selectedOption===o.id?'border-[rgba(255,31,166,0.6)] bg-[rgba(255,31,166,0.1)]':'border-[rgba(61,17,85,0.6)] hover:border-[rgba(255,31,166,0.3)]'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:o.colorHex}}/>
                    <span className="text-sm font-bold text-white">{o.label}</span>
                    <Badge variant="hot">HOT</Badge>
                  </div>
                  <span className="text-sm font-black text-[#ffd700]">{formatMultiplier(o.multiplier)}</span>
                </button>
              ))}
              {!game.options.filter(o=>o.isHot).length && <p className="text-xs text-[rgba(255,255,255,0.25)]">No hot options</p>}
            </div>
          </div>

          <div className="dl-card rounded-2xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[rgba(255,255,255,0.4)]">Balance</span><span className="font-black text-[#ffd700]">🪙 {formatTokens(balance)}</span></div>
              <div className="flex justify-between"><span className="text-[rgba(255,255,255,0.4)]">Pool</span><span className="font-bold text-white">🪙 {formatTokens(round?.totalBetAmount||0)}</span></div>
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
