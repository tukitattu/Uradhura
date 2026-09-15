'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await register(username, email, password); router.push('/games'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-end sm:justify-center pb-8 sm:pb-0 px-4"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, #6d00a0 0%, #3d0060 30%, #0a0010 70%)' }}>
      <div className="mb-8 text-center animate-fade-in">
        <img src="/assets/logo/dearlive-logo.png" alt="DearLive" className="h-24 mx-auto drop-shadow-2xl animate-float" />
      </div>
      <div className="w-full max-w-sm slide-up">
        <div className="dl-card-glow rounded-2xl p-6">
          <h2 className="text-xl font-black text-white text-center mb-6">Join DearLive 💎</h2>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[rgba(255,61,87,0.12)] border border-[rgba(255,61,87,0.3)] text-[#ff3d57] text-sm text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Username', value: username, set: setUsername, type: 'text', placeholder: 'YourName99' },
              { label: 'Email',    value: email,    set: setEmail,    type: 'email', placeholder: 'you@example.com' },
              { label: 'Password', value: password, set: setPassword, type: 'password', placeholder: 'min 8 characters' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-bold text-[rgba(255,255,255,0.5)] mb-1.5 uppercase tracking-wide">{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)}
                  type={f.type} placeholder={f.placeholder} required className="dl-input"
                  minLength={f.type === 'password' ? 8 : undefined} />
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="dl-btn-pink w-full py-3 text-base font-black rounded-xl mt-2 flex items-center justify-center gap-2">
              {loading ? <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : '💜 Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-[rgba(255,255,255,0.4)] mt-5">
            Have an account?{' '}
            <Link href="/login" className="text-[#ff1fa6] font-bold hover:text-[#ff52bf]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
