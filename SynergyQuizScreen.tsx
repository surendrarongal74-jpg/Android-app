import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, User, ChevronLeft, BrainCircuit, Loader2, Wand2 } from 'lucide-react';
import { generateAIResponse, AI_MODELS } from '../lib/ai';
import { useNavigate, Link } from 'react-router-dom';
import { triggerHapticFeedback } from '../lib/haptics';

interface SynergyState {
  id: string;
  coupleSpaceId: string;
  playersOnline: string[];
  status: 'waiting' | 'playing' | 'revealing' | 'result';
  currentQuestion: string;
  round: number;
  answers: Record<string, string>;
  synergyResult?: string;
}

export function SynergyQuizScreen() {
  const { userData } = useAuth();
  const { space, partnerData, addXp } = useCoupleSpace();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<SynergyState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const docRef = space?.id ? doc(db, `coupleSpaces/${space.id}/synergyQuiz`, 'default') : null;

  useEffect(() => {
    if (!docRef || !userData?.id) return;

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SynergyState;
        if (!data.playersOnline?.includes(userData.id)) {
           updateDoc(docRef, {
              playersOnline: [...(data.playersOnline || []).filter(id => id !== userData.id), userData.id].slice(-2)
           }).catch(e => console.error(e));
        }
        setGameState(data);
      } else {
        setDoc(docRef, {
          id: 'default',
          coupleSpaceId: space.id,
          playersOnline: [userData.id],
          status: 'waiting',
          currentQuestion: '',
          round: 0,
          answers: {},
          updatedAt: Date.now()
        }).catch(e => console.error(e));
      }
    }, (err) => {
       handleFirestoreError(err, OperationType.GET, `coupleSpaces/${space.id}/synergyQuiz/default`);
    });

    return () => {
       unsubscribe();
       if (docRef && userData?.id) {
           updateDoc(docRef, {
               playersOnline: gameState?.playersOnline?.filter(id => id !== userData.id) || []
           }).catch(e => console.log(e));
       }
    };
  }, [space?.id, userData?.id]);

  const bothOnline = gameState?.playersOnline?.length === 2;

  const handleStartGame = async () => {
    if (!docRef) return;
    setIsGenerating(true);
    try {
      const prompt = `Generate a thought-provoking relationship question for a couple. 
      It should be about shared preferences, dreams, or habits. 
      Example: "Who is more likely to stay up late talking?" or "What's our ideal Sunday morning?"
      Output just the question.`;
      const q = await generateAIResponse([
        { role: 'system', content: "You are Relationship Guardian AIRA." },
        { role: 'user', content: prompt }
      ], { model: AI_MODELS.romantic });
      
      await updateDoc(docRef, {
        status: 'playing',
        currentQuestion: q.trim(),
        round: 1,
        answers: {},
        synergyResult: null,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!docRef || !userData?.id || !gameState) return;
    
    const newAnswers = { ...gameState.answers, [userData.id]: answer };
    
    if (Object.keys(newAnswers).length === 2) {
       await updateDoc(docRef, {
          answers: newAnswers,
          status: 'revealing',
          updatedAt: Date.now()
       });
       
       // Generate Synergy Insight
       try {
         const p1 = Object.keys(newAnswers)[0];
         const p2 = Object.keys(newAnswers)[1];
         const prompt = `Analyze this couple's answers to the question: "${gameState.currentQuestion}"
         User 1 said: "${newAnswers[p1]}"
         User 2 said: "${newAnswers[p2]}"
         Provide a one-sentence warm, AI-powered insight about their compatibility or synergy.`;
         const insight = await generateAIResponse([
            { role: 'system', content: "You are Relationship Guardian AIRA." },
            { role: 'user', content: prompt }
          ], { model: AI_MODELS.smart });
         
         await updateDoc(docRef, {
            synergyResult: insight.trim(),
            status: 'result',
            updatedAt: Date.now()
         });
       } catch (err) {
         await updateDoc(docRef, { status: 'result' });
       }
    } else {
       await updateDoc(docRef, {
          answers: newAnswers,
          updatedAt: Date.now()
       });
    }
  };

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 flex flex-col font-sans relative">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 bg-white/40 backdrop-blur-md border-b border-white flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-serif font-black text-slate-900">Relationship Synergy</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!bothOnline ? (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto border border-rose-50">
                 <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-slate-800">Waiting for Resonance...</h2>
              <p className="text-sm text-slate-500 italic max-w-xs mx-auto">Ask {partnerData?.displayName} to open the Synergy Quiz to start aligning your orbits.</p>
            </motion.div>
          ) : gameState.status === 'waiting' ? (
            <motion.div key="start" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-10">
               <div className="relative">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} className="absolute -inset-8">
                     <BrainCircuit className="w-full h-full text-rose-100 opacity-50" />
                  </motion.div>
                  <div className="relative z-10 w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-rose-50">
                     <Sparkles className="w-12 h-12 text-rose-500 animate-pulse" />
                  </div>
               </div>
               <div className="max-w-xs">
                 <h2 className="text-3xl font-serif font-black text-slate-900 mb-3">AI Synergy Scan</h2>
                 <p className="text-slate-500 font-medium leading-relaxed italic">AIRA will analyze your responses to reveal patterns of hidden synchronicity.</p>
               </div>
               <button 
                onClick={handleStartGame}
                disabled={isGenerating}
                className="w-full bg-slate-900 text-white h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
               >
                 {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5 text-rose-400" />}
                 Initiate Synergy Scan
               </button>
            </motion.div>
          ) : gameState.status === 'playing' ? (
            <motion.div key="playing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-12">
               <div className="text-center space-y-4">
                  <span className="px-3 py-1 bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-full">Round {gameState.round}</span>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 leading-tight">
                    {gameState.currentQuestion}
                  </h2>
               </div>

               {!gameState.answers[userData?.id || ''] ? (
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => submitAnswer(userData?.id || '')}
                      className="h-20 bg-white border-2 border-white rounded-3xl shadow-xl hover:border-rose-200 transition-all text-xl font-bold text-slate-800 flex items-center justify-center gap-3 px-8"
                    >
                      <User className="w-6 h-6 text-rose-400" /> Me
                    </button>
                    <button 
                      onClick={() => submitAnswer(partnerData?.id || '')}
                      className="h-20 bg-rose-500 text-white rounded-3xl shadow-xl hover:bg-rose-600 transition-all text-xl font-bold flex items-center justify-center gap-3 px-8"
                    >
                      <Heart className="w-6 h-6 fill-white/20" /> {partnerData?.displayName}
                    </button>
                 </div>
               ) : (
                 <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-rose-300 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Waiting for {partnerData?.displayName}'s frequency...</p>
                 </div>
               )}
            </motion.div>
          ) : (
            /* Result Reveal */
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-10">
               <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] border border-white shadow-2xl text-center space-y-8">
                  <div className="flex items-center justify-center gap-4">
                     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm font-bold text-slate-400">
                        {gameState.answers[userData?.id || ''] === userData?.id ? 'Me' : 'You'}
                     </div>
                     <Heart className={`w-8 h-8 ${gameState.answers[userData?.id || ''] === gameState.answers[partnerData?.id || ''] ? 'text-rose-500 fill-rose-500' : 'text-slate-200'} animate-heartbeat`} />
                     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm font-bold text-slate-400">
                        {gameState.answers[partnerData?.id || ''] === partnerData?.id ? 'Me' : 'You'}
                     </div>
                  </div>

                  {gameState.status === 'result' ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                       <h3 className="text-sm font-black uppercase tracking-[0.2em] text-rose-500">Aira Synergy Insight</h3>
                       <p className="text-xl font-serif font-medium text-slate-700 italic leading-relaxed">
                          "{gameState.synergyResult || 'Your choices weave together a narrative of mutual understanding.'}"
                       </p>
                       <button 
                        onClick={handleStartGame}
                        className="mt-6 w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                       >
                         Next Question <Sparkles className="w-4 h-4 text-rose-400" />
                       </button>
                    </motion.div>
                  ) : (
                    <div className="py-10">
                       <Loader2 className="w-10 h-10 text-rose-300 animate-spin mx-auto mb-2" />
                       <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Aira is synthesizing orbits...</p>
                    </div>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
