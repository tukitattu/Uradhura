'use client';
import { useState } from 'react';
import { Video } from 'lucide-react';
import VideoCall from './VideoCall';

interface VideoCallButtonProps {
  channelName?: string;
  className?: string;
}

export default function VideoCallButton({ channelName, className }: VideoCallButtonProps) {
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <div className="space-y-3">
        <VideoCall channelName={channelName} onEnd={() => setActive(false)} />
      </div>
    );
  }

  return (
    <button
      onClick={() => setActive(true)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff1fa6] to-[#ff3d57] text-white text-sm font-bold hover:opacity-90 transition-all ${className || ''}`}
    >
      <Video size={16} />
      Join Live Room
    </button>
  );
}
