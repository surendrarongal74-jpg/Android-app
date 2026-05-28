import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cloud, Heart, MessageCircle, PlayCircle, Sparkles, MapPin, Gamepad2, Stars, Calendar, ArrowLeft, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from '../components/BottomNav';

const CATEGORIES = [
  {
    id: 'romantic_play',
    title: 'Romantic Play',
    icon: Gamepad2,
    color: 'from-pink-300 to-rose-300',
    delay: 0,
    items: [
      { name: 'Who Loves More', path: '/who-loves-more' },
      { name: 'Live Palette 🎨', path: '/sync/canvas' },
    ]
  },
  {
    id: 'deep_connection',
    title: 'Connection',
    icon: MessageCircle,
    color: 'from-purple-300 to-fuchsia-300',
    delay: 0.1,
    items: [
      { name: 'Emotion Guess', path: '/aira' },
      { name: 'Love Language', path: '/lovelanguage' },
      { name: 'Daily Notes', path: '/notes' },
    ]
  },
  {
    id: 'interactive_stories',
    title: 'Quiet Moments',
    icon: PlayCircle,
    color: 'from-blue-300 to-cyan-300',
    delay: 0.2,
    items: [
      { name: 'Shared Watchlist 🍿', path: '/sync/watch' },
      { name: 'AIRA Assistant', path: '/aira' },
    ]
  },
  {
    id: 'memory_moments',
    title: 'Memories',
    icon: Calendar,
    color: 'from-amber-300 to-orange-300',
    delay: 0.3,
    items: [
      { name: 'Shared Memories', path: '/memories' },
      { name: 'Photo Share', path: '/photos' },
      { name: 'Our Diary', path: '/diary' },
    ]
  },
  {
    id: 'real_life',
    title: 'Real-Life',
    icon: MapPin,
    color: 'from-teal-300 to-emerald-300',
    delay: 0.4,
    items: [
      { name: 'AI Date Planner', path: '/date-planner' },
      { name: 'Love Map', path: '/map' },
      { name: 'Surprise Scheduler', path: '/scheduler' },
    ]
  },
  {
    id: 'journey_progress',
    title: 'Journey',
    icon: Stars,
    color: 'from-indigo-300 to-violet-300',
    delay: 0.5,
    items: [
      { name: 'Smart Reminders', path: '/reminders' },
    ]
  }
];

function FloatingCloud({ delay = 0, duration = 15, className, size = 60, opacity = 1 }: { delay?: number, duration?: number, className?: string, size?: number, opacity?: number }) {
  return (
    <motion.div
      animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute text-white pointer-events-none drop-shadow-md z-0 flex items-center justify-center`}
      style={{ opacity, ...Object.fromEntries(className?.split(' ')?.map(c => {
         const m = c.match(/([a-z]+)-([a-z0-9%\[\]\.-]+)/);
         return m ? [m[1], m[2]] : [c, c];
      }) || []) }}
    >
       <Cloud fill="currentColor" stroke="none" style={{ width: size, height: size }} className={className} />
    </motion.div>
  );
}

export function LoveverseScreen() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[0] | null>(null);

  return (
    <div className="min-h-screen bg-transparent overflow-hidden relative pb-32 flex flex-col font-sans">
      {/* Background Clouds */}
      <FloatingCloud className="top-[10%] -left-[5%]" size={150} opacity={0.6} delay={0} duration={25} />
      <FloatingCloud className="top-[30%] -right-[10%]" size={200} opacity={0.4} delay={5} duration={30} />
      <FloatingCloud className="top-[60%] -left-[10%]" size={120} opacity={0.5} delay={2} duration={20} />
      <FloatingCloud className="top-[80%] -right-[5%]" size={180} opacity={0.6} delay={7} duration={28} />

      <div className="pt-12 pb-6 px-6 relative z-10 shrink-0 flex items-center gap-4 bg-white/60 backdrop-blur-2xl border-b border-white shadow-sm">
         <Link to="/" className="p-2 -ml-2 bg-white rounded-full shadow-sm text-love-400 hover:bg-love-50 transition-colors border border-love-100 flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
         </Link>
         <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 text-center pr-8"
         >
           <h1 className="text-2xl font-serif font-bold text-slate-800 tracking-tight">
             Loveverse
           </h1>
           <p className="text-xs font-medium text-slate-500 tracking-wide mt-1">A universe of love & games</p>
         </motion.div>
      </div>

      <div className="px-4 relative z-10 flex-1 flex flex-col pt-8 pb-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!activeCategory ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 gap-y-12 gap-x-6 max-w-md mx-auto w-full"
            >
              {CATEGORIES.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: cat.delay, type: 'spring', stiffness: 100 }}
                  onClick={() => setActiveCategory(cat)}
                  className="cursor-pointer group flex flex-col items-center justify-center relative"
                  whileHover={{ y: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div 
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i }}
                    className="relative w-32 h-24 mb-4 flex items-center justify-center"
                  >
                     {/* Cloud Base */}
                     <Cloud className="absolute w-full h-full text-white drop-shadow-[0_15px_25px_rgba(255,193,204,0.4)]" fill="currentColor" stroke="none" />
                     {/* Overlay Icon/Decorations */}
                     <div className={`relative z-10 w-12 h-12 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-inner text-white`}>
                       <cat.icon className="w-6 h-6 drop-shadow-sm" />
                     </div>
                     <Sparkles className={`absolute top-2 right-4 w-4 h-4 z-20 text-${cat.color.split('-')[1]}-400 animate-pulse`} />
                  </motion.div>
                  <h3 className="font-serif font-bold text-slate-700 text-[15px]">{cat.title}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#FF8FAB] mt-1">{cat.items.length} Games</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md mx-auto h-full flex items-center justify-center"
            >
              <div className="cloud-card p-6 lg:p-8 w-full group relative">
                 <div className="absolute top-[-30%] right-[-20%] w-40 h-40 bg-love-100/50 rounded-full blur-2xl group-hover:bg-love-200/50 transition-colors pointer-events-none" />
                 
                 <div className="flex items-center gap-4 mb-8 relative z-10">
                   <button 
                     onClick={() => setActiveCategory(null)}
                     className="w-10 h-10 rounded-full bg-white border border-love-100 shadow-sm flex items-center justify-center text-slate-500 hover:bg-love-50 transition-colors"
                   >
                     <ArrowLeft className="w-5 h-5 text-love-400" />
                   </button>
                   <div className="flex items-center gap-3">
                     <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${activeCategory.color} flex items-center justify-center text-white shadow-[0_5px_15px_rgba(255,193,204,0.5)] border-2 border-white`}>
                       <activeCategory.icon className="w-6 h-6" />
                     </div>
                     <div>
                        <h2 className="text-xl font-serif font-bold text-slate-800">{activeCategory.title}</h2>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-love-400 mt-0.5">{activeCategory.items.length} Games</p>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-3 relative z-10">
                   {activeCategory.items.map((item, i) => (
                     <motion.button
                       key={`${item.path}-${item.name}`}
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: i * 0.1 }}
                       onClick={() => navigate(item.path)}
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       className="w-full flex items-center justify-between p-5 bg-white border border-white hover:border-love-100 shadow-sm rounded-[1.5rem] transition-colors group"
                     >
                       <span className="font-semibold text-slate-700">{item.name}</span>
                       <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${activeCategory.color} shadow-sm border border-white flex items-center justify-center group-hover:scale-110 transition-transform`}>
                         <PlayCircle className="w-4 h-4 text-white" />
                       </div>
                     </motion.button>
                   ))}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
