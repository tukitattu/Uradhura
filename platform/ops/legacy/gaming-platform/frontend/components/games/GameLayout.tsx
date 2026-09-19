'use client';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Volume2, VolumeX, Wifi, X } from 'lucide-react';
import { useState } from 'react';
import { cn, formatTokens } from '@/lib/utils';

// ─── Per-game rules registry ──────────────────────────────────────────────────
// BRD section references kept inline so they stay close to the UI.
export const GAME_RULES: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  greedy: {
    title: 'Greedy — How to Play',
    sections: [
      { heading: 'Objective', body: 'Pick the food option you think the wheel will land on. If your option wins, you collect your stake multiplied by that option\'s multiplier.' },
      { heading: 'Round flow', body: 'Each round progresses: Betting Open → Betting Closed → Result → Settled. Place your bet while the countdown is running. All new bets are rejected once the timer expires.' },
      { heading: 'Bet denominations', body: 'Select a stake chip (e.g. 1K, 5K, 50K, 100K), then tap an option on the wheel to place your bet.' },
      { heading: 'Multipliers', body: 'Each option shows its payout multiplier (e.g. ×3, ×5, ×10). A winning bet of 1,000 on a ×5 option pays out 5,000 tokens.' },
      { heading: 'Auto Bet', body: 'Toggle Auto Bet to repeat your current selection every round automatically. Auto Bet stops if your balance falls below the current stake amount.' },
      { heading: 'Result', body: 'The server determines the winning option. The result is final and auditable. The client never controls the outcome.' },
    ],
  },
  'animal-wheel': {
    title: 'Animal Wheel — How to Play',
    sections: [
      { heading: 'Objective', body: 'Choose an animal option on the wheel. If it wins, you receive your stake × multiplier.' },
      { heading: 'HOT options', body: 'Options flagged 🔥 HOT are highlighted by the operator. The HOT label is informational — it does not change the payout or probability.' },
      { heading: 'Recent results', body: 'The last 10 winning options appear as a strip above the wheel so you can see recent history at a glance.' },
      { heading: 'Auto Bet', body: 'Auto Bet re-selects and bets your current option every round. It stops automatically when your balance is below the stake.' },
      { heading: 'Multipliers', body: 'Higher multiplier options pay more but may have lower probability of winning. Final probabilities are set by the operator.' },
    ],
  },
  'food-wheel': {
    title: 'Food Wheel — How to Play',
    sections: [
      { heading: 'Objective', body: 'Bet on a food item. If it spins to the top, you win stake × multiplier.' },
      { heading: 'Packages', body: 'Pre-built packages bundle a fixed stake on a curated option at a set price. Tap a package to place that bet instantly.' },
      { heading: 'Big Winners', body: 'The Big Winners panel shows the five largest recent payouts on this game.' },
      { heading: 'Single bet', body: 'You can also select any individual option on the wheel and use the chip denominations to set your own stake.' },
      { heading: 'Round flow', body: 'Same lifecycle as all games: Betting Open → Closed → Result → Settled.' },
    ],
  },
  'teen-patti': {
    title: 'Teen Patti — How to Play',
    sections: [
      { heading: 'Objective', body: 'Three card positions are dealt (A, B, C). Choose which position you believe will have the strongest hand before the timer expires.' },
      { heading: 'Chips', body: 'Select a chip denomination (20, 100, 500, 1K), then tap a position to place your bet.' },
      { heading: 'Cards', body: 'Cards remain face-down during betting. When the timer ends, all hands are revealed and the server evaluates the winner according to the approved Teen Patti rules.' },
      { heading: 'Pot', body: 'Each position shows the total pool bet on it. Your contribution is tracked separately.' },
      { heading: 'Repeat', body: 'Tap Repeat to re-place your last bet on the same position in the next round.' },
      { heading: 'Payout', body: 'The winning position\'s multiplier is applied to all bets placed on it. Exact hand-ranking rules are configured by the operator.' },
    ],
  },
  'three-card': {
    title: 'Three Card — How to Play',
    sections: [
      { heading: 'Objective', body: 'Three colored positions (Red, Blue, Green) each receive three cards. Back the position you think will win.' },
      { heading: 'Multiplier', body: 'Reference multiplier is ×2.9 per BRD. The operator may configure a different value. Check the multiplier displayed on each position before betting.' },
      { heading: 'Cards', body: 'Cards are face-down during betting and flipped after the round closes. The server evaluates the winning hand.' },
      { heading: 'Click to bet', body: 'Tap any position to immediately place a bet at the current denomination. No separate confirm step.' },
      { heading: 'Repeat', body: 'Use the Repeat button to re-place your last bet on the same position.' },
    ],
  },
  slot: {
    title: 'Slot Machine — How to Play',
    sections: [
      { heading: 'Objective', body: 'The three reels spin and stop on a symbol. If all three land on the same symbol, the multiplier for that symbol\'s corresponding option is applied to your stake.' },
      { heading: 'Quick Spin vs Spin', body: 'Quick Spin skips the animation delay. Spin plays the full reel animation.' },
      { heading: 'Extra Bet', body: 'Toggle Extra Bet to add 50% to your stake for the same spin, increasing both risk and potential payout proportionally.' },
      { heading: 'Auto Play', body: 'Repeats your spin every round. Stops automatically when your balance falls below the current stake.' },
      { heading: 'Symbol selection', body: 'You can pre-select a symbol/option to bet on. Otherwise, a random option is chosen for you.' },
      { heading: 'Result', body: 'The winning option is determined server-side. The reel animation is cosmetic; the middle row always shows the authoritative winning symbol once the round settles.' },
    ],
  },
  'luck-bag': {
    title: 'Luck Bag — How to Play',
    sections: [
      { heading: 'Objective', body: 'Choose a lucky bag. Each bag contains a mystery multiplier revealed after the betting window closes.' },
      { heading: 'How to bet', body: 'Select a stake denomination and tap a bag to place your bet. You can only open one bag per round.' },
      { heading: 'Reveal', body: 'After betting closes, all bags are opened simultaneously. Your payout is stake × the multiplier hidden in your chosen bag.' },
      { heading: 'Round flow', body: 'Standard lifecycle: Betting Open → Closed → Result → Settled.' },
      { heading: 'Note', body: 'Luck Bag is a live-room bonus game. It is typically launched from inside a live audio room.' },
    ],
  },
};

