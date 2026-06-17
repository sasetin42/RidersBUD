import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Video, VideoOff, Camera, Wifi, WifiOff, Signal, Clock, RotateCcw, PhoneIncoming } from 'lucide-react';
import { useCall } from '../context/CallContext';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  if (callStatus !== 'ringing' || !callInfo) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <div className="relative z-10 bg-gradient-to-b from-[#1E1E22] to-[#0A0A0C] border border-white/10 rounded-[2rem] shadow-2xl w-[90%] max-w-sm p-8 text-center animate-scaleUp">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 mx-auto mb-5 flex items-center justify-center ring-4 ring-primary/20 overflow-hidden">
          {callInfo.callerImage ? (
            <img src={callInfo.callerImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <Phone size={32} className="text-primary" />
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-1">{callInfo.callerName}</h2>
        <p className="text-sm text-gray-400 font-medium mb-1">
          {callInfo.callerRole === 'admin' ? 'Live Support' : callInfo.callerRole === 'mechanic' ? 'Mechanic' : 'Customer'}
        </p>
        <p className="text-xs text-gray-600 font-bold mb-8">Incoming {callInfo.type} call...</p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={declineCall}
            className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/40 transition-all duration-300 group"
          >
            <PhoneOff size={24} className="text-red-400 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={answerCall}
            className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center hover:bg-green-500/40 transition-all duration-300 group animate-pulse"
          >
            <Phone size={24} className="text-green-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const OutgoingCallModal: React.FC = () => {
  const { callStatus, callInfo, endCall } = useCall();

  if (callStatus !== 'calling' || !callInfo) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <div className="relative z-10 bg-gradient-to-b from-[#1E1E22] to-[#0A0A0C] border border-white/10 rounded-[2rem] shadow-2xl w-[90%] max-w-sm p-8 text-center animate-scaleUp">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 mx-auto mb-5 flex items-center justify-center ring-4 ring-primary/20 overflow-hidden">
          {callInfo.calleeImage ? (
            <img src={callInfo.calleeImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <Phone size={32} className="text-primary" />
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-1">{callInfo.calleeName}</h2>
        <p className="text-sm text-gray-400 font-medium mb-1">
          {callInfo.calleeRole === 'admin' ? 'Live Support' : callInfo.calleeRole === 'mechanic' ? 'Mechanic' : 'Customer'}
        </p>
        <p className="text-xs text-gray-600 font-bold mb-8">
          <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />
          Calling...
        </p>
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/40 transition-all duration-300 mx-auto group"
        >
          <X size={24} className="text-red-400 group-hover:scale-110 transition-transform" />
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
    <div className="fixed bottom-4 left-4 right-4 z-[200] animate-slideUp">
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
              onClick={endCall}
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
  const { callStatus, callInfo, endCall, toggleMute, toggleSpeaker, toggleVideo, switchCamera, isMuted, isSpeakerOn, callDuration, networkStats } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      // This will be updated via context
    }
  }, []);

  if (callStatus !== 'connected' || !callInfo || callInfo.type !== 'video') return null;

  const isVideoCall = callInfo.type === 'video';

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
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
            onClick={endCall}
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
            onClick={endCall}
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
  const SUPPORT_ADMIN_ID = 'admin-support';
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
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
