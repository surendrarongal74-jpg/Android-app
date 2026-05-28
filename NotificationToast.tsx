import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../contexts/NotificationContext';
import { MessageCircle, Phone, Heart, Sparkles, X, Gift, Milestone, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ICON_MAP: Record<string, any> = {
  chat: MessageCircle,
  call: Phone,
  reaction: Heart,
  mood: TrendingUp,
  memory: Milestone,
  aira: Sparkles,
  streak: Heart,
  gift: Gift
};

const COLOR_MAP: Record<string, string> = {
  chat: 'bg-blue-500',
  call: 'bg-green-500',
  reaction: 'bg-pink-500',
  mood: 'bg-purple-500',
  memory: 'bg-amber-500',
  aira: 'bg-indigo-500',
  streak: 'bg-rose-500',
  gift: 'bg-orange-500'
};

export const NotificationToast = () => {
  const { activeToast, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (!activeToast) return null;

  const Icon = ICON_MAP[activeToast.type] || MessageCircle;
  const bgColor = COLOR_MAP[activeToast.type] || 'bg-gray-500';

  return (
    <AnimatePresence>
      {activeToast && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: '-50%' }}
          animate={{ opacity: 1, y: 20, x: '-50%' }}
          exit={{ opacity: 0, y: -100, x: '-50%' }}
          className="fixed top-0 left-1/2 z-[9999] w-[90%] max-w-md cursor-pointer"
          onClick={() => {
            navigate('/notifications');
            dismissToast();
          }}
        >
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex items-start gap-4">
            <div className={`${bgColor} p-3 rounded-xl text-white shadow-lg`}>
              <Icon className="w-6 h-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900 truncate">
                {activeToast.title}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-2">
                {activeToast.body}
              </p>
            </div>
            
            <button 
              onClick={dismissToast}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Accent bar at the top */}
          <div className={`absolute top-0 left-4 right-4 h-1 ${bgColor} rounded-full opacity-50 blur-[2px]`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
