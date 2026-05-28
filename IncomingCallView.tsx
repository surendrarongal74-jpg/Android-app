import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Phone, Video, PhoneOff, Heart, MessageSquare, Sparkles } from 'lucide-react';
import { triggerHapticFeedback } from '../lib/haptics';

interface IncomingCallViewProps {
  partnerData: any;
  incomingCall: any;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallView({ partnerData, incomingCall, onAccept, onDecline }: IncomingCallViewProps) {
  const isVideo = incomingCall?.type === 'video';
  const partnerName = partnerData?.displayName || 'My Love';
  const initials = partnerName[0]?.toUpperCase() || 'P';

  // State to spawn floaters
  const [ambientParticles, setAmbientParticles] = useState<any[]>([]);
  const [floatingHearts, setFloatingHearts] = useState<any[]>([]);

  // Generate background clouds and sparkles
  useEffect(() => {
    // Generate organic particles
    const particles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 12 + 10,
      delay: Math.random() * -10,
    }));
    setAmbientParticles(particles);

    // Spawn heart generator interval
    const heartTimer = setInterval(() => {
      const newHeart = {
        id: Date.now() + Math.random(),
        x: Math.random() * 80 + 10, // 10% to 90%
        scale: Math.random() * 0.4 + 0.6,
        duration: Math.random() * 4 + 5,
      };
      setFloatingHearts(prev => [...prev.slice(-10), newHeart]);
    }, 2400);

