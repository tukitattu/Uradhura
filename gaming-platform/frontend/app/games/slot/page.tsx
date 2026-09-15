'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game, type GameOption } from '@/lib/api';
import GameLayout, { CountdownTimer, StatusBanner } from '@/components/games/GameLayout';
import BetHistory from '@/components/games/BetHistory';
import Button from '@/components/ui/Button';
import { cn, formatTokens, randomInt } from '@/lib/utils';
import { Zap, History } from 'lucide-react';

const SYMBOLS = ['🍒','🍋','🔔','💎','⭐','🎰','7️⃣','🃏'];
const BETS = [1000,5000,10000,50000];

function Reel({ spinning, finalSymbol, delay=0 }: { spinning:boolean;finalSymbol:string;delay?:number }) {
  const [syms, setSyms] = useState(Array.from({length:3},()=>SYMBOLS[randomInt(0,SYMBOLS.length-1)]));
  const ref = useRef<NodeJS.Timeout>();
  useEffect(()=>{
    if (spinning) {
      ref.current=setInterval(()=>setSyms([SYMBOLS[randomInt(0,7)],SYMBOLS[randomInt(0,7)],SYMBOLS[randomInt(0,7)]]),80);
    } else {
      clearInterval(ref.current);
      setTimeout(()=>setSyms([SYMBOLS[randomInt(0,7)],finalSymbol,SYMBOLS[randomInt(0,7)]]),delay);
    }
    return ()=>clearInterval(ref.current);
  },[spinning,finalSymbol,delay]);

  return (
    <div className="flex flex-col items-center justify-center bg-[rgba(0,0,0,0.5)] border border-[rgba(61,17,85,0.8)] rounded-2xl w-24 h-36 overflow-hidden">
      {syms.map((s,i)=>(
        <div key={i} className={cn('text-4xl flex items-center justify-center w-full h-12 transition-all',
          i===1&&'border-y-2 border-[rgba(255,215,0,0.5)] bg-[rgba(255,215,0,0.06)] text-5xl')}>
          {s}
        </div>
      ))}
    </div>
  );
}