// ─── GameLayout ───────────────────────────────────────────────────────────────

interface GameLayoutProps {
  children: React.ReactNode;
  title: string;
  balance: number;
  roundNumber?: number;
  onBack?: () => void;
  gameSlug?: string;
  branding?: { logoUrl?: string; primaryColor?: string; accentColor?: string; bgGradient?: string } | null;
}

export default function GameLayout({ children, title, balance, roundNumber, gameSlug, branding }: GameLayoutProps) {
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const rules = gameSlug ? GAME_RULES[gameSlug] : null;

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: branding?.bgGradient || 'radial-gradient(ellipse at 50% 0%, #3d0060 0%, #1a0028 40%, #0a0010 100%)',
    }}>
      <header className="sticky top-0 z-20 border-b border-[rgba(61,17,85,0.6)] bg-[rgba(10,0,16,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/games"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] transition-all hover:bg-[rgba(255,31,166,0.12)] hover:text-white"
              aria-label="Back to lobby">
              <ArrowLeft size={18} />
            </Link>

            <div className="flex min-w-0 items-center gap-2.5">
              <img src={branding?.logoUrl || '/assets/logo/ura-logo.jpg'} alt="Ura" className="h-8 w-8 rounded-full object-cover ring-1 ring-[#f6c453]/70" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-black leading-tight text-white" style={{ color: branding?.primaryColor || undefined }}>{title}</h1>
                {roundNumber && <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">Round #{roundNumber}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.08)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#00e676] sm:flex">
              <Wifi size={11} />
              Live
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.08)] px-2.5 py-1.5">
              <span className="text-sm font-black text-[#ffd700]">🪙 {formatTokens(balance)}</span>
            </div>
            <button onClick={() => setMuted(!muted)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] transition-all hover:text-white"
              aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] transition-all hover:text-[#ffd700]"
              aria-label="Game rules">
              <HelpCircle size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-8 pt-4">{children}</main>

      {/* ── Help / Rules modal ──────────────────────────────────────────────── */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHelp(false); }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden dl-card-glow bounce-in max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(61,17,85,0.6)] shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-[#ffd700]" />
                <span className="font-black text-white text-sm">
                  {rules?.title ?? `${title} — How to Play`}
                </span>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
                aria-label="Close help">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {rules ? (
                rules.sections.map((section) => (
                  <div key={section.heading}>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#ffd700] mb-1">
                      {section.heading}
                    </h3>
                    <p className="text-sm text-[rgba(255,255,255,0.7)] leading-relaxed">
                      {section.body}
                    </p>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#ffd700] mb-1">How to play</h3>
                    <p className="text-sm text-[rgba(255,255,255,0.7)]">
                      Place your bet before the countdown expires. The result is determined server-side.
                      Winnings are credited instantly after settlement.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#ffd700] mb-1">Round flow</h3>
                    <p className="text-sm text-[rgba(255,255,255,0.7)]">
                      Betting Open → Betting Closed → Result → Settled
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#ffd700] mb-1">Fair play</h3>
                    <p className="text-sm text-[rgba(255,255,255,0.7)]">
                      All results are generated and validated server-side. The client never controls the outcome.
                    </p>
                  </div>
                </div>
              )}

              {/* Common footer note */}
              <div className="pt-2 border-t border-[rgba(61,17,85,0.5)]">
                <p className="text-[10px] text-[rgba(255,255,255,0.3)] leading-relaxed">
                  All bets are final once accepted. Results are server-authoritative and auditable.
                  Auto Bet and Auto Play stop automatically when your balance is insufficient.
                  Play responsibly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
