import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../contexts/CallContext';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, Heart, Maximize2, Minimize2, MessageCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, setDoc, doc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { IncomingCallView } from './IncomingCallView';

// Web Audio Helper for Ringing Tones
class RingtonePlayer {
  ctx: AudioContext | null = null;
  osc1: OscillatorNode | null = null;
  osc2: OscillatorNode | null = null;
  gain: GainNode | null = null;
  interval: any = null;

  start(type: 'calling' | 'ringing' | 'ended') {
    this.stop();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      this.ctx = new AudioContextClass();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      this.gain.gain.value = 0;

      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();

      if (type === 'ended') {
        this.osc1.frequency.value = 400;
        this.osc2.frequency.value = 400;
        this.osc1.type = 'sine';
        this.osc2.type = 'sine';

        this.osc1.connect(this.gain);
        this.osc2.connect(this.gain);
        this.osc1.start();
        this.osc2.start();

        let count = 0;
        const playEndBeep = () => {
          if (!this.gain || !this.ctx) return;
          if (count >= 3) {
            this.stop();
            return;
          }
          this.gain.gain.setTargetAtTime(0.2, this.ctx.currentTime, 0.02);
          setTimeout(() => {
            if (this.gain && this.ctx) {
              this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            }
          }, 300);
          count++;
        };
        playEndBeep();
        this.interval = setInterval(playEndBeep, 600);
        return;
      }

      if (type === 'calling') {
        // North American dial tone / calling tone (440 + 480 Hz)
        this.osc1.frequency.value = 440;
        this.osc2.frequency.value = 480;
      } else {
        // Incoming ring (UK style or modern electronic) (400 + 450 Hz)
        this.osc1.frequency.value = 400;
        this.osc2.frequency.value = 450;
      }

      this.osc1.connect(this.gain);
      this.osc2.connect(this.gain);
      this.osc1.start();
      this.osc2.start();

      let isPlaying = false;
      
      const playBeep = () => {
        if (!this.gain || !this.ctx) return;
        this.gain.gain.setTargetAtTime(0.1, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.gain && this.ctx) {
            this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
          }
        }, 1500); // 1.5s beep
      };

      // Play pattern based on type
      playBeep();
      this.interval = setInterval(playBeep, type === 'calling' ? 4000 : 3000);

    } catch (e) {
      console.error(e);
    }
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    setTimeout(() => {
      try {
        this.osc1?.stop();
        this.osc2?.stop();
        this.ctx?.close();
      } catch (e) {}
      this.osc1 = null;
      this.osc2 = null;
      this.ctx = null;
      this.gain = null;
    }, 200);
  }
}

const ringtone = new RingtonePlayer();

