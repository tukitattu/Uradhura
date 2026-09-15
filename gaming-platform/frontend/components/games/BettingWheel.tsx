'use client';
import { useState, useRef, useEffect } from 'react';
import { cn, formatMultiplier } from '@/lib/utils';
import type { GameOption, OptionTotal } from '@/lib/api';

interface BettingWheelProps {
  options: GameOption[];
  totals: OptionTotal[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
  winnerId?: string | null;
  spinning?: boolean;
  centerLabel?: string;
  centerEmoji?: string;
}

export default function BettingWheel({
  options,
  totals,
  selectedOptionId,
  onSelect,
  disabled,
  winnerId,
  spinning,
  centerLabel = 'GREEDY',
  centerEmoji = '🐷',
}: BettingWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>();

  const totalBets = totals.reduce((s, t) => s + t.totalAmount, 0);
  const r = 42; // radius percent from center — reduced from 44 to prevent edge clipping

  useEffect(() => {
    if (spinning) {
      let angle = rotation;
      const targetAngle = angle + 1800 + Math.random() * 360;
      const duration = 4000;
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        angle = rotation + (targetAngle - rotation) * eased;
        setRotation(angle % 360);
        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        }
      };
      animRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animRef.current!);
    }
  }, [spinning]);

  if (!options.length) return null;

  const sliceAngle = 360 / options.length;

  return (
    <div className="max-w-[340px] w-full mx-auto relative flex items-center justify-center select-none">
      {/* Outer ring - option buttons */}
      <div className="relative w-full aspect-square max-w-[320px] md:max-w-[400px] overflow-visible">
        {/* Spin wheel visual */}
        <div
          className="absolute inset-4 rounded-full border-4 border-game-border"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'none' : 'transform 0.3s ease',
            background: `conic-gradient(${options.map((o, i) => `${o.colorHex}33 ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`).join(', ')})`,
          }}
        />

        {/* Winner highlight pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 text-2xl">▼</div>

        {/* Center character */}
        <div className={cn(
          'absolute inset-[38%] rounded-full flex flex-col items-center justify-center z-10 border-4 font-black text-center shadow-2xl',
          winnerId ? 'border-game-gold bg-game-gold/20 animate-bounce-in' : 'border-brand-500 bg-game-bg'
        )}>
          <span className="text-2xl">{centerEmoji}</span>
          <span className="text-[8px] text-game-gold font-bold">{centerLabel}</span>
        </div>

        {/* Option buttons arranged in circle */}
        {options.map((option, i) => {
          const angle = (i * sliceAngle - 90) * (Math.PI / 180);
          const x = 50 + r * Math.cos(angle);
          const y = 50 + r * Math.sin(angle);
          const total = totals.find((t) => t.optionId === option.id);
          const isSelected = selectedOptionId === option.id;
          const isWinner = winnerId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => !disabled && onSelect(option.id)}
              disabled={disabled}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 z-20 rounded-lg border-2 transition-all text-center min-w-[44px] sm:min-w-[56px]',
                isSelected && 'scale-110 shadow-lg',
                isWinner && 'scale-125 animate-bounce-in shadow-2xl',
                disabled && !isWinner && 'opacity-70 cursor-not-allowed',
                !disabled && !isSelected && 'hover:scale-105 cursor-pointer'
              )}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: isWinner ? option.colorHex : isSelected ? option.colorHex + 'cc' : option.colorHex + '33',
                borderColor: isWinner ? option.colorHex : isSelected ? option.colorHex : option.colorHex + '66',
              }}
            >
              <div className="px-1.5 py-1">
                {option.isHot && (
                  <div className="text-[8px] font-black text-orange-400 -mb-0.5">HOT 🔥</div>
                )}
                <div className="text-xs font-black text-white leading-tight">{option.label}</div>
                <div className="text-[10px] font-bold" style={{ color: option.colorHex }}>
                  {formatMultiplier(option.multiplier)}
                </div>
                {total && total.totalAmount > 0 && (
                  <div className="text-[8px] text-gray-300 mt-0.5">{Math.round(total.totalAmount / 1000)}K</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Total pool indicator */}
      {totalBets > 0 && (
        <div className="absolute bottom-0 text-xs text-gray-400">
          Pool: 🪙{(totalBets / 1000).toFixed(1)}K
        </div>
      )}
    </div>
  );
}
