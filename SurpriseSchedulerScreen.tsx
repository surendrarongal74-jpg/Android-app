import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { Send, Heart, Clock, Lock, Unlock, Gift, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export function SurpriseSchedulerScreen() {
  const navigate = useNavigate();
  const { space, partnerData } = useCoupleSpace();
  const { userData } = useAuth();
  
  const [surprises, setSurprises] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/memories`),
      where('type', '==', 'surprise')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as any[];
      
      data.sort((a, b) => new Date(b.deliverAt).getTime() - new Date(a.deliverAt).getTime());
      
      // Check if we have newly unlocked surprises from partner
      const prevSurprises = surprises.filter(s => s.creatorId !== userData?.id);
      const newSurprises = data.filter(s => s.creatorId !== userData?.id);
      
      if (newSurprises.length > prevSurprises.length && prevSurprises.length > 0) {
         // A new surprise was added! Show toast if it's already delivered
         const latest = newSurprises[newSurprises.length - 1];
         if (new Date(latest.deliverAt).getTime() <= Date.now()) {
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
         }
      }

      setSurprises(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/memories`);
    });

    return () => unsubscribe();
  }, [space?.id, userData?.id]);

  const scheduleSurprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !userData?.id || !newMessage.trim() || !deliveryDate || !deliveryTime) return;

    const deliverAtTime = new Date(`${deliveryDate}T${deliveryTime}`).getTime();
    if (deliverAtTime <= Date.now()) {
       alert("Please select a future date and time.");
       return;
    }

    const noteId = `surprise_${userData.id}_${Date.now()}`;
    
    const noteData = {
      id: noteId,
      coupleSpaceId: space.id,
      creatorId: userData.id,
      type: 'surprise',
      content: newMessage.trim(),
      deliverAt: new Date(deliverAtTime).toISOString(),
      date: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, `coupleSpaces/${space.id}/memories`, noteId), noteData);
      setNewMessage('');
      setDeliveryDate('');
      setDeliveryTime('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupleSpaces/${space.id}/memories`);
    }
  };

  // Re-render periodically to check if a surprise gets unlocked
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 relative pb-20 overflow-hidden text-zinc-50">
      
      {/* Dark romantic background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 blur-[100px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-600/20 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <div className="px-6 py-8 pb-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 bg-zinc-950 text-rose-300 rounded-full shadow-lg border border-zinc-800 hover:bg-zinc-900 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
             <h1 className="text-3xl font-serif font-bold text-rose-300 flex items-center gap-2">
               Surprises <Gift className="w-6 h-6 text-purple-400" />
             </h1>
             <p className="text-sm text-zinc-400 font-medium mt-1">Send a message to the future</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 z-10 relative">
        
        {/* Input Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl p-6 rounded-[2rem] border border-zinc-800 shadow-2xl">
            <form onSubmit={scheduleSurprise} className="flex flex-col">
                <label className="text-zinc-200 font-serif font-bold text-lg mb-3 block">Write a hidden message...</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="I'll love you even more when you read this..."
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 outline-none focus:border-rose-500/50 focus:bg-zinc-900 transition-all resize-none h-24 text-zinc-200 placeholder:text-zinc-600 placeholder:italic"
                  maxLength={500}
                  required
                />
                
                <div className="flex gap-4 mt-4">
                   <div className="flex-1">
                      <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Date</label>
                      <input 
                         type="date" 
                         value={deliveryDate}
                         min={new Date().toISOString().split('T')[0]}
                         onChange={(e) => setDeliveryDate(e.target.value)}
                         className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500/50 text-sm text-zinc-200"
                         required
                      />
                   </div>
                   <div className="flex-1">
                      <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Time</label>
                      <input 
                         type="time" 
                         value={deliveryTime}
                         onChange={(e) => setDeliveryTime(e.target.value)}
                         className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500/50 text-sm text-zinc-200"
                         required
                      />
                   </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-6 border-t border-zinc-800/50">
                  <span className="text-xs text-zinc-500 font-medium"><Clock className="w-4 h-4 inline mr-1" /> Pick a future time</span>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-rose-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-rose-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 group"
                  >
                    Schedule 💖
                  </button>
                </div>
            </form>
        </div>

        {/* Scheduled Surprises List */}
        <div className="space-y-4">
           <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-xs mb-4 ml-2">Scheduled & Unlocked</h3>
           
           {surprises.length === 0 && (
             <div className="bg-zinc-900/50 rounded-[2rem] p-8 text-center border border-zinc-800/50 border-dashed">
                <Gift className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No surprises scheduled yet.</p>
             </div>
           )}

           {surprises.map((s, i) => {
              const isMe = s.creatorId === userData?.id;
              const unlockTime = new Date(s.deliverAt).getTime();
              const isLocked = unlockTime > now && !isMe; // I can always see what I scheduled, partner waits
              const hasPassed = unlockTime <= now;

              return (
                <motion.div 
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-5 rounded-[2rem] border relative overflow-hidden transition-all ${
                     isLocked 
                     ? 'bg-zinc-900/80 border-zinc-800 shadow-inner' 
                     : isMe
                        ? 'bg-zinc-900 border-purple-500/30'
                        : 'bg-gradient-to-br from-rose-950 to-purple-950 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.1)]'
                  }`}
                >
                  {isLocked && (
                     <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <div className="bg-zinc-900/90 py-2 px-4 rounded-full border border-zinc-700/50 flex items-center gap-2 shadow-xl">
                           <Lock className="w-4 h-4 text-purple-400" />
                           <span className="text-sm font-bold text-zinc-300">Unlocks at {format(new Date(s.deliverAt), 'h:mm a, MMM d')}</span>
                        </div>
                     </div>
                  )}

                  <div className="flex items-start justify-between mb-3 relative z-0">
                     <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isMe ? 'bg-purple-500/20 text-purple-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {isMe ? 'Sent by you' : `From ${partnerData?.displayName}`}
                     </span>
                     <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        {hasPassed ? <Unlock className="w-3 h-3 text-zinc-400" /> : <Clock className="w-3 h-3" />} 
                        {format(new Date(s.deliverAt), 'h:mm a, MMM d')}
                     </span>
                  </div>

                  <p className={`font-serif italic leading-relaxed relative z-0 ${isLocked ? 'text-zinc-600 blur-[4px] select-none' : 'text-zinc-200'}`}>
                     "{s.content}"
                  </p>
                </motion.div>
              )
           })}
        </div>
      </div>

      <div className="z-20 bg-zinc-950 border-t border-zinc-800/50">
        <BottomNav />
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 30, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-rose-500/30 px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 border-b-4 border-b-rose-500 pointer-events-auto">
              <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-100 font-serif">You have a surprise 💝</h4>
                <p className="text-sm text-zinc-400">From {partnerData?.displayName}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
