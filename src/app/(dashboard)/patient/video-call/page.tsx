"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor } from 'lucide-react';

export default function VideoCallPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointmentId');
  const patientName = searchParams.get('doctorName') || searchParams.get('patientName') || 'Doctor';

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startLocalStream();
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isConnected]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsConnected(true);
    } catch (err: any) {
      console.error('Failed to get media devices:', err);
      setError('Could not access camera/microphone. Please check permissions.');
    }
  };

  const stopAllStreams = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    stopAllStreams();
    if (timerRef.current) clearInterval(timerRef.current);
    router.push('/patient/appointments');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[80vh] flex flex-col bg-slate-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
        <div>
          <h2 className="text-white font-bold text-lg">Video Consultation</h2>
          <p className="text-slate-400 text-sm">with {patientName}</p>
        </div>
        <div className="flex items-center gap-4">
          {isConnected && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-sm font-mono">{formatDuration(callDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        {error ? (
          <div className="text-center">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <Button onClick={startLocalStream} className="bg-blue-600 hover:bg-blue-700">
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Remote video placeholder */}
            <div className="w-full max-w-4xl aspect-video bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
              <div className="text-center">
                <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-slate-400">
                    {patientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-400 text-lg font-medium">{patientName}</p>
                <p className="text-slate-500 text-sm mt-1">Waiting for patient to join...</p>
              </div>
            </div>

            {/* Local video (picture-in-picture) */}
            <div className="absolute bottom-8 right-8 w-48 h-36 rounded-xl overflow-hidden border-2 border-slate-600 shadow-2xl bg-slate-800">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
              />
              {!videoEnabled && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <VideoOff className="w-8 h-8 text-slate-500" />
                </div>
              )}
              <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">You</div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-5 bg-slate-800/80 border-t border-slate-700">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-colors ${
            audioEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={audioEnabled ? 'Mute' : 'Unmute'}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${
            videoEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          title="End call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
