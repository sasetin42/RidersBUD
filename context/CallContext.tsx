import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { rtdb, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, set, push, onValue, off, update, remove, get, serverTimestamp } from 'firebase/database';
import { suspendManager, SuspendEvent } from '../utils/suspendManager';

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
type CallRole = 'customer' | 'mechanic' | 'admin';
type CallType = 'audio' | 'video';

interface CallInfo {
  callId: string;
  callerId: string;
  calleeId: string;
  callerRole: CallRole;
  calleeRole: CallRole;
  callerName: string;
  calleeName: string;
  callerImage?: string | null;
  calleeImage?: string | null;
  type: CallType;
  status: CallStatus;
  startedAt?: number;
  endedAt?: number;
  duration?: number;
}

interface CallHistoryEntry extends CallInfo {
  id: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
}

interface NetworkStats {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  rtt: number;
  packetsLost: number;
}

interface CallContextType {
  callStatus: CallStatus;
  callInfo: CallInfo | null;
  isCallActive: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callDuration: number;
  networkStats: NetworkStats | null;
  callHistory: CallHistoryEntry[];
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (params: {
    targetId: string;
    targetRole: CallRole;
    targetName: string;
    targetImage?: string;
    type: CallType;
  }) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// Enhanced ICE servers with STUN and TURN for better connectivity
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google's STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Twilio's free STUN servers
    { urls: 'stun:global.stun.twilio.com:3478' },
  ]
};

// Free public TURN servers (these are typically rate-limited but work for development)
// Note: For production, you should use a paid TURN service like Twilio, Agora, or Metered.ca
const TURN_SERVERS: RTCIceServer[] = [
  { urls: 'turn:turn.beta.us.1host.io:3478', username: 'guest', credential: 'guestpassword' },
  { urls: 'turn:turn.anyfirewall.com:3478', username: 'fantof', credential: 'fantof' },
  { urls: 'turn:coturn.opencloudvietnam.org:3478', username: 'guest', credential: 'guest' },
];

// Combine all ICE servers for maximum compatibility
const ALL_ICE_SERVERS: RTCConfiguration = {
  iceServers: [...ICE_SERVERS.iceServers as RTCIceServer[], ...TURN_SERVERS]
};

function getLocalUserId(): string {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  
  try {
    if (localStorage.getItem('ridersbud_customer_session') === 'true') {
      const customerDataStr = localStorage.getItem('ridersbud_customer_user_data');
      if (customerDataStr) {
        const customerData = JSON.parse(customerDataStr);
        const uid = customerData.uid || customerData.id;
        if (uid) return uid;
      }
    }
  } catch (e) {
    console.error('[CallContext] Error parsing ridersbud_customer_user_data:', e);
  }

  try {
    if (localStorage.getItem('ridersbud_mechanic_session') === 'true') {
      const mechanicDataStr = localStorage.getItem('ridersbud_mechanic_user_data');
      if (mechanicDataStr) {
        const mechanicData = JSON.parse(mechanicDataStr);
        const uid = mechanicData.uid || mechanicData.id;
        if (uid) return uid;
      }
    }
  } catch (e) {
    console.error('[CallContext] Error parsing ridersbud_mechanic_user_data:', e);
  }

  if (localStorage.getItem('ridersbud_admin_session') === 'true') {
    return 'admin';
  }

  return '';
}

function getLocalUserRole(): CallRole {
  const admin = sessionStorage.getItem('admin_authenticated') || localStorage.getItem('ridersbud_admin_session');
  const hint = sessionStorage.getItem('auth_type_hint');
  const mechanicSession = localStorage.getItem('ridersbud_mechanic_session');
  const customerSession = localStorage.getItem('ridersbud_customer_session');
  if (admin === 'true') return 'admin';
  if (hint === 'mechanic' || mechanicSession === 'true') return 'mechanic';
  if (hint === 'customer' || customerSession === 'true') return 'customer';
  return 'customer';
}

