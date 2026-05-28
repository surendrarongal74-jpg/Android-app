import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useNotifications } from '../contexts/NotificationContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { Bell, Plus, Calendar, MessageSquare, Heart, Clock, X, Check, Trash2, BellRing, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Reminder {
  id: string;
  coupleSpaceId: string;
  creatorId: string;
  title: string;
  type: 'anniversary' | 'message' | 'custom';
  date: number; // timestamp
  enabled: boolean;
  createdAt: number;
}

export function SmartRemindersScreen() {
  const navigate = useNavigate();
  const { space, partnerData } = useCoupleSpace();
  const { userData } = useAuth();
  const { sendNotification } = useNotifications();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'anniversary' | 'message' | 'custom'>('custom');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notification");
      return;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
  };

  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/reminders`),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Reminder);
      setReminders(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/reminders`);
    });

    return () => unsubscribe();
  }, [space?.id]);

  // Mock checking for upcoming reminders (within the next 1 minute)
  useEffect(() => {
    if (permission !== 'granted') return;
    
    const interval = setInterval(() => {
       const now = Date.now();
       reminders.forEach(r => {
          if (r.enabled && r.date > now && r.date - now < 60000) {
             // We trigger notification if 1 minute away
             new Notification("Couple Reminder 🔔", {
                body: r.title,
                icon: '/favicon.ico' // fallback
             });
             // auto disable it so it doesn't fire again immediately
             updateDoc(doc(db, `coupleSpaces/${space?.id}/reminders`, r.id), { enabled: false }).catch(console.error);
          }
       });
    }, 30000); // check every 30s
    
    return () => clearInterval(interval);
  }, [reminders, permission, space?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !userData?.id || !title.trim() || !dateStr) return;

    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr ? timeStr.split(':') : ['00', '00'];
    
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));

    try {
      const id = `reminder_${Date.now()}`;
      await setDoc(doc(db, `coupleSpaces/${space.id}/reminders`, id), {
        id,
        coupleSpaceId: space.id,
        creatorId: userData.id,
        title,
        type,
        date: d.getTime(),
        enabled: true,
        createdAt: Date.now()
      });

      // Notify partner
      if (partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'aira',
          title: 'Shared Reminder 🔔',
          body: `${userData.displayName || 'Partner'} added a new reminder: ${title}`,
          priority: 'medium',
          data: { reminderId: id }
        });
      }
      
      setIsAdding(false);
      setTitle('');
      setDateStr('');
      setTimeStr('');
      setType('custom');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupleSpaces/${space.id}/reminders`);
    }
  };

  const toggleReminder = async (id: string, currentStatus: boolean) => {
    if (!space?.id) return;
    try {
      await updateDoc(doc(db, `coupleSpaces/${space.id}/reminders`, id), {
        enabled: !currentStatus
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `coupleSpaces/${space.id}/reminders`);
    }
  };

  const deleteReminder = async (id: string) => {
    if (!space?.id) return;
    try {
      await deleteDoc(doc(db, `coupleSpaces/${space.id}/reminders`, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `coupleSpaces/${space.id}/reminders`);
    }
  };
  
  const getTypeIcon = (typeVal: string) => {
     switch (typeVal) {
        case 'anniversary': return <Heart className="w-5 h-5 text-rose-500" />;
        case 'message': return <MessageSquare className="w-5 h-5 text-blue-500" />;
        default: return <Bell className="w-5 h-5 text-indigo-500" />;
     }
  };

  const getUpcomingReminders = () => reminders.filter(r => r.date > Date.now());
  const getPastReminders = () => reminders.filter(r => r.date <= Date.now());

  return (
    <div className="flex flex-col h-screen bg-indigo-50 relative pb-20">
      
      <div className="px-6 py-8 pb-4 bg-gradient-to-b from-indigo-100 to-transparent z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 bg-white rounded-full shadow-sm text-indigo-600 hover:bg-slate-50 transition-colors border border-indigo-100 flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
               <h1 className="text-3xl font-bold text-indigo-950 flex items-center gap-2">
                 Reminders <BellRing className="w-6 h-6 text-indigo-500" />
               </h1>
               <p className="text-sm text-indigo-600 font-medium mt-1">
                 Never forget important moments
               </p>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-6">
         {permission !== 'granted' && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-between gap-4">
               <div>
                  <h3 className="font-bold text-indigo-950 text-sm">Enable Notifications</h3>
                  <p className="text-xs text-indigo-600 mt-1">Get local alerts when it's time!</p>
               </div>
               <button onClick={requestNotificationPermission} className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-200 transition-colors">
                  Enable
               </button>
            </div>
         )}

         {getUpcomingReminders().length > 0 && (
           <div>
             <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-widest mb-3 px-2">Upcoming</h2>
             <div className="space-y-3">
               {getUpcomingReminders().map(r => (
                  <ReminderCard key={r.id} r={r} getTypeIcon={getTypeIcon} toggleReminder={toggleReminder} deleteReminder={deleteReminder} />
               ))}
             </div>
           </div>
         )}

         {getPastReminders().length > 0 && (
           <div>
             <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-widest mb-3 px-2 mt-6 opacity-60">Past</h2>
             <div className="space-y-3 opacity-70">
               {getPastReminders().map(r => (
                  <ReminderCard key={r.id} r={r} getTypeIcon={getTypeIcon} toggleReminder={toggleReminder} deleteReminder={deleteReminder} />
               ))}
             </div>
           </div>
         )}
         
         {reminders.length === 0 && (
            <div className="text-center py-20">
               <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <BellRing className="w-10 h-10 text-indigo-300" />
               </div>
               <h3 className="text-lg font-bold text-indigo-900 mb-1">No Reminders Yet</h3>
               <p className="text-sm text-indigo-500">Tap the + button to add an anniversary or sweet message reminder.</p>
            </div>
         )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-indigo-950/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-indigo-50 flex justify-between items-center">
                <h3 className="font-bold text-indigo-950 text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500" />
                  New Reminder
                </h3>
                <button onClick={() => setIsAdding(false)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="reminder-form" onSubmit={handleCreate} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-indigo-800 uppercase tracking-widest mb-1 pl-1">Type</label>
                     <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setType('anniversary')} className={`py-2 flex flex-col items-center justify-center rounded-xl border transition-colors ${type === 'anniversary' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                           <Heart className="w-5 h-5 mb-1" />
                           <span className="text-[10px] font-bold">Anniversary</span>
                        </button>
                        <button type="button" onClick={() => setType('message')} className={`py-2 flex flex-col items-center justify-center rounded-xl border transition-colors ${type === 'message' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                           <MessageSquare className="w-5 h-5 mb-1" />
                           <span className="text-[10px] font-bold">Message</span>
                        </button>
                        <button type="button" onClick={() => setType('custom')} className={`py-2 flex flex-col items-center justify-center rounded-xl border transition-colors ${type === 'custom' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                           <Bell className="w-5 h-5 mb-1" />
                           <span className="text-[10px] font-bold">Custom</span>
                        </button>
                     </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-800 uppercase tracking-widest mb-1 pl-1">Title</label>
                    <input 
                      type="text"
                      className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                      placeholder="e.g. 1 Year Anniversary!"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-indigo-800 uppercase tracking-widest mb-1 pl-1">Date</label>
                       <input 
                         type="date"
                         className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                         value={dateStr}
                         onChange={(e) => setDateStr(e.target.value)}
                         required
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-indigo-800 uppercase tracking-widest mb-1 pl-1">Time</label>
                       <input 
                         type="time"
                         className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                         value={timeStr}
                         onChange={(e) => setTimeStr(e.target.value)}
                         required
                       />
                     </div>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  form="reminder-form"
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors w-full"
                >
                  Save Reminder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

const ReminderCard: React.FC<{ r: Reminder, getTypeIcon: (t: string) => React.ReactNode, toggleReminder: (id: string, status: boolean) => void, deleteReminder: (id: string) => void }> = ({ r, getTypeIcon, toggleReminder, deleteReminder }) => {
   const dateObj = new Date(r.date);
   
   return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border border-indigo-50 transition-opacity ${!r.enabled ? 'opacity-60' : ''}`}>
         <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex flex-shrink-0 items-center justify-center">
               {getTypeIcon(r.type)}
            </div>
            <div className="flex-1 overflow-hidden">
               <h3 className="font-bold text-indigo-950 truncate text-base">{r.title}</h3>
               <div className="flex items-center text-xs text-indigo-500 font-medium gap-2 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
               <button 
                 onClick={() => toggleReminder(r.id, r.enabled)}
                 className={`w-12 h-6 rounded-full p-1 transition-colors relative ${r.enabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
               >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${r.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
               <button onClick={() => deleteReminder(r.id)} className="text-gray-400 hover:text-rose-500 p-1 transition-colors">
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>
   );
}
