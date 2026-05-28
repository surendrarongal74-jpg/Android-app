import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { db, storage } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { Camera, Calendar, PlayCircle, Sparkles, X, Share, Download, Repeat, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { triggerHapticFeedback } from '../lib/haptics';

const DB_NAME = 'MemoriesStore';
const DB_VERSION = 1;
const STORE_NAME = 'media';

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function MemoriesScreen() {
  const navigate = useNavigate();
  const { space, partnerData, addXp } = useCoupleSpace();
  const { userData } = useAuth();
  const { sendNotification } = useNotifications();
  const [memories, setMemories] = useState<any[]>([]);
  const [localMedia, setLocalMedia] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isPlayingStory, setIsPlayingStory] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);

  const loadLocalMedia = async () => {
    if (!space?.id) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const spaceMedia = req.result.filter(item => item.spaceId === space.id);
        spaceMedia.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLocalMedia(spaceMedia);
      };
    } catch (e) {
      console.error('Error loading local media', e);
    }
  };

  useEffect(() => {
    loadLocalMedia();
  }, [space?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !space?.id || !userData?.id) return;
    const file = e.target.files[0];
    
    setIsGeneratingStory(true); // Show a loader
    setStoryProgress(10);

    try {
      // 1. Upload to Storage
      const storageRef = ref(storage, `coupleSpaces/${space.id}/memories/${Date.now()}_${file.name}`);
      setStoryProgress(30);
      await uploadBytes(storageRef, file);
      setStoryProgress(60);
      const url = await getDownloadURL(storageRef);
      setStoryProgress(80);

      // 2. Generate AI Caption (Optional: based on mood or generic romantic)
      let aiCaption = "";
      try {
        const { generateAIResponse, AI_MODELS } = await import('../lib/ai');
        aiCaption = await generateAIResponse([
          { role: 'system', content: "You are AIRA, a romantic AI assistant." },
          { role: 'user', content: `Generate a short, very romantic, and poetic caption (one sentence) for a photo shared between a couple. Vibe: ${space?.xp ? 'Deeply connected' : 'New love'}. No hashtags, just pure emotion.` }
        ], { model: AI_MODELS.romantic });
      } catch (err) {
        console.warn("AI caption failed", err);
      }

      const memoryData = {
        coupleSpaceId: space.id,
        creatorId: userData.id,
        type: file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'other'),
        url: url,
        date: new Date().toISOString(),
        caption: aiCaption.replace(/"/g, '').trim(),
        fileName: file.name
      };

      await addDoc(collection(db, `coupleSpaces/${space.id}/memories`), memoryData);
      addXp(20); // Significant reward for saving a memory
      
      // Notify partner
      if (partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'memory',
          title: 'New Memory! 📸',
          body: `${userData.displayName || 'Partner'} shared a moment.`,
          priority: 'medium',
          data: { type: memoryData.type }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupleSpaces/${space.id}/memories`);
    } finally {
      setIsGeneratingStory(false);
      setStoryProgress(0);
    }
  };

  useEffect(() => {
    if (!space?.id) return;
    
    const q = query(
      collection(db, `coupleSpaces/${space.id}/memories`),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allMemories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setMemories(allMemories.filter(m => 
        m.type !== 'daily_note' && 
        m.type !== 'surprise' && 
        m.type !== 'call_signaling' &&
        m.type !== 'call_signaling_answer'
      ));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, `coupleSpaces/${space.id}/memories`);
    });

    return () => unsubscribe();
  }, [space?.id]);

  const imagesOnly = memories.filter(m => m.type === 'image');

  // Handle Play Story Logic
  const handlePlayStory = () => {
    if (imagesOnly.length === 0) return;
    setIsGeneratingStory(true);
    setStoryProgress(0);
    // Fake generation progress
    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGeneratingStory(false);
            setCurrentImageIndex(0);
            setIsPlayingStory(true);
          }, 800);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Slideshow Logic
  useEffect(() => {
     let interval: any;
     if (isPlayingStory && imagesOnly.length > 0) {
         interval = setInterval(() => {
             setCurrentImageIndex(prev => {
               if (prev + 1 >= imagesOnly.length) {
                 clearInterval(interval);
                 setIsPlayingStory(false);
                 return prev;
               }
               return prev + 1;
             });
         }, 3500);
     }
     return () => clearInterval(interval);
  }, [isPlayingStory, imagesOnly.length]);

  return (
    <div className="flex flex-col h-screen bg-transparent relative pb-20 overflow-hidden font-sans">
      
      {/* Dynamic Background Clouds */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-gradient-to-b from-sky-50 via-white to-love-50" />
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-love-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[300px] h-[300px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none" />
      
      {/* 5. VIDEO GENERATION SCREEN overlay */}
      <AnimatePresence>
        {isGeneratingStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-white/70 backdrop-blur-2xl flex flex-col items-center justify-center px-8"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="bg-white/90 shadow-[0_10px_40px_rgba(255,193,204,0.4)] border border-love-100 rounded-[2rem] p-8 w-full max-w-sm text-center relative overflow-hidden"
            >
              <Sparkles className="w-10 h-10 text-love-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-xl font-serif text-slate-800 font-bold mb-2">Creating your love story... 💭</h2>
              <p className="text-sm text-slate-500 mb-8 italic">Weaving moments together</p>

              <div className="w-full bg-love-50 h-3 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-love-300 to-love-400 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${storyProgress}%` }}
                />
              </div>

              {/* Floating Sparkles inside loading card */}
              <motion.div animate={{ opacity: [0, 1, 0], scale: [0.8, 1.5, 0.8] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-4 right-4"><Sparkles className="w-4 h-4 text-yellow-300"/></motion.div>
              <motion.div animate={{ opacity: [0, 1, 0], scale: [0.8, 1.5, 0.8] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }} className="absolute bottom-4 left-4"><Sparkles className="w-4 h-4 text-yellow-300"/></motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. FINAL MEMORY SCREEN overlay */}
      <AnimatePresence>
        {isPlayingStory && imagesOnly.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col justify-center items-center"
          >
             {/* Soft pink glow background */}
             <div className="absolute inset-0 bg-radial-gradient from-love-50 to-white/50 z-0 pointer-events-none" />
             
             <button 
               onClick={() => setIsPlayingStory(false)}
               className="absolute top-10 right-6 z-50 text-slate-400 hover:text-slate-700 bg-white/50 p-2 rounded-full backdrop-blur-md shadow-sm"
             >
               <X className="w-6 h-6" />
             </button>

             <motion.div 
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="w-full max-w-sm aspect-[4/5] relative z-10 px-6"
             >
                <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(255,193,204,0.5)] border-4 border-white relative">
                  <img 
                    src={imagesOnly[currentImageIndex].url} 
                    className="w-full h-full object-cover"
                  />
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  
                  <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                     <motion.p 
                        key={`text-${currentImageIndex}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-white text-lg font-serif italic drop-shadow-md"
                     >
                        {format(new Date(imagesOnly[currentImageIndex].date), 'MMMM d, yyyy')}
                     </motion.p>
                  </div>
                </div>
             </motion.div>

             {/* Action Buttons (Pastel Glowing) */}
             <div className="absolute bottom-12 flex gap-6 z-20">
                <button 
                  onClick={async () => {
                    const currentMemory = imagesOnly[currentImageIndex];
                    if (currentMemory) {
                      triggerHapticFeedback('medium');
                      const shareData = {
                        title: 'Our Sweet Memory ❤️',
                        text: `Check out this memory from our Love Link journey!`,
                        url: currentMemory.url
                      };
                      if (navigator.share) {
                        try { await navigator.share(shareData); } catch (e) {}
                      } else {
                        navigator.clipboard.writeText(`Our Love Link Memory: ${currentMemory.url}`);
                        alert("Link copied!");
                      }
                    }
                  }}
                  className="w-14 h-14 bg-white rounded-full shadow-[0_10px_20px_rgba(255,193,204,0.4)] flex items-center justify-center text-love-400 hover:scale-105 active:scale-95 transition-all outline outline-2 outline-love-50"
                >
                   <Share className="w-6 h-6 fill-current opacity-20" />
                </button>
                <button onClick={() => { setIsPlayingStory(false); setTimeout(handlePlayStory, 500); }} className="w-16 h-16 bg-gradient-to-tr from-love-400 to-love-300 rounded-full shadow-[0_10px_30px_rgba(255,193,204,0.6)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all outline outline-4 outline-white">
                   <Repeat className="w-7 h-7" />
                </button>
                <button className="w-14 h-14 bg-white rounded-full shadow-[0_10px_20px_rgba(255,193,204,0.4)] flex items-center justify-center text-love-400 hover:scale-105 active:scale-95 transition-all outline outline-2 outline-love-50">
                   <Download className="w-6 h-6" />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Screen Content */}
      <div className="px-6 py-8 pb-4 z-10 sticky top-0 flex items-center gap-3 bg-white/60 backdrop-blur-3xl shrink-0 border-b border-love-100 shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white rounded-full shadow-sm text-rose-500 hover:bg-rose-50 transition-colors border border-rose-100 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-rose-500" />
        </button>
        <h1 className="text-2xl font-serif font-bold text-slate-800 tracking-tight flex-1">Our Beautiful Memories</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 relative scrollbar-hide">
        {/* Floating background clouds/blobs */}
        <div className="absolute top-10 right-0 w-64 h-64 bg-love-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-40 left-0 w-64 h-64 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />

        {memories.length === 0 && localMedia.length === 0 && (
          <div className="mt-12 glass-card p-10 text-center text-love-400 mx-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-love-50 rounded-full flex items-center justify-center mb-4 shadow-sm border border-white">
              <Calendar className="w-8 h-8 opacity-60 text-love-400" />
            </div>
            <p className="font-serif font-bold text-lg text-slate-700">No memories yet</p>
            <p className="text-sm mt-2 font-medium text-slate-500">Capture your first heavenly moment.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 pb-24 px-2">
          {memories.map((media, i) => {
            const url = media.url;
            const rotation = i % 2 === 0 ? 'rotate-[-3deg]' : 'rotate-[4deg]';
            const offset = i % 2 === 0 ? '-translate-y-2' : 'translate-y-2';
            return (
              <motion.div 
                key={media.id || i} 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                className={`relative group bg-white p-3 pb-8 rounded-sm shadow-[0_15px_35px_rgba(255,193,204,0.4)] ${rotation} ${offset}`}
              >
                {media.type === 'image' && (
                   <img src={url} alt="Memory" className="w-full aspect-square object-cover rounded-sm bg-slate-100" />
                )}
                {media.type === 'video' && (
                   <div className="w-full aspect-square bg-slate-800 rounded-sm flex items-center justify-center relative group">
                      <PlayCircle className="w-10 h-10 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                   </div>
                )}
                {/* Polaroid clip placeholder */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-8 h-4 bg-white/40 backdrop-blur-md rounded-full shadow-sm border border-black/5" />
                <div className="absolute bottom-1 px-4 w-full text-center left-0 space-y-0.5">
                  <p className="text-[11px] font-medium text-slate-500 font-serif opacity-80 truncate">{media.caption || format(new Date(media.date), 'MMM d, yyyy')}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-24 left-0 right-0 px-6 flex justify-center gap-4 z-30 pointer-events-none">
         {imagesOnly.length > 0 && (
            <motion.button 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={handlePlayStory}
              className="pointer-events-auto bg-gradient-to-r from-love-400 to-love-300 py-3.5 px-6 rounded-full shadow-[0_10px_25px_rgba(255,102,140,0.4)] flex items-center justify-center gap-2 text-white hover:scale-105 active:scale-95 transition-all outline outline-4 outline-white/40 font-semibold text-sm group"
            >
              <Sparkles className="w-4 h-4 group-hover:text-yellow-300 transition-colors" />
              <span>Turn into Love Story</span>
            </motion.button>
         )}
         
         <motion.button 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => fileInputRef.current?.click()}
            className="pointer-events-auto bg-white py-3.5 px-6 rounded-full shadow-[0_10px_25px_rgba(255,193,204,0.4)] flex items-center justify-center gap-2 text-love-500 hover:scale-105 active:scale-95 transition-all border border-love-100 font-semibold text-sm"
         >
            <Camera className="w-5 h-5" />
            <span>Add your memory 📸</span>
         </motion.button>
         
         <input 
           type="file" 
           ref={fileInputRef} 
           className="hidden" 
           accept="image/*,video/*,audio/*"
           onChange={handleFileUpload} 
         />
      </div>

      <BottomNav />
    </div>
  );
}
