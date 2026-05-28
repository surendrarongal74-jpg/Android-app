import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Heart, Zap, Star } from 'lucide-react';

interface DailyCardProps {
  title: string;
  description: string;
  xpReward: number;
  icon: React.ReactNode;
  onAction: () => void;
  completed?: boolean;
}

export const DailyCard = React.memo(function DailyCard({ title, description, xpReward, icon, onAction, completed }: DailyCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAction}
      className={`w-full max-w-sm rounded-[2.5rem] p-6 relative overflow-hidden group cursor-pointer transition-all ${
        completed 
          ? 'bg-emerald-50 border-emerald-100 opacity-80' 
          : 'bg-white border-white shadow-xl hover:shadow-2xl'
      } border-2`}
    >
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className={`p-4 rounded-2xl ${completed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-50 text-rose-500'} transition-colors`}>
            {icon}
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
            completed ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-600'
          }`}>
            {completed ? 'Completed' : `+${xpReward} XP`} <Sparkles size={10} />
          </div>
        </div>

        <div>
          <h3 className={`text-xl font-serif font-black ${completed ? 'text-emerald-900' : 'text-slate-800'} mb-1`}>
            {title}
          </h3>
          <p className={`text-sm font-medium ${completed ? 'text-emerald-600/70' : 'text-slate-500'} leading-relaxed`}>
            {description}
          </p>
        </div>

        {!completed && (
          <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
            Accept Challenge <ArrowRight size={14} />
          </div>
        )}
      </div>

      {/* Decorative patterns */}
      <div className={`absolute -bottom-12 -right-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity ${completed ? 'text-emerald-900' : 'text-rose-900'}`}>
        <Heart size={180} fill="currentColor" />
      </div>
    </motion.div>
  );
});
