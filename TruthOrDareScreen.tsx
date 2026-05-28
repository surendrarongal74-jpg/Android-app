import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { Wine, AlertCircle, CheckCircle, RefreshCw, Star, Heart, Camera, Upload, ArrowRight, X, Sparkles, Loader2, ChevronLeft } from 'lucide-react';
import { generateAIResponse, AI_MODELS } from '../lib/ai';

interface ToDState {
  id: string;
  coupleSpaceId: string;
  playersOnline: string[];
  status: 'waiting' | 'spinning' | 'choosing' | 'asking' | 'completing' | 'result';
  currentTurn: string;
  selectedChoice: 'truth' | 'dare' | '';
  questionOrDare: string;
  mediaUrl: string;
  scores: Record<string, number>;
  updatedAt: number;
}

const TRUTHS = [
  "What is your favorite memory of us?",
  "What is a secret you've never told me?",
  "If you could change one thing about our relationship, what would it be?",
  "What was your first impression of me?",
  "What's the most embarrassing thing you've done?",
  "What is your biggest fear?",
  "When did you realize you were in love with me?"
];

const DARES = [
  "Send me the ugliest selfie you can take right now.",
  "Do 10 pushups and send video proof.",
  "Text your best friend a really strange message and show me.",
  "Sing a romantic song in a voice note.",
  "Let me pick your outfit for our next date.",
  "Give me a 5-minute massage next time we meet.",
  "Do an impression of me."
];

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function TruthOrDareScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { space, partnerData } = useCoupleSpace();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [gameState, setGameState] = useState<ToDState | null>(null);
  const [spinDeg, setSpinDeg] = useState(0);
  
  const [customInput, setCustomInput] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const docRef = space?.id ? doc(db, `coupleSpaces/${space.id}/todGameState`, 'default') : null;

  useEffect(() => {
    if (!docRef || !userData?.id) return;

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ToDState;
        
        // Auto-join if not in playersOnline
        if (!data.playersOnline?.includes(userData.id)) {
           updateDoc(docRef, {
              playersOnline: [...(data.playersOnline || []).filter(id => id !== userData.id), userData.id].slice(-2)
           }).catch(e => console.error("Could not join game", e));
        }
        
        setGameState(data);
      } else {
        // Initialize if not exists
        setDoc(docRef, {
          id: 'default',
          coupleSpaceId: space.id,
          playersOnline: [userData.id],
          status: 'waiting',
          currentTurn: '',
          selectedChoice: '',
          questionOrDare: '',
          mediaUrl: '',
          scores: {},
          updatedAt: Date.now()
        }).catch(e => console.error(e));
      }
    }, (err) => {
       handleFirestoreError(err, OperationType.GET, `coupleSpaces/${space.id}/todGameState/default`);
    });

    return () => {
       // Leave game
       unsubscribe();
       if (docRef && userData?.id) {
           updateDoc(docRef, {
               playersOnline: gameState?.playersOnline?.filter(id => id !== userData.id) || []
           }).catch(e => console.log(e));
       }
    };
  }, [space?.id, userData?.id]);

  // Handle sudden leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (docRef && userData?.id && gameState?.playersOnline) {
          updateDoc(docRef, {
             playersOnline: gameState.playersOnline.filter(id => id !== userData.id)
          }).catch(e => console.log(e));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [docRef, userData?.id, gameState?.playersOnline]);

  const bothOnline = gameState?.playersOnline?.length === 2;
  const isMyTurn = gameState?.currentTurn === userData?.id;

  // Spin Logic
  const handleSpin = async () => {
    if (!docRef || !space?.id || !partnerData) return;
    
    const players = [userData.id, partnerData.id];
    const nextTurn = players[Math.floor(Math.random() * players.length)];
    
    try {
      await updateDoc(docRef, {
        status: 'spinning',
        currentTurn: nextTurn,
        selectedChoice: '',
        questionOrDare: '',
        mediaUrl: '',
        updatedAt: Date.now()
      });
      
      // Simulate spinning time
      setTimeout(() => {
        updateDoc(docRef, {
          status: 'choosing',
          updatedAt: Date.now()
        });
      }, 3000);
      
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `coupleSpaces/${space.id}/todGameState/default`);
    }
  };

  // Sync spin angle visually based on state
  useEffect(() => {
     if (gameState?.status === 'spinning') {
        const isMe = gameState.currentTurn === userData?.id;
        // If it's me, point DOWN (180deg). If partner, point UP (0deg).
        // Add random full rotations to make it spin long
        const extraRotations = 360 * 5;
        const targetAngle = isMe ? 180 : 0;
        setSpinDeg(prev => prev + extraRotations + (targetAngle - (prev % 360)));
     }
  }, [gameState?.status, gameState?.currentTurn, userData?.id]);

  const handleChoice = async (choice: 'truth' | 'dare') => {
    if (!docRef) return;
    try {
      await updateDoc(docRef, {
        status: 'asking',
        selectedChoice: choice,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAsk = async (text: string, isAuto: boolean = false) => {
    if (!docRef) return;
    setIsGenerating(true);
    let question = text;
    
    if (isAuto) {
      try {
        const prompt = `Generate a ${gameState?.selectedChoice} for a couple. 
        Theme: ${getRandom(['Romantic', 'Funny', 'Deep', 'Spicy'])}
        Relationship Context: They have shared ${space?.xp || 0} moments of growth.
        Output just the prompt text. NO quotes.`;
        question = await generateAIResponse([
          { role: 'system', content: "You are Relationship Guardian AIRA." },
          { role: 'user', content: prompt }
        ], { model: AI_MODELS.romantic });
      } catch (err) {
        console.error("AI generation failed", err);
      }
    }

    try {
      await updateDoc(docRef, {
        status: 'completing',
        questionOrDare: question.trim(),
        updatedAt: Date.now()
      });
      setCustomInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async () => {
    if (!docRef || !userData?.id) return;
    
    const points = gameState?.selectedChoice === 'dare' ? 10 : 5;
    const currentScore = gameState?.scores?.[userData.id] || 0;
    
    try {
      await updateDoc(docRef, {
        status: 'result',
        [`scores.${userData.id}`]: currentScore + points,
        mediaUrl: mediaPreview || '',
        updatedAt: Date.now()
      });
      setTimeout(() => {
         updateDoc(docRef, { status: 'waiting' });
      }, 5000);
      setMediaPreview(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Convert image to base64 for quick preview / dummy storage
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
         const img = new Image();
         img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            setMediaPreview(dataUrl);
         };
         img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  if (!gameState) {
    return <div className="h-screen bg-rose-50 flex items-center justify-center p-6"><AlertCircle className="w-8 h-8 text-rose-500 animate-pulse" /></div>;
  }

  // Waiting Screen
  if (!bothOnline) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-b from-rose-100 to-rose-50 relative pb-20 justify-center items-center p-6 text-center">
        <div className="absolute top-6 left-6 z-50">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="p-2 bg-white rounded-full shadow-md text-rose-500 hover:bg-rose-50 hover:scale-105 transition-all border border-rose-100 flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-rose-500" />
          </button>
        </div>
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 relative overflow-hidden">
           <Wine className="w-12 h-12 text-rose-300 opacity-50" />
           <div className="absolute bottom-0 w-full bg-rose-500 animate-pulse h-2" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-rose-950 mb-2">Waiting for Partner...</h2>
        <p className="text-rose-600 mb-8">Both of you need to be here to play Truth or Dare!</p>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-sm font-medium text-rose-700">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
          Ask {partnerData?.displayName || 'your partner'} to open the game
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-b from-purple-900 via-rose-900 to-rose-950 text-white relative pb-16">
      <div className="absolute top-6 left-6 z-50">
        <button 
          type="button"
          onClick={() => navigate(-1)} 
          className="p-2 bg-white/10 backdrop-blur-md rounded-full shadow-md text-white hover:bg-white/20 hover:scale-105 transition-all border border-white/20 flex-shrink-0 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      
      {/* Top Player (Partner) */}
      <div className="absolute top-8 left-0 w-full text-center z-10 flex flex-col items-center">
         <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-lg">
           <p className="text-sm font-medium opacity-80 mb-0.5">Partner</p>
           <h3 className="text-lg font-bold">
             {partnerData?.displayName || 'Partner'}
             <span className="ml-2 text-yellow-300 font-mono text-sm max-w-fit px-2 bg-black/20 rounded-full">
               ⭐ {gameState.scores?.[partnerData?.id || ''] || 0}
             </span>
           </h3>
         </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex items-center justify-center relative p-8">
         <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="w-[80vw] h-[80vw] rounded-full border-4 border-dashed border-white animate-[spin_60s_linear_infinite]" />
         </div>

         {/* The Bottle Area */}
         <AnimatePresence mode="wait">
            {gameState.status === 'waiting' || gameState.status === 'spinning' ? (
              <motion.div 
                key="bottle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative z-20 flex flex-col items-center"
              >
                 <motion.div 
                   animate={{ rotate: spinDeg }}
                   transition={{ type: "spring", stiffness: 40, damping: 20, mass: 2 }}
                   className="w-32 h-64 flex items-center justify-center relative drop-shadow-2xl"
                 >
                    {/* Visual Bottle - simplified for pure CSS/HTML */}
                    <div className="w-8 h-32 bg-green-800/80 backdrop-blur-sm rounded-t-xl absolute top-0 border-x border-t border-green-400/50 shadow-inner" />
                    <div className="w-24 h-40 bg-green-700/90 backdrop-blur-sm rounded-3xl absolute bottom-0 border border-green-400/50 flex flex-col items-center justify-center shadow-inner overflow-hidden">
                      <div className="w-full h-full absolute inset-0 bg-gradient-to-tr from-green-900 to-transparent opacity-50" />
                      <div className="w-16 h-20 border-2 border-green-900/30 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-md relative z-10">
                        <Heart className="text-rose-300/50 w-8 h-8" />
                      </div>
                    </div>
                 </motion.div>

                 {gameState.status === 'waiting' && (
                    <motion.button
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      onClick={handleSpin}
                      className="mt-12 bg-white text-rose-600 font-bold px-8 py-4 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all outline-none border-2 border-rose-100 flex items-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" /> Spin Bottle
                    </motion.button>
                 )}
              </motion.div>
            ) : (
              <motion.div 
                key="action-panel"
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-[2rem] p-8 border border-white/20 shadow-2xl relative z-30"
              >
                  {/* Phase 1: Choosing Truth or Dare */}
                  {gameState.status === 'choosing' && (
                    <div className="text-center">
                       {isMyTurn ? (
                         <>
                           <h2 className="text-2xl font-bold mb-6">Your Turn!</h2>
                           <p className="text-white/70 mb-8">Make your choice...</p>
                           <div className="grid grid-cols-2 gap-4">
                             <button onClick={() => handleChoice('truth')} className="bg-blue-500/80 hover:bg-blue-500 text-white font-bold py-6 rounded-2xl flex flex-col items-center gap-2 transition-colors border border-blue-400/50">
                               <span className="text-3xl">🧩</span> Truth
                             </button>
                             <button onClick={() => handleChoice('dare')} className="bg-rose-500/80 hover:bg-rose-500 text-white font-bold py-6 rounded-2xl flex flex-col items-center gap-2 transition-colors border border-rose-400/50">
                               <span className="text-3xl">🔥</span> Dare
                             </button>
                           </div>
                         </>
                       ) : (
                         <div className="py-8">
                           <RefreshCw className="w-12 h-12 text-white/50 animate-spin mx-auto mb-4" />
                           <h2 className="text-xl font-bold">Waiting for {partnerData?.displayName}...</h2>
                           <p className="text-white/70">They are choosing Truth or Dare</p>
                         </div>
                       )}
                    </div>
                  )}

                  {/* Phase 2: Asking */}
                  {gameState.status === 'asking' && (
                    <div className="text-center">
                       {!isMyTurn ? (
                         <>
                           <h2 className="text-2xl font-bold mb-2">They chose {gameState.selectedChoice?.toUpperCase()}!</h2>
                           <p className="text-white/70 mb-6">What do you want them to do?</p>
                           
                           <button 
                             onClick={() => handleAsk('', true)}
                             disabled={isGenerating}
                             className="w-full bg-white/20 hover:bg-white/30 py-3 rounded-xl mb-4 text-sm font-medium transition-colors backdrop-blur-md flex items-center justify-center gap-2"
                           >
                             {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-rose-300" />}
                             AIRA AI {gameState.selectedChoice} ✨
                           </button>
                           
                           <div className="flex flex-col gap-2">
                             <textarea 
                               value={customInput}
                               onChange={(e) => setCustomInput(e.target.value)}
                               placeholder={`Type a custom ${gameState.selectedChoice}...`}
                               className="w-full bg-black/20 border border-white/20 rounded-xl p-4 text-white placeholder:text-white/40 resize-none h-24 outline-none focus:border-white/50"
                             />
                             <button 
                               onClick={() => handleAsk(customInput)}
                               disabled={!customInput.trim() || isGenerating}
                               className="w-full bg-white text-rose-900 font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                             >
                               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send " + gameState.selectedChoice}
                               <ArrowRight className="w-4 h-4" />
                             </button>
                           </div>
                         </>
                       ) : (
                         <div className="py-8">
                           <RefreshCw className="w-12 h-12 text-white/50 animate-spin mx-auto mb-4" />
                           <h2 className="text-xl font-bold">{partnerData?.displayName} is thinking...</h2>
                           <p className="text-white/70">Get ready for your {gameState.selectedChoice}!</p>
                         </div>
                       )}
                    </div>
                  )}

                  {/* Phase 3: Completing */}
                  {gameState.status === 'completing' && (
                    <div className="text-center">
                       {isMyTurn ? (
                         <>
                           <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
                             Your {gameState.selectedChoice}
                           </span>
                           <h2 className="text-2xl font-bold mb-8 italic">"{gameState.questionOrDare}"</h2>
                           
                           {gameState.selectedChoice === 'dare' && (
                             <div className="mb-6 relative">
                               {mediaPreview ? (
                                  <div className="relative rounded-xl overflow-hidden mb-2">
                                    <img src={mediaPreview} alt="Proof" className="w-full h-48 object-cover" />
                                    <button onClick={() => setMediaPreview(null)} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white"><X className="w-4 h-4"/></button>
                                  </div>
                               ) : (
                                  <label className="w-full border-2 border-dashed border-white/30 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                    <Camera className="w-8 h-8 text-white/50 mb-2" />
                                    <span className="text-sm font-medium text-white/80">Upload Photo Proof (Optional)</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                  </label>
                               )}
                             </div>
                           )}

                           <button 
                             onClick={handleComplete}
                             className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg transition-colors border border-green-300"
                           >
                             <CheckCircle className="w-5 h-5" /> I Did It! (+{gameState.selectedChoice === 'dare' ? 10 : 5} pts)
                           </button>
                         </>
                       ) : (
                         <div className="py-8">
                           <h2 className="text-xl font-bold mb-2">They are doing it!</h2>
                           <p className="text-white/70 italic bg-black/20 p-4 rounded-xl border border-white/10 mb-4">"{gameState.questionOrDare}"</p>
                           <p className="text-sm text-rose-300 animate-pulse">Waiting for them to finish...</p>
                         </div>
                       )}
                    </div>
                  )}

                  {/* Phase 4: Result */}
                  {gameState.status === 'result' && (
                    <div className="text-center py-6">
                       <AnimatePresence>
                         <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6 pointer-events-none">
                           <div className="text-6xl mb-2">🎉</div>
                           <h2 className="text-2xl font-bold">Challenge Completed!</h2>
                         </motion.div>
                       </AnimatePresence>
                       
                       {gameState.mediaUrl && (
                         <div className="rounded-xl overflow-hidden mb-6 border border-white/20 shadow-xl max-h-64 object-cover">
                           <img src={gameState.mediaUrl} alt="Dare Proof" className="w-full h-full object-cover" />
                         </div>
                       )}

                       <p className="text-white/70">
                         {gameState.currentTurn === userData?.id ? "You" : partnerData?.displayName} earned pts!
                       </p>
                    </div>
                  )}

              </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Bottom Player (Me) */}
      <div className="absolute bottom-24 left-0 w-full text-center z-10 flex flex-col items-center">
         <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-lg">
           <h3 className="text-lg font-bold">
             You
             <span className="ml-2 text-yellow-300 font-mono text-sm max-w-fit px-2 bg-black/20 rounded-full">
               ⭐ {gameState.scores?.[userData.id] || 0}
             </span>
           </h3>
         </div>
      </div>

      <BottomNav />
    </div>
  );
}
