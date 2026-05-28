import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface HugAnimationProps {
  show: boolean;
  partnerName: string;
}

export function HugAnimation({ show, partnerName }: HugAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] pointer-events-none flex items-center justify-center bg-rose-500/10 backdrop-blur-[2px]"
        >
          <div className="relative">
            {/* Pulsing rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                className="absolute inset-0 bg-rose-400 rounded-full"
              />
            ))}
            
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="bg-white/90 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 border border-white"
            >
              <div className="relative">
                <Heart className="w-20 h-20 text-rose-500 fill-rose-500 animate-pulse" />
                <motion.div
                  animate={{ y: [0, -10, 0], x: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-4 text-3xl"
                >
                  🫂
                </motion.div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-serif font-black text-slate-800">Sending a Hug</h3>
                <p className="text-sm font-medium text-slate-500">{partnerName} just gave you a warm embrace 🤍</p>
              </div>
            </motion.div>

            {/* Random floating hearts */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`heart-${i}`}
                initial={{ opacity: 0, y: 0, x: 0 }}
                animate={{ 
                  opacity: [0, 1, 0], 
                  y: -200 - Math.random() * 200, 
                  x: (Math.random() - 0.5) * 300,
                  scale: [0.5, 1.5, 0.5],
                  rotate: (Math.random() - 0.5) * 45
                }}
                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                className="absolute text-rose-400 opacity-0"
              >
                <Heart size={20 + Math.random() * 20} fill="currentColor" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
