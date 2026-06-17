import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { rtdb, auth } from '../firebase';
import { ref, set, push, onValue, off, update, remove, get, serverTimestamp } from 'firebase/database';

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
  callerImage?: string;
  calleeImage?: string;
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
  return auth.currentUser?.uid || '';
}

function getLocalUserRole(): CallRole {
  const admin = sessionStorage.getItem('admin_authenticated');
  const hint = sessionStorage.getItem('auth_type_hint');
  if (admin === 'true') return 'admin';
  if (hint === 'mechanic') return 'mechanic';
  return 'customer';
}

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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const incomingCallRef = useRef<string | null>(null);
  const candidatesQueueRef = useRef<RTCIceCandidate[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number>(0);

  const userId = getLocalUserId();
  const userRole = getLocalUserRole();

const cleanupPeerConnection = useCallback(() => {
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
    candidatesQueueRef.current = [];
    setNetworkStats(null);
  }, []);

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

  const listenForIncomingCalls = useCallback(() => {
    if (!userId) return;
    const incomingRef = ref(rtdb, `calls/incoming/${userId}`);
    const unsubscribe = onValue(incomingRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.callId && callStatus === 'idle') {
        const callId = data.callId;
        incomingCallRef.current = callId;
        const callRef = ref(rtdb, `calls/${callId}`);
        get(callRef).then((callSnap) => {
          const callData = callSnap.val();
          if (callData && callData.status === 'ringing') {
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
          }
        });
      }
    });
    return () => off(incomingRef);
  }, [userId, callStatus]);

  useEffect(() => {
    const unsub = listenForIncomingCalls();
    return () => { unsub?.(); };
  }, [listenForIncomingCalls]);

  useEffect(() => {
    return () => {
      cleanupPeerConnection();
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
        callerImage: auth.currentUser?.photoURL || undefined,
        calleeImage: params.targetImage,
        type: params.type,
        status: 'ringing',
        startedAt: Date.now(),
      };

      setCallInfo(callData);
      setCallStatus('calling');
      setIsVideoEnabled(params.type === 'video');
      setIsFrontCamera(true);

      await set(ref(rtdb, `calls/${callId}`), callData);
      await set(ref(rtdb, `calls/incoming/${params.targetId}`), { callId });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: params.type === 'video',
      });
      localStreamRef.current = stream;

      // Use ALL_ICE_SERVERS for better connectivity
      const pc = new RTCPeerConnection(ALL_ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          set(ref(rtdb, `calls/${callId}/callerCandidates/${Date.now()}`), event.candidate.toJSON());
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(rtdb, `calls/${callId}/offer`), { type: offer.type, sdp: offer.sdp });

      const callRef = ref(rtdb, `calls/${callId}`);
      onValue(callRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.answer && pc.currentRemoteDescription === null) {
          const answer = new RTCSessionDescription({ type: data.answer.type, sdp: data.answer.sdp });
          await pc.setRemoteDescription(answer);
          setCallStatus('connected');
          if (callInfo) setCallInfo({ ...callInfo, status: 'connected' });
          await update(ref(rtdb, `calls/${callId}`), { status: 'connected' });
          
          // Start duration timer
          startDurationTimer();
          // Start network stats monitoring
          startNetworkStatsMonitoring();

          while (candidatesQueueRef.current.length > 0) {
            const c = candidatesQueueRef.current.shift();
            if (c) await pc.addIceCandidate(c);
          }
        }

        if (data.calleeCandidates && pc.remoteDescription) {
          const keys = Object.keys(data.calleeCandidates);
          for (const key of keys) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.calleeCandidates[key]));
            } catch { }
          }
        }

        if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
          setCallStatus(data.status);
          cleanupPeerConnection();
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
            callerImage: auth.currentUser?.photoURL || undefined,
            calleeImage: params.targetImage,
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
    } catch (error) {
      console.error('[CallContext] startCall error:', error);
      setCallStatus('ended');
      cleanupPeerConnection();
    }
  }, [userId, userRole, callInfo, cleanupPeerConnection, startDurationTimer, startNetworkStatsMonitoring, callDuration]);

const answerCall = useCallback(async () => {
    const ci = callInfo;
    if (!ci || !incomingCallRef.current) return;
    const callId = ci.callId;
    try {
      cleanupPeerConnection();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: ci.type === 'video',
      });
      localStreamRef.current = stream;

      // Use ALL_ICE_SERVERS for better connectivity
      const pc = new RTCPeerConnection(ALL_ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          set(ref(rtdb, `calls/${callId}/calleeCandidates/${Date.now()}`), event.candidate.toJSON());
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
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

      onValue(callRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.callerCandidates && pc.remoteDescription) {
          const keys = Object.keys(data.callerCandidates);
          for (const key of keys) {
            try {
              pc.addIceCandidate(new RTCIceCandidate(data.callerCandidates[key]));
            } catch { }
          }
        }

        if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
          setCallStatus(data.status);
          cleanupPeerConnection();
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
    } catch (error) {
      console.error('[CallContext] answerCall error:', error);
      setCallStatus('ended');
      cleanupPeerConnection();
    }
  }, [callInfo, userId, userRole, cleanupPeerConnection, startDurationTimer, startNetworkStatsMonitoring, callDuration]);

  const declineCall = useCallback(async () => {
    const ci = callInfo;
    if (!ci) return;
    await update(ref(rtdb, `calls/${ci.callId}`), { status: 'declined', endedAt: Date.now() });
    await remove(ref(rtdb, `calls/incoming/${userId}`));
    setCallStatus('idle');
    setCallInfo(null);
    incomingCallRef.current = null;
    cleanupPeerConnection();
  }, [callInfo, userId, cleanupPeerConnection]);

  const endCall = useCallback(async () => {
    const ci = callInfo;
    if (!ci) return;
    await update(ref(rtdb, `calls/${ci.callId}`), { status: 'ended', endedAt: Date.now() });
    await remove(ref(rtdb, `calls/incoming/${userId}`));
    if (ci.calleeId) {
      await remove(ref(rtdb, `calls/incoming/${ci.calleeId}`));
    }
    setCallStatus('idle');
    setCallInfo(null);
    incomingCallRef.current = null;
    cleanupPeerConnection();
  }, [callInfo, userId, cleanupPeerConnection]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
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
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          deviceId: newDevice ? { exact: newDevice.deviceId } : undefined,
          facingMode: newFacingMode,
        },
      });
      
      // Replace audio track (keep existing) and add new video track
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      localStreamRef.current = newStream;
      
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
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
