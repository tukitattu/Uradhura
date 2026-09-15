'use client';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Volume2, VolumeX, Wifi } from 'lucide-react';
import { useState } from 'react';
import { cn, formatTokens } from '@/lib/utils';

interface GameLayoutProps {
  children: React.ReactNode;
  title: string;
  balance: number;
  roundNumber?: number;
  onBack?: () => void;
  branding?: { logoUrl?: string; primaryColor?: string; accentColor?: string; bgGradient?: string } | null;
}

export default function GameLayout({ children, title, balance, roundNumber, branding }: GameLayoutProps) {
  const [muted, setMuted] = useState(false);
  return (
    <div className="min-h-screen flex flex-col" style={{
      background: branding?.bgGradient || 'radial-gradient(ellipse at 50% 0%, #3d0060 0%, #1a0028 40%, #0a0010 100%)',
    }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[rgba(61,17,85,0.6)] bg-[rgba(10,0,16,0.7)] backdrop-blur-md z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <Link href="/games"
            className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center hover:bg-[rgba(255,31,166,0.15)] transition-all"
            aria-label="Back">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <img src={branding?.logoUrl || '/assets/logo/ura-logo.jpg'} alt="Ura" className="h-8 w-8 rounded-full object-cover ring-1 ring-[#f6c453]/70" />
            <h1 className="font-black text-base text-white leading-tight" style={{ color: branding?.primaryColor || undefined }}>{title}</h1>
            {roundNumber && <p className="text-xs text-[rgba(255,255,255,0.4)]">Round #{roundNumber}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-[#00e676]">
            <Wifi size={12} />
            <span className="hidden sm:inline font-semibold">LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.25)] rounded-xl px-3 py-1.5">
            <span className="text-[#ffd700] text-sm font-black">🪙 {formatTokens(balance)}</span>
          </div>
          <button onClick={() => setMuted(!muted)}
            className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-all">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <Link href="/games"
            className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-all">
            <HelpCircle size={16} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

/* ─── Countdown Timer ────────────────────────────────────────────────────── */
interface CountdownProps { seconds: number; status: string; }

export function CountdownTimer({ seconds, status }: CountdownProps) {
  const isUrgent = seconds <= 5 && status === 'BETTING_OPEN';
  const isOpen   = status === 'BETTING_OPEN';
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-2xl px-4 py-3 transition-all',
      isOpen && !isUrgent && 'countdown-open',
      isUrgent && 'countdown-urgent',
      !isOpen && 'bg-[rgba(255,255,255,0.04)] border border-[rgba(61,17,85,0.6)]'
    )}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.5)] mb-0.5">
        {isOpen ? 'Closes in' : status === 'BETTING_CLOSED' ? 'Processing' : status === 'SETTLED' ? 'Settled' : 'Starting'}
      </span>
      <span className={cn(
        'text-3xl font-black tabular-nums leading-none',
        isUrgent ? 'text-[#ff3d57] text-glow-pink' : isOpen ? 'text-[#00e676]' : 'text-white'
      )}>
        {isOpen ? `${seconds}s` : status === 'BETTING_CLOSED' || status === 'RESULT_PROCESSING' ? '⏳' : status === 'SETTLED' ? '✓' : '...'}
      </span>
    </div>
  );
}

/* ─── Bet Denominations ──────────────────────────────────────────────────── */
const DENOMS = [1000, 5000, 50000, 100000];

interface BetDenomProps { selected: number; onSelect: (v: number) => void; disabled?: boolean; }

export function BetDenominations({ selected, onSelect, disabled }: BetDenomProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {DENOMS.map(d => (
        <button key={d} onClick={() => onSelect(d)} disabled={disabled}
          className={cn('dl-chip', selected === d && 'active', disabled && 'opacity-40 cursor-not-allowed')}>
          {formatTokens(d)}
        </button>
      ))}
    </div>
  );
}

/* ─── Status Banner ──────────────────────────────────────────────────────── */
interface StatusBannerProps { status: string; winnerId?: string; winnerLabel?: string; }

export function StatusBanner({ status, winnerLabel }: StatusBannerProps) {
  const config: Record<string, { label: string; className: string }> = {
    UPCOMING:          { label: '⏰ Next round starting soon…',        className: 'dl-card text-[rgba(255,255,255,0.5)]' },
    BETTING_OPEN:      { label: '💎 Place your bets now!',             className: 'status-betting' },
    BETTING_CLOSED:    { label: '🔒 Betting closed — drawing result…', className: 'status-closed' },
    RESULT_PROCESSING: { label: '✨ Drawing winner…',                  className: 'status-processing' },
    SETTLED:           { label: `🏆 Winner: ${winnerLabel || '—'}`,    className: 'status-settled' },
    CLOSED:            { label: 'Round closed',                         className: 'dl-card text-[rgba(255,255,255,0.4)]' },
  };
  const cfg = config[status] || config.UPCOMING;
  return (
    <div className={cn('w-full text-center py-2.5 px-4 rounded-xl text-sm font-bold', cfg.className)}>
      {cfg.label}
    </div>
  );
}
