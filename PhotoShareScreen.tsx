import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Image as ImageIcon, Send, Sparkles, Heart, Flame, Smile } from 'lucide-react';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export function PhotoShareScreen() {
  const navigate = useNavigate();
  const { space, partnerData } = useCoupleSpace();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [partnerImage, setPartnerImage] = useState<string | null>(null);
  const [partnerBlur, setPartnerBlur] = useState(true);
  const [reactions, setReactions] = useState<{ id: string, emoji: string, left: number }[]>([]);

  useEffect(() => {
    if (!space?.id) return;
    const syncRef = doc(db, 'coupleSpaces', space.id, 'photoSync', 'latest');
    
    const unsubscribe = onSnapshot(syncRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.senderId !== user?.uid && data.image) {
          setPartnerImage(data.image);
          setPartnerBlur(true); // Automatically blur new incoming images
        }
        if (data.reaction && data.reactionTimestamp > (window as any).lastReactionTime) {
           showFlyingReaction(data.reaction);
           (window as any).lastReactionTime = data.reactionTimestamp;
        }
      }
    });

    (window as any).lastReactionTime = Date.now();
    return () => unsubscribe();
  }, [space?.id, user?.uid]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      sendImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const sendImage = async (base64: string) => {
    if (!space?.id || !user?.uid) return;
    const syncRef = doc(db, 'coupleSpaces', space.id, 'photoSync', 'latest');
    
    // Convert to smaller quality before upload (simulated via canvas locally normally)
    // In a prod app, we'd use Firebase Storage. For real-time demo, we use Firestore Data URI.
    await setDoc(syncRef, {
      image: base64,
      senderId: user.uid,
      timestamp: Date.now()
    }, { merge: true });
    
    // We can also trigger a notification or memory creation here.
  };

  const sendReaction = async (emoji: string) => {
    if (!space?.id) return;
    const syncRef = doc(db, 'coupleSpaces', space.id, 'photoSync', 'latest');
    await setDoc(syncRef, {
      reaction: emoji,
      reactionTimestamp: Date.now()
    }, { merge: true });
    showFlyingReaction(emoji);
  };

  const showFlyingReaction = (emoji: string) => {
    const newReaction = { id: Date.now().toString(), emoji, left: Math.random() * 80 + 10 };
    setReactions(prev => [...prev, newReaction]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 2000);
  };

  return (
    <div className="h-full min-h-screen bg-teal-50 flex flex-col relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-200/40 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-200/40 blur-[100px] rounded-full pointer-events-none" />

      {/* Floating Reactions */}
      {reactions.map(r => (
        <div 
          key={r.id} 
          className="absolute bottom-40 text-5xl animate-bounce pointer-events-none z-50 transition-all duration-1000 ease-out transform -translate-y-64 opacity-0"
          style={{ left: `${r.left}%` }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Top Bar */}
      <div className="glass-card flex items-center justify-between p-4 m-4 z-10 sticky top-4 border-teal-100">
        <button onClick={() => navigate(-1)} className="p-2 text-teal-600 hover:bg-teal-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="font-bold text-lg text-slate-800">Live Photo 📸</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-teal-200" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6 z-10 w-full max-w-md mx-auto">
         {/* Incoming Partner Photo */}
         {partnerImage && (
            <div className="w-full flex flex-col items-center gap-4">
               <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full backdrop-blur-md shadow-sm border border-white">
                  <span className="w-2 h-2 rounded-full bg-love-400 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-700">Sent Just Now by {partnerData?.displayName || 'Partner'} 💌</p>
               </div>
               
               <div 
                 onClick={() => setPartnerBlur(false)}
                 className={`w-full aspect-[4/5] rounded-3xl overflow-hidden glass-card shadow-lg relative cursor-pointer transition-all duration-500 border border-white/80 ${partnerBlur ? 'scale-[0.98]' : 'scale-100'}`}
               >
                  <img 
                    src={partnerImage} 
                    alt="Incoming" 
                    className={`w-full h-full object-cover transition-all duration-700 ${partnerBlur ? 'blur-2xl scale-110 opacity-70' : 'blur-0 scale-100 opacity-100'}`}
                  />
                  {partnerBlur && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <p className="px-6 py-3 bg-white/80 backdrop-blur-md text-slate-800 font-bold rounded-full shadow-lg">Tap to reveal 💕</p>
                    </div>
                  )}
               </div>

               {/* Reactions */}
               {!partnerBlur && (
                 <div className="flex items-center justify-center gap-4 p-3 bg-white/60 backdrop-blur-xl rounded-full shadow-sm w-full border border-white/50">
                    <button onClick={() => sendReaction('❤️')} className="p-2 hover:scale-125 transition-transform text-2xl">❤️</button>
                    <button onClick={() => sendReaction('😍')} className="p-2 hover:scale-125 transition-transform text-2xl">😍</button>
                    <button onClick={() => sendReaction('🔥')} className="p-2 hover:scale-125 transition-transform text-2xl">🔥</button>
                    <button onClick={() => sendReaction('😘')} className="p-2 hover:scale-125 transition-transform text-2xl">😘</button>
                    <div className="w-px h-8 bg-slate-200 mx-2" />
                    <button className="flex items-center gap-1 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors">
                       Reply <Send className="w-4 h-4 ml-1" />
                    </button>
                 </div>
               )}
            </div>
         )}

         {/* If no incoming photo */}
         {!partnerImage && (
           <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-center glass-card rounded-3xl mb-4 border border-teal-100">
             <div className="w-20 h-20 bg-teal-100 text-teal-500 rounded-full flex items-center justify-center mb-6">
               <Camera className="w-10 h-10" />
             </div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">Share a moment</h2>
             <p className="text-slate-500 leading-relaxed text-sm">
                Send a quick live photo to {partnerData?.displayName || 'your partner'}. It will pop up right here!
             </p>
           </div>
         )}
      </div>

      {/* Upload Bottom Action */}
      <div className="p-6 z-10 w-full mt-auto">
         <div className="glass-card p-2 rounded-2xl flex items-center gap-2 bg-white/80 shadow-lg border-teal-100">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              // capture="environment"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              <Camera className="w-6 h-6" />
              <span>Capture Photo</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-xl font-medium transition-colors"
            >
               <ImageIcon className="w-6 h-6" />
            </button>
         </div>
      </div>
    </div>
  );
}
