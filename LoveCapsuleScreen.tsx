import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Lock, Unlock, Calendar, Send, Sparkles, Heart, Clock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { triggerHapticFeedback } from '../lib/haptics';

export function LoveCapsuleScreen() {
  const navigate = useNavigate();
  const { space } = useCoupleSpace();
  const { userData } = useAuth();
  const [capsules, setCapsules] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCapsule, setNewCapsule] = useState({ content: '', type: 'letter', unlockDate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/capsules`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setCapsules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [space?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !userData?.id || !newCapsule.content || !newCapsule.unlockDate) return;

    setIsSubmitting(true);
    try {
      const unlockAt = new Date(newCapsule.unlockDate).getTime();
      await addDoc(collection(db, `coupleSpaces/${space.id}/capsules`), {
        coupleSpaceId: space.id,
        creatorId: userData.id,
        type: newCapsule.type,
        content: newCapsule.content,
        unlockAt,
        createdAt: Date.now(),
        isUnlocked: false
      });
      triggerHapticFeedback('heavy');
      setIsCreating(false);
      setNewCapsule({ content: '', type: 'letter', unlockDate: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-50 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400">
           <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-serif font-black text-slate-800">Love Capsules</h1>
        <div className="w-10" />
      </div>

      <div className="px-6 py-8 space-y-8">
         {/* Welcome Hero */}
         <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
               className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl"
            />
            
            <div className="relative z-10 text-center">
               <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Clock className="w-8 h-8 text-rose-400" />
               </div>
               <h2 className="text-2xl font-serif font-black text-white mb-2">Seal Your Love ⏳</h2>
               <p className="text-white/60 text-sm font-medium leading-relaxed">
                  Write messages, lock memories, or send letters to the future. They stay sealed until their special time.
               </p>
               <button 
                  onClick={() => setIsCreating(true)}
                  className="mt-6 bg-rose-500 hover:bg-rose-600 text-white font-black px-8 py-3 rounded-full text-sm shadow-xl transition-all active:scale-95"
               >
                  Create New Capsule
               </button>
            </div>
         </div>

         {/* Capsule List */}
         <div className="space-y-4">
            <h3 className="font-serif font-black text-slate-800 text-lg px-2">Our Stored Moments</h3>
            
            {capsules.length === 0 ? (
               <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                     <Mail size={24} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">No capsules yet. Start a tradition today!</p>
               </div>
            ) : (
               <div className="grid gap-4">
                  {capsules.map((capsule) => {
                    const isUnlocked = Date.now() >= capsule.unlockAt;
                    const isCreator = capsule.creatorId === userData?.id;

                    return (
                      <motion.div 
                        key={capsule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden transition-all ${!isUnlocked && !isCreator ? 'grayscale-[0.5]' : ''}`}
                      >
                         <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                               <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                  {isUnlocked ? <Unlock size={20} /> : <Lock size={20} />}
                               </div>
                               <div>
                                  <h4 className="font-black text-slate-800 text-sm tracking-tight">
                                     {isUnlocked ? 'Capsule Unlocked!' : 'Time Capsule'}
                                  </h4>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                     From {capsule.creatorId === userData?.id ? 'You' : 'Partner'}
                                  </p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase">Unlock Date</p>
                               <p className="font-bold text-slate-700 text-xs">{format(capsule.unlockAt, 'MMM d, yyyy')}</p>
                            </div>
                         </div>

                         {isUnlocked ? (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-white shadow-inner">
                               <p className="text-slate-700 font-medium leading-relaxed italic italic">
                                  "{capsule.content}"
                               </p>
                            </div>
                         ) : (
                            <div className="space-y-3">
                               <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, Math.max(0, (Date.now() - capsule.createdAt) / (capsule.unlockAt - capsule.createdAt) * 100))}%` }}
                                    className="h-full bg-rose-400"
                                  />
                               </div>
                               <p className="text-[11px] text-center font-bold text-slate-400">
                                  {isCreator ? "You can see this, but it's hidden from your partner" : "Patiently waiting for the reveal..."}
                               </p>
                               {isCreator && (
                                  <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                                    <p className="text-rose-900/60 text-xs italic">"{capsule.content}"</p>
                                  </div>
                               )}
                            </div>
                         )}
                      </motion.div>
                    );
                  })}
               </div>
            )}
         </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center"
          >
             <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-rose-500">
                   <Heart size={120} fill="currentColor" />
                </div>

                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-serif font-black text-slate-800">Create a Surprise</h3>
                   <button onClick={() => setIsCreating(false)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                      <ChevronLeft className="w-5 h-5 rotate-270" />
                   </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">The Message</label>
                      <textarea 
                        required
                        placeholder="Write your beautiful future message here..."
                        className="w-full h-40 bg-slate-50 border border-slate-200 rounded-[2rem] p-6 text-slate-700 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 transition-all resize-none"
                        value={newCapsule.content}
                        onChange={(e) => setNewCapsule({...newCapsule, content: e.target.value})}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unlock Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-14 pr-6 text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 transition-all appearance-none"
                          value={newCapsule.unlockDate}
                          onChange={(e) => setNewCapsule({...newCapsule, unlockDate: e.target.value})}
                        />
                      </div>
                   </div>

                   <button 
                     disabled={isSubmitting}
                     className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black py-4 rounded-full shadow-xl shadow-indigo-200 hover:shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                      {isSubmitting ? 'Sealing...' : <>Seal this Memory <Lock size={18} /></>}
                   </button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
