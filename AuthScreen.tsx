import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Cloud, Sparkles } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AuthScreen() {
  const { user, userData, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (user) {
    if (userData && !userData.setupComplete) {
      return <Navigate to="/setup" />;
    }
    return <Navigate to="/onboarding" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-gradient-to-br from-white to-love-50 text-slate-800 px-6">
      {/* Floating clouds */}
      <motion.div 
        animate={{ x: [0, 50, 0], y: [0, 10, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 -left-10 text-white"
      >
        <Cloud fill="currentColor" className="w-40 h-40 drop-shadow-sm opacity-80" />
      </motion.div>
      <motion.div 
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-32 -right-10 text-white"
      >
        <Cloud fill="currentColor" className="w-56 h-56 drop-shadow-sm opacity-60" />
      </motion.div>

      {/* Floating hearts */}
      <motion.div
        animate={{ y: [0, -20, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4"
      >
        <Heart className="w-6 h-6 text-love-300 fill-love-200" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/3 left-1/4"
      >
        <Heart className="w-8 h-8 text-love-400 fill-love-300" />
      </motion.div>

      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="text-center relative z-10 w-full max-w-sm mb-12"
      >
        <h1 className="text-4xl font-serif text-love-500 font-bold mb-2 flex items-center justify-center gap-2">
          AI Love Journey <Sparkles className="w-6 h-6 text-yellow-400" />
        </h1>
        <p className="text-lg text-slate-500 font-sans italic">Where your love feels like a dream</p>
      </motion.div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="relative z-10 flex flex-col justify-center items-center mb-16"
      >
        <div className="w-48 h-48 rounded-[2.5rem] bg-white/40 backdrop-blur-3xl border border-white/80 shadow-[0_10px_40px_rgba(255,193,204,0.3)] flex items-center justify-center p-8 relative">
           <Cloud fill="currentColor" className="w-full h-full text-white drop-shadow-md absolute inset-0 m-auto z-0 scale-125 opacity-50" />
           <Heart className="w-24 h-24 text-love-400 fill-love-300 animate-heartbeat relative z-10" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        <button
          onClick={signInWithGoogle}
          className="w-full glass-card py-5 px-8 flex items-center justify-center gap-3 text-love-500 font-semibold text-lg hover:bg-white/80 active:scale-95 transition-all mb-4 group"
        >
          <Sparkles className="w-5 h-5 group-hover:text-yellow-400 transition-colors" />
          <span>Begin Your Love Story</span>
        </button>
      </motion.div>
    </div>
  );
}
