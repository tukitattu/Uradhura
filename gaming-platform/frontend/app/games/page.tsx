'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { gamesApi, playerApi, betsApi, type Game, type TokenPackage } from '@/lib/api';
import { formatTokens } from '@/lib/utils';
import { LogOut, Trophy, Settings, X, Coins } from 'lucide-react';

const GAME_META: Record<string, { emoji: string; gradient: string; description: string }> = {
  greedy: { emoji: '🐷', gradient: 'from-orange-600 to-red-700', description: 'Spin the food wheel & win big multipliers' },
  'animal-wheel': { emoji: '🐯', gradient: 'from-yellow-600 to-orange-700', description: 'Wild animals, wild winnings' },
  'teen-patti': { emoji: '🃏', gradient: 'from-blue-600 to-indigo-700', description: 'Classic 3-card poker style' },
  'food-wheel': { emoji: '🍜', gradient: 'from-green-600 to-teal-700', description: 'Package deals & food spins' },
  'three-card': { emoji: '🎴', gradient: 'from-purple-600 to-pink-700', description: 'Three players, one winner' },
  slot: { emoji: '🎰', gradient: 'from-red-600 to-rose-700', description: 'Reels & multiplier jackpots' },
};

export default function GamesPage() {
  const { player, logout, loading, refreshBalance } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({ wonToday: 0, totalBets: 0 });

  // Top Up state
  const [showTopUp, setShowTopUp] = useState(false);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [toppingUp, setToppingUp] = useState<string | null>(null);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !player) router.push('/login');
  }, [player, loading, router]);

  useEffect(() => {
    gamesApi.list().then(setGames).catch(() => {}).finally(() => setGamesLoading(false));
  }, []);

  useEffect(() => {
    if (!player) return;
    betsApi.myBets(1).then(data => {
      const today = new Date().toDateString();
      const todayBets = data.bets.filter(b => new Date(b.createdAt).toDateString() === today);
      const wonToday = todayBets.filter(b => b.status === 'WON').reduce((s, b) => s + (b.payout || 0), 0);
      setTodayStats({ wonToday, totalBets: todayBets.length });
    }).catch(() => {});
  }, [player]);

  // Load packages when modal opens
  useEffect(() => {
    if (!showTopUp || packages.length > 0) return;
    setPackagesLoading(true);
    playerApi.getPackages()
      .then(setPackages)
      .catch(() => {})
      .finally(() => setPackagesLoading(false));
  }, [showTopUp, packages.length]);

  async function handleTopUp(pkg: TokenPackage) {
    setToppingUp(pkg.id);
    setTopUpSuccess(null);
    try {
      const result = await playerApi.topUp(pkg.id);
      await refreshBalance();
      setTopUpSuccess(`+${formatTokens(pkg.baseTokens + pkg.bonusTokens)} tokens added! New balance: 🪙 ${formatTokens(result.balance)}`);
    } catch {
      // silent — user can retry
    } finally {
      setToppingUp(null);
    }
  }

  if (loading || !player) return null;

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #1a1f2e 0%, #0d1117 70%)' }}>
      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#1a1f2e] border border-game-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-game-border">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-game-gold" />
                <h2 className="font-black text-white">Demo Top Up</h2>
              </div>
              <button
                onClick={() => { setShowTopUp(false); setTopUpSuccess(null); }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success banner */}
            {topUpSuccess && (
              <div className="mx-4 mt-4 px-4 py-3 bg-game-green/10 border border-game-green/30 rounded-xl text-game-green text-sm font-semibold">
                ✅ {topUpSuccess}
              </div>
            )}

            {/* Packages */}
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-4">
                Demo mode — tokens are credited instantly at no cost.
              </p>

              {packagesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : packages.length === 0 ? (
                <p className="text-gray-500 text-center py-6">No packages available.</p>
              ) : (
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleTopUp(pkg)}
                      disabled={!!toppingUp}
                      className="w-full flex items-center justify-between bg-game-card hover:bg-game-card/80 border border-game-border hover:border-brand-500/40 rounded-xl px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{pkg.name}</span>
                          {pkg.isPopular && (
                            <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-2 py-0.5 rounded-full">Popular</span>
                          )}
                          {pkg.isSpecialOffer && (
                            <span className="bg-game-gold/20 text-game-gold text-xs font-bold px-2 py-0.5 rounded-full">Special</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {pkg.baseTokens.toLocaleString()} base
                          {pkg.bonusTokens > 0 && ` + ${pkg.bonusTokens.toLocaleString()} bonus`}
                          {' '}tokens
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-black text-game-gold">
                          🪙 {formatTokens(pkg.baseTokens + pkg.bonusTokens)}
                        </p>
                        <p className="text-xs text-gray-500">${pkg.priceUsd.toFixed(2)}</p>
                      </div>
                      {toppingUp === pkg.id && (
                        <svg className="animate-spin h-4 w-4 ml-3 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            {/* Top Up button */}
            <button
              onClick={() => setShowTopUp(true)}
              className="text-xs text-brand-400 border border-brand-500/30 px-2 py-1 rounded-lg hover:bg-brand-500/10 transition-colors"
            >
              + Top Up
            </button>
            {/* Profile avatar */}
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm hover:bg-brand-500/30 transition-colors"
            >
              {player.username[0].toUpperCase()}
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
              aria-label="Logout"
            >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-game-card rounded-2xl animate-pulse border border-game-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => {
              const meta = GAME_META[game.slug] || { emoji: '🎲', gradient: 'from-gray-600 to-gray-700', description: 'Play and win' };
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.slug}`}
                  className="group relative rounded-2xl overflow-hidden border border-game-border hover:border-brand-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-500/10 active:scale-[0.98]"
                >
                  <div className={`bg-gradient-to-br ${meta.gradient} p-6 h-full min-h-[160px] flex flex-col justify-between`}>
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
            <div><p className="text-2xl font-black text-game-green">{formatTokens(todayStats.wonToday)}</p><p className="text-xs text-gray-400">Won Today</p></div>
            <div><p className="text-2xl font-black text-brand-400">{todayStats.totalBets}</p><p className="text-xs text-gray-400">Bets Today</p></div>
          </div>
        </div>
      </main>
    </div>
  );
}
