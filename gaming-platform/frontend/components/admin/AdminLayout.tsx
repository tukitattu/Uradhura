'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Gamepad2, Users, TrendingUp, Package,
  FileText, Shield, Settings, LogOut, Bell, Search, ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/games', label: 'Games', icon: Gamepad2 },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/profit-risk', label: 'Profit & Risk', icon: TrendingUp },
  { href: '/admin/token-packages', label: 'Token Packages', icon: Package },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { player, loading, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && (!player || (player.role !== 'admin' && player.role !== 'super_admin'))) {
      router.push('/login');
    }
  }, [player, loading, router]);

  if (loading || !player) return null;

  return (
    <div className="flex min-h-screen bg-game-bg">
      {/* Sidebar */}
      <aside className="admin-sidebar w-52 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-game-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-black text-sm">G</div>
            <div>
              <div className="text-sm font-black text-white">GameAdmin</div>
              <div className="text-[10px] text-gray-400">Gaming Operations Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* System status */}
        <div className="p-4 border-t border-game-border">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-game-green animate-pulse" />
            <div>
              <div className="text-white font-medium">System Online</div>
              <div className="text-gray-500">All services operational</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-game-card border-b border-game-border px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-xs text-gray-400">Welcome back,</p>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white">{player.username}</h1>
              {player.role === 'super_admin' && (
                <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Super Admin</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/admin/players?search=${encodeURIComponent(searchQuery)}`);
                    setSearchQuery('');
                  }
                }}
                placeholder="Search players, games, rounds..."
                className="w-64 bg-game-bg border border-game-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-white/10 text-gray-400">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-game-red rounded-full text-[9px] font-bold text-white flex items-center justify-center">3</span>
            </button>

            {/* Profile */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={logout}>
              <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {player.username[0]}
              </div>
              <div className="hidden md:block text-sm">
                <div className="text-white font-medium leading-tight">{player.username}</div>
                <div className="text-gray-400 text-xs capitalize">{player.role.replace('_', ' ')}</div>
              </div>
              <LogOut size={14} className="text-gray-400 hover:text-white" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
