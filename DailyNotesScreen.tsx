import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { Send, Heart, Flame, Calendar, Bell, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay } from 'date-fns';
import { triggerHapticFeedback } from '../lib/haptics';

export function DailyNotesScreen() {
  const navigate = useNavigate();
  const { space, partnerData, addXp } = useCoupleSpace();
  const { userData } = useAuth();
  const { sendNotification } = useNotifications();

  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [hasSentToday, setHasSentToday] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [partnerLatestNote, setPartnerLatestNote] = useState<any>(null);

  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/memories`),
      where('type', '==', 'daily_note')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as any[];
      
      notesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotes(notesData);

      const todayStr = new Date().toISOString().split('T')[0];
      const myTodayNote = notesData.find(n => n.creatorId === userData?.id && n.date.startsWith(todayStr));
      setHasSentToday(!!myTodayNote);

      const pLatest = notesData.find(n => n.creatorId !== userData?.id);
      if (pLatest) {
        if (!partnerLatestNote || partnerLatestNote.id !== pLatest.id) {
           // New note from partner!
           if (partnerLatestNote) { // Don't show on initial load, only on updates
             triggerHapticFeedback('heavy');
             setShowNotification(true);
             setTimeout(() => setShowNotification(false), 5000);
           }
        }
        setPartnerLatestNote(pLatest);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/memories`);
    });

    return () => unsubscribe();
  }, [space?.id, userData?.id]);

  const sendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !userData?.id || !newNote.trim() || hasSentToday) return;

    triggerHapticFeedback('medium');
    const todayStr = new Date().toISOString().split('T')[0];
    // Create predictable ID to prevent duplicate per day
    const noteId = `note_${userData.id}_${todayStr}`;
    
    const noteData = {
      id: noteId,
      coupleSpaceId: space.id,
      creatorId: userData.id,
      type: 'daily_note',
      content: newNote.trim(),
      date: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, `coupleSpaces/${space.id}/memories`, noteId), noteData);
      setNewNote('');
      
      // Update streak and give XP
      addXp(15);
      const newStreak = (space.streak || 0) + 1;
      await updateDoc(doc(db, 'coupleSpaces', space.id), {
         streak: newStreak,
         lastInteractionAt: Date.now()
      });

      // Notify partner of daily note
      if (partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'chat',
          title: 'New Daily Note 📝',
          body: `${userData.displayName || 'Partner'} shared today's love note!`,
          priority: 'medium',
          data: { noteId: noteId }
        });
      }
      
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupleSpaces/${space.id}/memories`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 relative pb-20 overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-8 pb-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 bg-white rounded-full shadow-sm text-rose-500 hover:bg-rose-50 transition-colors border border-rose-100 flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
             <h1 className="text-3xl font-serif font-bold text-rose-950 flex items-center gap-2">
               Daily Notes <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
             </h1>
             <p className="text-sm text-rose-500 font-medium mt-1">One meaningful message per day</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
          <span className="font-bold text-orange-600 font-mono">{space?.streak || 0}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 z-10 relative">
        
        {/* Input Card */}
        <div className="bg-gradient-to-br from-rose-400 to-pink-500 p-[2px] rounded-[2rem] shadow-xl shadow-rose-200/50">
           <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2rem] h-full flex flex-col">
              {hasSentToday ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                   <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                     <Heart className="w-8 h-8 text-rose-500 fill-rose-500 animate-pulse" />
                   </div>
                   <h3 className="text-xl font-serif font-bold text-rose-950 mb-2">Note Sent!</h3>
                   <p className="text-rose-500 text-sm">You've shared your love for today. Come back tomorrow! 💕</p>
                </div>
              ) : (
                <form onSubmit={sendNote} className="flex flex-col">
                   <label className="text-rose-950 font-serif font-bold text-lg mb-3 block">Write today's love note...</label>
                   <textarea
                     value={newNote}
                     onChange={(e) => setNewNote(e.target.value)}
                     placeholder="What do you appreciate about them today?"
                     className="w-full bg-rose-50/50 border border-rose-100 rounded-2xl p-4 outline-none focus:border-rose-300 focus:bg-white transition-all resize-none h-32 text-rose-950 placeholder:text-rose-300 placeholder:italic"
                     maxLength={500}
                   />
                   <div className="flex justify-between items-center mt-4">
                     <span className="text-xs text-rose-400 font-medium">{newNote.length}/500</span>
                     <button 
                       type="submit"
                       disabled={!newNote.trim()}
                       className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 group"
                     >
                       Send Love <Send className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                     </button>
                   </div>
                </form>
              )}
           </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-1/2 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-rose-300 before:to-transparent">
          {notes.map((note, i) => {
             const isMe = note.creatorId === userData?.id;
             const isToday = isSameDay(new Date(note.date), new Date());
             return (
               <motion.div 
                 key={note.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.1 }}
                 className="relative flex items-center justify-between md:justify-normal md:even:flex-row-reverse group"
               >
                 <div className="flex items-center absolute left-0 md:left-1/2 -translate-x-1/2">
                   <div className={`w-12 h-12 rounded-full border-4 border-white flex items-center justify-center shadow-md z-10 transition-transform group-hover:scale-110 ${isToday ? 'bg-gradient-to-br from-rose-400 to-pink-500' : 'bg-rose-100 text-rose-400'}`}>
                     {isToday ? <Flame className="w-5 h-5 text-white fill-white" /> : <Calendar className="w-5 h-5" />}
                   </div>
                 </div>
                 <div className="w-full pl-16 md:pl-0 md:w-5/12 md:even:text-right">
                    <div className={`p-5 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow relative ${isToday ? 'bg-white border-2 border-rose-200' : 'bg-white/60 backdrop-blur-md border border-white'}`}>
                       <p className="text-[11px] font-bold text-rose-400 mb-2 uppercase tracking-wider">
                         {format(new Date(note.date), 'MMM d, yyyy')} • {isMe ? 'You' : partnerData?.displayName}
                       </p>
                       <p className="text-rose-950 font-medium leading-relaxed italic">"{note.content}"</p>
                    </div>
                 </div>
               </motion.div>
             )
          })}
        </div>
      </div>

      <BottomNav />

      {/* Notification Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 30, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 border-b-4 border-b-rose-400 pointer-events-auto">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-rose-500 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-rose-950 font-serif">You received a love note 💌</h4>
                <p className="text-sm text-rose-500">From {partnerData?.displayName}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
