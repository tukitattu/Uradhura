'use client';

import { useEffect, useState } from 'react';
import SocialShell from '@/components/social/SocialShell';
import { socialApi, type SocialRoom } from '@/lib/social';

export default function PartyPage() {
  const [rooms, setRooms] = useState<SocialRoom[]>([]);
  useEffect(() => { socialApi.home().then(data => setRooms(data.rooms.filter(room => room.category === 'Party room'))).catch(() => {}); }, []);
  return <SocialShell><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff75b8]">Hang out</p><h1 className="text-3xl font-black">Party rooms</h1><p className="mt-2 text-sm text-white/55">Pull up a seat, send a gift, and stay awhile.</p></div><div className="grid gap-4 sm:grid-cols-2">{rooms.map(room => <article key={room.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#281238] p-5"><img src="/assets/icons/nav3d/party.png" alt="" className="absolute right-4 top-4 h-12 w-12 opacity-80" /><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#f6c453]">8 seats</p><h2 className="mt-12 text-xl font-black">{room.title}</h2><p className="mt-1 text-sm text-white/55">{room.host} is hosting now</p><button className="mt-5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-[#ff4fa8]">Join party</button></article>)}</div><div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-r from-[#ff4fa8]/20 to-[#6f43e5]/20 p-5"><h2 className="text-xl font-black">Start your own room</h2><p className="mt-1 text-sm text-white/60">Invite friends and make your own corner of Ura Live.</p><button className="mt-4 rounded-full bg-[#f6c453] px-4 py-2 text-sm font-black text-[#201024]">Go live</button></div></SocialShell>;
}
