import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Star, Trophy } from 'lucide-react';

interface MilestoneCelebrationProps {
  show: boolean;
  levelName: string;
  icon: string;
  onClose: () => void;
}

export function MilestoneCelebration({ show, levelName, icon, onClose }: MilestoneCelebrationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="bg-white rounded-[3rem] p-10 text-center relative overflow-hidden max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated background stars */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.2, 0.5, 0.2],
                  y: [0, -20, 0]
                }}
                transition={{
                  type: "tween",
                  duration: 2 + i,
                  repeat: Infinity,
                  delay: i * 0.5
                }}
                className="absolute text-yellow-400 opacity-20"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 90}%`
                }}
              >
                <Star size={20} fill="currentColor" />
              </motion.div>
            ))}

            <div className="relative z-10">
              <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
                <span className="text-5xl">{icon}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Level Up!</span>
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              </div>

              <h2 className="text-3xl font-serif font-bold text-slate-800 mb-4">You are now <br/>{levelName}</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Your bond is growing stronger every day. Aira is impressed by your connection. ✨
              </p>

              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Continue Loving <Sparkles size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
