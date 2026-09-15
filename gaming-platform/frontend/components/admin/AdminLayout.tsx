'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Gamepad2, Users, TrendingUp, Package,
  FileText, Shield, Settings, LogOut, Bell, Search, Crown,
} from 'lucide-react';

const NAV_ITEMS = [
  { href:'/admin',               label:'Dashboard',     icon:LayoutDashboard },
  { href:'/admin/games',         label:'Games',         icon:Gamepad2 },
  { href:'/admin/players',       label:'Players',       icon:Users },
  { href:'/admin/profit-risk',   label:'Profit & Risk', icon:TrendingUp },
  { href:'/admin/token-packages',label:'Token Packages',icon:Package },
  { href:'/admin/reports',       label:'Reports',       icon:FileText },
  { href:'/admin/audit-logs',    label:'Audit Logs',    icon:Shield },
  { href:'/admin/settings',      label:'Settings',      icon:Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { player, loading, logout } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && (!player || (player.role !== 'admin' && player.role !== 'super_admin'))) {
      router.push('/login');
    }
  }, [player, loading, router]);

  if (loading || !player) return null;

  const isSuperAdmin = player.role === 'super_admin';

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0010' }}>
      {/* Sidebar */}
      <aside className="dl-sidebar w-52 flex flex-col flex-shrink-0 fixed h-full z-20 overflow-y-auto">
        {/* Logo */}
        <div className="p-4 border-b border-[rgba(61,17,85,0.6)]">
          <div className="flex items-center gap-2.5">
            <img src="/assets/logo/dearlive-logo.png" alt="DearLive" className="h-9 drop-shadow-lg" />
            <div>
              <div className="text-xs font-black text-white">GameAdmin</div>
              <div className="text-[9px] text-[rgba(255,255,255,0.35)] uppercase tracking-wide">
                {isSuperAdmin ? 'Super Admin' : 'Operations Panel'}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-[rgba(255,31,166,0.15)] text-[#ff1fa6] border border-[rgba(255,31,166,0.25)]'
                    : 'text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                )}>
                <Icon size={15} className={isActive ? 'text-[#ff1fa6]' : ''} />
                {label}
              </Link>
            );
          })}

          {/* Super Admin section — only visible to super_admin */}
          {isSuperAdmin && (
            <>
              <div className="dl-divider my-3" />
              <div className="px-3 py-1">
                <span className="text-[9px] font-black text-[rgba(255,215,0,0.5)] uppercase tracking-widest">Super Admin</span>
              </div>
              <Link href="/admin/superadmin"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  pathname.startsWith('/admin/superadmin')
                    ? 'bg-gradient-to-r from-[rgba(255,215,0,0.2)] to-[rgba(139,0,255,0.15)] text-[#ffd700] border border-[rgba(255,215,0,0.3)]'
                    : 'text-[rgba(255,215,0,0.6)] hover:bg-[rgba(255,215,0,0.08)] hover:text-[#ffd700]'
                )}>
                <Crown size={15} className={pathname.startsWith('/admin/superadmin') ? 'text-[#ffd700]' : ''} />
                Design System
              </Link>
            </>
          )}
        </nav>

        {/* System status */}
        <div className="p-4 border-t border-[rgba(61,17,85,0.6)]">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
            <div>
              <div className="text-white font-bold">System Online</div>
              <div className="text-[rgba(255,255,255,0.3)] text-[10px]">All services operational</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col ml-52 min-w-0">
        <header className="bg-[rgba(18,0,30,0.95)] border-b border-[rgba(61,17,85,0.6)] px-6 py-3 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div>
            <p className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-widest">Welcome back,</p>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">{player.username}</span>
              {isSuperAdmin && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a0028] uppercase tracking-wide">
                  ✦ Super Admin
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && search.trim()) {
                    router.push(`/admin/players?search=${encodeURIComponent(search)}`);
                    setSearch('');
                  }
                }}
                placeholder="Search players…"
                className="w-56 dl-input pl-9 py-2 text-sm"
              />
            </div>

            <button className="relative w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(61,17,85,0.6)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:text-white transition-all">
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff3d57] rounded-full text-[8px] font-black text-white flex items-center justify-center">3</span>
            </button>

            <div className="flex items-center gap-2 cursor-pointer group" onClick={logout}>
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm',
                isSuperAdmin
                  ? 'bg-gradient-to-br from-[#ffd700] to-[#ff8c00] glow-gold'
                  : 'bg-gradient-to-br from-[#ff1fa6] to-[#8b00ff] glow-pink'
              )}>
                {player.username[0]}
              </div>
              <LogOut size={14} className="text-[rgba(255,255,255,0.3)] group-hover:text-[#ff3d57] transition-colors" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
