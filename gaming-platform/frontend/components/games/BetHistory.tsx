'use client';
import { useState, useEffect } from 'react';
import { betsApi, type Bet } from '@/lib/api';
import { cn, formatTokens } from '@/lib/utils';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface BetHistoryProps {
  gameId?: string;
  compact?: boolean;
}

export default function BetHistory({ gameId, compact }: BetHistoryProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    betsApi.myBets(1, gameId).then((data) => {
      setBets(data.bets.slice(0, compact ? 5 : 20));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gameId, compact]);

  if (loading) return <div className="text-gray-400 text-sm text-center py-4">Loading history...</div>;
  if (!bets.length) return <div className="text-gray-400 text-sm text-center py-4">No bets yet</div>;

  return (
    <div className="space-y-1">
      {bets.map((bet) => (
        <div
          key={bet.id}
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg text-sm border',
            bet.status === 'WON' ? 'bg-game-green/10 border-game-green/20' :
            bet.status === 'LOST' ? 'bg-game-red/10 border-game-red/20' :
            'bg-game-card border-game-border'
          )}
        >
          <div className="flex items-center gap-2">
            {bet.status === 'WON' ? <TrendingUp size={14} className="text-game-green" /> :
             bet.status === 'LOST' ? <TrendingDown size={14} className="text-game-red" /> :
             <Clock size={14} className="text-gray-400" />}
            <span className="text-gray-300">{bet.option?.label || '...'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">🪙 {formatTokens(bet.amount)}</span>
            {bet.status === 'WON' && bet.payout && (
              <span className="text-game-green font-bold">+{formatTokens(bet.payout)}</span>
            )}
            {bet.status === 'LOST' && (
              <span className="text-game-red font-bold">-{formatTokens(bet.amount)}</span>
            )}
            {bet.status === 'PENDING' && (
              <span className="text-gray-400 text-xs">Pending</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
