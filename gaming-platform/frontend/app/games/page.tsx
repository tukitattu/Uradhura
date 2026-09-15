'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { gamesApi, playerApi, betsApi, type Game, type TokenPackage } from '@/lib/api';
import { formatTokens } from '@/lib/utils';
import { LogOut, Settings, X, Coins, Sparkles, Crown } from 'lucide-react';

const GAME_META: Record<string, { emoji: string; bg: string; glow: string; tag: string }> = {
  greedy:        { emoji:'🐷', bg:'from-[#4a0020] to-[#1a0028]', glow:'rgba(255,31,166,0.3)',  tag:'Food Wheel' },
  'animal-wheel':{ emoji:'🐯', bg:'from-[#3d1500] to-[#1a0028]', glow:'rgba(255,140,0,0.3)',   tag:'Animal Spins' },
  'teen-patti':  { emoji:'🃏', bg:'from-[#001a4a] to-[#1a0028]', glow:'rgba(0,102,255,0.3)',   tag:'Card Game' },
  'food-wheel':  { emoji:'🍜', bg:'from-[#003d1a] to-[#1a0028]', glow:'rgba(0,230,118,0.3)',   tag:'Packages' },
  'three-card':  { emoji:'🎴', bg:'from-[#2d004a] to-[#1a0028]', glow:'rgba(139,0,255,0.3)',   tag:'3 Players' },
  slot:          { emoji:'🎰', bg:'from-[#4a0000] to-[#1a0028]', glow:'rgba(255,61,87,0.3)',   tag:'Jackpot' },
};