class CallSoundEffects {
  private ctx: AudioContext | null = null;
  private interval: any = null;
  private activeNodes: AudioNode[] = [];

  private init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[CallSoundEffects] Failed to initialize AudioContext:', e);
    }
  }

  unlock() {
    this.init();
  }

  stop() {
    try {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
      this.activeNodes.forEach(node => {
        try {
          (node as any).disconnect?.();
          (node as any).stop?.();
        } catch (_) {}
      });
      this.activeNodes = [];
    } catch (e) {
      console.warn('[CallSoundEffects] Failed to stop sound:', e);
    }
  }

  playOutgoingRing() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playTone = () => {
      try {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        gain.gain.setValueAtTime(0.08, now + 1.9);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);

        osc1.start(now);
        osc2.start(now);

        osc1.stop(now + 2.0);
        osc2.stop(now + 2.0);

        this.activeNodes.push(osc1, osc2, gain);
      } catch (e) {
        console.warn('[CallSoundEffects] playTone error:', e);
      }
    };

    playTone();
    this.interval = setInterval(playTone, 4000);
  }

  playIncomingRing() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playToneSequence = () => {
      try {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const now = this.ctx.currentTime;

        const notes = [
          { freq: 440, time: 0, duration: 0.15 },
          { freq: 523, time: 0.2, duration: 0.15 },
          { freq: 659, time: 0.4, duration: 0.15 },
          { freq: 784, time: 0.6, duration: 0.3 },
          
          { freq: 440, time: 1.0, duration: 0.15 },
          { freq: 523, time: 1.2, duration: 0.15 },
          { freq: 659, time: 1.4, duration: 0.15 },
          { freq: 784, time: 1.6, duration: 0.3 }
        ];

        notes.forEach(note => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.value = note.freq;

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          gain.gain.setValueAtTime(0, now + note.time);
          gain.gain.linearRampToValueAtTime(0.12, now + note.time + 0.02);
          gain.gain.setValueAtTime(0.12, now + note.time + note.duration - 0.02);
          gain.gain.linearRampToValueAtTime(0, now + note.time + note.duration);

          osc.start(now + note.time);
          osc.stop(now + note.time + note.duration);

          this.activeNodes.push(osc, gain);
        });
      } catch (e) {
        console.warn('[CallSoundEffects] playIncoming error:', e);
      }
    };

    playToneSequence();
    this.interval = setInterval(playToneSequence, 3000);
  }
}

function createDummyMediaStream(audio: boolean, video: boolean): MediaStream {
  const tracks: MediaStreamTrack[] = [];
  
  if (audio) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const audioTrack = dst.stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false; // Mute it so we don't play a continuous tone
          tracks.push(audioTrack);
        }
      }
    } catch (e) {
      console.warn('[CallContext] Failed to create dummy audio track:', e);
    }
  }

  if (video) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, 0, 640, 480);
      }
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          tracks.push(videoTrack);
        }
      }
    } catch (e) {
      console.warn('[CallContext] Failed to create dummy video track:', e);
    }
  }

  return new MediaStream(tracks);
}

