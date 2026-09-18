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
      {label && <label className="block text-xs font-semibold text-[rgba(255,255,255,0.5)] mb-1.5 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          className={cn('dl-input', suffix && 'pr-9', error && 'border-[rgba(255,61,87,0.6)]', className)}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)] text-xs font-bold">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-[#ff3d57] text-xs mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
export default Input;