export function CallOverlay() {
  const { userData } = useAuth();
  const { callState, callType, incomingCall, acceptCall, declineCall, endCall, dismissEndedCall, localStream, remoteStream, toggleMute, toggleVideo, isMuted, isVideoOff } = useCall();
  const { partnerData, space } = useCoupleSpace();
  const [isPip, setIsPip] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{id: string, x: number}[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let timer: any;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  useEffect(() => {
    if (callState === 'calling' || callState === 'ringing' || callState === 'ended') {
      // Need a small timeout to allow user gesture to resolve if it's incoming
      setTimeout(() => ringtone.start(callState as any), 100);
    } else {
      ringtone.stop();
    }
    return () => ringtone.stop();
  }, [callState]);

  // Listen for reactions
  useEffect(() => {
    if (!space?.id || callState === 'idle') return;
    
    // We only want to listen to reactions sent while connected
    const q = query(
      collection(db, `coupleSpaces/${space.id}/messages`),
      where('type', '==', 'reaction'),
      where('createdAt', '>', Date.now() - 5000), // recent ones
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.senderId !== userData?.id) {
            triggerFloatingHeart();
          }
        }
      });
    });

    return () => unsubscribe();
  }, [space?.id, callState, userData?.id]);

  const triggerFloatingHeart = () => {
    const id = Date.now().toString() + Math.random().toString();
    const x = Math.random() * 80 + 10; // 10% to 90% view width
    setFloatingHearts(prev => [...prev, { id, x }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 3000);
  };

  const sendReaction = async () => {
    if (!space || !userData) return;
    triggerFloatingHeart();
    try {
      const msgId = `msg_${Date.now()}_${userData.id}`;
      await setDoc(doc(db, `coupleSpaces/${space.id}/messages`, msgId), {
        id: msgId,
        coupleSpaceId: space.id,
        senderId: userData.id,
        content: '❤️',
        type: 'reaction',
        seen: false,
        createdAt: Date.now()
      });
    } catch(err) {}
  };

  // persistentAudioRef was removed because remoteVideoRef maps to either an audio tag or a video tag based on callType, preventing echo.

  if (callState === 'idle') return null;

  return (
    <>
      <AnimatePresence>
        <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isPip ? 
          { opacity: 1, scale: 1, width: '120px', height: '160px', bottom: '20px', right: '20px', top: 'auto', left: 'auto', borderRadius: '1rem', zIndex: 100 } : 
          { opacity: 1, scale: 1, inset: 0, borderRadius: '0', zIndex: 100 }
        }
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed overflow-hidden shadow-2xl transition-all ${isPip ? 'cursor-pointer hover:scale-105' : 'bg-gradient-to-b from-[#110B29] to-[#291749]'}`}
        onClick={() => isPip && setIsPip(false)}
      >
        {/* If PIP, just show remote stream or profile picture */}
        {isPip && (
          <div className="w-full h-full relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-white/20">
            {callType === 'video' ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center font-bold text-lg bg-white/20 text-white backdrop-blur-md">
                   {partnerData?.displayName?.[0]?.toUpperCase() || 'P'}
                </div>
                <div className="mt-2 text-white font-bold text-xs uppercase tracking-wider animate-pulse">
                  {callState === 'connected' ? formatDuration(callDuration) : 'Calling...'}
                </div>
              </div>
            )}
            <div className="absolute top-2 right-2">
               <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
            </div>
          </div>
        )}

        {!isPip && callState === 'ringing' ? (
          <IncomingCallView
            partnerData={partnerData}
            incomingCall={incomingCall}
            onAccept={acceptCall}
            onDecline={declineCall}
          />
        ) : !isPip && (
          <div className="absolute inset-0 flex flex-col items-center justify-between text-white font-sans h-[100dvh]">
            
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen pointer-events-none" />
            <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Floating Hearts Area */}
            {floatingHearts.map((heart) => (
               <motion.div
                 key={heart.id}
                 initial={{ opacity: 0, y: 100, scale: 0.5, x: `${heart.x}vw` }}
                 animate={{ opacity: [0, 1, 0], y: -300, scale: 1.5, x: `${heart.x + (Math.random() * 10 - 5)}vw` }}
                 transition={{ duration: 2.5, ease: "easeOut" }}
                 className="absolute bottom-32 z-50 pointer-events-none"
                 style={{ left: 0 }}
               >
                 <Heart className="w-10 h-10 text-pink-500 fill-pink-500 drop-shadow-2xl opacity-80" />
               </motion.div>
            ))}

            {/* Video Background if connected and type is video */}
            {(callState === 'connected' && callType === 'video') && (
               <div className="absolute inset-0 z-0 bg-black">
                 <video 
                   ref={remoteVideoRef} 
                   autoPlay 
                   playsInline 
                   className="w-full h-full object-cover" 
                 />
                 {/* Local Video PIP */}
                 <div className="absolute top-16 right-4 w-28 h-40 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-20">
                   <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                 </div>
               </div>
            )}

            {/* Audio playback for both video and voice (if voice, this handles it invisibly) */}
            {(callState === 'connected') && (
              <audio ref={callType === 'voice' ? remoteVideoRef : undefined} autoPlay playsInline className="hidden" />
            )}

            {/* Content Container */}
            <div className="relative z-10 w-full h-full flex flex-col">
              
              {/* Header */}
              <div className="w-full flex justify-between items-start px-6 pt-12 pb-4 bg-gradient-to-b from-black/50 to-transparent">
                <button 
                  onClick={() => setIsPip(true)}
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md"
                >
                  <Minimize2 className="w-6 h-6 text-white" />
                </button>
                <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-xs font-bold uppercase tracking-widest text-white/90">End-to-end Encrypted</span>
                </div>
                <div className="w-10"></div> {/* Spacer */}
              </div>

              {/* Main Area */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                
                {/* Caller Info */}
                {callState === 'ended' ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-24 h-24 bg-gray-500/20 rounded-full flex items-center justify-center text-4xl font-bold mb-6 border-2 border-white/10 opacity-50 grayscale">
                      {partnerData?.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Call Ended</h2>
                    <p className="text-white/50 font-medium text-md uppercase">Duration: Completed</p>
                  </motion.div>
                ) : (callState !== 'connected' || callType !== 'video') ? (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-32 h-32 bg-gradient-to-br from-[#FF7A9A] to-[#FF4B72] rounded-full flex items-center justify-center text-4xl font-bold shadow-[0_0_40px_rgba(255,75,114,0.4)] border-4 border-white/20 relative z-10">
                        {partnerData?.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                      
                      {/* Ringing animations */}
                      {(callState === 'calling' || callState === 'ringing') && (
                        <>
                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ type: "tween", repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-pink-500/30 rounded-full z-0" />
                          <motion.div animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }} transition={{ type: "tween", repeat: Infinity, duration: 2, delay: 0.5 }} className="absolute inset-0 bg-blue-500/20 rounded-full z-0" />
                        </>
                      )}
                    </div>
                    
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                      {partnerData?.displayName || 'My Love'}
                    </h2>
                    
                    <p className="text-white/60 font-medium text-lg tracking-wide uppercase flex items-center gap-2">
                      {callState === 'calling' && 'Calling...'}
                      {callState === 'ringing' && 'Incoming Call...'}
                      {callState === 'connecting' && (
                        <span className="flex items-center gap-1.5 animate-pulse">
                           <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" /> Connection Handshake...
                        </span>
                      )}
                      {callState === 'reconnecting' && (
                        <span className="flex items-center gap-1.5 animate-pulse text-amber-300">
                           <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" /> Reconnecting...
                        </span>
                      )}
                      {callState === 'connected' && formatDuration(callDuration)}
                    </p>

                    {/* Waveform for voice calls connected */}
                    {callState === 'connected' && callType === 'voice' && (
                       <div className="mt-12 flex items-center justify-center gap-1.5 h-16 w-full max-w-[200px]">
                         {[...Array(15)].map((_, i) => (
                           <motion.div 
                             key={i} 
                             className="w-1.5 bg-gradient-to-t from-pink-500 to-indigo-400 rounded-full"
                             animate={{ height: ['20%', '80%', '20%'] }}
                             transition={{ repeat: Infinity, duration: 0.5 + (Math.random() * 0.5), delay: i * 0.1 }}
                           />
                         ))}
                       </div>
                    )}
                  </motion.div>
                ) : null}

              </div>

              {/* Controls */}
              <div className="w-full bg-gradient-to-t from-black/80 to-transparent pt-12 pb-10 px-8">
                {callState === 'ended' ? (
                  <div className="flex justify-around items-center w-full max-w-sm mx-auto">
                     <button 
                       onClick={() => { dismissEndedCall(); /* Can navigate to chat or something if needed, but going to idle works */ }}
                       className="flex flex-col items-center gap-2 group"
                     >
                       <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                         <MessageCircle className="w-6 h-6 text-white" />
                       </div>
                       <span className="text-xs font-medium text-white/70 tracking-widest uppercase">Message</span>
                     </button>
                     <button 
                       onClick={dismissEndedCall}
                       className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/20 shadow-lg"
                     >
                       <PhoneOff className="w-7 h-7 text-white" />
                     </button>
                  </div>
                ) : callState === 'ringing' ? (
                  <div className="flex justify-around items-center w-full max-w-sm mx-auto">
                    <button 
                      onClick={() => {
                         if (navigator.vibrate) navigator.vibrate(50);
                         declineCall();
                      }}
                      className="w-16 h-16 rounded-full bg-red-500 flex flex-col justify-center items-center gap-1 shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <PhoneOff className="w-7 h-7 text-white" />
                    </button>
                    <button 
                      onClick={() => {
                         if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                         acceptCall();
                      }}
                      className="w-16 h-16 rounded-full bg-green-500 flex flex-col justify-center items-center gap-1 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:bg-green-600 transition-colors"
                    >
                      {incomingCall?.type === 'video' ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
                     
                     {/* Features row */}
                     {callState === 'connected' && (
                        <div className="flex justify-center mb-2">
                           <button onClick={sendReaction} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2 transition-all active:scale-95 shadow-md">
                              <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
                              <span className="text-sm font-bold text-white tracking-widest uppercase text-white/90">Send Love</span>
                           </button>
                        </div>
                     )}

                     {/* Call Controls row */}
                     <div className="flex justify-between items-center bg-white/10 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 shadow-2xl">
                       <button onClick={toggleMute} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                         {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                       </button>
                       
                       {callType === 'video' && (
                         <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                           {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                         </button>
                       )}
                       
                       <button onClick={() => {
                           if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
                           endCall();
                         }} className="p-5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all transform hover:scale-105 active:scale-95">
                         <PhoneOff className="w-7 h-7" />
                       </button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
    </>
  );
}
