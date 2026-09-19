'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRound } from '@/hooks/useRound';
import { gamesApi, playerApi, type Game, type TodayStats } from '@/lib/api';
import GameLayout, { CountdownTimer, BetDenominations, StatusBanner } from '@/components/games/GameLayout';
import BettingWheel from '@/components/games/BettingWheel';
import BetHistory from '@/components/games/BetHistory';
import Button from '@/components/ui/Button';
import { formatTokens } from '@/lib/utils';
import { RefreshCw, History, BarChart2, TrendingUp } from 'lucide-react';

export default function GreedyPage() {
  const { player, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [betResult, setBetResult] = useState<{ won: boolean; payout?: number } | null>(null);
  const [autoBet, setAutoBet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [myBetThisRound, setMyBetThisRound] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.get('greedy').then(setGame).catch(() => {}); }, []);
  useEffect(() => { playerApi.getTodayStats().then(setTodayStats).catch(() => {}); }, []);

  const { round, totals, countdown, betting, placeBet } = useRound({ gameId: game?.id || '' });

  useEffect(() => {
    if (round?.status === 'BETTING_OPEN' && myBetThisRound !== round.id) {
      setBetResult(null);
      if (!autoBet) setSelectedOption(null);
    }
  }, [round?.id, round?.status]);

  useEffect(() => {
    if (round?.status === 'SETTLED' && round.winnerId && myBetThisRound === round.id) {
      const didWin = selectedOption === round.winnerId;
      const option = game?.options.find(o => o.id === round.winnerId);
      setBetResult({ won: didWin, payout: didWin ? betAmount * (option?.multiplier || 1) : 0 });
      refreshBalance().then(() => {
        playerApi.getTodayStats().then(setTodayStats).catch(() => {});
      });
    }
  }, [round?.status, round?.winnerId]);

  async function handleBet() {
    if (!selectedOption || !round) return;
    // Auto Bet stop condition (BRD G1-BR-05)
    if ((player?.balance ?? 0) < betAmount) {
      setAutoBet(false);
      alert('Auto Bet stopped: insufficient balance.');
      return;
    }
    try {
      await placeBet(selectedOption, betAmount);
      setMyBetThisRound(round.id);
      await refreshBalance();
    } catch (err: unknown) { alert((err as Error).message); }
  }

  useEffect(() => {
    if (autoBet && round?.status === 'BETTING_OPEN' && selectedOption && myBetThisRound !== round.id) handleBet();
  }, [round?.id, round?.status, autoBet]);

  const winnerOption = game?.options.find(o => o.id === round?.winnerId);
  const canBet = round?.status === 'BETTING_OPEN' && selectedOption && !betting && myBetThisRound !== round?.id;
  const balance = player?.balance ?? 0;
  if (!player || !game) return null;

  return (
    <GameLayout title={game.branding?.displayName || 'Greedy'} branding={game.branding} balance={balance} roundNumber={round?.roundNumber} gameSlug="greedy">
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1">
        {/* Main column */}
        <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
          {round && <StatusBanner status={round.status} winnerId={round.winnerId} winnerLabel={winnerOption?.label}/>}

          {betResult && (
            <div className={`w-full rounded-2xl p-4 text-center border result-pop ${betResult.won ? 'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.3)]' : 'bg-[rgba(255,61,87,0.08)] border-[rgba(255,61,87,0.3)]'}`}>
              <div className={`text-2xl font-black ${betResult.won ? 'text-[#ffd700] text-glow-gold' : 'text-[#ff3d57]'}`}>
                {betResult.won ? `🏆 WIN! +🪙${formatTokens(betResult.payout!)}` : '💔 Better luck next round!'}
              </div>
              {betResult.won && <div className="text-xs text-[rgba(255,255,255,0.5)] mt-1">Winner: {winnerOption?.label}</div>}
            </div>
          )}

          <div className="mt-2 mb-8">
            <BettingWheel options={game.options} totals={totals} selectedOptionId={selectedOption}
              onSelect={setSelectedOption} disabled={round?.status !== 'BETTING_OPEN' || myBetThisRound === round?.id}
              winnerId={round?.status === 'SETTLED' ? round.winnerId : null}
              spinning={round?.status === 'RESULT_PROCESSING'} centerEmoji="🐷" centerLabel="GREEDY"/>
          </div>

          {round && <div className="w-full max-w-[260px]"><CountdownTimer seconds={countdown} status={round.status}/></div>}

          {/* Bet controls */}
          <div className="w-full max-w-[420px] dl-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-wide">Bet Amount</span>
              <span className="text-sm font-black text-[#ffd700]">🪙 {formatTokens(betAmount)}</span>
            </div>
            <BetDenominations selected={betAmount} onSelect={setBetAmount} disabled={round?.status !== 'BETTING_OPEN'}/>
            <div className="flex gap-2">
              <Button onClick={handleBet} disabled={!canBet} loading={betting} variant="gold" className="flex-1" size="lg">
                {myBetThisRound === round?.id ? '✓ Placed' : selectedOption ? `Bet 🪙${formatTokens(betAmount)}` : 'Select option'}
              </Button>
              <Button
                onClick={() => {
                  if (!autoBet && (player?.balance ?? 0) < betAmount) {
                    alert('Insufficient balance to start Auto Bet.');
                    return;
                  }
                  setAutoBet(!autoBet);
                }}
                variant={autoBet ? 'primary' : 'ghost'} size="lg">
                <RefreshCw size={16} className={autoBet ? 'animate-spin' : ''}/>  Auto
              </Button>
            </div>
            {selectedOption && (
              <p className="text-xs text-center text-[rgba(255,255,255,0.35)]">
                Potential win: 🪙 {formatTokens(betAmount * (game.options.find(o=>o.id===selectedOption)?.multiplier||1))}
              </p>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="w-full lg:w-64 space-y-3">
          {/* Round Stats */}
          <div className="dl-card rounded-2xl p-4">
            <h3 className="font-black text-sm mb-3 flex items-center gap-2 text-[rgba(255,255,255,0.7)]"><BarChart2 size={14}/> Round Stats</h3>
            <div className="space-y-2">
              {[
                { l:'Pool', v: `🪙 ${formatTokens(round?.totalBetAmount||0)}` },
                { l:'Round', v: `#${round?.roundNumber||'—'}` },
                { l:'Balance', v: formatTokens(balance), gold: true },
              ].map(({l,v,gold})=>(
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-[rgba(255,255,255,0.4)]">{l}</span>
                  <span className={`font-bold ${gold?'text-[#ffd700]':'text-white'}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Earnings (BRD G2-UI-06) */}
          <div className="dl-card rounded-2xl p-4">
            <h3 className="font-black text-sm mb-3 flex items-center gap-2 text-[rgba(255,255,255,0.7)]">
              <TrendingUp size={14} className="text-[#00e676]"/> Today&apos;s Earnings
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[rgba(255,255,255,0.4)]">Net</span>
                <span className={`font-black ${(todayStats?.todayEarnings ?? 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>
                  {todayStats
                    ? `${todayStats.todayEarnings >= 0 ? '+' : ''}🪙${formatTokens(todayStats.todayEarnings)}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[rgba(255,255,255,0.4)]">Won</span>
                <span className="font-bold text-[#ffd700]">🪙{formatTokens(todayStats?.todayWon ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[rgba(255,255,255,0.4)]">Bets</span>
                <span className="font-bold text-white">{todayStats?.todayBetCount ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Live bet breakdown */}
          <div className="dl-card rounded-2xl p-4">
            <h3 className="font-black text-sm mb-3 text-[rgba(255,255,255,0.7)]">Current Bets</h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {totals.sort((a,b)=>b.totalAmount-a.totalAmount).slice(0,8).map(t => {
                const opt = game.options.find(o=>o.id===t.optionId);
                const pct = round?.totalBetAmount ? (t.totalAmount/round.totalBetAmount)*100 : 0;
                return (
                  <div key={t.optionId} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor:opt?.colorHex||'#888'}}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-[rgba(255,255,255,0.6)] truncate">{t.label}</span>
                        <span className="text-[rgba(255,255,255,0.35)]">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1 bg-[rgba(61,17,85,0.8)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:opt?.colorHex||'#ff1fa6'}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!totals.length && <p className="text-xs text-[rgba(255,255,255,0.25)]">No bets yet</p>}
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
