import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-game-bg disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-brand-500 hover:bg-brand-600 text-white focus:ring-brand-500',
      secondary: 'bg-game-card border border-game-border hover:bg-game-border text-white focus:ring-game-border',
      danger: 'bg-game-red hover:bg-red-700 text-white focus:ring-game-red',
      ghost: 'bg-transparent hover:bg-white/10 text-gray-300 focus:ring-white/20',
      gold: 'bg-game-gold hover:bg-yellow-500 text-black focus:ring-game-gold',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;
