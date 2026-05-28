import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useCoupleSpace } from './CoupleSpaceContext';
import { useNotifications } from './NotificationContext';
import { triggerHapticFeedback } from '../lib/haptics';
import io from 'socket.io-client';
import { nativeCallBridge } from '../services/nativeBridge';

type CallType = 'voice' | 'video';
type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'ended';

interface CallContextType {
  callState: CallState;
  callType: CallType | null;
  incomingCall: any;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  dismissEndedCall: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const { space, partnerData } = useCoupleSpace();
  const { sendNotification } = useNotifications();
  
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStateRef = useRef<CallState>('idle');
  const callingTimeoutRef = useRef<any>(null);
  const queuedCandidatesRef = useRef<any[]>([]);

  const drainQueuedCandidates = async () => {
    const pc = pcRef.current;
    if (pc && pc.remoteDescription && queuedCandidatesRef.current.length > 0) {
      console.log(`[CallContext WebRTC] Draining ${queuedCandidatesRef.current.length} queued ICE candidates.`);
      const candidates = [...queuedCandidatesRef.current];
      queuedCandidatesRef.current = [];
      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[CallContext WebRTC] Successfully applied queued ICE candidate.');
        } catch (e) {
          console.warn('[CallContext WebRTC] Failed to apply queued ICE candidate:', e);
        }
      }
    }
  };

  const acceptCallRef = useRef<() => Promise<void>>(null as any);
  const declineCallRef = useRef<() => Promise<void>>(null as any);
  const endCallRef = useRef<() => Promise<void>>(null as any);

  useEffect(() => {
    acceptCallRef.current = acceptCall;
    declineCallRef.current = declineCall;
    endCallRef.current = endCall;
  });

  // Keep ref in sync to avoid stale closure issues in persistent listeners
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Bind bidirectional native hardware bridge listeners
  useEffect(() => {
    console.log('[CallContext] Activating Native CallKeep inflow message listeners.');
    const unsubscribe = nativeCallBridge.registerInflowListener({
      onNativeAccept: () => {
        console.log('[CallContext] Executing native-bridge accept action.');
        acceptCallRef.current();
      },
      onNativeDecline: () => {
        console.log('[CallContext] Executing native-bridge decline action.');
        declineCallRef.current();
      },
      onNativeEnd: () => {
        console.log('[CallContext] Executing native-bridge end call action.');
        endCallRef.current();
      }
    });

    return () => {
      console.log('[CallContext] Dismissing Native CallKeep inflow message listeners.');
      unsubscribe();
    };
  }, []);

  // Initialize socket.io connection for signaling & heartbeats
  useEffect(() => {
    if (!userData?.id || !space?.id) return;

    // Direct local origin socket initialization
    console.log('[CallContext] Initializing Socket.IO connection for user:', userData.id);
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[CallContext] Socket.IO Connected and registering user with id:', userData.id);
      socket.emit('register-user', { userId: userData.id, coupleSpaceId: space.id });
    });

    // Register active seat immediately
    socket.emit('register-user', { userId: userData.id, coupleSpaceId: space.id });

    // Listen to real-time events from partner
    socket.on('incoming-call-internal', async ({ fromUserId, callType: t, callId, offer }) => {
      console.log('[CallContext] Received instant local incoming call offer:', callId, 'Current call state:', callStateRef.current);
      // Deny duplicate calls if already active
      if (pcRef.current !== null || callStateRef.current !== 'idle') {
        socket.emit('end-call-internal', {
          toUserId: fromUserId,
          callId,
          reason: 'busy'
        });
        return;
      }

      setIncomingCall({ id: callId, callerId: fromUserId, callType: t, offer });
      setCallState('ringing');
      setCallType(t);

      // Trigger RNCallKeep native UI screen display on wrapper
      nativeCallBridge.send('DISPLAY_INCOMING_CALL', {
        callUUID: callId,
        callerName: partnerData?.displayName || 'My Love',
        type: t
      });

      // Signal back that it is actively ringing on device
      socket.emit('ringing-internal', { toUserId: fromUserId, callId });
    });

    socket.on('call-ringing-internal', ({ callId }) => {
      console.log('[CallContext] Remote peer device is ringing:', callId);
    });

    socket.on('call-accepted-internal', async ({ fromUserId, callId, answer }) => {
      console.log('[CallContext] Remote partner accepted call answer:', callId);
      const pc = pcRef.current;
      if (pc) {
        try {
          setCallState('connecting');
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[CallContext] Remote description successfully registered. Initiating media handshakes.');
          await drainQueuedCandidates();
        } catch (e) {
          console.error('[CallContext] Error applying remote SDP description answer:', e);
        }
      }
    });

    socket.on('ice-candidate-internal', async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc) {
        if (!pc.remoteDescription) {
          console.log('[CallContext] Queueing remote ICE candidate since remoteDescription is not yet set.');
          queuedCandidatesRef.current.push(candidate);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[CallContext] Successfully incorporated secondary ICE candidate.');
          } catch (e) {
            console.warn('[CallContext] Candidate addition skipped:', e);
          }
        }
      }
    });

    socket.on('webrtc-connected-internal', ({ callId }) => {
      console.log('[CallContext] Peer handshakes complete. Channel status is active:', callId);
      setCallState('connected');
    });

    socket.on('call-ended-internal', ({ callId, reason }) => {
      console.log('[CallContext] Partner triggered call close or left, reason:', reason);
      resetCall();
    });

    // Ringing/Hearing heartbeat intervals to prevent phantom rings
    const hbInterval = setInterval(() => {
      if (socket.connected) {
         socket.emit('heartbeat-internal');
      }
    }, 15000);

    return () => {
      clearInterval(hbInterval);
      if (socket) {
        console.log('[CallContext] Cleaning up Socket.IO connection');
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [userData?.id, space?.id]);

  // Setup actual RTCPeerConnection object with STUN/TURN fallback
  const setupWebRTC = async (type: CallType, partnerId: string, callId: string) => {
    const rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Fallback production TURN configurations
        ...(import.meta.env.VITE_TURN_SERVER_URL ? [{
          urls: import.meta.env.VITE_TURN_SERVER_URL,
          username: import.meta.env.VITE_TURN_SERVER_USERNAME || '',
          credential: import.meta.env.VITE_TURN_SERVER_CREDENTIAL || ''
        }] : [])
      ]
    };

    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    // Remote streams creation
    const remote = new MediaStream();
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      console.log('[CallContext WebRTC] Adding remote stream tracks.');
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
    };

    // Candidate capture
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate-internal', {
          toUserId: partnerId,
          callId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Authentic ConnectionState tracking
    pc.onconnectionstatechange = async () => {
      const state = pc.connectionState;
      console.log('[CallContext WebRTC connectionState changed]:', state);
      
      if (state === 'connected') {
        setCallState('connected');
        if (callingTimeoutRef.current) {
          clearTimeout(callingTimeoutRef.current);
          callingTimeoutRef.current = null;
        }
        // Persist true active link status in Firestore database securely
        setDoc(doc(db, 'calls', callId), {
          status: 'connected',
          startedAt: Date.now()
        }, { merge: true }).catch(() => {});

        // Confirm connection back to the partner
        if (socketRef.current) {
          socketRef.current.emit('webrtc-connected-internal', {
            toUserId: partnerId,
            callId
          });
        }
      } else if (state === 'disconnected') {
        setCallState('reconnecting');
        console.log('[CallContext WebRTC disconnected] Attempting automatic connection healing...');
      } else if (state === 'failed') {
        console.warn('[CallContext WebRTC connectionState failed] Initiating high-priority ICE restart...');
        try {
          if (pc.signalingState !== 'closed') {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            
            if (socketRef.current) {
              socketRef.current.emit('call-internal', {
                toUserId: partnerId,
                callId,
                callType: type,
                offer: {
                  type: offer.type,
                  sdp: offer.sdp
                }
              });
            }
          } else {
            resetCall();
          }
        } catch (restartErr) {
          console.error('[CallContext WebRTC Restart Failed] Auto-healing aborted:', restartErr);
          resetCall();
        }
      } else if (state === 'closed') {
        resetCall();
      }
    };

    return pc;
  };

  const getMedia = async (type: CallType) => {
    try {
      // 720p 24fps low-end mobile optimization constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? {
          facingMode: 'user',
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      console.error('[CallContext getUserMedia Error]:', err);
      throw err;
    }
  };

  const startCall = async (type: CallType) => {
    if (!space?.id || !userData?.id || !partnerData?.id) return;

    // Safety: active online verification
    const partnerLastSeen = partnerData.lastSeen || 0;
    const isPartnerOnline = partnerData.isOnline && (Date.now() - partnerLastSeen < 1000 * 60 * 5);
    
    if (!isPartnerOnline) {
       alert("Partner appears offline. They may not hear the call, but we're attempting connection...");
    }

    triggerHapticFeedback('medium');

    try {
      setCallState('calling');
      setCallType(type);
      
      const stream = await getMedia(type);
      const callId = `call_${Date.now()}_${userData.id}`;
      currentCallIdRef.current = callId;

      const pc = await setupWebRTC(type, partnerData.id, callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offerDescription = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      });
      await pc.setLocalDescription(offerDescription);

      // Fast-forward WebRTC routing via sockets instantly
      if (socketRef.current) {
        socketRef.current.emit('call-internal', {
          toUserId: partnerData.id,
          callId,
          callType: type,
          offer: {
            type: offerDescription.type,
            sdp: offerDescription.sdp
          }
        });
      }

      // Notify native bridge regarding initiated outgoing call
      nativeCallBridge.send('OUTGOING_CALL_INITIATED', {
        callUUID: callId,
        partnerName: partnerData?.displayName || 'My Love',
        type
      });

      // Persistently record calling history ledger entry in DB
      const callData = {
        id: callId,
        coupleSpaceId: space.id,
        callerId: userData.id,
        receiverId: partnerData.id,
        callerDisplayName: userData.displayName || 'My Partner',
        type,
        status: 'calling',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'calls', callId), callData);

      // Send local app banner notification
      sendNotification(partnerData.id, {
        type: 'call',
        title: `Incoming ${type} call`,
        body: `${userData.displayName || 'Partner'} is calling you...`,
        priority: 'high',
        data: { callId, type }
      });

      // Send FCM push notifications proxy
      if (partnerData.fcmToken) {
         fetch("/call-notification", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               token: partnerData.fcmToken,
               title: "Love Is Calling 📞",
               body: `${userData.displayName} is signaling a ${type} call.`,
               callData
            })
         }).catch(() => {});
      }

      // Automatically end call after 35 seconds of silence or no-answer
      if (callingTimeoutRef.current) clearTimeout(callingTimeoutRef.current);
      callingTimeoutRef.current = setTimeout(() => {
         if (callStateRef.current === 'calling' || callStateRef.current === 'ringing') {
            console.log('[CallContext Timeout] Call went unanswered for 35 seconds. Auto-terminating.');
            endCall();
         }
      }, 35000);

    } catch (e) {
      console.error('[CallContext startCall Exception]:', e);
      resetCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !partnerData?.id || !space?.id || !userData?.id) return;
    
    const callId = incomingCall.id || currentCallIdRef.current;
    if (!callId) return;

    triggerHapticFeedback('heavy');

    try {
      setCallState('connecting');
      const stream = await getMedia(incomingCall.callType);
      const pc = await setupWebRTC(incomingCall.callType, partnerData.id, callId);
      
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (incomingCall.offer) {
        const offerDescription = new RTCSessionDescription(incomingCall.offer);
        await pc.setRemoteDescription(offerDescription);
        await drainQueuedCandidates();

        const answerDescription = await pc.createAnswer();
        await pc.setLocalDescription(answerDescription);

        // Immediate responsive Answer stream via Sockets
        if (socketRef.current) {
          socketRef.current.emit('accept-call-internal', {
            toUserId: partnerData.id,
            callId,
            answer: {
              type: answerDescription.type,
              sdp: answerDescription.sdp
            }
          });
        }

        // Keep native wrapper updated on accept state
        nativeCallBridge.send('NATIVE_CALL_ANSWERED', { callUUID: callId });

        // Persist connects securely inside Firestore
        await setDoc(doc(db, 'calls', callId), {
          status: 'connecting',
          updatedAt: Date.now()
        }, { merge: true });

        setIncomingCall(null);
      }
    } catch (e) {
      console.error('[CallContext acceptCall Exception]:', e);
      resetCall();
    }
  };

  const declineCall = async () => {
    if (!incomingCall || !partnerData?.id) {
      resetCall();
      return;
    }
    
    const callId = incomingCall.id;
    if (socketRef.current) {
      socketRef.current.emit('end-call-internal', {
        toUserId: partnerData.id,
        callId,
        reason: 'declined'
      });
    }

    await setDoc(doc(db, 'calls', callId), {
      status: 'declined',
      endedAt: Date.now()
    }, { merge: true }).catch(() => {});

    resetCall();
  };

  const endCall = async () => {
    const callId = currentCallIdRef.current || (incomingCall ? incomingCall.id : null);
    
    if (partnerData?.id && socketRef.current) {
      socketRef.current.emit('end-call-internal', {
        toUserId: partnerData.id,
        callId: callId || 'active_call',
        reason: 'completed'
      });
    }

    if (callId) {
      await setDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endedAt: Date.now()
      }, { merge: true }).catch(() => {});
    }

    transitionToEnded();
  };

  const transitionToEnded = () => {
    setCallState('ended');
    closeMedia();
  };

  const resetCall = () => {
    transitionToEnded();
  };

  const dismissEndedCall = () => {
    setCallState('idle');
    setCallType(null);
    setIncomingCall(null);
    currentCallIdRef.current = null;
  };

  const closeMedia = () => {
    setIsMuted(false);
    setIsVideoOff(false);
    queuedCandidatesRef.current = [];

    const callId = currentCallIdRef.current || (incomingCall ? incomingCall.id : null);
    if (callId) {
      nativeCallBridge.send('END_NATIVE_CALL', { callUUID: callId });
    }

    if (callingTimeoutRef.current) {
      clearTimeout(callingTimeoutRef.current);
      callingTimeoutRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  };

  return (
    <CallContext.Provider value={{
      callState,
      callType,
      incomingCall,
      localStream,
      remoteStream,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      dismissEndedCall,
      toggleMute,
      toggleVideo,
      isMuted,
      isVideoOff
    }}>
      {children}
    </CallContext.Provider>
  );
}