export default function SlotPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game|null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [extraBet, setExtraBet] = useState(false);
  const [selectedOption, setSelectedOption] = useState<GameOption|null>(null);
  const [myBetThisRound, setMyBetThisRound] = useState<string|null>(null);
  const [spinning, setSpinning] = useState(false);
  const [betResult, setBetResult] = useState<{won:boolean;payout?:number;multiplier?:number}|null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(()=>{ if (!loading&&!player) router.push('/login'); },[player,loading,router]);
  useEffect(()=>{ gamesApi.get('slot').then(setGame).catch(()=>{}); },[]);

  const { round, countdown, betting, placeBet } = useRound({ gameId: game?.id||'' });

  useEffect(()=>{
    if (round?.status==='RESULT_PROCESSING') { setSpinning(true); setTimeout(()=>setSpinning(false),3000); }
    if (round?.status==='BETTING_OPEN') { setBetResult(null); setSpinning(false); }
  },[round?.status,round?.id]);

  useEffect(()=>{
    if (round?.status==='SETTLED'&&myBetThisRound===round.id) {
      const winOpt=game?.options.find(o=>o.id===round.winnerId);
      const didWin=selectedOption?.id===round.winnerId;
      const total=extraBet?betAmount*1.5:betAmount;
      setBetResult({won:didWin,payout:didWin?total*(winOpt?.multiplier||1):0,multiplier:winOpt?.multiplier});
      refreshBalance();
    }
  },[round?.status,round?.winnerId]);

  async function handleSpin(quick=false) {
    if (!round||!game) return;
    const option=selectedOption||game.options[randomInt(0,game.options.length-1)];
    const amount=extraBet?Math.floor(betAmount*1.5):betAmount;
    try {
      setSpinning(true);
      await placeBet(option.id,amount);
      setMyBetThisRound(round.id); setSelectedOption(option); await refreshBalance();
      if (!quick) setTimeout(()=>setSpinning(false),3000);
    } catch (err:unknown) { setSpinning(false); alert((err as Error).message); }
  }

  useEffect(()=>{
    if (autoPlay&&round?.status==='BETTING_OPEN'&&myBetThisRound!==round?.id) handleSpin();
  },[round?.id,round?.status,autoPlay]);

  const balance = player?.balance??0;
  const winOption = game?.options.find(o=>o.id===round?.winnerId);
  const canSpin = round?.status==='BETTING_OPEN'&&!betting&&!spinning&&myBetThisRound!==round?.id;
  if (!player||!game) return null;

  return (
    <GameLayout title="Slot Machine" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col items-center gap-4 p-4 max-w-lg mx-auto w-full flex-1">
        {round&&<StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={winOption?.label}/>}

        {betResult&&(
          <div className={`w-full rounded-2xl p-4 text-center border result-pop ${betResult.won?'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.3)]':'bg-[rgba(255,61,87,0.08)] border-[rgba(255,61,87,0.3)]'}`}>
            <div className={`text-2xl font-black ${betResult.won?'text-[#ffd700] text-glow-gold':'text-[#ff3d57]'}`}>
              {betResult.won?`🎰 JACKPOT! +🪙${formatTokens(betResult.payout!)} (x${betResult.multiplier})`:'🎰 No match — spin again!'}
            </div>
          </div>
        )}

        {/* Machine body */}
        <div className="w-full dl-card-gold rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-4">
            <div className="text-2xl font-black text-gradient-gold">🎰 SLOTS 🎰</div>
            {round?.status==='SETTLED'&&winOption&&(
              <div className="text-xs text-[#ffd700] mt-1 font-bold">Winner: {winOption.label}</div>
            )}
          </div>

          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2].map(i=>(
              <Reel key={i} spinning={spinning}
                finalSymbol={SYMBOLS[game.options.findIndex(o=>o.id===round?.winnerId)%SYMBOLS.length]||'🍒'}
                delay={i*300}/>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-[rgba(255,215,0,0.4)] justify-center mb-3">
            <div className="h-px flex-1 bg-[rgba(255,215,0,0.2)]"/>
            <span className="font-bold tracking-widest">— PAYLINE —</span>
            <div className="h-px flex-1 bg-[rgba(255,215,0,0.2)]"/>
          </div>

          <div className="flex gap-1.5 justify-center flex-wrap">
            {game.options.map(o=>(
              <button key={o.id} onClick={()=>setSelectedOption(o)}
                className={cn('px-2 py-1 rounded-lg text-[10px] font-black border transition-all',
                  selectedOption?.id===o.id?'bg-[#ffd700] text-[#1a0028] border-[#ffd700]':
                  round?.winnerId===o.id?'bg-[rgba(0,230,118,0.15)] text-[#00e676] border-[rgba(0,230,118,0.4)]':
                  'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border-[rgba(61,17,85,0.6)] hover:border-[rgba(255,215,0,0.3)]'
                )}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {round&&<div className="w-full max-w-[200px]"><CountdownTimer seconds={countdown} status={round.status}/></div>}

        <div className="w-full dl-card rounded-2xl p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {BETS.map(a=>(
              <button key={a} onClick={()=>setBetAmount(a)}
                className={cn('dl-chip',betAmount===a&&'active')}>
                {formatTokens(a)}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer" onClick={()=>setExtraBet(!extraBet)}>
              <div className={`dl-toggle ${extraBet?'on':'off'}`}/>
              <span className="text-sm text-[rgba(255,255,255,0.6)]">Extra Bet (+50%)</span>
            </label>
            <span className="text-sm font-black text-[#ffd700]">🪙 {formatTokens(extraBet?Math.floor(betAmount*1.5):betAmount)}</span>
          </div>

          <div className="flex gap-2">
            <Button onClick={()=>handleSpin(true)} disabled={!canSpin} loading={spinning||betting} variant="gold" className="flex-1" size="lg">
              <Zap size={16}/> Quick Spin
            </Button>
            <Button onClick={()=>handleSpin()} disabled={!canSpin} variant="primary" size="lg">SPIN</Button>
            <Button onClick={()=>setAutoPlay(!autoPlay)} variant={autoPlay?'primary':'ghost'} size="lg">Auto</Button>
          </div>

          {myBetThisRound===round?.id&&(
            <p className="text-xs text-center text-[rgba(255,255,255,0.35)]">✓ Bet placed — waiting for result…</p>
          )}
        </div>

        <div className="w-full max-w-lg mx-auto">
          <button onClick={()=>setShowHistory(!showHistory)} className="w-full flex items-center gap-2 text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors mb-2">
            <History size={13}/> {showHistory?'Hide':'Show'} My History
          </button>
          {showHistory&&<div className="dl-card rounded-2xl p-4"><BetHistory gameId={game.id} compact/></div>}
        </div>
      </div>
    </GameLayout>
  );
}
