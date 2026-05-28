import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Send, BrainCircuit, X, ChevronRight, CheckCircle2, History, Wand2 } from 'lucide-react';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, collection, addDoc, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { generateHeartSyncQuestion, generateAIResponse, AI_MODELS } from '../lib/ai';
import { useNavigate } from 'react-router-dom';

interface SyncSession {
  id: string;
  question: string;
  type: string;
  p1Answer: string | null;
  p2Answer: string | null;
  status: 'active' | 'completed';
  result?: {
    compatibility: number;
    insight: string;
  };
}

export function HeartSyncScreen() {
  const { space, partnerData } = useCoupleSpace();
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SyncSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isP1 = userData?.id < (partnerData?.id || '');

  useEffect(() => {
    if (!space?.id) return;

    const unsubscribe = onSnapshot(doc(db, `coupleSpaces/${space.id}/sync`, 'current'), (doc) => {
      if (doc.exists()) {
        setSession(doc.data() as SyncSession);
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [space?.id]);

  const startNewSync = async () => {
    if (!space?.id || !userData) return;
    setLoading(true);

    try {
      // Get some history for AI
      const q = query(collection(db, `coupleSpaces/${space.id}/messages`), orderBy('createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      const history = snap.docs.map(d => d.data().content);

      const qs = await generateHeartSyncQuestion({ love: space.xp || 10, chemistry: 80 }, history);
      
      const newSession: SyncSession = {
        id: Date.now().toString(),
        question: qs.question,
        type: qs.type,
        p1Answer: null,
        p2Answer: null,
        status: 'active'
      };

      await setDoc(doc(db, `coupleSpaces/${space.id}/sync`, 'current'), newSession);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!space?.id || !session || !answer) return;
    setIsSubmitting(true);

    try {
      const updateData = isP1 ? { p1Answer: answer } : { p2Answer: answer };
      await updateDoc(doc(db, `coupleSpaces/${space.id}/sync`, 'current'), updateData);
      
      // If both answered, trigger AI result
      const p1AnswerFinal = isP1 ? answer : session.p1Answer;
      const p2AnswerFinal = isP1 ? session.p2Answer : answer;

      if (p1AnswerFinal && p2AnswerFinal) {
         try {
            const resultPrompt = `Analyze this couple's answers to: "${session.question}"
            User 1: "${p1AnswerFinal}"
            User 2: "${p2AnswerFinal}"
            Compare their emotional depth and providing a compatibility percentage (0-100) and a short warm insight.
            Return JSON ONLY: {"compatibility": 85, "insight": "..."}`;

            const resText = await generateAIResponse([
              { role: 'system', content: "You are Relationship Guardian AIRA. Output JSON only." },
              { role: 'user', content: resultPrompt }
            ], { model: AI_MODELS.smart });
            
            let result;
            try {
              result = JSON.parse(resText.replace(/```json|```/g, '').trim());
            } catch (err) {
              console.warn("Heart sync content parse failed, using fallback:", err);
              result = { compatibility: 85, insight: resText || "Your responses share a beautiful, deeply touching harmony." };
            }
            
            await updateDoc(doc(db, `coupleSpaces/${space.id}/sync`, 'current'), { 
              status: 'completed',
              result,
              p1Answer: p1AnswerFinal,
              p2Answer: p2AnswerFinal
            });
            
            // Grant XP
            await updateDoc(doc(db, 'coupleSpaces', space.id), {
              xp: (space.xp || 0) + 50
            });
         } catch (err) {
            console.error("Sync result error:", err);
            await updateDoc(doc(db, `coupleSpaces/${space.id}/sync`, 'current'), { 
              status: 'completed',
              result: { compatibility: 85, insight: "Your connection is deep and resonate." },
              p1Answer: p1AnswerFinal,
              p2Answer: p2AnswerFinal
            });
         }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const myAnswer = isP1 ? session?.p1Answer : session?.p2Answer;
  const partnerAnswer = isP1 ? session?.p2Answer : session?.p1Answer;

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col font-sans relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-rose-200 rounded-full blur-[100px] opacity-40" />

      <div className="pt-16 pb-6 px-6 flex items-center justify-between sticky top-0 bg-rose-50/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-rose-400">
           <X className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-serif font-black text-rose-900">Heart Sync</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-6 pb-20 flex flex-col items-center justify-center">
        {!session ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8"
          >
            <div className="relative inline-block">
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                 transition={{ type: "tween", duration: 3, repeat: Infinity }}
                 className="absolute inset-0 bg-rose-400 rounded-full blur-2xl"
               />
               <div className="relative z-10 w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center">
                  <Heart className="w-12 h-12 text-rose-500 animate-heartbeat fill-rose-100" />
               </div>
            </div>
            
            <div className="max-w-xs mx-auto">
              <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Engage Connection</h2>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                AIRA will generate a unique question based on your journey. Both answer separately to discover your resonance.
              </p>
            </div>

            <button 
              onClick={startNewSync}
              disabled={loading}
              className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              {loading ? "Aligning Orbits..." : "Start Sync Session"}
              <Sparkles className="w-4 h-4 text-rose-400" />
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-10">
            {/* Question Card */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-rose-200/50 border border-white text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6">
                <BrainCircuit className="w-6 h-6 text-rose-200 group-hover:text-rose-400 transition-colors" />
              </div>
              <span className="inline-block px-3 py-1 bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-widest rounded-full mb-6 italic">
                {session.type} Question
              </span>
              <h3 className="text-2xl font-serif font-bold text-slate-800 leading-tight">
                {session.question}
              </h3>
            </div>

            {/* Answer State */}
            <div className="space-y-6">
              {session.status === 'active' ? (
                <>
                  {!myAnswer ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                       <textarea 
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Pour your heart out..."
                        className="w-full min-h-[120px] bg-white rounded-3xl p-6 text-slate-700 font-medium border-2 border-transparent focus:border-rose-200 outline-none transition-all shadow-lg text-lg resize-none"
                       />
                       <button 
                        onClick={submitAnswer}
                        disabled={!answer || isSubmitting}
                        className="mt-4 w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-3"
                       >
                         {isSubmitting ? "Sending to AIRA..." : "Seal My Heart"}
                         <Send className="w-4 h-4" />
                       </button>
                    </motion.div>
                  ) : (
                    <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 border border-white text-center">
                       <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                       <h4 className="text-lg font-bold text-slate-700">Answer Locked</h4>
                       <p className="text-xs text-slate-500 mt-1">Waiting for {partnerData?.displayName?.split(' ')[0]} to reveal...</p>
                       
                       <div className="mt-8 flex justify-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${myAnswer ? 'bg-emerald-400' : 'bg-slate-200 animate-pulse'}`} />
                          <div className={`w-3 h-3 rounded-full ${partnerAnswer ? 'bg-emerald-400' : 'bg-slate-200 animate-pulse'}`} />
                       </div>
                    </div>
                  )}
                </>
              ) : (
                /* Results View */
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                   <div className="text-center space-y-2">
                      <div className="text-6xl font-black text-rose-500 drop-shadow-sm">{session.result?.compatibility}%</div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-300">Emotional Resonance</p>
                   </div>
                   
                   <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-rose-100 relative">
                     <Wand2 className="absolute -top-3 -right-3 w-8 h-8 text-rose-400 bg-white rounded-full p-1 shadow-md" />
                     <p className="text-slate-600 leading-relaxed font-medium italic">
                        "{session.result?.insight}"
                     </p>
                   </div>

                   <button 
                    onClick={startNewSync}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-3"
                   >
                     New Synchronisation
                     <ChevronRight className="w-4 h-4 text-rose-400" />
                   </button>
                </motion.div>
              )}
            </div>
            
          </motion.div>
        )}
      </div>
    </div>
  );
}
