import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pink' | 'gold' | 'green' | 'red' | 'purple' | 'blue' | 'gray' | 'hot';
  className?: string;
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn(
      variant === 'pink'   && 'dl-badge-pink',
      variant === 'gold'   && 'dl-badge-gold',
      variant === 'green'  && 'dl-badge-green',
      variant === 'red'    && 'dl-badge-red',
      variant === 'purple' && 'dl-badge-purple',
      variant === 'blue'   && 'dl-badge-blue',
      variant === 'gray'   && 'dl-badge-gray',
      variant === 'hot'    && 'dl-badge-pink animate-pulse',
      className
    )}>
      {children}
    </span>
  );
}
