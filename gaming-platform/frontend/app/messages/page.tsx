import Link from 'next/link';
import SocialShell from '@/components/social/SocialShell';

const chats = [
  ['Ura team', 'Welcome to your new community.', 'UR'],
  ['Party invitations', 'You have new rooms to discover.', 'PI'],
  ['Friends', 'Start a conversation with someone new.', 'FR'],
];

export default function MessagesPage() {
  return <SocialShell><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff75b8]">Stay connected</p><h1 className="text-3xl font-black">Messages</h1><p className="mt-2 text-sm text-white/55">Your conversations and room invitations in one place.</p></div><div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">{chats.map(([name, preview, initials], index) => <Link href="#" key={name} className="flex items-center gap-3 border-b border-white/10 p-4 last:border-0 hover:bg-white/5"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4fa8] to-[#6f43e5] font-black">{initials}</div><div className="min-w-0 flex-1"><div className="flex justify-between"><h2 className="font-bold">{name}</h2><span className="text-xs text-white/35">{index + 1}h</span></div><p className="mt-1 truncate text-sm text-white/50">{preview}</p></div></Link>)}</div></SocialShell>;
}