const callSounds = new CallSoundEffects();

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const incomingCallRef = useRef<string | null>(null);
  const candidatesQueueRef = useRef<RTCIceCandidate[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const callListenerUnsubscribeRef = useRef<(() => void) | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStatusRef = useRef<CallStatus>('idle');
  const ringingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [userId, setUserId] = useState<string>(getLocalUserId());
  const [userRole, setUserRole] = useState<CallRole>(getLocalUserRole());

  useEffect(() => {
    const handleAuthUpdate = () => {
      const id = getLocalUserId();
      const role = getLocalUserRole();
      setUserId(id);
      setUserRole(role);
    };

    handleAuthUpdate();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      handleAuthUpdate();
    });

    window.addEventListener('storage', handleAuthUpdate);
    window.addEventListener('adminAuthChange', handleAuthUpdate);
    window.addEventListener('customerAuthChange', handleAuthUpdate);
    window.addEventListener('mechanicAuthChange', handleAuthUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleAuthUpdate);
      window.removeEventListener('adminAuthChange', handleAuthUpdate);
      window.removeEventListener('customerAuthChange', handleAuthUpdate);
      window.removeEventListener('mechanicAuthChange', handleAuthUpdate);
    };
  }, []);

  // Audio Context Autoplay Unlocking Listener
  useEffect(() => {
    const unlockAudio = () => {
      callSounds.unlock();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

const cleanupPeerConnection = useCallback(() => {
    callSounds.stop();
    if (callListenerUnsubscribeRef.current) {
      callListenerUnsubscribeRef.current();
      callListenerUnsubscribeRef.current = null;
    }
    // Clear duration timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    // Clear stats interval
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    // Update call duration in history
    if (callStartTimeRef.current > 0) {
      const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(duration);
      callStartTimeRef.current = 0;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    candidatesQueueRef.current = [];
    setNetworkStats(null);
  }, []);

  const handleCallTermination = useCallback((finalStatus: CallStatus, wasConnected: boolean) => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    setCallStatus(finalStatus);
    cleanupPeerConnection();

    if (userId) {
      remove(ref(rtdb, `calls/incoming/${userId}`)).catch(err => {
        console.warn('[CallContext] Error removing incoming call node:', err);
      });
    }

    if (!wasConnected) {
      setCallStatus('idle');
      setCallInfo(null);
      incomingCallRef.current = null;
    } else {
      resetTimeoutRef.current = setTimeout(() => {
        setCallStatus('idle');
        setCallInfo(null);
        incomingCallRef.current = null;
      }, 2000);
    }
  }, [cleanupPeerConnection, userId]);

  // Start call duration timer when connected
  const startDurationTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(duration);
    }, 1000);
  }, []);

  // Monitor network stats
  const startNetworkStatsMonitoring = useCallback(() => {
    if (!pcRef.current) return;
    
    statsIntervalRef.current = setInterval(async () => {
      if (!pcRef.current) return;
      
      try {
        const stats = await pcRef.current.getStats();
        let rtt = 0;
        let packetsLost = 0;
        
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
          }
        });
        
        // Determine quality based on RTT
        let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
        if (rtt < 50) quality = 'excellent';
        else if (rtt < 150) quality = 'good';
        else if (rtt < 300) quality = 'fair';
        else quality = 'poor';
        
        setNetworkStats({ quality, rtt: Math.round(rtt * 1000), packetsLost });
      } catch (error) {
        console.log('[CallContext] Failed to get stats:', error);
      }
    }, 2000);
  }, []);

  const incomingCallUnsubRef = useRef<(() => void) | null>(null);

  const listenForIncomingCalls = useCallback(() => {
    if (!userId) return;
    
    // Clean up any existing incoming listener
    if (incomingCallUnsubRef.current) {
      incomingCallUnsubRef.current();
      incomingCallUnsubRef.current = null;
    }

    const incomingRef = ref(rtdb, `calls/incoming/${userId}`);
    const unsubscribe = onValue(incomingRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.callId) {
        const canReceive = 
          callStatusRef.current === 'idle' || 
          callStatusRef.current === 'ended' || 
          callStatusRef.current === 'declined' || 
          callStatusRef.current === 'missed';

        if (canReceive) {
          if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
          }

          const callId = data.callId;
          incomingCallRef.current = callId;
          const callRef = ref(rtdb, `calls/${callId}`);
          
          if (callListenerUnsubscribeRef.current) {
            callListenerUnsubscribeRef.current();
            callListenerUnsubscribeRef.current = null;
          }

          // Auto-decline ringing after 30 seconds
          if (ringingTimeoutRef.current) {
            clearTimeout(ringingTimeoutRef.current);
            ringingTimeoutRef.current = null;
          }
          ringingTimeoutRef.current = setTimeout(async () => {
            if (callStatusRef.current === 'ringing' && incomingCallRef.current === callId) {
              try {
                await update(ref(rtdb, `calls/${callId}`), { status: 'missed', endedAt: Date.now() });
                await remove(ref(rtdb, `calls/incoming/${userId}`));
              } catch {}
              callSounds.stop();
              cleanupPeerConnection();
              setCallStatus('idle');
              setCallInfo(null);
              incomingCallRef.current = null;
            }
          }, 30000);

          const callUnsub = onValue(callRef, (callSnap) => {
            const callData = callSnap.val();
            if (!callData) {
              cleanupPeerConnection();
              setCallStatus('idle');
              setCallInfo(null);
              incomingCallRef.current = null;
              return;
            }

            // Clear ringing timeout if call is answered, ended, or declined
            if (callData.status !== 'ringing' && ringingTimeoutRef.current) {
              clearTimeout(ringingTimeoutRef.current);
              ringingTimeoutRef.current = null;
            }

            if (callData.status === 'ringing') {
              setCallInfo({
                callId,
                callerId: callData.callerId,
                calleeId: callData.calleeId,
                callerRole: callData.callerRole,
                calleeRole: callData.calleeRole,
                callerName: callData.callerName,
                calleeName: callData.calleeName,
                callerImage: callData.callerImage,
                calleeImage: callData.calleeImage,
                type: callData.type || 'audio',
                status: 'ringing',
                startedAt: callData.startedAt,
              });
              setCallStatus('ringing');
              callSounds.playIncomingRing();
            } else if (callData.status === 'ended' || callData.status === 'declined' || callData.status === 'missed') {
              handleCallTermination(callData.status, callStatusRef.current === 'connected');
            }
          });
          callListenerUnsubscribeRef.current = callUnsub;
        }
      } else {
        if (callStatusRef.current === 'ringing') {
          cleanupPeerConnection();
          setCallStatus('idle');
          setCallInfo(null);
          incomingCallRef.current = null;
        }
      }
    });

    incomingCallUnsubRef.current = unsubscribe;
    return () => {
      unsubscribe();
      if (incomingCallUnsubRef.current === unsubscribe) {
        incomingCallUnsubRef.current = null;
      }
    };
  }, [userId, cleanupPeerConnection, handleCallTermination]);

  // Sync ref with state to avoid stale closures
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    const unsub = listenForIncomingCalls();
    return () => { unsub?.(); };
  }, [listenForIncomingCalls]);

  // Suspend & Interruption Event Handling (Sleep Mode, Power Button Lock, Incoming Phone Calls)
  useEffect(() => {
    const handleSuspendEvent = async (event: SuspendEvent) => {
      if (callStatusRef.current !== 'idle') {
        console.log('[CallContext] Received suspend event:', event);
      }

      if (event === 'app_sleep' || event === 'power_button_locked') {
        // Device is sleeping or power button pressed (screen off)
        if (callStatusRef.current === 'connected') {
          // Keep audio session alive with wake-lock, but disable video tracks temporarily to conserve battery and avoid WebRTC freeze
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
              track.enabled = false;
            });
          }
        }
      } else if (event === 'app_resume' || event === 'power_button_unlocked') {
        // Device woken up or power button unlocked
        if (callStatusRef.current === 'connected') {
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
              track.enabled = true;
            });
          }
          // Re-trigger audio context in case it got suspended by OS
          callSounds.unlock();
        }
      } else if (event === 'incoming_call_interrupt') {
        // User is interrupted by a native cellular phone call or external audio interrupt
        if (callStatusRef.current === 'connected') {
          console.log('[CallContext] In-app call interrupted by external phone call - auto holding');
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
              track.enabled = false;
            });
          }
        }
      } else if (event === 'call_interrupt_ended') {
        // Cellular phone call finished or user returned to app
        if (callStatusRef.current === 'connected') {
          console.log('[CallContext] Cellular phone call ended - resuming in-app call audio');
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
              track.enabled = true;
            });
          }
          callSounds.unlock();
        }
      }
    };

    const unsubscribe = suspendManager.subscribe(handleSuspendEvent);

    // Request wake lock when in active call to prevent unwanted OS sleep drops
    if (callStatus === 'connected' || callStatus === 'calling' || callStatus === 'ringing') {
      suspendManager.requestWakeLock();
    } else {
      suspendManager.releaseWakeLock();
    }

    return () => {
      unsubscribe();
    };
  }, [callStatus]);

  useEffect(() => {
    return () => {
      suspendManager.releaseWakeLock();
      cleanupPeerConnection();
      if (incomingCallUnsubRef.current) {
        incomingCallUnsubRef.current();
        incomingCallUnsubRef.current = null;
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }
      if (incomingCallRef.current) {
        remove(ref(rtdb, `calls/incoming/${userId}`));
      }
    };
  }, [cleanupPeerConnection, userId]);

