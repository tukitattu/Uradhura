import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'gold' | 'dark';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        variant === 'default' && 'dl-card',
        variant === 'glow'    && 'dl-card-glow',
        variant === 'gold'    && 'dl-card-gold',
        variant === 'dark'    && 'bg-[#0a0010] border border-[rgba(61,17,85,0.6)] rounded-2xl',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 border-b border-[rgba(61,17,85,0.6)]', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