    return () => clearInterval(heartTimer);
  }, []);

  // Motion controls for Swipe mechanism
  const dragX = useMotionValue(0);
  
  // Transform drag distance to background color triggers and opacity levels
  const leftGlowOpacity = useTransform(dragX, [-80, -20, 0], [0.85, 0.2, 0]);
  const rightGlowOpacity = useTransform(dragX, [0, 20, 80], [0, 0.2, 0.85]);
  const textHintOpacity = useTransform(dragX, [-40, 0, 40], [0, 1, 0]);
  const handleXScale = useTransform(dragX, [-80, 0, 80], [0.9, 1, 0.9]);

  // Handle Drag Completion
  const handleDragEnd = (_, info) => {
    const threshold = 75;
    if (info.offset.x > threshold) {
      triggerHapticFeedback('heavy');
      onAccept();
    } else if (info.offset.x < -threshold) {
      triggerHapticFeedback('medium');
      onDecline();
    }
  };

  return (
    <div className="absolute inset-0 z-[100] overflow-hidden flex flex-col justify-between font-sans bg-slate-950 text-white">
      {/* 1. ANIMATED DEEP DREAMY GRADIENT MOVEMENT */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#110B29] via-[#1E113A] to-[#2E183B]" />
      
      {/* Moving blurred light clouds */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 0.9, 1],
          x: [0, 40, -30, 0],
          y: [0, -50, 20, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[10%] -left-[20%] w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] bg-rose-500/15 rounded-full blur-[90px] mix-blend-screen pointer-events-none" 
      />
      
      <motion.div 
        animate={{ 
          scale: [1, 0.85, 1.15, 1],
          x: [0, -50, 40, 0],
          y: [0, 40, -30, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-[10%] -right-[15%] w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-indigo-500/15 rounded-full blur-[100px] mix-blend-screen pointer-events-none" 
      />

      <motion.div 
        animate={{ 
          scale: [0.9, 1.1, 0.85, 0.9],
          x: [20, -20, 20],
          y: [-20, 30, -20],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-[40%] left-[25%] w-[250px] h-[250px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" 
      />

      {/* Grid overlay for futuristic texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* 2. AMBIENT PARTICLES UPWARD FLOW */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {ambientParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: '110%', x: `${p.x}%`, opacity: 0 }}
            animate={{ 
              y: '-10%', 
              opacity: [0, 0.7, 0.7, 0],
              x: [`${p.x}%`, `${p.x + (Math.sin(p.id) * 8)}%`]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'linear',
              delay: p.delay,
            }}
            style={{ width: p.size, height: p.size }}
            className="absolute bg-white rounded-full mix-blend-screen shadow-[0_0_8px_#ffffff]"
          />
        ))}

        {/* Floating Hearts generator */}
        <AnimatePresence>
          {floatingHearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ y: '110vh', x: `${h.x}vw`, opacity: 0, scale: 0.2, rotate: 0 }}
              animate={{ 
                y: '-10vh', 
                opacity: [0, 0.9, 0.8, 0],
                scale: h.scale,
                rotate: [0, Math.sin(h.id) * 30] 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: h.duration, ease: 'easeOut' }}
              className="absolute text-rose-500/30 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]"
            >
              <Heart className="w-6 h-6 fill-current" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Smooth Dark cinematic overlay to elevate readable contrast */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 3. TOP SECTION: BRANDING & INCOMING CALL META */}
      {/* ========================================================================= */}
      <motion.div 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full flex flex-col items-center pt-16 px-6 text-center select-none"
      >
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl mb-4 shadow-xl">
          <motion.div 
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" 
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-200/90 font-bold">Love Link secure call</span>
        </div>
        
        <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-2">
          {isVideo ? (
            <>
              <Video className="w-3.5 h-3.5 text-rose-400" /> Incoming Video Call
            </>
          ) : (
            <>
              <Phone className="w-3.5 h-3.5 text-rose-400" /> Incoming Voice Call
            </>
          )}
        </h3>
      </motion.div>

      {/* ========================================================================= */}
      {/* 4. CENTER SECTION: PORTRAIT & LIVE RIPPLES / WAVEFORMS */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 select-none">
        
        {/* Glowing avatar ring stage */}
        <div className="relative mb-8 flex items-center justify-center">
          
          {/* Wave ripple rings pulsing synced around avatar */}
          <div className="absolute w-44 h-44 rounded-full border border-rose-500/25 animate-ping opacity-30 pointer-events-none" style={{ animationDuration: '3s' }} />
          <div className="absolute w-56 h-56 rounded-full border border-indigo-500/20 animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          <div className="absolute w-72 h-72 rounded-full border border-purple-500/10 animate-ping opacity-15 pointer-events-none" style={{ animationDuration: '3s', animationDelay: '2s' }} />

          {/* Halo ambient aura */}
          <div className="absolute inset-0 w-36 h-36 bg-gradient-to-tr from-pink-500 to-indigo-500 rounded-full blur-[35px] opacity-40 animate-pulse pointer-events-none" />

          {/* Interactive Profile Photo Box */}
          <motion.div 
            animate={{ 
              scale: [1, 1.03, 1],
              boxShadow: [
                '0 0 30px rgba(244,63,94,0.3)', 
                '0 0 50px rgba(99,102,241,0.5)', 
                '0 0 30px rgba(244,63,94,0.3)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="relative w-36 h-36 bg-gradient-to-tr from-[#FF7A9A] via-[#E8547A] to-[#8B5CF6] rounded-full p-[3.5px] z-10"
          >
            <div className="w-full h-full bg-[#1b1236]/90 rounded-full flex items-center justify-center border-2 border-white/5 shadow-inner overflow-hidden">
              <span className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-rose-100 to-indigo-150 drop-shadow-md">
                {initials}
              </span>
            </div>
          </motion.div>

          {/* Mini active floating heart next to profile circle */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute bottom-1 right-2 z-20 w-10 h-10 bg-rose-550 border-2 border-white rounded-full flex items-center justify-center p-1 shadow-lg bg-pink-500"
          >
            <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
          </motion.div>
        </div>

        {/* Caller identity */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-4xl font-serif font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-100 to-rose-250 tracking-tight drop-shadow-xl mb-3">
            {partnerName}
          </h2>
          <p className="text-slate-300 font-medium text-sm sm:text-base tracking-wider flex items-center justify-center gap-1.5 opacity-90">
            <span className="inline-block relative w-2 h-2 rounded-full bg-pink-400 animate-ping mr-1" />
            Wants to connect with you
          </p>
        </motion.div>

        {/* Monitored voice frequency visualizer ring inside background */}
        <div className="mt-8 flex items-center gap-1.5 h-6">
          {[...Array(9)].map((_, i) => (
            <motion.div 
              key={i} 
              className="w-1 bg-[#F2A7BE]/60 rounded-full"
              animate={{ height: ['8px', i % 2 === 0 ? '24px' : '16px', '8px'] }}
              transition={{ repeat: Infinity, duration: 0.7 + (i * 0.05), ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM SECTION: INTEGRATE GLASS SWIPING TRACK & TACTILE ACTIONS */}
      {/* ========================================================================= */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        className="relative z-10 w-full bg-gradient-to-t from-black/85 via-black/40 to-transparent pb-16 pt-10 px-8 flex flex-col items-center"
      >
        
        {/* Dynamic glow blocks showing interactive drag direction colors */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-16">
          <motion.div 
            style={{ opacity: leftGlowOpacity }}
            className="w-24 h-24 bg-red-600/30 rounded-full blur-[40px]" 
          />
          <motion.div 
            style={{ opacity: rightGlowOpacity }}
            className="w-24 h-24 bg-green-500/30 rounded-full blur-[40px]" 
          />
        </div>

        {/* DUAL ACTION SWIPE SLIDER */}
        <div className="w-full max-w-xs mb-8 relative">
          
          <div className="h-16 rounded-full bg-white/[0.06] backdrop-blur-2xl border border-white/10 flex items-center justify-between px-3 relative overflow-hidden shadow-2xl">
            
            {/* Sliding channel direction guides */}
            <div className="absolute inset-0 flex justify-between items-center px-6 pointer-events-none text-white/20">
              <span className="text-xs font-mono font-bold">≪ DECLINE</span>
              <span className="text-xs font-mono font-bold">ACCEPT ≫</span>
            </div>

            {/* Glowing drag zone tracks helper */}
            <motion.div 
              style={{ opacity: leftGlowOpacity }} 
              className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-red-500/20 to-transparent rounded-l-full" 
            />
            <motion.div 
              style={{ opacity: rightGlowOpacity }} 
              className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/20 to-transparent rounded-r-rull" 
            />

            {/* Red Decline target guide */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-red-500/70 border border-red-500/10">
              <PhoneOff className="w-4 h-4 text-red-400" />
            </div>

            {/* Central SWIPE HANDLE block */}
            <motion.div
              drag="x"
              dragElastic={0.2}
              dragConstraints={{ left: -90, right: 90 }}
              style={{ x: dragX, scale: handleXScale }}
              onDragEnd={handleDragEnd}
              whileTap={{ cursor: 'grabbing', scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] to-purple-600 flex items-center justify-center cursor-grab active:scale-95 z-20 hover:shadow-pink-500/30 border border-white/30"
            >
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}
              >
                <Heart className="w-6 h-6 text-white fill-current" />
              </motion.div>
            </motion.div>

            {/* Green Accept target guide */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-green-500/70 border border-green-500/10">
              <Phone className="w-4 h-4 text-emerald-400" />
            </div>

          </div>

          <motion.p 
            style={{ opacity: textHintOpacity }}
            className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-semibold text-slate-400 mt-2.5 animate-pulse"
          >
            ← Swipe Left to Decline — Right to Accept →
          </motion.p>
        </div>


        {/* TACTILE SPARE ACCESSIBILITY BUTTON CHANNELS */}
        <div className="flex justify-between items-center w-full max-w-[240px] px-2 z-20">
          
          {/* Decline Button Card */}
          <div className="flex flex-col items-center gap-1.5 group">
            <motion.button 
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(45);
                triggerHapticFeedback('medium');
                onDecline();
              }}
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.92 }}
              className="w-14 h-14 rounded-full bg-rose-950/60 border border-red-500/30 hover:bg-red-650 flex items-center justify-center shadow-lg group-hover:shadow-red-900/30 text-red-400 transition-colors cursor-pointer"
              title="Decline Invitation"
            >
              <PhoneOff className="w-5 h-5 text-red-500" />
            </motion.button>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider">Decline</span>
          </div>

          <div className="w-[1px] h-8 bg-white/10" />

          {/* Accept Button Card */}
          <div className="flex flex-col items-center gap-1.5 group">
            <motion.button 
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
                triggerHapticFeedback('heavy');
                onAccept();
              }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.92 }}
              className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-650 flex items-center justify-center shadow-lg group-hover:shadow-emerald-900/30 text-emerald-400 transition-colors cursor-pointer"
              title="Accept Invitation"
            >
              {isVideo ? (
                <Video className="w-5 h-5 text-emerald-400" />
              ) : (
                <Phone className="w-5 h-5 text-emerald-400" />
              )}
            </motion.button>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider">Accept</span>
          </div>

        </div>

      </motion.div>
    </div>
  );
}