const startCall = useCallback(async (params: {
    targetId: string;
    targetRole: CallRole;
    targetName: string;
    targetImage?: string;
    type: CallType;
  }) => {
    if (!userId) return;
    try {
      cleanupPeerConnection();
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      callSounds.playOutgoingRing();
      const callId = push(ref(rtdb, 'calls')).key!;
      const myName = auth.currentUser?.displayName || userRole.charAt(0).toUpperCase() + userRole.slice(1);

      const callData: CallInfo = {
        callId,
        callerId: userId,
        calleeId: params.targetId,
        callerRole: userRole,
        calleeRole: params.targetRole,
        callerName: myName,
        calleeName: params.targetName,
        callerImage: auth.currentUser?.photoURL || '',
        calleeImage: params.targetImage || '',
        type: params.type,
        status: 'ringing',
        startedAt: Date.now(),
      };

      setCallInfo(callData);
      setCallStatus('calling');
      setIsVideoEnabled(params.type === 'video');
      setIsFrontCamera(true);

      await set(ref(rtdb, `calls/${callId}`), callData);
      await remove(ref(rtdb, `calls/incoming/${userId}`)); // Clean up any old incoming call node
      await set(ref(rtdb, `calls/incoming/${params.targetId}`), { callId });

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: params.type === 'video',
        });
      } catch (err) {
        console.warn('[CallContext] getUserMedia failed in startCall, falling back to dummy stream:', err);
        stream = createDummyMediaStream(true, params.type === 'video');
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Use ALL_ICE_SERVERS for better connectivity
      const pc = new RTCPeerConnection(ALL_ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(rtdb, `calls/${callId}/callerCandidates`), event.candidate.toJSON());
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(rtdb, `calls/${callId}/offer`), { type: offer.type, sdp: offer.sdp });

      const callRef = ref(rtdb, `calls/${callId}`);
      const processedCandidates = new Set<string>();

      const unsubscribe = onValue(callRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.answer && pc.currentRemoteDescription === null) {
          const answer = new RTCSessionDescription({ type: data.answer.type, sdp: data.answer.sdp });
          await pc.setRemoteDescription(answer);
          setCallStatus('connected');
          if (callInfo) setCallInfo({ ...callInfo, status: 'connected' });
          await update(ref(rtdb, `calls/${callId}`), { status: 'connected' });
          
          // Stop sounds
          callSounds.stop();
          
          // Start duration timer
          startDurationTimer();
          // Start network stats monitoring
          startNetworkStatsMonitoring();

          while (candidatesQueueRef.current.length > 0) {
            const c = candidatesQueueRef.current.shift();
            if (c) await pc.addIceCandidate(c);
          }
        }

        if (data.calleeCandidates) {
          const keys = Object.keys(data.calleeCandidates);
          for (const key of keys) {
            if (!processedCandidates.has(key)) {
              try {
                const candidate = new RTCIceCandidate(data.calleeCandidates[key]);
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(candidate);
                  processedCandidates.add(key);
                } else {
                  if (!candidatesQueueRef.current.some(c => c.candidate === candidate.candidate && c.sdpMid === candidate.sdpMid && c.sdpMLineIndex === candidate.sdpMLineIndex)) {
                    candidatesQueueRef.current.push(candidate);
                    processedCandidates.add(key);
                  }
                }
              } catch { }
            }
          }
        }

        if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
          handleCallTermination(data.status, callStatusRef.current === 'connected');
          remove(ref(rtdb, `calls/incoming/${userId}`));
          remove(ref(rtdb, `calls/incoming/${params.targetId}`));
          
          // Add to call history
          const historyEntry: CallHistoryEntry = {
            id: callId,
            callId,
            callerId: userId,
            calleeId: params.targetId,
            callerRole: userRole,
            calleeRole: params.targetRole,
            callerName: myName,
            calleeName: params.targetName,
            callerImage: auth.currentUser?.photoURL || '',
            calleeImage: params.targetImage || '',
            type: params.type,
            status: data.status,
            startedAt: Date.now(),
            duration: callDuration,
            timestamp: Date.now(),
            direction: 'outgoing',
          };
          setCallHistory(prev => [historyEntry, ...prev].slice(0, 50));
        }
      }, { onlyOnce: false });
      callListenerUnsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('[CallContext] startCall error:', error);
      setCallStatus('ended');
      cleanupPeerConnection();
    }
  }, [userId, userRole, callInfo, cleanupPeerConnection, startDurationTimer, startNetworkStatsMonitoring, callDuration, callStatus, handleCallTermination]);

