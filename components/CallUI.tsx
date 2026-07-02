import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Video, VideoOff, Camera, Wifi, WifiOff, Signal, Clock, RotateCcw, PhoneIncoming, ShieldCheck, Grid } from 'lucide-react';
import { useCall } from '../context/CallContext';
import { rtdb, auth } from '../firebase';
import { ref, set, remove } from 'firebase/database';


// Format call duration as MM:SS
function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Get network quality color
function getNetworkQualityColor(quality: string): string {
  switch (quality) {
    case 'excellent': return 'text-green-400';
    case 'good': return 'text-green-400';
    case 'fair': return 'text-yellow-400';
    case 'poor': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

export const IncomingCallModal: React.FC = () => {
  const { callStatus, callInfo, answerCall, declineCall } = useCall();
  const acceptButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (callStatus === 'ringing' && callInfo) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 800);
      } catch { }
    }
  }, [callStatus, callInfo]);

  // Robust autofocus for the 'Accept' button
  useEffect(() => {
    if (callStatus === 'ringing' && acceptButtonRef.current) {
      const timer = setTimeout(() => {
        acceptButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [callStatus]);

  // Keyboard shortcuts: Enter to accept, Escape to decline
  useEffect(() => {
    if (callStatus !== 'ringing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        answerCall();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        declineCall();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callStatus, answerCall, declineCall]);

  if (callStatus !== 'ringing' || !callInfo) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="incoming-call-title">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <div className="relative z-10 bg-gradient-to-b from-[#1E1E22] to-[#0A0A0C] border border-white/10 rounded-[2.25rem] shadow-2xl w-[85%] max-w-xs p-6 text-center animate-scaleUp">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 mx-auto mb-4 flex items-center justify-center ring-4 ring-primary/20 overflow-hidden shadow-lg">
          {callInfo.callerImage ? (
            <img src={callInfo.callerImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <Phone size={24} className="text-primary" />
          )}
        </div>
        <h2 id="incoming-call-title" className="text-xl font-black text-white mb-0.5 tracking-tight">{callInfo.callerName}</h2>
        <p className="text-xs text-gray-400 font-bold mb-0.5">
          {callInfo.callerRole === 'admin' ? 'Live Support' : callInfo.callerRole === 'mechanic' ? 'Mechanic' : 'Customer'}
        </p>
        <p className="text-[10px] text-gray-600 font-bold mb-6 font-mono uppercase tracking-wider">Incoming {callInfo.type} call...</p>
        
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); declineCall(); }}
            className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 active:scale-90 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all duration-300 group"
            aria-label="Decline Call"
          >
            <PhoneOff size={20} className="text-red-400 group-hover:scale-110 transition-transform" />
          </button>
          <button
            ref={acceptButtonRef}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); answerCall(); }}
            className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center hover:bg-green-500/30 active:scale-90 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all duration-300 group animate-pulse"
            aria-label="Answer Call"
          >
            <Phone size={20} className="text-green-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const OutgoingCallModal: React.FC = () => {
  const { callStatus, callInfo, endCall } = useCall();
  const [isMuted, setIsMuted] = React.useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = React.useState(false);
  const [showKeypad, setShowKeypad] = React.useState(false);
  const endButtonRef = useRef<HTMLButtonElement | null>(null);

  // Autofocus the end call button for ease of quick cancellation
  useEffect(() => {
    if (callStatus === 'calling' && endButtonRef.current) {
      const timer = setTimeout(() => {
        endButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [callStatus]);

  // Keyboard shortcut: Escape to end/cancel the outgoing call
  useEffect(() => {
    if (callStatus !== 'calling') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        endCall();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callStatus, endCall]);

  if (callStatus !== 'calling' || !callInfo) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="outgoing-call-title">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
      <div className="relative z-10 bg-[#15151A]/85 border border-white/10 rounded-[2.25rem] shadow-2xl w-[85%] max-w-xs p-6 text-center animate-scaleUp overflow-hidden">
        {/* Top Status Indicators */}
        <div className="flex justify-between items-center mb-6 px-1">
          <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
            <ShieldCheck size={11} />
            <span className="text-[8px] font-black uppercase tracking-wider">Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
            <Signal size={11} className="text-primary animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-wider font-mono">HD Audio</span>
          </div>
        </div>

        {/* Pulsing Avatar Area */}
        <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          {/* Animated ripple rings */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute -inset-1.5 rounded-full bg-primary/10 animate-pulse" style={{ animationDuration: '2s' }} />
          
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-4 ring-primary/30 overflow-hidden shadow-2xl">
            {callInfo.calleeImage ? (
              <img src={callInfo.calleeImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <Phone size={28} className="text-primary" />
            )}
          </div>
        </div>

        {/* Callee Details */}
        <h2 id="outgoing-call-title" className="text-xl font-black text-white mb-0.5 tracking-tight">{callInfo.calleeName}</h2>
        <p className="text-xs text-gray-400 font-bold tracking-wide mb-1">
          {callInfo.calleeRole === 'admin' ? 'Live Support' : callInfo.calleeRole === 'mechanic' ? 'Mechanic' : 'Customer'}
        </p>
        <p className="text-[10px] text-primary/80 font-bold mb-6 flex items-center justify-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
          Calling...
        </p>

        {/* Mid-Call Action Buttons (redesigned controls) */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-[200px] mx-auto">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                isMuted 
                  ? 'bg-red-500/20 border-red-500/40 text-red-400' 
                  : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
              }`}
              aria-label="Mute Microphone"
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <span className="text-[9px] text-gray-400 font-bold">Mute</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                isSpeakerOn 
                  ? 'bg-primary/20 border-primary/40 text-primary' 
                  : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
              }`}
              aria-label="Speaker"
            >
              <Volume2 size={16} className={isSpeakerOn ? 'animate-pulse' : ''} />
            </button>
            <span className="text-[9px] text-gray-400 font-bold">Speaker</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setShowKeypad(!showKeypad)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                showKeypad 
                  ? 'bg-white/20 border-white/30 text-white' 
                  : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
              }`}
              aria-label="Toggle Keypad"
            >
              <Grid size={16} />
            </button>
            <span className="text-[9px] text-gray-400 font-bold">Keypad</span>
          </div>
        </div>

        {/* End Call Button */}
        <button
          ref={endButtonRef}
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); endCall(); }}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 flex items-center justify-center transition-all duration-300 mx-auto group active:scale-90 focus:outline-none focus:ring-4 focus:ring-red-500/50"
          aria-label="End Call"
        >
          <PhoneOff size={20} className="text-white group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export const ActiveCallBar: React.FC = () => {
  const { callStatus, callInfo, endCall, toggleMute, toggleSpeaker, toggleVideo, switchCamera, isMuted, isSpeakerOn, callDuration, networkStats, callHistory } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (callStatus !== 'connected' || !callInfo) return null;

  // Check if this is a video call
  const isVideoCall = callInfo.type === 'video';

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999999] animate-slideUp">
      <div className="bg-gradient-to-r from-[#1E1E22] to-[#0A0A0C] border border-primary/20 rounded-2xl shadow-2xl shadow-primary/5 p-4 max-w-md mx-auto backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {callInfo.calleeImage ? (
                <img src={callInfo.calleeImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Phone size={16} className="text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{callInfo.calleeName}</p>
              <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Connected • {formatCallDuration(callDuration)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Call duration timer */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 ${getNetworkQualityColor(networkStats?.quality || 'good')}`}>
              <Clock size={12} />
              <span className="text-[10px] font-bold">{formatCallDuration(callDuration)}</span>
            </div>
            
            {/* Network quality indicator */}
            {networkStats && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${getNetworkQualityColor(networkStats.quality)}`} title={`Network: ${networkStats.quality}`}>
                <Signal size={12} />
              </div>
            )}
            
            <button
              onClick={toggleMute}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={toggleSpeaker}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isSpeakerOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            {isVideoCall && (
              <>
                <button
                  onClick={toggleVideo}
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
                  title="Toggle Video"
                >
                  <Video size={16} />
                </button>
                <button
                  onClick={switchCamera}
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
                  title="Switch Camera"
                >
                  <Camera size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); endCall(); }}
              className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/40 transition-all"
            >
              <PhoneOff size={16} className="text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Full-screen video call modal
export const FullScreenCallModal: React.FC = () => {
  const { callStatus, callInfo, endCall, toggleMute, toggleSpeaker, toggleVideo, switchCamera, isMuted, isSpeakerOn, callDuration, networkStats, localStream, remoteStream } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus !== 'connected' || !callInfo || callInfo.type !== 'video') return null;

  const isVideoCall = callInfo.type === 'video';

  return (
    <div className="fixed inset-0 z-[999999] bg-black flex flex-col">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative bg-gray-900">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Floating controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-black/50 rounded-full backdrop-blur-sm">
              <Signal size={14} className={getNetworkQualityColor(networkStats?.quality || 'good')} />
              <span className="text-xs font-bold text-white">{formatCallDuration(callDuration)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); endCall(); }}
            className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center"
          >
            <PhoneOff size={20} className="text-white" />
          </button>
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-24 right-4 w-32 h-48 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-gray-800">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          <div className="absolute bottom-2 left-2 flex gap-1">
            <button
              onClick={toggleMute}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-black/50'}`}
            >
              {isMuted ? <MicOff size={14} className="text-white" /> : <Mic size={14} className="text-white" />}
            </button>
            <button
              onClick={toggleVideo}
              className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              <Video size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
          </button>
          <button
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-primary' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {isSpeakerOn ? <Volume2 size={24} className="text-white" /> : <VolumeX size={24} className="text-white" />}
          </button>
          <button
            onClick={toggleVideo}
            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <Video size={24} className="text-white" />
          </button>
          <button
            onClick={switchCamera}
            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <Camera size={24} className="text-white" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); endCall(); }}
            className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CallButton: React.FC<{
  targetId: string;
  targetRole: 'customer' | 'mechanic' | 'admin';
  targetName: string;
  targetImage?: string;
  type?: 'audio' | 'video';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ targetId, targetRole, targetName, targetImage, type = 'audio', className = '', size = 'md' }) => {
  const { startCall, callStatus } = useCall();
  const isDisabled = callStatus !== 'idle';

  const sizeClasses = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!isDisabled) {
          startCall({ targetId, targetRole, targetName, targetImage, type });
        }
      }}
      disabled={isDisabled}
      className={`${sizeClasses} rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/40 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isDisabled ? 'A call is already active' : `Call ${targetName}`}
    >
      <Phone size={iconSize} className="text-primary group-hover:scale-110 transition-transform" />
    </button>
  );
};

// Support/Admin Call Button - for customers to call Live Support
export const SupportCallButton: React.FC<{
  targetName?: string;
  targetImage?: string;
  type?: 'audio' | 'video';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ targetName = 'Live Support', targetImage, type = 'audio', className = '', size = 'md' }) => {
  const { startCall, callStatus } = useCall();
  const isDisabled = callStatus !== 'idle';

  // Live Support admin ID - this should match your admin user ID in Firebase
    // Read admin ID from Firebase auth or localStorage fallback
  const getAdminId = (): string => {
    try {
      const adminSession = localStorage.getItem('ridersbud_admin_session');
      if (adminSession === 'true') {
        const adminDataStr = localStorage.getItem('ridersbud_admin_user_data');
        if (adminDataStr) {
          const adminData = JSON.parse(adminDataStr);
          return adminData.uid || adminData.id || 'admin';
        }
      }
    } catch {}
    // Also check if there's an admin user in Firebase Auth with known ID
    return 'admin'; // Default admin UID
  };
  const SUPPORT_ADMIN_ID = getAdminId();
  const SUPPORT_ROLE: 'admin' = 'admin';

  const sizeClasses = size === 'sm' ? 'px-3 py-2 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2.5 text-sm';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!isDisabled) {
          startCall({ 
            targetId: SUPPORT_ADMIN_ID, 
            targetRole: SUPPORT_ROLE, 
            targetName, 
            targetImage, 
            type 
          });
        }
      }}
      disabled={isDisabled}
      className={`${sizeClasses} rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center gap-2 hover:bg-primary/40 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed font-bold ${className}`}
      title={isDisabled ? 'A call is already active' : `Call ${targetName}`}
    >
      <Phone size={iconSize} className="text-primary group-hover:scale-110 transition-transform" />
      <span className="text-primary">{size !== 'sm' && 'Call Support'}</span>
    </button>
  );
};

// Admin Call Button - for admin to call customers or mechanics
export const AdminCallButton: React.FC<{
  targetId: string;
  targetRole: 'customer' | 'mechanic';
  targetName: string;
  targetImage?: string;
  type?: 'audio' | 'video';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ targetId, targetRole, targetName, targetImage, type = 'audio', className = '', size = 'md' }) => {
  const { startCall, callStatus } = useCall();
  const isDisabled = callStatus !== 'idle';

  const sizeClasses = size === 'sm' ? 'px-3 py-2 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2.5 text-sm';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!isDisabled) {
          startCall({ targetId, targetRole, targetName, targetImage, type });
        }
      }}
      disabled={isDisabled}
      className={`${sizeClasses} rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center gap-2 hover:bg-primary/40 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed font-bold ${className}`}
      title={isDisabled ? 'A call is already active' : `Call ${targetName}`}
    >
      <Phone size={iconSize} className="text-primary group-hover:scale-110 transition-transform" />
      <span className="text-primary">{size !== 'sm' && `Call ${targetRole === 'mechanic' ? 'Mechanic' : 'Customer'}`}</span>
    </button>
  );
};

// Mechanic Call Button - for mechanics to call customers or support
export const MechanicCallButton: React.FC<{
  targetId: string;
  targetRole: 'customer' | 'admin';
  targetName: string;
  targetImage?: string;
  type?: 'audio' | 'video';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ targetId, targetRole, targetName, targetImage, type = 'audio', className = '', size = 'md' }) => {
  const { startCall, callStatus } = useCall();
  const isDisabled = callStatus !== 'idle';

  const sizeClasses = size === 'sm' ? 'px-3 py-2 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2.5 text-sm';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!isDisabled) {
          startCall({ targetId, targetRole, targetName, targetImage, type });
        }
      }}
      disabled={isDisabled}
      className={`${sizeClasses} rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center gap-2 hover:bg-primary/40 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed font-bold ${className}`}
      title={isDisabled ? 'A call is already active' : `Call ${targetName}`}
    >
      <Phone size={iconSize} className="text-primary group-hover:scale-110 transition-transform" />
      <span className="text-primary">{size !== 'sm' && 'Call'}</span>
    </button>
  );
};

// Call History Modal to show past calls
export const CallHistoryButton: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { callHistory } = useCall();
  const [isOpen, setIsOpen] = React.useState(false);

  if (callHistory.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all ${className}`}
      >
        <Clock size={16} className="text-gray-400" />
        <span className="text-xs font-bold text-gray-400">Call History ({callHistory.length})</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80">
          <div className="bg-[#1E1E22] border border-white/10 rounded-2xl p-6 w-[90%] max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Call History</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {callHistory.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      call.direction === 'incoming' ? 'bg-green-500/20' : 'bg-blue-500/20'
                    }`}>
                      {call.direction === 'incoming' ? <PhoneIncoming size={16} className="text-green-400" /> : <Phone size={16} className="text-blue-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{call.calleeName}</p>
                      <p className="text-xs text-gray-500">
                        {call.direction === 'incoming' ? 'Incoming' : 'Outgoing'} • {call.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400">{formatCallDuration(call.duration || 0)}</p>
                    <p className="text-[10px] text-gray-600">
                      {new Date(call.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};


