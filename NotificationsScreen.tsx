import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ChevronLeft, Trash2, CheckCircle, Sparkles, MessageCircle, Heart, Image as ImageIcon, Wand2, X, BrainCircuit } from 'lucide-react';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { generateAIResponse, AI_MODELS } from '../lib/ai';

export function NotificationsScreen() {
  const { notifications, markAsRead, clearNotification, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [airaExplanation, setAiraExplanation] = useState<string | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'chat': return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case 'memory': return <ImageIcon className="w-5 h-5 text-purple-400" />;
      case 'aira': return <Sparkles className="w-5 h-5 text-rose-400" />;
      case 'streak': return <Wand2 className="w-5 h-5 text-orange-400" />;
      default: return <Heart className="w-5 h-5 text-rose-300" />;
    }
  };

  const handleShowExplanation = async (notif: Notification) => {
    setSelectedNotif(notif);
    setAiraExplanation(notif.data?.airaExplanation || null);
    
    if (!notif.data?.airaExplanation && (notif.type === 'aira' || notif.type === 'memory')) {
      setExplaining(true);
      try {
        const prompt = `Explain why you (AIRA, a relationship guide) sent this notification:
        Title: ${notif.title}
        Body: ${notif.body}
        
        Provide a 2-sentence warm, intelligent explanation of why this is important for the couple's relationship health right now.`;
        
        const explanation = await generateAIResponse([
          { role: 'system', content: "You are AIRA, the relationship guardian." },
          { role: 'user', content: prompt }
        ], { model: AI_MODELS.smart });
        setAiraExplanation(explanation);
      } catch (err) {
        setAiraExplanation("I just felt like you both needed a little spark today.");
      } finally {
        setExplaining(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <div className="pt-12 pb-6 px-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-serif font-bold text-slate-800">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 p-4 space-y-3 pb-32">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
            <Bell className="w-12 h-12 mb-4 stroke-[1px]" />
            <p className="text-sm font-medium">All quiet in the Loveverse</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <motion.div
              layout
              key={notif.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white rounded-3xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all ${!notif.read ? 'border-rose-100 shadow-rose-100/20' : ''}`}
              onClick={() => {
                markAsRead(notif.id);
                if (notif.type === 'aira' || notif.type === 'memory') {
                   handleShowExplanation(notif);
                }
              }}
            >
              {!notif.read && (
                <div className="absolute top-0 right-0 p-2">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                </div>
              )}
              
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm flex-shrink-0 ${!notif.read ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-bold truncate ${!notif.read ? 'text-slate-900' : 'text-slate-500'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] font-medium text-slate-400 capitalize">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>
                  
                  {(notif.type === 'aira' || notif.type === 'memory') && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase tracking-widest">
                      <BrainCircuit className="w-3 h-3" /> Aira is explaining...
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute -right-20 group-hover:right-0 top-0 bottom-0 flex transition-all duration-300">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notif.id);
                  }}
                  className="bg-rose-500 text-white px-6 flex items-center justify-center hover:bg-rose-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* AIRA Explanation Modal */}
      <AnimatePresence>
        {selectedNotif && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNotif(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-[101] shadow-2xl border-t border-rose-100"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center mb-4 border border-rose-100 shadow-sm">
                  <BrainCircuit className="w-8 h-8 text-rose-500" />
                </div>
                
                <h2 className="text-xl font-serif font-bold text-slate-800 mb-1">Aira's Insight</h2>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-6">Deep Guardian Analysis</p>
                
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 relative w-full italic">
                  {explaining ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <BrainCircuit className="w-6 h-6 text-rose-300" />
                      </motion.div>
                      <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest animate-pulse">Analyzing orbits...</span>
                    </div>
                  ) : (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[15px] text-slate-600 leading-relaxed font-medium"
                    >
                      "{airaExplanation}"
                    </motion.p>
                  )}
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-rose-200" />
                </div>
                
                <button 
                  onClick={() => setSelectedNotif(null)}
                  className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-xl"
                >
                  Understood, Aira
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
