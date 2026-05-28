import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Sparkles, LogOut, Copy, Gamepad2, PlayCircle, Camera, ArrowRight, HeartPulse, Heart, Smile, Meh, Frown, Angry, Star, Globe, Palette, BookOpen, Zap, Quote, Image as ImageIcon, Share2, ChevronRight, Trophy, MessageSquare, Plane, Clock, ChevronLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud as CloudIcon } from 'lucide-react';
import { AiraInsightCard } from '../components/AiraInsightCard';
import { MilestoneCelebration } from '../components/MilestoneCelebration';
import { HugAnimation } from '../components/HugAnimation';
import { DailyCard } from '../components/DailyCard';
import { RelationshipPet } from '../components/RelationshipPet';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';

import { triggerHapticFeedback } from '../lib/haptics';

const FloatingCloud = React.memo(function FloatingCloud({ delay = 0, duration = 15, className, size = 60, opacity = 1 }: { delay?: number, duration?: number, className?: string, size?: number, opacity?: number }) {
  return (
    <motion.div
      animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
      transition={{ type: "tween", duration, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute text-white pointer-events-none drop-shadow-md z-0 flex items-center justify-center`}
      style={{ opacity, ...Object.fromEntries(className?.split(' ')?.map(c => {
         const m = c.match(/([a-z]+)-([a-z0-9%\[\]\.-]+)/);
         return m ? [m[1], m[2]] : [c, c];
      }) || []) }}
    >
       <CloudIcon fill="currentColor" stroke="none" style={{ width: size, height: size }} className={className} />
    </motion.div>
  );
});

export function HomeScreen() {
  const { user, userData, signOut, updateMood } = useAuth();
  const { space, partnerData, dailyQuestion, dailyQuote, memoryFlashback, relationshipLevel, addXp, moodAura, sendHug, hugReceived, couplePersonality } = useCoupleSpace();
  const { sendNotification } = useNotifications();
  const [showSettings, setShowSettings] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showLevelCelebration, setShowLevelCelebration] = useState(false);
  const [lastSeenLevel, setLastSeenLevel] = useState<number | null>(null);
  const [latestDream, setLatestDream] = useState<any>(null);
  const [isBelowFoldVisible, setIsBelowFoldVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBelowFoldVisible(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!space?.id) return;
    const q = query(
      collection(db, `coupleSpaces/${space.id}/dreams`),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setLatestDream({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setLatestDream(null);
      }
    });
  }, [space?.id]);

  const getAuraColor = () => {
    switch(moodAura) {
      case 'romance': return 'from-rose-50 to-pink-100';
      case 'cozy': return 'from-amber-50 to-orange-100';
      case 'calm': return 'from-sky-50 to-blue-100';
      case 'missing': return 'from-indigo-50 to-slate-200';
      default: return 'from-rose-50 to-white';
    }
  };

  useEffect(() => {
    if (relationshipLevel) {
      const currentLevel = Math.floor((space?.xp || 0) / 100) + 1;
      if (lastSeenLevel !== null && currentLevel > lastSeenLevel) {
        setShowLevelCelebration(true);
        triggerHapticFeedback('heavy');
      }
      setLastSeenLevel(currentLevel);
    }
  }, [space?.xp]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const MOODS = [
    { label: 'Happy', emoji: '😊', icon: Smile, color: 'text-yellow-500' },
    { label: 'In Love', emoji: '🥰', icon: Heart, color: 'text-rose-500' },
    { label: 'Neutral', emoji: '😐', icon: Meh, color: 'text-slate-500' },
    { label: 'Sad', emoji: '😢', icon: Frown, color: 'text-blue-500' },
    { label: 'Excited', emoji: '🤩', icon: Star, color: 'text-orange-500' },
  ];

  const handleMoodSelect = async (mood: string) => {
    triggerHapticFeedback('medium');
    await updateMood(mood);
    addXp(5); // Small reward for sharing mood
    setShowMoodPicker(false);
    
    // Notify partner if they exist
    if (partnerData?.id) {
      sendNotification(partnerData.id, {
        type: 'mood',
        title: 'Mood Update!',
        body: `${userData?.displayName || 'Partner'} is feeling ${mood} ${MOODS.find(m => m.label === mood)?.emoji || ''}`,
        priority: 'medium',
        data: { mood }
      });
    }
  };

  const handleCopyCode = () => {
    if (space?.inviteCode) {
      navigator.clipboard.writeText(space.inviteCode);
    }
  };

  const handleSendHug = async () => {
    triggerHapticFeedback('heavy');
    await sendHug();
    if (partnerData?.id) {
      sendNotification(partnerData.id, {
        type: 'reaction',
        title: 'A Hug for You! 🫂',
        body: `${userData?.displayName || 'Partner'} just sent you an invisible hug.`,
        priority: 'high'
      });
    }
  };

  if (!space) {
    return (
      <div className="flex flex-col min-h-screen bg-rose-50/30 p-6 space-y-6">
        <div className="pt-12 flex justify-between animate-pulse">
           <div className="space-y-2">
              <div className="h-8 w-48 bg-rose-200/50 rounded-lg"></div>
              <div className="h-4 w-32 bg-rose-100/50 rounded-lg"></div>
           </div>
           <div className="h-12 w-12 bg-rose-200/50 rounded-full"></div>
        </div>
        <div className="h-40 w-full bg-slate-900/5 rounded-[2.5rem] animate-pulse"></div>
        <div className="h-44 w-full bg-white/50 rounded-[2.5rem] animate-pulse"></div>
        <div className="h-64 w-full bg-white/50 rounded-[2.5rem] animate-pulse"></div>
      </div>
    );
  }

  const handleBack = async () => {
    if (!userData) return;
    triggerHapticFeedback('medium');
    try {
      await updateDoc(doc(db, 'users', userData.id), {
        coupleSpaceId: ''
      });
    } catch (error) {
      console.error("Failed to disconnect/go back:", error);
    }
  };

  // Determine if waiting for partner
  if (!partnerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 py-12 relative overflow-hidden bg-gradient-to-b from-rose-50/60 to-white/90">
        {/* Floating Top Bar for navigation */}
        <div className="absolute top-12 left-6 z-50">
          <button 
            type="button"
            onClick={handleBack}
            className="p-3 bg-white shadow-md hover:bg-rose-50 rounded-full text-rose-500 hover:scale-105 active:scale-95 transition-all border border-rose-100 flex items-center justify-center cursor-pointer"
            title="Go back to space selection"
          >
            <ChevronLeft className="w-5 h-5 text-rose-500" />
          </button>
        </div>

        <div className="absolute top-12 right-6 z-50">
          <button 
            type="button"
            onClick={() => {
              triggerHapticFeedback('medium');
              signOut();
            }}
            className="p-3 bg-white shadow-md hover:bg-rose-50 rounded-full text-slate-500 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all border border-rose-100 flex items-center justify-center cursor-pointer"
            title="Log out of account"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <FloatingCloud className="top-[5%] -left-[10%]" size={150} opacity={0.6} delay={0} duration={25} />
        <FloatingCloud className="top-[35%] -right-[5%]" size={200} opacity={0.4} delay={5} duration={30} />
        
        <div className="bg-white/70 backdrop-blur-2xl p-8 rounded-[3rem] shadow-lg border border-white text-center w-full max-w-sm relative z-10">
          <div className="w-20 h-20 bg-love-50 border border-white shadow-sm rounded-full flex items-center justify-center animate-pulse mb-6 mx-auto">
            <Heart className="w-10 h-10 text-love-400 fill-love-100" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-800 mb-3">Waiting for Partner</h1>
          <p className="text-slate-500 font-medium mb-6">Ask your partner to enter this code to join your private space.</p>
          
          <div className="bg-white/80 border border-love-100 p-6 rounded-[2rem] w-full mb-6 shadow-inner flex flex-col items-center gap-4">
             <span className="font-mono font-bold text-4xl tracking-widest text-love-500 select-all">{space?.inviteCode}</span>
             <div className="flex gap-3 w-full">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(space?.inviteCode || '');
                    triggerHapticFeedback('light');
                  }}
                  className="flex-1 bg-white border border-love-100 text-love-500 font-bold py-3 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} /> Copy
                </button>
                <button 
                  onClick={async () => {
                    triggerHapticFeedback('medium');
                    const shareData = {
                      title: 'Our Love Link Space ❤️',
                      text: `Join our private space on Love Link! Code: ${space?.inviteCode}`,
                      url: window.location.origin
                    };
                    if (navigator.share) {
                      try { await navigator.share(shareData); } catch (e) {}
                    } else {
                      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                      alert("Invite copied!");
                    }
                  }}
                  className="flex-1 bg-love-500 text-white font-bold py-3 rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={16} /> Share
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-[100dvh] pb-32 font-sans relative overflow-x-hidden transition-colors duration-1000 bg-gradient-to-br ${getAuraColor()}`}>
      <HugAnimation show={hugReceived} partnerName={partnerData?.displayName || 'Partner'} />
      {/* Background Decorative Sky Clouds */}
      <FloatingCloud className="top-[5%] -left-[10%]" size={150} opacity={0.6} delay={0} duration={25} />
      <FloatingCloud className="top-[15%] -right-[5%]" size={200} opacity={0.4} delay={5} duration={30} />
      <FloatingCloud className="top-[45%] -left-[5%]" size={120} opacity={0.5} delay={2} duration={20} />
      <FloatingCloud className="top-[70%] -right-[10%]" size={180} opacity={0.6} delay={7} duration={28} />

      {/* Header */}
      <div className="px-6 pt-12 pb-6 relative z-10 shrink-0 flex justify-between items-start">
         <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl font-serif font-bold text-slate-800 tracking-tight flex items-center gap-2" onClick={() => setShowSettings(!showSettings)}>
              {getGreeting()}, {user?.displayName?.split(' ')[0]} <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-300" />
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-medium text-slate-500">Every love story is beautiful ✨</p>
              <button 
                onClick={() => setShowMoodPicker(!showMoodPicker)}
                className="ml-2 bg-white/60 border border-white px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm hover:bg-white transition-all flex items-center gap-1 active:scale-95"
              >
                {userData?.mood ? `${MOODS.find(m => m.label === userData.mood)?.emoji || ''} ${userData.mood}` : 'Set Mood'}
              </button>
            </div>
         </motion.div>
         
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center relative gap-1">
            {partnerData?.mood && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 right-0 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-white shadow-sm text-xs font-bold text-rose-500 whitespace-nowrap flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {partnerData.displayName?.split(' ')[0]} is {partnerData.mood}
              </motion.div>
            )}
           
           <div className="flex flex-col items-center group cursor-pointer" onClick={() => navigate('/pulse')}>
             <div className="relative">
               <div className="absolute inset-0 bg-rose-400 rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-rose-100 shadow-sm relative z-10 text-2xl">
                  {relationshipLevel.icon}
               </div>
               <div className="absolute -top-1 -right-1 bg-gradient-to-br from-orange-400 to-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-20">
                  {Math.floor((space?.xp || 0) / 100) + 1}
               </div>
             </div>
             
             <div className="mt-1 flex items-center gap-1 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white shadow-sm">
                <Zap className="w-3 h-3 text-orange-500 fill-orange-300" />
                <span className="text-[10px] font-black text-slate-700">{space?.streak || 0}</span>
             </div>
           </div>
          </motion.div>
      </div>

      <div className="flex-1 px-4 space-y-6 relative z-10 flex flex-col items-center">
        
        <MilestoneCelebration 
          show={showLevelCelebration} 
          levelName={relationshipLevel.name} 
          icon={relationshipLevel.icon} 
          onClose={() => setShowLevelCelebration(false)} 
        />

        {/* Global Action: Invisible Hug */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSendHug}
          className="bg-white/90 backdrop-blur-xl border-4 border-white p-5 rounded-full shadow-2xl flex items-center gap-3 active:bg-rose-50 transition-colors"
        >
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-500">
            <Heart size={20} fill="currentColor" />
          </div>
          <span className="font-serif font-black text-slate-800 pr-2">Send an Invisible Hug 🫂</span>
        </motion.button>
        
        {/* Relationship Personality Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 shadow-xl"
        >
          <span className="text-2xl">{couplePersonality.badge}</span>
          <div>
            <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Couple Personality</h4>
            <h3 className="text-sm font-bold text-white leading-none">{couplePersonality.name}</h3>
          </div>
          <div className="w-[1px] h-6 bg-white/10 mx-2" />
          <p className="text-[10px] text-slate-400 font-medium max-w-[120px] line-clamp-1">{couplePersonality.description}</p>
        </motion.div>
        
        {/* Relationship Status Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white/40 backdrop-blur-md p-5 rounded-[2rem] border border-white flex flex-col gap-3 shadow-sm shadow-rose-100/50"
        >
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] block mb-1">Our Journey ✨</span>
              <h3 className="font-serif font-black text-xl text-slate-800 flex items-center gap-2">
                {relationshipLevel.name} <span className="text-2xl">{relationshipLevel.icon}</span>
              </h3>
            </div>
            <div className="text-right">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter block">Lvl {Math.floor((space?.xp || 0) / 100) + 1}</span>
               <span className="text-[11px] font-black text-rose-400">{(space?.xp || 0) % 100} / 100 XP</span>
            </div>
          </div>
          <div className="h-3.5 w-full bg-slate-100/50 rounded-full overflow-hidden p-0.5 border border-white shadow-inner">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${(space?.xp || 0) % 100}%` }}
               className="h-full bg-gradient-to-r from-rose-400 via-pink-400 to-love-300 rounded-full relative"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                <motion.div 
                   animate={{ x: ['-100%', '400%'] }} 
                   transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                   className="absolute inset-0 w-12 bg-white/30 skew-x-12 blur-sm"
                />
             </motion.div>
          </div>
        </motion.div>

        {/* Relationship Pet & Tiny Companion */}
        <div className="w-full max-w-sm flex flex-col items-center gap-2">
           <RelationshipPet xp={space?.xp || 0} level={Math.floor((space?.xp || 0) / 100) + 1} />
           <div className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.1em]">Your Companion is Happy</span>
           </div>
        </div>

        {/* Feature Grid: Dreams & Capsules (Premium Entry Points) */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-4">
           <motion.button
             whileHover={{ y: -5 }}
             whileTap={{ scale: 0.98 }}
             onClick={() => navigate('/dreams')}
             className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group border-2 border-indigo-400"
           >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <Plane className="w-8 h-8 opacity-20 absolute -top-2 -right-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <div className="relative z-10 text-left">
                 <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Collaborate</h4>
                 <h3 className="text-xl font-serif font-black">Dream Wall ✈️</h3>
              </div>
           </motion.button>
           
           <motion.button
             whileHover={{ y: -5 }}
             whileTap={{ scale: 0.98 }}
             onClick={() => navigate('/capsules')}
             className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden group border-2 border-slate-700"
           >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <Clock className="w-8 h-8 opacity-20 absolute -top-2 -right-2 group-hover:scale-110 transition-transform" />
              <div className="relative z-10 text-left">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Surprise</h4>
                 <h3 className="text-xl font-serif font-black">Time Capsule ⏳</h3>
              </div>
           </motion.button>
        </div>

        {/* Latest Dream Preview Widget */}
        <AnimatePresence>
          {latestDream && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              onClick={() => navigate('/dreams')}
              className="w-full max-w-sm bg-white/70 backdrop-blur-xl border border-rose-100 rounded-[2.5rem] p-5 shadow-xl relative overflow-hidden cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                   <Sparkles className="w-6 h-6 animate-pulse text-rose-500" />
                </div>
                <div className="text-left">
                   <span className="text-[9px] font-black tracking-widest text-rose-400 uppercase leading-none block mb-1">Our Latest Shared Dream</span>
                   <h3 className="font-serif font-black text-slate-800 text-sm leading-none line-clamp-1">
                     {latestDream.title}
                   </h3>
                   <span className="text-[9px] text-slate-400 mt-1 block">Category: {latestDream.category || 'Goals'} • Tap to explore wall</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Challenges Section */}
        <div className="w-full max-w-sm space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="font-serif font-black text-slate-800 text-lg">Daily Challenges</h3>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full border border-white text-[10px] font-black text-slate-500">
                 <Zap size={10} className="text-orange-500" /> {space?.streak || 0} DAY STREAK
              </div>
           </div>
           
           <DailyCard 
             title="Mood Check-in" 
             description="Share your current feelings with your partner to stay connected."
             xpReward={10}
             icon={<Smile size={24} />}
             onAction={() => setShowMoodPicker(true)}
             completed={!!userData?.mood}
           />

           <DailyCard 
             title="Daily Question" 
             description={dailyQuestion || "What's on your mind today?"}
             xpReward={15}
             icon={<MessageSquare size={24} />}
             onAction={() => navigate('/chat')}
           />
        </div>

        {/* Daily Question & Flashback Row */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-4">
           {/* Daily Quote Card */}
           {dailyQuote && (
             <motion.div
               whileTap={{ scale: 0.98 }}
               className="bg-white/60 backdrop-blur-md p-5 rounded-[2.5rem] border border-white shadow-sm flex flex-col justify-between"
             >
                <Quote className="w-5 h-5 text-rose-300 mb-2" />
                <p className="text-[12px] font-serif font-medium text-slate-700 italic leading-relaxed line-clamp-4">
                  "{dailyQuote.text}"
                </p>
                <span className="text-[9px] font-black text-slate-400 mt-2 block uppercase tracking-wider">— {dailyQuote.author}</span>
             </motion.div>
           )}

           {/* Magic Moment Flashback */}
           {memoryFlashback && (
             <motion.div
               whileTap={{ scale: 0.98 }}
               onClick={() => navigate('/memories')}
               className="bg-gradient-to-br from-rose-100/50 to-white backdrop-blur-md p-5 rounded-[2.5rem] border border-white shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center group cursor-pointer"
             >
                <div className="absolute inset-0 bg-[url('/bg-dots.png')] opacity-10" />
                <div className="w-12 h-12 rounded-2xl bg-white/80 border border-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 group-hover:rotate-6 transition-all">
                   <ImageIcon className="w-6 h-6 text-rose-400" />
                </div>
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Remember this?</span>
                <span className="text-[11px] font-black text-slate-700">Relive a Moment</span>
             </motion.div>
           )}
        </div>

        <AiraInsightCard />

        {/* Relationship Intelligence Dashboard - New Premium Feature */}
        <motion.div 
           initial={{ y: 30, opacity: 0 }} 
           animate={{ y: 0, opacity: 1 }} 
           transition={{ delay: 0.15, duration: 0.6 }}
           whileHover={{ y: -5 }}
           onClick={() => navigate('/intelligence')}
           className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-6 cursor-pointer relative overflow-hidden group shadow-2xl"
        >
           {/* Animated Background Gradients */}
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-slate-900 to-rose-900/40 opacity-80" />
           <motion.div 
             animate={{ 
               scale: [1, 1.2, 1],
               opacity: [0.3, 0.5, 0.3],
             }}
             transition={{ type: "tween", duration: 5, repeat: Infinity }}
             className="absolute -top-1/2 -right-1/2 w-[300px] h-[300px] bg-rose-500/20 rounded-full blur-[80px]"
           />
           
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center">
                       <Zap className="w-6 h-6 text-amber-400 fill-amber-300" />
                    </div>
                    <div>
                       <h3 className="font-bold text-lg text-white">Love Intelligence</h3>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aira Strategist ✨</p>
                    </div>
                 </div>
                 <div className="bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter">Live Analysis</span>
                 </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 space-y-3">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Romantic Receptivity</span>
                    <span className="text-xs font-black text-rose-400">High (92%)</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '92%' }}
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
                    />
                 </div>
                 <p className="text-[11px] text-slate-400 font-medium italic">"Partner is extremely responsive. Perfect time to ask your question."</p>
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-2 text-white font-black uppercase tracking-widest text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">
                Explore Emotional Analytics <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
           </div>
        </motion.div>
        
        {/* Mood Picker Modal-like */}
        {showMoodPicker && (
          <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="w-full max-w-sm glass-card p-6 flex flex-wrap gap-3 justify-center mb-4">
             <h4 className="w-full text-center font-bold text-slate-700 mb-2">How are you feeling?</h4>
             {MOODS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => handleMoodSelect(m.label)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${userData?.mood === m.label ? 'bg-love-50 border-love-300 scale-105' : 'bg-white border-transparent hover:bg-slate-50'}`}
                >
                   <m.icon className={`w-6 h-6 ${m.color}`} />
                   <span className="text-[10px] font-bold text-slate-500">{m.label}</span>
                </button>
             ))}
          </motion.div>
        )}
        
        {/* Floating Settings/SignOut */}
        {showSettings && (
          <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="w-full max-w-sm glass-card p-6 text-center">
             <p className="font-medium text-slate-700 mb-2">My Invite Code</p>
             <div className="bg-slate-50 py-3 px-4 rounded-[1rem] flex items-center justify-between border border-white shadow-inner mb-4">
               <span className="font-mono font-bold tracking-wider text-slate-800">{space.inviteCode}</span>
               <button onClick={handleCopyCode} className="text-love-500 hover:text-love-600 bg-love-50 border border-white shadow-sm p-2 rounded-lg">
                 <Copy className="w-4 h-4" />
               </button>
             </div>
             
             <button
               onClick={signOut}
               className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-100 shadow-sm text-red-600 rounded-[1rem] hover:bg-red-100 transition-colors font-medium"
             >
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </motion.div>
        )}

        {/* Weekly Recap Hook - High Engagement */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="w-full max-w-sm"
        >
          <button 
            onClick={() => {
              triggerHapticFeedback('medium');
              navigate('/recap');
            }}
            className="w-full relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 p-6 rounded-[2.5rem] shadow-xl group border-2 border-white/20 active:scale-[0.98] transition-all"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
             <div className="relative z-10 flex items-center justify-between">
                <div className="text-left">
                   <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Personal Journey</span>
                   </div>
                   <h3 className="text-xl font-serif font-black text-white mb-1">Weekly Recap ✨</h3>
                   <p className="text-white/70 text-xs font-medium">Relive your sweet moments</p>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                   <ArrowRight className="w-5 h-5" />
                </div>
             </div>
             
             {/* Sparkle decorative */}
             <motion.div 
               animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }} 
               transition={{ type: "tween", duration: 3, repeat: Infinity }}
               className="absolute -bottom-8 -right-8 text-white/5"
             >
                <Heart size={140} fill="white" />
             </motion.div>
          </button>
        </motion.div>

        {isBelowFoldVisible ? (
          <>
            {/* 1. Chat Cloud */}
            <motion.div 
               initial={{ y: 30, opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               transition={{ delay: 0.1, duration: 0.6 }}
               whileHover={{ y: -5 }}
               onClick={() => navigate('/chat')}
               className="w-full max-w-sm cloud-card p-6 flex flex-col gap-4 cursor-pointer relative overflow-hidden group"
            >
               <div className="absolute top-[-30%] right-[-20%] w-40 h-40 bg-love-100/50 rounded-full blur-2xl group-hover:bg-love-200/50 transition-colors" />
               
               <div className="flex justify-between items-start relative z-10">
                 <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-50/50 border border-white shadow-sm flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-blue-400 fill-blue-100" />
                    </div>
                    <div>
                       <h3 className="font-serif font-bold text-lg text-slate-800">Chat Cloud</h3>
                       <p className="text-xs text-slate-500 font-medium">Continue your sweet conversations</p>
                    </div>
                 </div>
                 <div className="bg-love-400 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">3</div>
               </div>

               <div className="bg-white/60 rounded-[1.5rem] p-3 flex justify-between items-center border border-white shadow-sm relative z-10">
                  <span className="text-sm font-semibold text-love-500 flex items-center gap-2">
                     Open Chat <ArrowRight className="w-4 h-4" />
                  </span>
                  <div className="flex -space-x-2">
                     <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                     <div className="w-8 h-8 rounded-full bg-love-200 border-2 border-white shadow-sm" />
                  </div>
               </div>
            </motion.div>

            {/* 4. Memory Cloud */}
            <motion.div 
               initial={{ y: 30, opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               transition={{ delay: 0.3, duration: 0.6 }}
               whileHover={{ y: -5 }}
               onClick={() => navigate('/memories')}
               className="w-full max-w-sm cloud-card p-6 cursor-pointer relative group"
            >
               <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-amber-50/50 border border-white shadow-sm flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-amber-400 fill-amber-100" />
                  </div>
                  <div>
                     <h3 className="font-serif font-bold text-lg text-slate-800">Memory Cloud</h3>
                     <p className="text-xs text-slate-500 font-medium">Relive beautiful moments</p>
                  </div>
               </div>

               <div className="flex justify-center gap-[-10px] mb-4 py-2 relative z-10">
                  {[1, 2, 3].map((num, i) => (
                     <motion.div 
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ type: "tween", duration: 3, repeat: Infinity, delay: i * 0.5 }}
                        className={`w-20 h-24 rounded-[1rem] bg-slate-200 border-[4px] border-white shadow-md flex-shrink-0 relative overflow-hidden ${i === 0 ? 'rotate-[-10deg] translate-x-4 z-10' : i === 1 ? 'z-30' : 'rotate-[10deg] -translate-x-4 z-20'}`}
                     >
                        <div className="w-full h-full bg-gradient-to-br from-love-200 to-sky-200 mix-blend-multiply" />
                     </motion.div>
                  ))}
               </div>

               <div className="bg-white/60 shadow-sm rounded-[1.5rem] p-3 flex justify-between items-center border border-white relative z-10">
                  <span className="text-sm font-semibold text-love-500 flex items-center gap-2">
                     View Memories <ArrowRight className="w-4 h-4" />
                  </span>
                  <div className="bg-love-400 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">24</div>
               </div>
            </motion.div>

            {/* 5. AIRA Cloud */}
            <motion.div 
               initial={{ y: 30, opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               transition={{ delay: 0.5, duration: 0.6 }}
               onClick={() => navigate('/aira')}
               className="w-full max-w-sm cloud-card bg-gradient-to-br from-love-50 to-white p-6 cursor-pointer relative group flex items-center justify-between overflow-visible mt-4"
            >
               <div className="flex-1 pr-4 relative z-20">
                  <div className="flex items-center gap-2 mb-3">
                     <div className="w-8 h-8 rounded-full bg-white border border-love-100 shadow-sm flex items-center justify-center">
                       <Sparkles className="w-4 h-4 text-love-400" />
                     </div>
                     <h3 className="font-serif font-bold text-lg text-slate-800">AIRA Cloud</h3>
                  </div>
                  <p className="text-[13px] text-slate-600 font-medium bg-white p-3 rounded-2xl border border-white shadow-sm relative z-30">
                     "Feeling playful?<br/>Try Love Spin today! 🎲💕"
                  </p>
                  <div className="mt-4 bg-gradient-to-r from-love-400 to-love-300 text-white font-semibold py-2.5 px-5 rounded-full flex items-center gap-2 w-fit text-sm shadow-[0_5px_15px_rgba(255,193,204,0.4)]">
                     Talk with AIRA <ArrowRight className="w-4 h-4" />
                  </div>
               </div>
               
               {/* Soft angelic AI character presence */}
               <div className="w-24 h-24 rounded-full bg-gradient-to-b from-love-100 to-sky-100 border-[4px] border-white shadow-sm flex items-center justify-center relative flex-shrink-0 z-20 overflow-hidden">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                    <CloudIcon className="w-16 h-16 text-white absolute -inset-2 opacity-30" />
                    <Sparkles className="w-10 h-10 text-love-400 relative z-10" />
                  </motion.div>
               </div>
               
               {/* Glowing rings */}
               <div className="absolute top-1/2 right-4 w-24 h-24 bg-love-300/30 blur-2xl rounded-full transform -translate-y-1/2 z-0" />
            </motion.div>
          </>
        ) : (
          <div className="w-full max-w-sm space-y-6 pb-12 animate-pulse">
             <div className="h-40 bg-white/40 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(255,245,248)]" />
             <div className="h-72 bg-white/40 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(255,245,248)]" />
             <div className="h-56 bg-white/40 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(255,245,248)]" />
             <div className="h-44 bg-white/40 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(255,245,248)]" />
             <div className="h-48 bg-white/40 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(255,245,248)]" />
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
