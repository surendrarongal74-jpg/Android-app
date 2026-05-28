import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Share2, Heart, Star, Calendar, MessageSquare, Image as ImageIcon, Sparkles, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { triggerHapticFeedback } from '../lib/haptics';

export function RelationshipRecapScreen() {
  const navigate = useNavigate();
  const { space, partnerData, dailyQuote } = useCoupleSpace();
  const { userData } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Mock data for the recap - in a real app, this would be computed from Firestore
  const recapData = [
    {
      title: "Our Love Journey",
      subtitle: "This Week in Love Link",
      icon: <Sparkles className="w-12 h-12 text-yellow-400" />,
      content: "You two have been busy building your world of love.",
      stat: `${space?.streak || 0} Day Streak`,
      bg: "from-rose-400 to-pink-500"
    },
    {
      title: "Connection Pulse",
      subtitle: "Heart to Heart",
      icon: <MessageSquare className="w-12 h-12 text-blue-400" />,
      content: "You shared many meaningful moments through chat and notes.",
      stat: "24 Messages Swapped",
      bg: "from-blue-400 to-indigo-500"
    },
    {
      title: "Visual Memories",
      subtitle: "Captured Love",
      icon: <ImageIcon className="w-12 h-12 text-purple-400" />,
      content: "Saving memories is like planting seeds for the future.",
      stat: "5 Moments Saved",
      bg: "from-purple-400 to-fuchsia-500"
    },
    {
      title: "Aira's Insight",
      subtitle: "The Guardian's Song",
      icon: <Heart className="w-12 h-12 text-rose-500" />,
      content: dailyQuote?.text || "Your love is a unique dance that the universe celebrates.",
      stat: "Deep Sync: 92%",
      bg: "from-emerald-400 to-teal-500"
    },
    {
      title: "Relationship Milestone",
      subtitle: "Leveling Up",
      icon: <Trophy className="w-12 h-12 text-orange-400" />,
      content: "You've grown closer this week than ever before.",
      stat: "Level Progress: +15%",
      bg: "from-orange-400 to-amber-500"
    }
  ];

  const nextSlide = () => {
    if (currentSlide < recapData.length - 1) {
      triggerHapticFeedback('light');
      setCurrentSlide(currentSlide + 1);
    } else {
      triggerHapticFeedback('medium');
      navigate('/');
    }
  };

  const handleShare = async () => {
    triggerHapticFeedback('heavy');
    const slide = recapData[currentSlide];
    const shareText = `Our Love Link Recap: ${slide.title} - ${slide.stat} ❤️`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Love Link Journey',
          text: shareText,
          url: window.location.origin
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Recap copied to clipboard ✨");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans select-none">
      {/* Progress Bars */}
      <div className="absolute top-12 left-0 right-0 px-4 flex gap-1 z-50">
         {recapData.map((_, i) => (
           <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%' }}
               transition={{ duration: i === currentSlide ? 5 : 0.3, ease: "linear" }}
               onAnimationComplete={() => {
                 if (i === currentSlide) {
                    // Auto-advance after 5 seconds
                    setTimeout(nextSlide, 0);
                 }
               }}
               className="h-full bg-white shadow-[0_0_10px_white]"
             />
           </div>
         ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, rotate: -2 }}
          transition={{ duration: 0.6 }}
          className={`absolute inset-0 bg-gradient-to-br ${recapData[currentSlide].bg} flex flex-col items-center justify-center p-8 text-center`}
        >
           {/* Abstract Background Shapes */}
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
             className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-10 pointer-events-none"
           >
              <Heart className="absolute top-1/4 left-1/4 w-32 h-32" />
              <Star className="absolute bottom-1/4 right-1/4 w-24 h-24" />
              <Sparkles className="absolute top-1/2 right-1/3 w-20 h-20" />
           </motion.div>

           <motion.div
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.3 }}
             className="relative z-10 space-y-8"
           >
              <div className="flex flex-col items-center gap-4">
                 <div className="p-6 bg-white/20 backdrop-blur-md rounded-full shadow-2xl border border-white/30">
                    {recapData[currentSlide].icon}
                 </div>
                 <div>
                    <h2 className="text-white/60 text-xs font-black uppercase tracking-[0.4em] mb-1">{recapData[currentSlide].subtitle}</h2>
                    <h1 className="text-4xl font-serif font-black text-white drop-shadow-lg">{recapData[currentSlide].title}</h1>
                 </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[3rem] shadow-2xl">
                 <p className="text-white text-lg font-medium leading-relaxed mb-6 italic">
                   "{recapData[currentSlide].content}"
                 </p>
                 <div className="inline-block px-8 py-3 bg-white text-slate-900 rounded-full font-black text-xl shadow-xl">
                   {recapData[currentSlide].stat}
                 </div>
              </div>
           </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Header Controls */}
      <div className="absolute top-16 left-0 right-0 px-6 flex justify-between items-center z-50">
         <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
            <ChevronLeft className="w-6 h-6" />
         </button>
         <button onClick={handleShare} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <Share2 className="w-5 h-5" />
         </button>
      </div>

      {/* Tap Areas */}
      <div className="absolute inset-0 flex z-40">
        <div className="w-1/3 h-full cursor-pointer" onClick={() => {
          if (currentSlide > 0) {
            triggerHapticFeedback('light');
            setCurrentSlide(currentSlide - 1);
          }
        }} />
        <div className="w-2/3 h-full cursor-pointer" onClick={nextSlide} />
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center z-50 pointer-events-none">
         <div className="flex items-center gap-2 opacity-60">
            <Heart className="w-4 h-4 text-white fill-white" />
            <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Love Link • Our Story</span>
         </div>
      </div>
    </div>
  );
}
