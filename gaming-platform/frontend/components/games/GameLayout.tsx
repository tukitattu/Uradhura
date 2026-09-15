'use client';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Volume2, VolumeX, Settings, Wifi } from 'lucide-react';
import { useState } from 'react';
import { cn, formatTokens } from '@/lib/utils';

interface GameLayoutProps {
  children: React.ReactNode;
  title: string;
  balance: number;
  roundNumber?: number;
  onBack?: () => void;
}

export default function GameLayout({ children, title, balance, roundNumber, onBack }: GameLayoutProps) {
  const [muted, setMuted] = useState(false);

  return (
    <div className="min-h-screen bg-game-bg text-white flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #1a1f2e 0%, #0d1117 70%)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-card/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/games"
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Back to games"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-base">{title}</h1>
            {roundNumber && (
              <p className="text-xs text-gray-400">Round #{roundNumber}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection */}
          <div className="flex items-center gap-1 text-xs text-game-green">
            <Wifi size={14} />
            <span className="hidden sm:inline">Live</span>
          </div>

          {/* Balance */}
          <div className="bg-game-card border border-game-border rounded-lg px-3 py-1.5 text-sm font-bold text-game-gold">
            🪙 {formatTokens(balance)}
          </div>

          {/* Controls */}
          <button
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <Link href="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400" aria-label="Help">
            <HelpCircle size={18} />
          </Link>
          <Link href="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400" aria-label="Settings">
            <Settings size={18} />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

// ─── Countdown Timer ───────────────────────────────────────────────────────────

interface CountdownProps {
  seconds: number;
  status: string;
}

export function CountdownTimer({ seconds, status }: CountdownProps) {
  const isUrgent = seconds <= 5 && status === 'BETTING_OPEN';
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border p-3',
      status === 'BETTING_OPEN' ? 'border-game-green/50 bg-game-green/10' : 'border-game-border bg-game-card',
      isUrgent && 'border-game-red/50 bg-game-red/10 animate-pulse'
    )}>
      <span className="text-xs text-gray-400 mb-1">
        {status === 'BETTING_OPEN' ? 'Bet closes in' : status === 'BETTING_CLOSED' ? 'Processing...' : status === 'SETTLED' ? 'Settled' : 'Starting...'}
      </span>
      <span className={cn('text-3xl font-black tabular-nums', isUrgent ? 'text-game-red' : 'text-white')}>
        {status === 'BETTING_OPEN'
          ? seconds
          : status === 'BETTING_CLOSED' || status === 'RESULT_PROCESSING'
          ? '⏳'
          : status === 'SETTLED'
          ? '✓'
          : '...'}
      </span>
    </div>
  );
}

// ─── Bet Denominations ────────────────────────────────────────────────────────

const DENOMINATIONS = [1000, 5000, 50000, 100000];

interface BetDenomProps {
  selected: number;
  onSelect: (amount: number) => void;
  disabled?: boolean;
}

export function BetDenominations({ selected, onSelect, disabled }: BetDenomProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {DENOMINATIONS.map((d) => (
        <button
          key={d}
          onClick={() => onSelect(d)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-bold border transition-all',
            selected === d
              ? 'bg-game-gold text-black border-game-gold scale-105'
              : 'bg-game-card border-game-border text-gray-300 hover:border-game-gold/50 hover:text-game-gold',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {formatTokens(d)}
        </button>
      ))}
    </div>
  );
}

// ─── Round Status Banner ──────────────────────────────────────────────────────

interface StatusBannerProps {
  status: string;
  winnerId?: string;
  winnerLabel?: string;
}

export function StatusBanner({ status, winnerLabel }: StatusBannerProps) {
  const config: Record<string, { label: string; className: string }> = {
    UPCOMING: { label: 'Next round starting soon...', className: 'bg-gray-700/50 text-gray-300' },
    BETTING_OPEN: { label: '🎯 Place your bets now!', className: 'bg-game-green/20 text-game-green border border-game-green/30' },
    BETTING_CLOSED: { label: '🔒 Betting closed — wait for result', className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
    RESULT_PROCESSING: { label: '🎲 Drawing result...', className: 'bg-brand-500/20 text-brand-400 border border-brand-500/30' },
    SETTLED: { label: `🏆 Winner: ${winnerLabel || 'Announced!'}`, className: 'bg-game-gold/20 text-game-gold border border-game-gold/30' },
    CLOSED: { label: 'Round closed', className: 'bg-gray-700/50 text-gray-400' },
  };
  const cfg = config[status] || config.UPCOMING;
  return (
    <div className={cn('text-center py-2 px-4 rounded-lg text-sm font-semibold', cfg.className)}>
      {cfg.label}
    </div>
  );
}
