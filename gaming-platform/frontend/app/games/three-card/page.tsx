'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game } from '@/lib/api';
import GameLayout, { CountdownTimer, BetDenominations, StatusBanner } from '@/components/games/GameLayout';
import Button from '@/components/ui/Button';
import { cn, formatTokens, dealCards } from '@/lib/utils';

const POS_CFG = [
  { key:'Red',   emoji:'🔴', grad:'from-[#4a0010] to-[#1a0028]', border:'border-[rgba(255,61,87,0.5)]',  glow:'rgba(255,61,87,0.5)' },
  { key:'Blue',  emoji:'🔵', grad:'from-[#001a4a] to-[#1a0028]', border:'border-[rgba(0,102,255,0.5)]',  glow:'rgba(0,102,255,0.5)' },
  { key:'Green', emoji:'🟢', grad:'from-[#004020] to-[#1a0028]', border:'border-[rgba(0,230,118,0.5)]',  glow:'rgba(0,230,118,0.5)' },
];

export default function ThreeCardPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game|null>(null);
  const [selectedOption, setSelectedOption] = useState<string|null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [myBetThisRound, setMyBetThisRound] = useState<string|null>(null);
  const [betResult, setBetResult] = useState<{won:boolean;payout?:number}|null>(null);
  const [dealtCards, setDealtCards] = useState<Record<string,string[]>>({});
  const [revealed, setRevealed] = useState(false);
  const [lastBet, setLastBet] = useState<{optionId:string;amount:number}|null>(null);

  useEffect(()=>{ if (!loading&&!player) router.push('/login'); },[player,loading,router]);
  useEffect(()=>{ gamesApi.get('three-card').then(setGame).catch(()=>{}); },[]);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id||'' });

  useEffect(()=>{
    if (round?.status==='RESULT_PROCESSING'&&game) {
      const cards:Record<string,string[]>={};
      game.options.forEach(o=>{cards[o.id]=dealCards(3);});
      setDealtCards(cards); setTimeout(()=>setRevealed(true),600);
    } else if (round?.status==='BETTING_OPEN') {
      setDealtCards({}); setRevealed(false); setBetResult(null);
    }
  },[round?.status,round?.id,game]);

  useEffect(()=>{
    if (round?.status==='SETTLED'&&myBetThisRound===round.id) {
      const didWin=selectedOption===round.winnerId;
      const opt=game?.options.find(o=>o.id===round.winnerId);
      setBetResult({won:didWin,payout:didWin?betAmount*(opt?.multiplier||1):0});
      refreshBalance();
    }
  },[round?.status,round?.winnerId]);

  async function handleBet(optionId?:string) {
    const oid=optionId||selectedOption; if (!oid||!round) return;
    try { await placeBet(oid,betAmount); setMyBetThisRound(round.id); setSelectedOption(oid); setLastBet({optionId:oid,amount:betAmount}); await refreshBalance(); }
    catch (err:unknown) { alert((err as Error).message); }
  }

  const SUITS:Record<string,string>={S:'♠',H:'♥',D:'♦',C:'♣'};
  const balance = player?.balance??0;
  const canBet = round?.status==='BETTING_OPEN'&&!betting&&myBetThisRound!==round?.id;
  if (!player||!game) return null;

  return (
    <GameLayout title="Three Card" balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto w-full flex-1">
        {round&&<StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={game.options.find(o=>o.id===round.winnerId)?.label}/>}
        {betResult&&(
          <div className={`w-full rounded-2xl p-4 text-center border result-pop ${betResult.won?'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.3)]':'bg-[rgba(255,61,87,0.08)] border-[rgba(255,61,87,0.3)]'}`}>
            <div className={`text-2xl font-black ${betResult.won?'text-[#ffd700] text-glow-gold':'text-[#ff3d57]'}`}>
              {betResult.won?`🎴 Win! +🪙${formatTokens(betResult.payout!)}`:'🎴 Lost this hand'}
            </div>
          </div>
        )}

        <div className="w-full grid grid-cols-3 gap-3">
          {game.options.map((option,i)=>{
            const cfg=POS_CFG.find(p=>p.key===option.label)||POS_CFG[i%3];
            const cards=dealtCards[option.id]||[];
            const optTotal=totals.find(t=>t.optionId===option.id);
            const isSelected=selectedOption===option.id;
            const isWinner=round?.winnerId===option.id;

            return (
              <button key={option.id} onClick={()=>canBet&&handleBet(option.id)} disabled={!canBet}
                className={cn('rounded-2xl border-2 p-3 flex flex-col items-center gap-2 transition-all',
                  `bg-gradient-to-b ${cfg.grad}`,cfg.border,
                  isWinner&&'scale-105',isSelected&&!isWinner&&'scale-102',
                  canBet&&'hover:scale-105 cursor-pointer',!canBet&&'cursor-not-allowed'
                )}
                style={{boxShadow:isWinner?`0 0 24px ${cfg.glow}`:isSelected?`0 0 12px ${cfg.glow}60`:undefined}}>
                <div className="text-2xl">{cfg.emoji}</div>
                <div className="text-xs font-black text-white">{option.label}</div>

                {/* Cards */}
                <div className="flex gap-1">
                  {(cards.length?cards:['?','?','?']).map((card,ci)=>{
                    const isRed=card.endsWith('H')||card.endsWith('D');
                    const isBack=card==='?';
                    return (
                      <div key={ci} className={cn('w-7 h-10 rounded border-2 flex items-center justify-center text-[9px] font-black',
                        isBack?'bg-gradient-to-b from-[#3d0060] to-[#1a0028] border-[rgba(255,31,166,0.4)] text-[rgba(255,31,166,0.5)]'
                        :cn('bg-white border-gray-100 shadow',isRed?'text-red-600':'text-gray-900'),
                        revealed&&!isBack&&`card-reveal-${ci}`
                      )}>
                        {isBack?'✦':<span>{card.slice(0,-1)}{SUITS[card.slice(-1)]}</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="text-center">
                  <div className="text-[10px] font-black text-[rgba(255,215,0,0.8)]">{option.multiplier}x</div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.35)]">🪙{formatTokens(optTotal?.totalAmount||0)}</div>
                </div>
                {isWinner&&<div className="text-xs font-black text-[#ffd700] animate-bounce">🏆 WINNER!</div>}
              </button>
            );
          })}
        </div>

        {round&&<div className="w-full max-w-[180px]"><CountdownTimer seconds={countdown} status={round.status}/></div>}

        <div className="w-full dl-card rounded-2xl p-4 space-y-3">
          <div className="text-xs text-[rgba(255,255,255,0.4)] text-center font-semibold">x2.9 multiplier on win · Click position to bet</div>
          <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={!canBet}/>
          <div className="flex gap-2">
            {selectedOption&&<Button onClick={()=>handleBet()} disabled={!canBet} loading={betting} variant="gold" className="flex-1">
              Confirm — {game.options.find(o=>o.id===selectedOption)?.label}
            </Button>}
            {lastBet&&<Button onClick={()=>handleBet(lastBet.optionId)} disabled={!canBet} variant="ghost">
              🔄 Repeat
            </Button>}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
