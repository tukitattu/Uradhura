'use client';

import { useEffect, useState } from 'react';
import SocialShell from '@/components/social/SocialShell';
import { socialApi, type SocialMoment } from '@/lib/social';

export default function MomentsPage() {
  const [moments, setMoments] = useState<SocialMoment[]>([]);
  useEffect(() => { socialApi.home().then(data => setMoments(data.moments)).catch(() => {}); }, []);
  return <SocialShell><div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff75b8]">Community feed</p><h1 className="text-3xl font-black">Moments</h1></div><button className="rounded-full bg-[#ff4fa8] px-4 py-2 text-sm font-bold">+ Share</button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{moments.map(moment => <article key={moment.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]"><img src={moment.image} alt="" className="h-64 w-full object-cover" /><div className="p-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb35c] to-[#ee4b9d] text-xs font-black">{moment.username[0]}</span><span className="text-sm font-bold">{moment.username}</span></div><p className="mt-3 text-sm text-white/70">{moment.caption}</p><div className="mt-4 flex gap-4 text-xs text-white/45"><span>♡ Like</span><span>◌ Comment</span><span>↗ Share</span></div></div></article>)}</div></SocialShell>;
}
