import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'gold' | 'blue' | 'gray' | 'hot';
  className?: string;
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide',
        variant === 'green' && 'bg-game-green/20 text-game-green',
        variant === 'red' && 'bg-game-red/20 text-game-red',
        variant === 'gold' && 'bg-game-gold/20 text-game-gold',
        variant === 'blue' && 'bg-brand-500/20 text-brand-400',
        variant === 'gray' && 'bg-white/10 text-gray-400',
        variant === 'hot' && 'bg-orange-500 text-white animate-pulse',
        className
      )}
    >
      {children}
    </span>
  );
}