export default function GamesPage() {
  const { player, logout, loading, refreshBalance } = useAuth();
  const router = useRouter();
  const [games, setGames]   = useState<Game[]>([]);
  const [gLoading, setGL]   = useState(true);
  const [todayStats, setTS] = useState({ won: 0, bets: 0 });
  const [showTopUp, setST]  = useState(false);
  const [packages, setPkgs] = useState<TokenPackage[]>([]);
  const [toppingUp, setTU]  = useState<string | null>(null);
  const [topMsg, setTM]     = useState('');

  useEffect(() => { if (!loading && !player) router.push('/login'); }, [player, loading, router]);
  useEffect(() => { gamesApi.list().then(setGames).catch(()=>{}).finally(()=>setGL(false)); }, []);
  useEffect(() => {
    if (!player) return;
    betsApi.myBets(1).then(d => {
      const today = new Date().toDateString();
      const tb = d.bets.filter(b => new Date(b.createdAt).toDateString() === today);
      setTS({ won: tb.filter(b=>b.status==='WON').reduce((s,b)=>s+(b.payout||0),0), bets: tb.length });
    }).catch(()=>{});
  }, [player]);

  useEffect(() => {
    if (!showTopUp || packages.length) return;
    playerApi.getPackages().then(setPkgs).catch(()=>{});
  }, [showTopUp, packages.length]);

  async function handleTopUp(pkg: TokenPackage) {
    setTU(pkg.id); setTM('');
    try {
      const r = await playerApi.topUp(pkg.id);
      await refreshBalance();
      setTM(`+${formatTokens(pkg.baseTokens + pkg.bonusTokens)} tokens added!`);
    } catch {}
    finally { setTU(null); }
  }

  if (loading || !player) return null;

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at 50% -5%, #3d0060 0%, #1a0028 35%, #0a0010 100%)',
    }}>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md dl-card-glow rounded-2xl overflow-hidden bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(61,17,85,0.6)]">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-[#ffd700]" />
                <span className="font-black text-white">Top Up Tokens</span>
                <span className="dl-badge-purple text-[10px]">DEMO</span>
              </div>
              <button onClick={()=>{setST(false);setTM('');}} className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white">
                <X size={16} />
              </button>
            </div>
            {topMsg && (
              <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-[rgba(0,230,118,0.1)] border border-[rgba(0,230,118,0.3)] text-[#00e676] text-sm font-bold text-center bounce-in">
                ✅ {topMsg}
              </div>
            )}
            <div className="p-4 space-y-2">
              {packages.length === 0
                ? Array.from({length:4}).map((_,i)=><div key={i} className="h-16 dl-skeleton rounded-xl"/>)
                : packages.map(pkg => (
                  <button key={pkg.id} onClick={()=>handleTopUp(pkg)} disabled={!!toppingUp}
                    className="w-full flex items-center justify-between dl-card rounded-xl px-4 py-3 hover:border-[rgba(255,31,166,0.4)] transition-all disabled:opacity-50">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{pkg.name}</span>
                        {pkg.isPopular && <span className="dl-badge-pink text-[9px]">POPULAR</span>}
                      </div>
                      <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                        {pkg.baseTokens.toLocaleString()}{pkg.bonusTokens>0?` + ${pkg.bonusTokens} bonus`:''} tokens
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#ffd700]">🪙 {formatTokens(pkg.baseTokens+pkg.bonusTokens)}</span>
                      {toppingUp===pkg.id && <svg className="animate-spin h-4 w-4 text-[#ff1fa6]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[rgba(61,17,85,0.6)] bg-[rgba(10,0,16,0.85)] backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo/dearlive-logo.png" alt="DearLive" className="h-10 drop-shadow-lg" />
            <div className="hidden sm:block">
              <div className="text-xs text-[rgba(255,255,255,0.4)]">Welcome,</div>
              <div className="text-sm font-black text-white leading-tight">{player.username}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(player.role==='admin'||player.role==='super_admin') && (
              <Link href="/admin" className="flex items-center gap-1.5 text-xs font-bold text-[#ff1fa6] border border-[rgba(255,31,166,0.3)] px-3 py-1.5 rounded-xl hover:bg-[rgba(255,31,166,0.1)] transition-all">
                <Settings size={13}/> Admin
              </Link>
            )}
            <div className="flex items-center gap-1.5 bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] rounded-xl px-3 py-1.5">
              <span className="text-[#ffd700] text-sm font-black">🪙 {formatTokens(player.balance)}</span>
            </div>
            <button onClick={()=>setST(true)} className="text-xs font-bold text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.1)] px-2.5 py-1.5 rounded-xl hover:border-[rgba(255,31,166,0.4)] hover:text-white transition-all">
              + Top Up
            </button>
            <Link href="/profile" className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff1fa6] to-[#8b00ff] flex items-center justify-center text-white font-black text-sm glow-pink">
              {player.username[0].toUpperCase()}
            </Link>
            <button onClick={logout} className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:text-white transition-all">
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-12">
        {/* Hero */}
        <div className="text-center mb-8 pt-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={18} className="text-[#ffd700]" />
            <h2 className="text-3xl sm:text-4xl font-black text-gradient-gold">Choose Your Game</h2>
            <Sparkles size={18} className="text-[#ffd700]" />
          </div>
          <p className="text-[rgba(255,255,255,0.4)] text-sm">6 live games · Real-time betting · Instant payouts</p>
        </div>

        {/* Games grid */}
        {gLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({length:6}).map((_,i)=><div key={i} className="h-44 dl-skeleton rounded-2xl"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {games.map(game => {
              const m = GAME_META[game.slug] || { emoji:'🎲', bg:'from-[#1a0028] to-[#0a0010]', glow:'rgba(255,31,166,0.2)', tag:'Game' };
              return (
                <Link key={game.id} href={`/games/${game.slug}`}
                  className="group relative rounded-2xl overflow-hidden border border-[rgba(61,17,85,0.6)] hover:border-[rgba(255,31,166,0.4)] transition-all active:scale-95"
                  style={{ boxShadow: `0 4px 20px ${m.glow}` }}>
                  <div className={`bg-gradient-to-b ${m.bg} p-5 h-full min-h-[160px] flex flex-col justify-between`}>
                    {/* Glow bg */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: `radial-gradient(circle at 50% 50%, ${m.glow}, transparent 70%)` }} />
                    <div className="relative">
                      <div className="text-5xl mb-2 group-hover:scale-110 transition-transform drop-shadow-lg">{m.emoji}</div>
                      <div className="text-base font-black text-white leading-tight">{game.name}</div>
                      <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5 font-semibold uppercase tracking-wide">{m.tag}</div>
                    </div>
                    <div className="relative flex items-center justify-between mt-3">
                      <span className="text-[10px] text-[rgba(255,255,255,0.3)]">{game.options.length} options</span>
                      <span className="dl-badge-pink text-[9px]">LIVE</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 dl-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-[#ffd700]"/>
            <span className="font-black text-white text-sm">Today&apos;s Stats</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-black text-[#ffd700]">🪙 {formatTokens(player.balance)}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5 uppercase tracking-wide">Balance</div>
            </div>
            <div>
              <div className="text-xl font-black text-[#00e676]">{formatTokens(todayStats.won)}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5 uppercase tracking-wide">Won Today</div>
            </div>
            <div>
              <div className="text-xl font-black text-[#ff1fa6]">{todayStats.bets}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5 uppercase tracking-wide">Bets Today</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