const answerCall = useCallback(async () => {
    const ci = callInfo;
    if (!ci || !incomingCallRef.current) return;
    const callId = ci.callId;
    try {
      if (callListenerUnsubscribeRef.current) {
        callListenerUnsubscribeRef.current();
        callListenerUnsubscribeRef.current = null;
      }
      cleanupPeerConnection();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: ci.type === 'video',
        });
      } catch (err) {
        console.warn('[CallContext] getUserMedia failed in answerCall, falling back to dummy stream:', err);
        stream = createDummyMediaStream(true, ci.type === 'video');
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Use ALL_ICE_SERVERS for better connectivity
      const pc = new RTCPeerConnection(ALL_ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(rtdb, `calls/${callId}/calleeCandidates`), event.candidate.toJSON());
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      };

      const callRef = ref(rtdb, `calls/${callId}`);
      const callSnap = await get(callRef);
      const callData = callSnap.val();

      if (callData?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: callData.offer.type, sdp: callData.offer.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await set(ref(rtdb, `calls/${callId}/answer`), { type: answer.type, sdp: answer.sdp });
        await update(ref(rtdb, `calls/${callId}`), { status: 'connected' });
        setCallStatus('connected');
        setCallInfo(prev => prev ? { ...prev, status: 'connected' } : null);
        remove(ref(rtdb, `calls/incoming/${userId}`));
        
        // Start duration timer
        startDurationTimer();
        // Start network stats monitoring
        startNetworkStatsMonitoring();
      }

      const processedCandidates = new Set<string>();
      const unsubscribe = onValue(callRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.callerCandidates && pc.remoteDescription) {
          const keys = Object.keys(data.callerCandidates);
          for (const key of keys) {
            if (!processedCandidates.has(key)) {
              try {
                pc.addIceCandidate(new RTCIceCandidate(data.callerCandidates[key]));
                processedCandidates.add(key);
              } catch { }
            }
          }
        }

        if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
          handleCallTermination(data.status, callStatusRef.current === 'connected');
          remove(ref(rtdb, `calls/incoming/${userId}`));
          
          // Add to call history for incoming call
          const historyEntry: CallHistoryEntry = {
            id: callId,
            callId,
            callerId: ci.callerId,
            calleeId: userId,
            callerRole: ci.callerRole,
            calleeRole: userRole,
            callerName: ci.callerName,
            calleeName: ci.calleeName,
            callerImage: ci.callerImage,
            calleeImage: ci.calleeImage,
            type: ci.type,
            status: data.status,
            startedAt: ci.startedAt,
            duration: callDuration,
            timestamp: Date.now(),
            direction: 'incoming',
          };
          setCallHistory(prev => [historyEntry, ...prev].slice(0, 50));
        }
      });
      callListenerUnsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('[CallContext] answerCall error:', error);
      setCallStatus('ended');
      cleanupPeerConnection();
    }
  }, [callInfo, userId, userRole, cleanupPeerConnection, startDurationTimer, startNetworkStatsMonitoring, callDuration]);

  const declineCall = useCallback(async () => {
    const ci = callInfo;
    callSounds.stop();
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    setCallStatus('idle');
    setCallInfo(null);
    incomingCallRef.current = null;
    cleanupPeerConnection();

    if (!ci) return;
    try {
      await update(ref(rtdb, `calls/${ci.callId}`), { status: 'declined', endedAt: Date.now() });
      await remove(ref(rtdb, `calls/incoming/${userId}`));
    } catch (e) {
      console.error('[CallContext] declineCall error:', e);
    }
  }, [callInfo, userId, cleanupPeerConnection]);

  const endCall = useCallback(async () => {
    const ci = callInfo;
    callSounds.stop();
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    setCallStatus('idle');
    setCallInfo(null);
    incomingCallRef.current = null;
    cleanupPeerConnection();

    if (!ci) return;
    try {
      await update(ref(rtdb, `calls/${ci.callId}`), { status: 'ended', endedAt: Date.now() });
      await remove(ref(rtdb, `calls/incoming/${userId}`));
      if (ci.calleeId) {
        await remove(ref(rtdb, `calls/incoming/${ci.calleeId}`));
      }
    } catch (e) {
      console.error('[CallContext] endCall error:', e);
    }
  }, [callInfo, userId, cleanupPeerConnection]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [isMuted]);

