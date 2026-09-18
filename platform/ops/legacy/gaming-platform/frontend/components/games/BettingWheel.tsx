'use client';
import { useRef, useEffect, useState } from 'react';
import { cn, formatMultiplier } from '@/lib/utils';
import type { GameOption, OptionTotal } from '@/lib/api';

interface BettingWheelProps {
  options: GameOption[];
  totals: OptionTotal[];
  selectedOptionId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  winnerId?: string | null;
  spinning?: boolean;
  centerLabel?: string;
  centerEmoji?: string;
}

export default function BettingWheel({
  options, totals, selectedOptionId, onSelect, disabled,
  winnerId, spinning, centerLabel = 'GAME', centerEmoji = '🎮',
}: BettingWheelProps) {
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>();

  useEffect(() => {
    if (spinning) {
      let angle = rotation;
      const target = angle + 1440 + Math.random() * 360;
      const duration = 3500;
      const start = performance.now();
      const animate = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        setRotation((rotation + (target - rotation) * eased) % 360);
        if (p < 1) animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animRef.current!);
    }
  }, [spinning]);

  if (!options.length) return null;

  const sliceAngle = 360 / options.length;
  const totalPool  = totals.reduce((s, t) => s + t.totalAmount, 0);

  return (
    <div className="relative flex items-center justify-center select-none w-full max-w-[340px] sm:max-w-[380px] mx-auto">
      <div className="relative w-full aspect-square overflow-visible">

        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,31,166,0.08) 0%, transparent 70%)' }} />

        {/* Conic wheel */}
        <div className="absolute inset-[10%] rounded-full border-2 border-[rgba(61,17,85,0.8)]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'none' : 'transform 0.4s ease',
            background: `conic-gradient(${options.map((o, i) =>
              `${o.colorHex}28 ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`
            ).join(', ')})`,
            boxShadow: '0 0 40px rgba(139,0,255,0.15), inset 0 0 40px rgba(0,0,0,0.4)',
          }}
        />

        {/* Tick lines */}
        {options.map((_, i) => {
          const a = (i * sliceAngle - 90) * (Math.PI / 180);
          return (
            <div key={i} className="absolute inset-[10%] rounded-full"
              style={{
                transform: `rotate(${i * sliceAngle}deg)`,
                transformOrigin: 'center',
              }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-[10%] bg-[rgba(255,255,255,0.06)]" />
            </div>
          );
        })}

        {/* Top pointer */}
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 z-20 text-[#ffd700] text-xl drop-shadow-lg">▼</div>

        {/* Center circle */}
        <div className={cn(
          'absolute inset-[35%] rounded-full flex flex-col items-center justify-center z-10 border-2 transition-all duration-500',
          winnerId
            ? 'border-[#ffd700] bg-[rgba(255,215,0,0.12)] glow-gold'
            : 'border-[rgba(255,31,166,0.5)] bg-[rgba(10,0,16,0.95)] glow-pink'
        )}>
          <span className="text-xl leading-none">{centerEmoji}</span>
          <span className="text-[8px] font-black tracking-widest mt-0.5 text-gradient-pink uppercase">{centerLabel}</span>
        </div>

        {/* Option buttons in circle */}
        {options.map((option, i) => {
          const angle = (i * sliceAngle - 90) * (Math.PI / 180);
          const r = 41;
          const x = 50 + r * Math.cos(angle);
          const y = 50 + r * Math.sin(angle);
          const total = totals.find(t => t.optionId === option.id);
          const isSelected = selectedOptionId === option.id;
          const isWinner   = winnerId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => !disabled && onSelect(option.id)}
              disabled={disabled}
              className={cn(
                'bet-option',
                isSelected && 'selected',
                isWinner   && 'winner',
                disabled && !isWinner && 'disabled'
              )}
              style={{ left: `${x}%`, top: `${y}%`, borderColor: isWinner ? '#ffd700' : isSelected ? option.colorHex : `${option.colorHex}44` }}
            >
              <div className="px-1.5 py-1.5">
                {option.isHot && <div className="text-[9px] font-black text-[#ffaa00] -mb-0.5 text-center">🔥HOT</div>}
                <div className="text-[11px] font-black text-white leading-tight text-center">{option.label}</div>
                <div className="text-[10px] font-bold text-center" style={{ color: isWinner ? '#ffd700' : option.colorHex }}>
                  {formatMultiplier(option.multiplier)}
                </div>
                {total && total.totalAmount > 0 && (
                  <div className="text-[8px] text-[rgba(255,255,255,0.5)] text-center mt-0.5">
                    {Math.round(total.totalAmount / 1000)}K
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pool indicator */}
      {totalPool > 0 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-[rgba(255,255,255,0.4)] font-semibold whitespace-nowrap">
          Pool 🪙 {(totalPool / 1000).toFixed(1)}K
        </div>
      )}
    </div>
  );
}
