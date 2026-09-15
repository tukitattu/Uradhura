'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, type Game } from '@/lib/api';
import GameLayout, { CountdownTimer, StatusBanner } from '@/components/games/GameLayout';
import Button from '@/components/ui/Button';
import { formatTokens, dealCards } from '@/lib/utils';
import { cn } from '@/lib/utils';

const CHIP_AMOUNTS = [20, 100, 500, 1000];
const POS_COLORS: Record<string,{grad:string;border:string;glow:string}> = {
  'Player A': { grad:'from-[#4a0010] to-[#2a000a]', border:'border-[rgba(255,61,87,0.6)]',  glow:'rgba(255,61,87,0.5)' },
  'Player B': { grad:'from-[#001040] to-[#000820]', border:'border-[rgba(0,102,255,0.6)]',  glow:'rgba(0,102,255,0.5)' },
  'Player C': { grad:'from-[#004020] to-[#002010]', border:'border-[rgba(0,230,118,0.6)]',  glow:'rgba(0,230,118,0.5)' },
};

function CardDisplay({ cards, revealed }: { cards:string[]; revealed:boolean }) {
  const SUITS:Record<string,string> = { S:'♠', H:'♥', D:'♦', C:'♣' };
  const isRed = (c:string) => c.endsWith('H')||c.endsWith('D');
  return (
    <div className="flex gap-1 justify-center">
      {cards.map((card,i)=>(
        <div key={i} className={cn(
          'w-9 h-13 rounded-lg border-2 flex items-center justify-center text-xs font-black',
          revealed
            ? cn('bg-white border-gray-100 shadow-lg', isRed(card)?'text-red-600':'text-gray-900', `card-reveal-${i}`)
            : 'bg-gradient-to-b from-[#3d0060] to-[#1a0028] border-[rgba(255,31,166,0.4)] text-[rgba(255,31,166,0.5)]'
        )}>
          {revealed ? (
            <div className="text-center leading-none">
              <div>{card.slice(0,-1)}</div>
              <div className="text-[10px]">{SUITS[card.slice(-1)]||card.slice(-1)}</div>
            </div>
          ) : <div className="text-base">✦</div>}
        </div>
      ))}
    </div>
  );
}