const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
  }, []);

  // Toggle video on/off during a call
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  }, [isVideoEnabled]);

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    
    try {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
      
      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      if (videoDevices.length <= 1) return;
      
      // Find the opposite camera
      const newFacingMode = isFrontCamera ? 'environment' : 'user';
      const newDevice = videoDevices.find(d =>
        d.label.toLowerCase().includes(newFacingMode)
      );
      
      // Get new stream with switched camera
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            deviceId: newDevice ? { exact: newDevice.deviceId } : undefined,
            facingMode: newFacingMode,
          },
        });
      } catch (err) {
        console.error('[CallContext] switchCamera getUserMedia error:', err);
        return;
      }
      
      // Replace audio track (keep existing) and add new video track
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      
      if (pcRef.current && audioTrack) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          const newVideoTrack = newStream.getVideoTracks()[0];
          if (newVideoTrack) {
            sender.replaceTrack(newVideoTrack);
          }
        }
      }
      
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('[CallContext] switchCamera error:', error);
    }
  }, [isFrontCamera]);

  return (
    <CallContext.Provider value={{
      callStatus,
      callInfo,
      isCallActive: callStatus === 'connected',
      isMuted,
      isSpeakerOn,
      callDuration,
      networkStats,
      callHistory,
      localStream,
      remoteStream,
      startCall,
      answerCall,
      declineCall,
      endCall,
      toggleMute,
      toggleSpeaker,
      toggleVideo,
      switchCamera,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    console.warn('useCall must be used within a CallProvider. Returning dummy context to prevent HMR crashes.');
    return {
      callStatus: 'idle',
      callInfo: null,
      isCallActive: false,
      isMuted: false,
      isSpeakerOn: false,
      callDuration: 0,
      networkStats: null,
      callHistory: [],
      localStream: null,
      remoteStream: null,
      startCall: async () => {},
      answerCall: async () => {},
      declineCall: async () => {},
      endCall: async () => {},
      toggleMute: () => {},
      toggleSpeaker: () => {},
      toggleVideo: () => {},
      switchCamera: async () => {},
    } as CallContextType;
  }
  return context;
};
