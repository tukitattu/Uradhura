'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { gamesApi, type Game } from '@/lib/api';
import { formatTokens } from '@/lib/utils';
import { LogOut, Trophy, Settings } from 'lucide-react';

const GAME_META: Record<string, { emoji: string; gradient: string; description: string }> = {
  greedy: { emoji: '🐷', gradient: 'from-orange-600 to-red-700', description: 'Spin the food wheel & win big multipliers' },
  'animal-wheel': { emoji: '🐯', gradient: 'from-yellow-600 to-orange-700', description: 'Wild animals, wild winnings' },
  'teen-patti': { emoji: '🃏', gradient: 'from-blue-600 to-indigo-700', description: 'Classic 3-card poker style' },
  'food-wheel': { emoji: '🍜', gradient: 'from-green-600 to-teal-700', description: 'Package deals & food spins' },
  'three-card': { emoji: '🎴', gradient: 'from-purple-600 to-pink-700', description: 'Three players, one winner' },
  slot: { emoji: '🎰', gradient: 'from-red-600 to-rose-700', description: 'Reels & multiplier jackpots' },
};

export default function GamesPage() {
  const { player, logout, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    if (!loading && !player) router.push('/login');
  }, [player, loading, router]);

  useEffect(() => {
    gamesApi.list().then(setGames).catch(() => {}).finally(() => setGamesLoading(false));
  }, []);

  if (loading || !player) return null;

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #1a1f2e 0%, #0d1117 70%)' }}>
      {/* Header */}
      <header className="border-b border-game-border bg-game-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <div>
              <h1 className="font-black text-lg text-white">GameZone</h1>
              <p className="text-xs text-gray-400">Welcome back, {player.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(player.role === 'admin' || player.role === 'super_admin') && (
              <Link href="/admin" className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 border border-brand-500/30 px-3 py-1.5 rounded-lg">
                <Settings size={14} /> Admin Panel
              </Link>
            )}
            <div className="bg-game-card border border-game-border rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="text-game-gold font-bold">🪙 {formatTokens(player.balance)}</span>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors" aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black mb-2">Choose Your Game</h2>
          <p className="text-gray-400">6 exciting games, live rounds, real-time betting</p>
        </div>

        {/* Games grid */}
        {gamesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-game-card rounded-2xl animate-pulse border border-game-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => {
              const meta = GAME_META[game.slug] || { emoji: '🎲', gradient: 'from-gray-600 to-gray-700', description: 'Play and win' };
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.slug}`}
                  className="group relative rounded-2xl overflow-hidden border border-game-border hover:border-brand-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-500/10"
                >
                  <div className={`bg-gradient-to-br ${meta.gradient} p-6 h-full min-h-[180px] flex flex-col justify-between`}>
                    <div>
                      <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{meta.emoji}</div>
                      <h3 className="text-xl font-black text-white">{game.name}</h3>
                      <p className="text-white/70 text-sm mt-1">{meta.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-white/60 text-xs">
                        {game.options.length} options
                      </span>
                      <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full group-hover:bg-white/30 transition-colors">
                        Play Now →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Today's stats */}
        <div className="mt-8 p-4 bg-game-card border border-game-border rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-game-gold" />
            <h3 className="font-bold">Your Stats Today</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-black text-game-gold">{formatTokens(player.balance)}</p><p className="text-xs text-gray-400">Balance</p></div>
            <div><p className="text-2xl font-black text-game-green">—</p><p className="text-xs text-gray-400">Won Today</p></div>
            <div><p className="text-2xl font-black text-brand-400">—</p><p className="text-xs text-gray-400">Total Bets</p></div>
          </div>
        </div>
      </main>
    </div>
  );
}
