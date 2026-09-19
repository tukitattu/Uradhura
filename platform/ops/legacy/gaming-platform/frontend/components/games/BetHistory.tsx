'use client';
import { useState, useEffect } from 'react';
import { betsApi, type Bet } from '@/lib/api';
import { formatTokens } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface BetHistoryProps { gameId?: string; compact?: boolean; }

export default function BetHistory({ gameId, compact }: BetHistoryProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    betsApi.myBets(1, gameId).then(d => {
      setBets(d.bets.slice(0, compact ? 6 : 20));
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [gameId, compact]);

  if (loading) return (
    <div className="space-y-2">
      {Array.from({length:3}).map((_,i)=><div key={i} className="h-9 dl-skeleton rounded-xl"/>)}
    </div>
  );
  if (!bets.length) return <p className="text-[rgba(255,255,255,0.3)] text-xs text-center py-4">No bets yet</p>;

  return (
    <div className="space-y-1.5">
      {bets.map(bet => (
        <div key={bet.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all
          ${bet.status==='WON'  ? 'bg-[rgba(0,230,118,0.06)] border-[rgba(0,230,118,0.2)]'  :
            bet.status==='LOST' ? 'bg-[rgba(255,61,87,0.06)]  border-[rgba(255,61,87,0.2)]'   :
            'bg-[rgba(255,255,255,0.03)] border-[rgba(61,17,85,0.4)]'}`}>
          <div className="flex items-center gap-2">
            {bet.status==='WON'     ? <TrendingUp  size={13} className="text-[#00e676] shrink-0"/> :
             bet.status==='LOST'    ? <TrendingDown size={13} className="text-[#ff3d57] shrink-0"/> :
             <Clock size={13} className="text-[rgba(255,255,255,0.3)] shrink-0"/>}
            <span className="text-[rgba(255,255,255,0.7)] truncate max-w-[80px]">{bet.option?.label||'—'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[rgba(255,255,255,0.4)] text-xs">🪙{formatTokens(bet.amount)}</span>
            {bet.status==='WON'  && <span className="text-[#00e676] font-bold text-xs">+{formatTokens(bet.payout||0)}</span>}
            {bet.status==='LOST' && <span className="text-[#ff3d57] font-bold text-xs">-{formatTokens(bet.amount)}</span>}
            {bet.status==='PENDING' && <span className="text-[rgba(255,255,255,0.3)] text-xs">•••</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
