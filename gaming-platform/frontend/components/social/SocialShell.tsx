'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Coins, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatTokens } from '@/lib/utils';

const tabs = [
  { href: '/home', label: 'Home', icon: 'live' },
  { href: '/live', label: 'Live', icon: 'live' },
  { href: '/party', label: 'Party', icon: 'party' },
  { href: '/moments', label: 'Moments', icon: 'moment' },
  { href: '/messages', label: 'Messages', icon: 'message' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];

export default function SocialShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { player } = useAuth();

  return (
    <div className="min-h-screen bg-[#100718] text-white pb-24">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#100718]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/home" aria-label="Ura home">
            <img src="/assets/logo/ura-logo.jpg" alt="Ura" className="h-10 w-10 rounded-full object-cover ring-2 ring-[#f6c453]/70" />
          </Link>
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45 sm:flex">
            <Search size={16} /> Search hosts, rooms, or moments
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Notifications" className="rounded-full p-2 text-white/70 hover:bg-white/10"><Bell size={18} /></button>
            <div className="hidden items-center gap-1 rounded-full border border-[#f6c453]/30 bg-[#f6c453]/10 px-3 py-1.5 text-sm font-bold text-[#f6c453] sm:flex">
              <Coins size={15} /> {formatTokens(player?.balance || 0)}
            </div>
            <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f6c453] to-[#b7791f] font-black text-[#21130a]">
              {player?.username?.[0]?.toUpperCase() || '?'}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#100718]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl grid-cols-6 px-1 py-2">
          {tabs.map(tab => {
            const active = pathname === tab.href || (tab.href === '/home' && pathname === '/');
            return (
              <Link key={tab.href} href={tab.href} className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${active ? 'text-[#ff5caf]' : 'text-white/45 hover:text-white'}`}>
                <img src={`/assets/icons/nav/${tab.icon}/${active ? `${tab.icon}_sel` : tab.icon}.svg`} alt="" className="h-7 w-7" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
