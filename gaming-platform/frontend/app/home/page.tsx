'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SocialShell from '@/components/social/SocialShell';
import { socialApi, type SocialHomeData } from '@/lib/social';

const empty: SocialHomeData = { rooms: [], moments: [], ranking: [] };

export default function HomePage() {
  const [data, setData] = useState(empty);
  useEffect(() => { socialApi.home().then(setData).catch(() => {}); }, []);

  return <SocialShell>
    <section className="relative overflow-hidden rounded-[28px] bg-[#29113e] shadow-2xl">
      <img src="/assets/bg/home_bg.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
      <div className="relative min-h-[270px] max-w-xl p-6 sm:min-h-[340px] sm:p-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#f6c453]">Ura community</p>
        <h1 className="max-w-md text-4xl font-black leading-[0.95] sm:text-6xl">Where love lives.</h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">Meet hosts, find your room, and make a moment worth sharing.</p>
        <Link href="/live" className="mt-6 inline-flex rounded-full bg-[#ff4fa8] px-5 py-3 text-sm font-black shadow-lg shadow-[#ff4fa8]/30">Explore live rooms</Link>
      </div>
    </section>

    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff75b8]">Right now</p><h2 className="text-2xl font-black">Live rooms</h2></div><Link href="/live" className="text-sm font-bold text-white/55">See all</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.rooms.slice(0, 3).map(room => <Link href="/live" key={room.id} className="group relative min-h-[190px] overflow-hidden rounded-2xl border border-white/10 bg-[#281238]">
          <img src={room.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="relative flex h-full min-h-[190px] flex-col justify-end p-4"><div className="mb-2 flex items-center gap-2 text-xs text-[#9dffcb]"><span className="h-2 w-2 rounded-full bg-[#51e69b]" /> {room.viewers} watching</div><h3 className="font-black">{room.title}</h3><p className="text-xs text-white/60">Hosted by {room.host}</p></div>
        </Link>)}
      </div>
    </section>

    <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><div className="mb-4 flex justify-between"><h2 className="text-xl font-black">Moments</h2><Link href="/moments" className="text-sm text-white/55">View feed</Link></div><div className="grid grid-cols-2 gap-3">{data.moments.slice(0, 4).map(moment => <div key={moment.id} className="overflow-hidden rounded-xl bg-black/20"><img src={moment.image} alt="" className="h-28 w-full object-cover" /><div className="p-3"><p className="text-xs font-bold">{moment.username}</p><p className="mt-1 truncate text-xs text-white/55">{moment.caption}</p></div></div>)}</div></div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#3c1c55] to-[#1b0d2b] p-4"><div className="mb-4 flex justify-between"><h2 className="text-xl font-black">Top hosts</h2><span className="text-xs text-[#f6c453]">This week</span></div>{data.ranking.map((rank, index) => <div key={rank.id} className="mb-3 flex items-center gap-3"><span className="w-5 text-center font-black text-[#f6c453]">{index + 1}</span><div className="relative h-11 w-11"><img src={rank.frame} alt="" className="absolute inset-0 z-10 h-full w-full" /><div className="m-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb35c] to-[#ee4b9d] text-sm font-black">{rank.username[0]}</div></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{rank.username}</p><p className="text-xs text-white/50">{rank.score.toLocaleString()} points</p></div></div>)}</div>
    </section>
  </SocialShell>;
}
