import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, BrainCircuit, Zap, Wand2, Compass, ArrowRight, ChevronLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';

const ACTIVITIES = [
  {
    id: 'sync',
    title: 'Heart Sync',
    desc: 'Align your neural paths through collaborative truth-seeking.',
    icon: <Heart className="w-6 h-6 text-rose-500" />,
    color: 'from-rose-500 to-pink-500',
    path: '/sync',
    tag: 'NEW'
  },
  {
    id: 'synergy',
    title: 'Synergy Quiz',
    desc: 'Discover hidden patterns in your relationship via Aira AI.',
    icon: <BrainCircuit className="w-6 h-6 text-indigo-500" />,
    color: 'from-indigo-500 to-purple-500',
    path: '/who-loves-more',
    tag: 'AI-DRIVEN'
  },
  {
    id: 'tod',
    title: 'Truth or Dare',
    desc: 'Escalate the vibe with AI-generated intimate challenges.',
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    color: 'from-amber-500 to-orange-500',
    path: '/tod',
    tag: 'LEVEL 5+'
  },
  {
    id: 'pulse',
    title: 'The Love Lab',
    desc: 'Advanced emotional analytics and connection insights.',
    icon: <Compass className="w-6 h-6 text-emerald-500" />,
    color: 'from-emerald-500 to-teal-500',
    path: '/pulse'
  }
];

export function GameScreen() {
  const navigate = useNavigate();
  const { space } = useCoupleSpace();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-rose-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="pt-16 pb-6 px-6 bg-white/40 backdrop-blur-md border-b border-white flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400">
           <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-serif font-black text-slate-900 tracking-tight">Activity Hub</h1>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 rounded-full">
           <Wand2 className="w-3 h-3 text-rose-500" />
           <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest">{space?.xp || 0} XP</span>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 pb-32">
        <div className="space-y-2 mb-8">
           <h2 className="text-2xl font-serif font-bold text-slate-800">Choose your journey</h2>
           <p className="text-sm text-slate-500 italic">Every activity brings your hearts closer into resonance.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {ACTIVITIES.map((activity, idx) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(activity.path)}
              className="group bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="relative z-10 flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activity.color} flex items-center justify-center text-white shadow-lg`}>
                  {activity.icon}
                </div>
                
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                     <h3 className="font-bold text-slate-800">{activity.title}</h3>
                     {activity.tag && (
                       <span className="px-1.5 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black rounded uppercase tracking-tighter">
                          {activity.tag}
                       </span>
                     )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{activity.desc}</p>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
              </div>

              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>

        {/* AI Suggestion Banner */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
           <Sparkles className="absolute top-4 right-4 w-12 h-12 text-white opacity-5 animate-pulse" />
           <div className="flex flex-col gap-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400">Aira Recommends</span>
              <h3 className="text-lg font-serif font-bold italic">"Tonight feels right for a Heart Sync deep-dive. Your frequencies are subtly shifting."</h3>
           </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
