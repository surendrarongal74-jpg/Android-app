import React from 'react';
import { motion } from 'framer-motion';

interface RelationshipPetProps {
  xp: number;
  level: number;
}

export const RelationshipPet = React.memo(function RelationshipPet({ xp, level }: RelationshipPetProps) {
  // Simple SVG-based pet that reacts to level
  const getPetState = () => {
    if (level < 3) return 'baby';
    if (level < 7) return 'junior';
    return 'evolved';
  };

  const state = getPetState();

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ type: "tween", duration: 4, repeat: Infinity }}
        className={`absolute inset-0 rounded-full blur-xl ${
          state === 'baby' ? 'bg-rose-300' : state === 'junior' ? 'bg-emerald-300' : 'bg-purple-400'
        }`}
      />
      
      <motion.div
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-full h-full flex items-center justify-center cursor-pointer"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Pet Body */}
          <motion.circle
            cx="50" cy="55" r="30"
            fill="white"
            className="transition-colors duration-1000"
          />
          
          {/* Eyes */}
          <circle cx="40" cy="50" r="3" fill="#1e293b" />
          <circle cx="60" cy="50" r="3" fill="#1e293b" />
          
          {/* Blush */}
          <circle cx="35" cy="58" r="4" fill="#fda4af" opacity="0.6" />
          <circle cx="65" cy="58" r="4" fill="#fda4af" opacity="0.6" />

          {/* Features based on level */}
          {state !== 'baby' && (
            <motion.path 
              d="M30 30 Q50 10 70 30" 
              fill="none" 
              stroke={state === 'junior' ? '#10b981' : '#a855f7'} 
              strokeWidth="4" 
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          )}

          {state === 'evolved' && (
            <>
              <motion.circle cx="50" cy="25" r="5" fill="#f59e0b" animate={{ scale: [1, 1.3, 1] }} transition={{ type: "tween", repeat: Infinity }} />
              <path d="M20 50 Q10 40 20 30" fill="none" stroke="#a855f7" strokeWidth="2" />
              <path d="M80 50 Q90 40 80 30" fill="none" stroke="#a855f7" strokeWidth="2" />
            </>
          )}

          {/* Smile */}
          <path d="M42 65 Q50 72 58 65" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Level Tag */}
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-2 right-0 bg-white border border-rose-100 text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm text-rose-500"
        >
          Lvl {level}
        </motion.div>
      </motion.div>
    </div>
  );
});
