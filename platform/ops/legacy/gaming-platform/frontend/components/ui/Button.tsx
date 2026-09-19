import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'ghost' | 'danger' | 'secondary' | 'purple';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-bold rounded-xl transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

    const variants = {
      primary:   'dl-btn-pink',
      gold:      'dl-btn-gold',
      ghost:     'dl-btn-ghost',
      secondary: 'dl-btn-ghost',
      danger:    'dl-btn-danger',
      purple:    'bg-gradient-to-br from-[#8b00ff] to-[#6200ea] text-white font-bold border-none shadow-[0_4px_15px_rgba(139,0,255,0.4)]',
    };

    const sizes = {
      xs: 'px-2.5 py-1.5 text-xs gap-1',
      sm: 'px-3 py-2 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-sm gap-2',
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
          <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
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
