import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, suffix, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          className={cn(
            'w-full bg-[#0d1117] border border-game-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors',
            suffix && 'pr-8',
            error && 'border-game-red',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-game-red text-xs mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
export default Input;
