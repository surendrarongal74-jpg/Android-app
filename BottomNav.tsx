import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, Heart, Calendar, Cloud, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { triggerHapticFeedback } from '../lib/haptics';

export const BottomNav = React.memo(function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/chat', icon: MessageCircle, label: 'Chat', hasBadge: true },
    { to: '/memories', icon: Calendar, label: 'Memories' },
    { to: '/loveverse', icon: Cloud, label: 'Loveverse' },
  ];

  return (
    <div className="fixed bottom-0 w-full left-0 right-0 z-50 px-6 pb-5 pointer-events-none flex justify-center">
      <div className="bg-white/80 backdrop-blur-2xl border border-white/60 flex justify-around items-center py-2 px-3 rounded-[34px] shadow-[0_15px_35px_rgba(232,84,122,0.12),0_8px_15px_rgba(43,26,46,0.04)] pointer-events-auto w-full max-w-sm transition-all duration-300">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink 
              key={item.to}
              to={item.to}
              onClick={() => triggerHapticFeedback('light')}
              className="flex flex-col items-center gap-1.5 p-2 px-4 transition-all relative rounded-full text-slate-400 hover:text-deep-rose"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-soft-pink-glow/60 rounded-full -z-10 shadow-[0_0_20px_rgba(232,84,122,0.18)] border border-blush-rose/30"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              
              <div className="relative">
                <motion.div
                  animate={isActive ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ repeat: isActive ? Infinity : 0, repeatDelay: 4, duration: 0.6 }}
                >
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-deep-rose' : 'text-dusty-mauve'}`} />
                </motion.div>
                
                {item.hasBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-deep-rose rounded-full border border-white shadow-[0_0_8px_rgba(232,84,122,0.8)] animate-pulse" />
                )}
              </div>
              
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isActive ? 'text-deep-rose' : 'text-dusty-mauve/80'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
});
