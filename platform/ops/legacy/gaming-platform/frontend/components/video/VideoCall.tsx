'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { videoApi, type VideoCallToken } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, Maximize2, Minimize2 } from 'lucide-react';

interface VideoCallProps {
  channelName?: string;
  onEnd?: () => void;
}

export default function VideoCall({ channelName = 'admin-broadcast', onEnd }: VideoCallProps) {
  const [tokenData, setTokenData] = useState<VideoCallToken | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const agoraRef = useRef<any>(null);

  // Fetch video token
  useEffect(() => {
    videoApi.getToken()
      .then(setTokenData)
      .catch(err => setError('Failed to get video token'))
      .finally(() => setLoading(false));
  }, []);

  const joinChannel = useCallback(async () => {
    if (!tokenData) return;

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Try to initialize Agora if available
      if (typeof window !== 'undefined') {
        try {
          const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
          const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

          client.on('user-published', async (user: any, mediaType: string) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video' && remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = user.videoTrack?.getMediaStreamTrack();
            }
            if (mediaType === 'audio') {
              user.audioTrack?.play();
            }
          });

          client.on('user-joined', () => {
            setParticipantCount(prev => prev + 1);
          });

          client.on('user-left', () => {
            setParticipantCount(prev => Math.max(0, prev - 1));
          });

          await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);

          // Publish local tracks
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          await client.publish([audioTrack, videoTrack]);

          agoraRef.current = client;
          setJoined(true);
          return;
        } catch {
          // Agora SDK not available — fallback to basic mode
        }
      }

      // Fallback: just show local video without Agora
      setJoined(true);
      setParticipantCount(1);
    } catch (err) {
      setError('Failed to access camera/microphone');
    }
  }, [tokenData, channelName]);

  const leaveChannel = useCallback(async () => {
    if (agoraRef.current) {
      await agoraRef.current.leave();
      agoraRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setJoined(false);
    setParticipantCount(0);
    onEnd?.();
  }, [onEnd]);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  }, [videoEnabled]);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  }, [audioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[rgba(0,0,0,0.5)] border border-[rgba(61,17,85,0.6)] p-8 text-center">
        <div className="text-[rgba(255,255,255,0.4)]">Connecting to video...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-[rgba(255,61,87,0.08)] border border-[rgba(255,61,87,0.3)] p-6 text-center">
        <div className="text-[#ff3d57] font-bold mb-2">Video Error</div>
        <p className="text-sm text-[rgba(255,255,255,0.5)]">{error}</p>
        <Button onClick={() => { setError(null); setLoading(true); videoApi.getToken().then(setTokenData).catch(e => setError('Failed')).finally(() => setLoading(false)); }} variant="ghost" size="sm" className="mt-3">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-[rgba(0,0,0,0.5)] border border-[rgba(61,17,85,0.6)] overflow-hidden transition-all ${
      minimized ? 'w-64 h-40' : 'w-full aspect-video max-w-2xl'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <Video size={14} className="text-[#ff1fa6]" />
          <span className="text-xs font-bold text-white">Live Room</span>
          {joined && (
            <span className="flex items-center gap-1 text-[10px] text-game-green">
              <span className="w-1.5 h-1.5 rounded-full bg-game-green animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-[rgba(255,255,255,0.4)]">
            <Users size={12} /> {participantCount}
          </span>
          <button onClick={() => setMinimized(!minimized)} className="text-[rgba(255,255,255,0.3)] hover:text-white">
            {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="relative w-full h-full bg-black">
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local video (picture-in-picture) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-3 right-3 w-28 h-20 rounded-xl object-cover border-2 border-[rgba(255,31,166,0.5)] shadow-lg z-10"
        />

        {!joined && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)]">
            <div className="text-center space-y-4">
              <div className="text-4xl">📹</div>
              <p className="text-white font-bold">Ready to join?</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">Channel: {channelName}</p>
              <Button onClick={joinChannel} variant="gold">
                <Video size={16} /> Join Live Room
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {joined && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-[rgba(0,0,0,0.3)]">
          <button
            onClick={toggleVideo}
            className={`p-2.5 rounded-full transition-all ${
              videoEnabled ? 'bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]' : 'bg-[#ff3d57]'
            }`}
          >
            {videoEnabled ? <Video size={16} className="text-white" /> : <VideoOff size={16} className="text-white" />}
          </button>
          <button
            onClick={toggleAudio}
            className={`p-2.5 rounded-full transition-all ${
              audioEnabled ? 'bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]' : 'bg-[#ff3d57]'
            }`}
          >
            {audioEnabled ? <Mic size={16} className="text-white" /> : <MicOff size={16} className="text-white" />}
          </button>
          <button
            onClick={leaveChannel}
            className="p-2.5 rounded-full bg-[#ff3d57] hover:bg-[#ff1f3d] transition-all"
          >
            <PhoneOff size={16} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
