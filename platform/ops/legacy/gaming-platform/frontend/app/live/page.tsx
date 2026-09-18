'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SocialShell from '@/components/social/SocialShell';
import { socialApi, type SocialRoom } from '@/lib/social';

export default function LivePage() {
  const [rooms, setRooms] = useState<SocialRoom[]>([]);
  useEffect(() => { socialApi.home().then(data => setRooms(data.rooms)).catch(() => {}); }, []);
  return <SocialShell><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff75b8]">Discover</p><h1 className="text-3xl font-black">Live rooms</h1><p className="mt-2 text-sm text-white/55">Find your people and join the conversation.</p></div><div className="mb-5 flex gap-2 overflow-x-auto pb-1 text-sm"><span className="rounded-full bg-[#ff4fa8] px-4 py-2 font-bold">All</span><span className="rounded-full bg-white/10 px-4 py-2 text-white/65">Party</span><span className="rounded-full bg-white/10 px-4 py-2 text-white/65">Music</span><span className="rounded-full bg-white/10 px-4 py-2 text-white/65">Games</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rooms.map(room => <Link key={room.id} href="/party" className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]"><div className="relative h-52"><img src={room.cover} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /><div className="absolute inset-x-3 top-3 flex justify-between text-xs font-bold"><span className="rounded-full bg-[#ff4fa8] px-2.5 py-1">LIVE</span><span className="rounded-full bg-black/55 px-2.5 py-1">{room.viewers} viewers</span></div></div><div className="p-4"><h2 className="font-black">{room.title}</h2><p className="mt-1 text-sm text-white/55">{room.host} · {room.category}</p></div></Link>)}</div></SocialShell>;
}
