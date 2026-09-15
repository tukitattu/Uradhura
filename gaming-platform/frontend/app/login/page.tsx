'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
    setError('');
    setLoading(true);
    try {
      const player = await login(email, password);
      router.push(player.role === 'admin' || player.role === 'super_admin' ? '/admin' : '/games');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-bg px-4"
      style={{ background: 'radial-gradient(ellipse at center, #1a1f2e 0%, #0d1117 70%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎮</div>
          <h1 className="text-3xl font-black text-white">GameZone</h1>
          <p className="text-gray-400 mt-2">Sign in to play</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-game-card border border-game-border rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-game-red/20 border border-game-red/30 text-game-red text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign In
          </Button>
          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300">
              Register
            </Link>
          </p>
          <div className="border-t border-game-border pt-3 text-xs text-gray-500 text-center space-y-1">
            <p>Demo: player@gaming.com / player123</p>
            <p>Admin: admin@gaming.com / admin123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
