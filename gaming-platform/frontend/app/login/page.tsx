'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const player = await login(email, password);
      router.push(player.role === 'admin' || player.role === 'super_admin' ? '/admin' : '/games');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-end sm:justify-center pb-8 sm:pb-0 px-4"
      style={{
        background: 'radial-gradient(ellipse at 50% -10%, #6d00a0 0%, #3d0060 30%, #0a0010 70%)',
        backgroundImage: 'radial-gradient(ellipse at 50% -10%, #6d00a0 0%, #3d0060 30%, #0a0010 70%), url(/assets/logo/dearlive-poster.png)',
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center top',
        backgroundBlendMode: 'normal',
      }}>

      {/* Logo */}
      <div className="mb-8 sm:mb-10 text-center animate-fade-in">
        <img src="/assets/logo/dearlive-logo.png" alt="DearLive" className="h-28 sm:h-36 mx-auto drop-shadow-2xl animate-float" />
        <p className="text-[rgba(255,255,255,0.5)] text-sm mt-2 tracking-widest uppercase font-semibold">Where Love Lives</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm slide-up">
        <div className="dl-card-glow rounded-2xl p-6 backdrop-blur-xl">
          <h2 className="text-xl font-black text-white text-center mb-6">Welcome Back 💜</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[rgba(255,61,87,0.12)] border border-[rgba(255,61,87,0.3)] text-[#ff3d57] text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[rgba(255,255,255,0.5)] mb-1.5 uppercase tracking-wide">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="you@example.com" required
                className="dl-input" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[rgba(255,255,255,0.5)] mb-1.5 uppercase tracking-wide">Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                type="password" placeholder="••••••••" required
                className="dl-input" />
            </div>

            <button type="submit" disabled={loading}
              className="dl-btn-pink w-full py-3 text-base font-black rounded-xl mt-2 flex items-center justify-center gap-2">
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : '✨ Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[rgba(255,255,255,0.4)] mt-5">
            No account?{' '}
            <Link href="/register" className="text-[#ff1fa6] font-bold hover:text-[#ff52bf] transition-colors">Register</Link>
          </p>

          <div className="mt-5 pt-4 border-t border-[rgba(61,17,85,0.6)] space-y-1">
            <p className="text-center text-[10px] text-[rgba(255,255,255,0.25)] font-mono">player@gaming.com / player123</p>
            <p className="text-center text-[10px] text-[rgba(255,255,255,0.25)] font-mono">admin@gaming.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
