import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useNotifications } from '../contexts/NotificationContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { Map, CalendarHeart, Wand2, Compass, DollarSign, Clock, X, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { generateAIResponse, AI_MODELS } from '../lib/ai';

interface DatePlan {
  id: string;
  coupleSpaceId: string;
  creatorId: string;
  title: string;
  description: string;
  budget: string;
  mood: string;
  createdAt: number;
}

export function AIPlannerScreen() {
  const navigate = useNavigate();
  const { space, partnerData } = useCoupleSpace();
  const { userData } = useAuth();
  const { sendNotification } = useNotifications();
  
  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [budget, setBudget] = useState('Medium ($$)');
  const [mood, setMood] = useState('Romantic & Quiet');
  const [time, setTime] = useState('Evening');
  const [vibes, setVibes] = useState('');

  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/datePlans`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as DatePlan);
      setPlans(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/datePlans`);
    });

    return () => unsubscribe();
  }, [space?.id]);

  const generateDate = async () => {
    if (!space?.id || !userData?.id) return;
    setIsGenerating(true);
    
    try {
      const prompt = `Act as an expert romantic date planner. 
      Generate a date idea with these parameters:
      - Budget: ${budget}
      - Mood: ${mood}
      - Time: ${time}
      - Extra vibes: ${vibes || 'None'}
      
      Output format:
      Return ONLY a JSON object (no markdown formatting, no code blocks).
      {
         "title": "A catchy date title",
         "description": "A sweet, detailed multiline description and step-by-step plan"
      }`;

      const res = await generateAIResponse([
        { role: 'system', content: "You are an expert romantic date planner AI. Output JSON only." },
        { role: 'user', content: prompt }
      ], { model: AI_MODELS.smart });
      
      // Clean JSON if needed
      let planData;
      try {
        const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        planData = JSON.parse(cleanJson);
      } catch (err) {
        console.warn("Date planner response was not JSON, converting to object:", err);
        planData = {
          title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} Rendezvous ✨`,
          description: res || "Let's share a quiet, beautiful moment together tonight, listening to our favorite tunes."
        };
      }
      
      const id = `date_${Date.now()}`;
      await setDoc(doc(db, `coupleSpaces/${space.id}/datePlans`, id), {
        id,
        coupleSpaceId: space.id,
        creatorId: userData.id,
        title: planData.title,
        description: planData.description,
        budget,
        mood,
        createdAt: Date.now()
      });

      // Notify partner
      if (partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'aira',
          title: 'New Date Idea! ✨',
          body: `${userData.displayName || 'Partner'} planned a new date: ${planData.title}`,
          priority: 'medium',
          data: { planId: id }
        });
      }
      
      setShowForm(false);
      setVibes('');
    } catch (e) {
      console.error(e);
      alert("Oops! The AI got confused. Let's try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!space?.id) return;
    try {
      await deleteDoc(doc(db, `coupleSpaces/${space.id}/datePlans`, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `coupleSpaces/${space.id}/datePlans`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-rose-50 relative pb-20">
      
      <div className="px-6 py-8 pb-4 bg-gradient-to-b from-rose-100 to-transparent z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 bg-white rounded-full shadow-sm text-rose-500 hover:bg-rose-50 transition-colors border border-rose-100 flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
               <h1 className="text-3xl font-bold text-rose-950 flex items-center gap-2">
                 Date Planner <CalendarHeart className="w-6 h-6 text-rose-500" />
               </h1>
               <p className="text-sm text-rose-600 font-medium mt-1">
                 AI-generated perfect dates 💖
               </p>
            </div>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="p-3 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-6 pt-2">
         {plans.map(plan => (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               key={plan.id}
               className="bg-white rounded-[2rem] p-6 shadow-sm border border-rose-100 relative overflow-hidden group"
            >
               <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => deletePlan(plan.id)} className="text-gray-300 hover:text-rose-500 transition-colors p-2 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100">
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               
               <h3 className="font-serif font-bold text-xl text-rose-950 pr-10 mb-2 leading-tight">
                  {plan.title}
               </h3>
               
               <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-green-100">
                     <DollarSign className="w-3 h-3" /> {plan.budget}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-purple-100">
                     <Compass className="w-3 h-3" /> {plan.mood}
                  </span>
               </div>
               
               <div className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed font-medium bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                  {plan.description}
               </div>
            </motion.div>
         ))}
         
         {plans.length === 0 && !showForm && (
            <div className="text-center py-20 px-6">
               <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-rose-200 border-dashed">
                 <Wand2 className="w-8 h-8 text-rose-400" />
               </div>
               <h3 className="text-xl font-bold text-rose-900 mb-2 font-serif">No Dates Planned</h3>
               <p className="text-rose-500 font-medium">Click the + button to let our AI design the perfect romantic date for you two!</p>
            </div>
         )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-rose-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-rose-50 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-bold text-rose-950 text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-rose-500" />
                  Generate Date Idea
                </h3>
                <button onClick={() => setShowForm(false)} disabled={isGenerating} className="p-2 text-rose-400 hover:bg-rose-50 rounded-full disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                 {/* Budget */}
                 <div>
                    <label className="block text-xs font-bold text-rose-800 uppercase tracking-widest mb-3 pl-1">Budget</label>
                    <div className="grid grid-cols-3 gap-2">
                       {['Free ($0)', 'Medium ($$)', 'Luxury ($$$)'].map(b => (
                          <button key={b} onClick={() => setBudget(b)} className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all ${budget === b ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:border-rose-200'}`}>
                             {b.split(' ')[0]}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Mood */}
                 <div>
                    <label className="block text-xs font-bold text-rose-800 uppercase tracking-widest mb-3 pl-1">Vibe / Mood</label>
                    <div className="grid grid-cols-2 gap-2">
                       {['Romantic & Quiet', 'Adventurous', 'Cozy at Home', 'Foodie Focus'].map(m => (
                          <button key={m} onClick={() => setMood(m)} className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all ${mood === m ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-200'}`}>
                             {m}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Time */}
                 <div>
                    <label className="block text-xs font-bold text-rose-800 uppercase tracking-widest mb-3 pl-1">Time of Day</label>
                    <div className="grid grid-cols-3 gap-2">
                       {['Morning', 'Afternoon', 'Evening'].map(t => (
                          <button key={t} onClick={() => setTime(t)} className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${time === t ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:border-amber-200'}`}>
                             <Clock className="w-4 h-4" /> {t}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Extra vibes */}
                 <div>
                    <label className="block text-xs font-bold text-rose-800 uppercase tracking-widest mb-2 pl-1">Any specific needs?</label>
                    <input 
                       type="text" 
                       value={vibes} 
                       onChange={(e) => setVibes(e.target.value)} 
                       placeholder="e.g., We love italian food, must include coffee..." 
                       className="w-full bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:bg-white transition-all"
                    />
                 </div>
              </div>

              <div className="p-4 bg-white border-t border-rose-50">
                <button
                  onClick={generateDate}
                  disabled={isGenerating}
                  className="bg-rose-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 hover:-translate-y-1 active:translate-y-0 transition-all w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isGenerating ? (
                     <><Wand2 className="w-5 h-5 animate-pulse" /> Brainstorming magic...</>
                  ) : (
                     <><Wand2 className="w-5 h-5" /> Generate Perfect Date</>
                  )}
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