export default function TeenPattiPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game|null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string|null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [dealtCards, setDealtCards] = useState<Record<string,string[]>>({});
  const [revealed, setRevealed] = useState(false);
  const [myBetThisRound, setMyBetThisRound] = useState<string|null>(null);
  const [betResult, setBetResult] = useState<{won:boolean;payout?:number}|null>(null);
  const [lastBet, setLastBet] = useState<{optionId:string;amount:number}|null>(null);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('teen-patti').then(setGame).catch(()=>{}); }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id||'' });

  useEffect(() => {
    if (round?.status==='RESULT_PROCESSING') {
      const cards:Record<string,string[]> = {};
      game?.options.forEach(o=>{ cards[o.id]=dealCards(3); });
      setDealtCards(cards);
      setTimeout(()=>setRevealed(true), 700);
    } else if (round?.status==='BETTING_OPEN') {
      setDealtCards({}); setRevealed(false); setBetResult(null);
      if (!lastBet) setSelectedPosition(null);
    }
  }, [round?.status, round?.id]);

  useEffect(() => {
    if (round?.status==='SETTLED' && myBetThisRound===round.id) {
      const didWin = selectedPosition===round.winnerId;
      const opt = game?.options.find(o=>o.id===round.winnerId);
      setBetResult({ won:didWin, payout:didWin?betAmount*(opt?.multiplier||1):0 });
      refreshBalance();
    }
  }, [round?.status, round?.winnerId]);

  async function handleBet(optionId:string) {
    if (!round) return;
    try {
      await placeBet(optionId, betAmount);
      setMyBetThisRound(round.id); setSelectedPosition(optionId);
      setLastBet({ optionId, amount:betAmount });
      await refreshBalance();
    } catch (err:unknown) { alert((err as Error).message); }
  }

  const balance = player?.balance ?? 0;
  if (!player || !game) return null;

  return (
    <GameLayout title={game.branding?.displayName || 'Teen Patti'} branding={game.branding} balance={balance} roundNumber={round?.roundNumber}>
      <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto w-full flex-1">
        {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={game.options.find(o=>o.id===round.winnerId)?.label}/>}

        {betResult && (
          <div className={`w-full rounded-2xl p-4 text-center border result-pop ${betResult.won?'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.3)]':'bg-[rgba(255,61,87,0.08)] border-[rgba(255,61,87,0.3)]'}`}>
            <div className={`text-2xl font-black ${betResult.won?'text-[#ffd700] text-glow-gold':'text-[#ff3d57]'}`}>
              {betResult.won?`🃏 WIN! +🪙${formatTokens(betResult.payout!)}`:'🃏 Lost this hand'}
            </div>
          </div>
        )}

        {/* Table felt */}
        <div className="w-full rounded-3xl p-5 border-2 border-[rgba(0,100,40,0.6)]"
          style={{ background:'radial-gradient(ellipse at center, #003020 0%, #001510 100%)', boxShadow:'0 0 40px rgba(0,150,60,0.2), inset 0 0 60px rgba(0,0,0,0.4)' }}>
          <div className="text-center mb-4">
            <div className="text-sm font-black text-[#ffd700] tracking-widest uppercase">Teen Patti</div>
            {round && <div className="text-xs text-[rgba(255,255,255,0.3)]">Round #{round.roundNumber}</div>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {game.options.map(option => {
              const colors = POS_COLORS[option.label] || { grad:'from-[#1a0028] to-[#0a0010]', border:'border-[rgba(61,17,85,0.6)]', glow:'rgba(255,31,166,0.3)' };
              const optTotal = totals.find(t=>t.optionId===option.id);
              const isSelected = selectedPosition===option.id;
              const isWinner = round?.winnerId===option.id;
              const cards = dealtCards[option.id]||[];
              const canBetHere = round?.status==='BETTING_OPEN' && myBetThisRound!==round?.id;

              return (
                <div key={option.id}
                  onClick={()=>canBetHere&&handleBet(option.id)}
                  className={cn(
                    'rounded-2xl border-2 p-3 flex flex-col items-center gap-2 transition-all',
                    `bg-gradient-to-b ${colors.grad}`,
                    colors.border,
                    isWinner && 'scale-105',
                    isSelected && !isWinner && 'scale-102',
                    canBetHere && 'cursor-pointer hover:scale-105',
                    !canBetHere && 'cursor-not-allowed'
                  )}
                  style={{ boxShadow: isWinner ? `0 0 24px ${colors.glow}` : isSelected ? `0 0 12px ${colors.glow}60` : undefined }}>
                  <div className="text-xs font-black text-white tracking-wide">{option.label}</div>
                  <CardDisplay cards={cards.length?cards:['back','back','back']} revealed={revealed&&cards.length>0}/>
                  <div className="text-center">
                    <div className="text-[10px] text-[rgba(255,255,255,0.4)]">Pot</div>
                    <div className="text-sm font-black text-[#ffd700]">🪙{formatTokens(optTotal?.totalAmount||0)}</div>
                  </div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.35)] font-bold">{option.multiplier}x</div>
                  {isWinner && <div className="text-xs font-black text-[#ffd700] animate-bounce text-glow-gold">WINNER! 🏆</div>}
                </div>
              );
            })}
          </div>

          {round && <div className="mt-4 max-w-[180px] mx-auto"><CountdownTimer seconds={countdown} status={round.status}/></div>}
        </div>

        {/* Chip selection */}
        <div className="w-full dl-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-wide">Select Chip</span>
            <span className="text-sm font-black text-[#ffd700]">Selected: {betAmount}</span>
          </div>
          <div className="flex gap-3 justify-center">
            {CHIP_AMOUNTS.map(c=>(
              <button key={c} onClick={()=>setBetAmount(c)}
                className={cn(
                  'w-14 h-14 rounded-full border-4 font-black text-xs transition-all',
                  betAmount===c
                    ? 'border-[#ffd700] bg-gradient-to-b from-[#ffd700] to-[#ff8c00] text-[#1a0028] scale-110 glow-gold'
                    : 'border-[rgba(61,17,85,0.8)] bg-[rgba(255,255,255,0.04)] text-white hover:border-[rgba(255,215,0,0.4)]'
                )}>
                {c>=1000?`${c/1000}K`:c}
              </button>
            ))}
          </div>
          {lastBet && (
            <Button onClick={()=>handleBet(lastBet.optionId)} disabled={round?.status!=='BETTING_OPEN'||myBetThisRound===round?.id} loading={betting} variant="ghost" className="w-full">
              🔄 Repeat — {game.options.find(o=>o.id===lastBet.optionId)?.label} · {lastBet.amount}
            </Button>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
