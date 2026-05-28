import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Plus, Check, Heart, Sparkles, MapPin, Plane, 
  Gift, Trash2, Search, Sliders, Play, Pause, Music, 
  Video, Mic, FileText, Lock, Unlock, Calendar, Compass, 
  Map, Globe, Star, Image as ImageIcon, Send, ArrowRight,
  Sparkle, ShieldCheck, HeartPulse
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, query, onSnapshot, orderBy, 
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { triggerHapticFeedback } from '../lib/haptics';
import confetti from 'canvas-confetti';

// Ambient StarrySky for Space and Cloud modes
function StarrySky({ count = 30 }) {
  const [stars, setStars] = useState<any[]>([]);
  useEffect(() => {
    const s = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 3,
    }));
    setStars(s);
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white opacity-40 shadow-sm"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))'
          }}
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.3, 0.9, 0.3],
          }}
          transition={{
            type: "tween",
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

// Interactive SVG World/Relationship Globe Map Component
function InteractiveGlobe({ dreams, onPinClick }: { dreams: any[]; onPinClick: (dream: any) => void }) {
  const tripDreams = dreams.filter(d => d.type === 'trip' || d.category === 'Trips');

  // Interactive mockup map projection coordinates
  const projectionPins = [
    { label: "Kyoto, Japan 🌸", x: 74, y: 38 },
    { label: "Paris, France 🗼", x: 42, y: 28 },
    { label: "Santorini, Greece 🇬🇷", x: 46, y: 35 },
    { label: "Bali, Indonesia 🌴", x: 71, y: 64 },
    { label: "New York, USA 🗽", x: 22, y: 32 },
    { label: "Swiss Alps, Switzerland 🏔️", x: 41, y: 30 },
    { label: "Maldives 🐠", x: 62, y: 55 },
    { label: "Venice, Italy 🛶", x: 43, y: 32 }
  ];

  return (
    <div className="relative w-full aspect-[2/1] bg-slate-950/40 rounded-3xl p-4 border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden group">
      <StarrySky count={15} />
      <div className="absolute top-4 left-4 z-10">
        <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 animate-spin-slow" /> Interactive Dream Globe
        </h4>
        <p className="text-[10px] text-slate-400">Glow keys: Purple = Plan | Pink = Dream | Gold = Achieved</p>
      </div>

      {/* Styled stylized minimalist world vector */}
      <svg viewBox="0 0 200 100" className="w-full h-full opacity-35 select-none">
        {/* Europe / Africa Outline */}
        <path d="M40 20 C42 15 48 18 45 25 C47 28 41 33 43 40 C44 45 42 55 46 60 C48 65 44 80 40 85 C38 80 37 68 35 60 C32 50 35 40 33 30 Z" fill="#475569" stroke="#64748b" strokeWidth="0.5" />
        {/* Americas Outline */}
        <path d="M10 20 C15 15 25 10 28 18 C30 25 22 35 25 45 C28 55 24 65 26 75 C23 85 18 90 15 85 C14 75 16 68 12 55 C8 45 6 35 8 25 Z" fill="#475569" stroke="#64748b" strokeWidth="0.5" />
        {/* Asia / Australia Outline */}
        <path d="M60 20 C70 12 90 15 88 30 C85 35 88 43 85 50 C80 57 78 63 81 70 C83 75 80 85 75 80 C72 70 70 60 68 50 C65 40 62 30 60 20 Z" fill="#475569" stroke="#64748b" strokeWidth="0.5" />
        <circle cx="78" cy="72" r="6" fill="#475569" stroke="#64748b" strokeWidth="0.5" />
      </svg>

      {/* Interactive Glowing Trip Pins */}
      {projectionPins.map((pin, i) => {
        // Match existing user dreams to this coordinate
        const matchedDream = tripDreams.find(d => d.title.toLowerCase().includes(pin.label.split(',')[0].toLowerCase()));
        const isMatched = !!matchedDream;
        const stateColor = matchedDream?.completed 
          ? 'bg-amber-400 shadow-amber-400' 
          : (matchedDream ? 'bg-purple-500 shadow-purple-500' : 'bg-pink-400 shadow-pink-400');

        return (
          <div
            key={i}
            onClick={() => {
              triggerHapticFeedback('light');
              onPinClick(matchedDream || { title: `Let's add ${pin.label} to Our Dreams!`, type: 'trip', category: 'Trips', id: 'suggested' });
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group/pin"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            {/* Pulsing visual halo */}
            <span className={`absolute inline-flex h-4 w-4 rounded-full opacity-60 animate-ping ${stateColor}`} />
            <div className={`relative w-2.5 h-2.5 rounded-full border border-white ${stateColor} transition-transform hover:scale-150 shadow-[0_0_12px_var(--tw-shadow-color)]`} />

            {/* Float tooltip text */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 scale-0 group-hover/pin:scale-100 transition-transform bg-slate-900 text-white border border-white/10 rounded-lg px-2 py-1 text-[8px] whitespace-nowrap font-black shadow-xl z-20">
              {pin.label} {isMatched ? '❤️' : '✨'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// AI suggestions local generator
const AI_DREAM_IDEAS = [
  { title: "Switzerland Alps Explorer 🏔️", desc: "Cozy firewood cabin & cableway adventure.", tag: "Mountains", icon: "🏔️" },
  { title: "Kyoto Traditional Tea Ceremony 🍵", desc: "Wander together under sunset cherry blossoms.", tag: "Culture", icon: "🌸" },
  { title: "Santorini Cliffside Watch 🌅", desc: "Private candlelit cave pool with views.", tag: "Romantic", icon: "✨" },
  { title: "Underwater Floating Hotel in Maldives 🐠", desc: "Waking up together with oceanic views.", tag: "Luxury", icon: "🏝️" },
  { title: "Learn Paragliding Couples Course 🪂", desc: "Gliding across high cloud valleys.", tag: "Wild Adventure", icon: "🔥" }
];

export function DreamWallScreen() {
  const navigate = useNavigate();
  const { space, addXp } = useCoupleSpace();
  const { userData } = useAuth();
  const [dreams, setDreams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [wallMode, setWallMode] = useState<'cloud' | 'pinterest' | 'universe'>('universe');
  const [isAdding, setIsAdding] = useState(false);
  const [newDream, setNewDream] = useState<any>({
    title: '',
    category: 'Goals',
    type: 'note', // note, photo, video, voice, trip, song
    description: '',
    imageUrl: '',
    videoUrl: '',
    audioUrl: '',
    isSecret: false,
    unlockDate: '',
    plannedCost: '',
  });
  
  // Simulated Voice Record States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);

  // Comments mapping local thread
  const [commentsThread, setCommentsThread] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!space?.id) return;
    const q = query(collection(db, `coupleSpaces/${space.id}/dreams`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setDreams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [space?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !newDream.title.trim()) return;

    try {
      const payload: any = {
        title: newDream.title.trim(),
        category: newDream.category,
        type: newDream.type,
        completed: false,
        createdAt: Date.now(),
        creatorId: userData?.id || '',
        creatorName: userData?.displayName || 'Partner',
        isSecret: newDream.isSecret,
        reactions: {},
        comments: [],
        promises: []
      };

      if (newDream.type === 'photo') {
        payload.imageUrl = newDream.imageUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800';
      } else if (newDream.type === 'video') {
        payload.videoUrl = newDream.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-holding-hands-of-a-loved-one-41974-large.mp4';
      } else if (newDream.type === 'voice') {
        payload.audioUrl = recordedBlobUrl || 'simulated_voice_clip';
      } else if (newDream.type === 'trip') {
        payload.plannedCost = newDream.plannedCost || '$1500';
      }

      if (newDream.isSecret && newDream.unlockDate) {
        payload.unlockAt = new Date(newDream.unlockDate).getTime();
      }

      await addDoc(collection(db, `coupleSpaces/${space.id}/dreams`), payload);
      
      triggerHapticFeedback('heavy');
      confetti({ particleCount: 50, spread: 60, colors: ['#f43f5e', '#a855f7'] });
      
      setIsAdding(false);
      setNewDream({
        title: '',
        category: 'Goals',
        type: 'note',
        description: '',
        imageUrl: '',
        videoUrl: '',
        audioUrl: '',
        isSecret: false,
        unlockDate: '',
        plannedCost: '',
      });
      setRecordedBlobUrl(null);
      addXp(15);
    } catch (e) {
      console.error("Dream creation error:", e);
    }
  };

  const handleSimulateRecord = () => {
    setIsRecording(true);
    triggerHapticFeedback('light');
    setTimeout(() => {
      setIsRecording(false);
      setRecordedBlobUrl("simulated_clip_url");
      triggerHapticFeedback('medium');
    }, 2500);
  };

  const toggleDreamCompletion = async (dreamId: string, completed: boolean) => {
    if (!space?.id) return;
    triggerHapticFeedback(completed ? 'light' : 'heavy');
    
    if (!completed) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#f43f5e']
      });
    }

    await updateDoc(doc(db, `coupleSpaces/${space.id}/dreams`, dreamId), { completed: !completed });
    if (!completed) {
      addXp(30); // Higher award for actual shared goal realization!
    }
  };

  const deleteDream = async (dreamId: string) => {
    if (!space?.id) return;
    triggerHapticFeedback('medium');
    await deleteDoc(doc(db, `coupleSpaces/${space.id}/dreams`, dreamId));
  };

  const addReaction = async (dreamId: string, emoji: string) => {
    if (!space?.id || !userData?.id) return;
    triggerHapticFeedback('light');
    const dreamRef = doc(db, `coupleSpaces/${space.id}/dreams`, dreamId);
    
    const targetDream = dreams.find(d => d.id === dreamId);
    if (!targetDream) return;

    const currentReactions = targetDream.reactions || {};
    const userReacted = currentReactions[emoji]?.includes(userData.id);

    if (userReacted) {
      // Remove
      await updateDoc(dreamRef, {
        [`reactions.${emoji}`]: arrayRemove(userData.id)
      });
    } else {
      // Add
      await updateDoc(dreamRef, {
        [`reactions.${emoji}`]: arrayUnion(userData.id)
      });
      // Splendid small visual burst
      confetti({ particleCount: 15, angle: 60, spread: 55, origin: { x: Math.random(), y: Math.random() } });
    }
  };

  const toggleGildedPromise = async (dreamId: string, promiseText: string) => {
    if (!space?.id || !userData?.id) return;
    triggerHapticFeedback('medium');
    const dreamRef = doc(db, `coupleSpaces/${space.id}/dreams`, dreamId);
    const targetDream = dreams.find(d => d.id === dreamId);
    if (!targetDream) return;

    const currentPromises = targetDream.promises || [];
    const hasPromise = currentPromises.includes(promiseText);

    if (hasPromise) {
      await updateDoc(dreamRef, { promises: arrayRemove(promiseText) });
    } else {
      await updateDoc(dreamRef, { promises: arrayUnion(promiseText) });
      confetti({ particleCount: 30, spread: 40, colors: ['#f59e0b', '#fff'] });
    }
  };

  const submitComment = async (dreamId: string) => {
    const commentText = commentsThread[dreamId]?.trim();
    if (!commentText || !space?.id) return;

    triggerHapticFeedback('light');
    const dreamRef = doc(db, `coupleSpaces/${space.id}/dreams`, dreamId);
    
    const newComment = {
      userId: userData?.id || '',
      userName: userData?.displayName || 'Partner',
      text: commentText,
      timestamp: Date.now()
    };

    await updateDoc(dreamRef, {
      comments: arrayUnion(newComment)
    });

    setCommentsThread(prev => ({ ...prev, [dreamId]: '' }));
  };

  // Math percentage calculations
  const totalDreams = dreams.length;
  const completedCount = dreams.filter(d => d.completed).length;
  const progressPercent = totalDreams > 0 ? Math.round((completedCount / totalDreams) * 100) : 0;

  // Filter list
  const filteredDreams = dreams.filter(dream => {
    const matchesSearch = dream.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (dream.category && dream.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'All' || dream.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    'All', '✈️ Trips', '🏠 Home', '🍽️ Food', '🎯 Goals', 
    '💍 Wedding', '🎵 Music', '🌌 Future', '🛍️ Wishlist', '📸 Memories'
  ];

  return (
    <div className={`flex flex-col min-h-screen font-sans pb-24 transition-colors duration-1000 relative overflow-x-hidden ${
      wallMode === 'universe' ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-rose-50/70 to-purple-100/40 text-slate-800'
    }`}>
      {/* Dynamic Starry backdrop if chosen */}
      {wallMode === 'universe' && <StarrySky count={45} />}

      {/* Styled Top Header */}
      <div className={`px-6 pt-12 pb-6 border-b transition-colors duration-1000 ${
        wallMode === 'universe' ? 'bg-slate-950/80 border-white/10' : 'bg-white/80 border-rose-100/50'
      } sticky top-0 z-50 backdrop-blur-xl flex flex-col gap-4`}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-300/20 text-rose-500">
             <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
             <h1 className="text-2xl font-serif font-black flex items-center justify-center gap-1.5 bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
               ✨ Dream Wall
             </h1>
             <p className={`text-[10px] font-bold ${wallMode === 'universe' ? 'text-slate-400' : 'text-slate-500'}`}>
               Our shared future universe starts here
             </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Wall mode buttons */}
            <div className={`flex rounded-full p-1 border ${
              wallMode === 'universe' ? 'bg-slate-900 border-white/10' : 'bg-rose-50/50 border-rose-100/50'
            }`}>
              <button 
                onClick={() => { setWallMode('universe'); triggerHapticFeedback('light'); }}
                className={`p-1.5 rounded-full transition-all ${wallMode === 'universe' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}
                title="Universe Space Mode"
              >
                <Star size={14} />
              </button>
              <button 
                onClick={() => { setWallMode('pinterest'); triggerHapticFeedback('light'); }}
                className={`p-1.5 rounded-full transition-all ${wallMode === 'pinterest' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}
                title="Pinterest Grid Mode"
              >
                <Sliders size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar + Progress Indicators */}
        <div className="grid grid-cols-[1fr_80px] gap-2 items-center">
          <div className={`flex items-center gap-2 pl-4 pr-2 py-2.5 rounded-full border ${
            wallMode === 'universe' ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white/90 border-rose-100 text-slate-800'
          } shadow-sm`}>
            <Search size={16} className="text-slate-400 shrink-0" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search our future goals..."
              className="w-full text-xs font-bold outline-none border-none placeholder-slate-400"
            />
          </div>

          <div className={`p-2 rounded-2xl border flex flex-col items-center justify-center ${
            wallMode === 'universe' ? 'bg-slate-900/50 border-white/10' : 'bg-white border-rose-100'
          } shadow-sm shrink-0`}>
             <span className="text-xs font-sans font-black text-rose-500">{progressPercent}%</span>
             <span className="text-[7px] font-black uppercase tracking-wider text-slate-400">Progress</span>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-6 px-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); triggerHapticFeedback('light'); }}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                activeCategory === cat 
                  ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20' 
                  : (wallMode === 'universe' ? 'bg-slate-900 border-white/10 hover:border-white/20 text-slate-400' : 'bg-white border-rose-100/50 text-slate-600')
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-8 relative z-10">
        
        {/* World Globe Travel Section (Trips Filter or suggestions) */}
        {(activeCategory === 'All' || activeCategory === '✈️ Trips') && (
          <InteractiveGlobe 
            dreams={dreams} 
            onPinClick={(suggestedDream) => {
              if (suggestedDream.id === 'suggested') {
                setNewDream({
                  title: suggestedDream.title,
                  category: '✈️ Trips',
                  type: 'trip',
                  description: 'Our travel destination pin inside our relationship map!',
                  imageUrl: '',
                  videoUrl: '',
                  audioUrl: '',
                  isSecret: false,
                  unlockDate: '',
                  plannedCost: '$2000'
                });
                setIsAdding(true);
              } else {
                // Focus / Alert details
                confetti({ particleCount: 20, spread: 45 });
              }
            }} 
          />
        )}

        {/* Local Rule-Based Creative Suggestions */}
        {filteredDreams.length < 5 && (
          <div className={`rounded-[2.5rem] p-6 border ${
            wallMode === 'universe' ? 'bg-slate-900/60 border-white/10' : 'bg-white border-rose-200'
          } shadow-xl relative overflow-hidden`}>
            <div className="absolute top-2 right-2 p-2 opacity-5 text-rose-500">
              <Sparkles size={80} fill="currentColor" />
            </div>
            <h3 className="font-serif font-black text-slate-800 text-sm flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" /> Spark Future Inspiration
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Add some recommended premium dream blueprints to your wall:</p>
            
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {AI_DREAM_IDEAS.map((idea, index) => (
                <div 
                  key={index}
                  onClick={() => {
                    triggerHapticFeedback('medium');
                    setNewDream({
                      title: idea.title,
                      category: '🌌 Future',
                      type: 'note',
                      description: idea.desc,
                      imageUrl: '',
                      videoUrl: '',
                      audioUrl: '',
                      isSecret: false,
                      unlockDate: '',
                      plannedCost: ''
                    });
                    setIsAdding(true);
                  }}
                  className={`flex-1 shrink-0 w-44 rounded-2xl p-4 border transition-all cursor-pointer ${
                    wallMode === 'universe' ? 'bg-slate-950/80 border-white/10 hover:border-rose-500/40 text-white' : 'bg-slate-50 border-slate-200 hover:border-rose-200'
                  }`}
                >
                  <div className="text-xl mb-2">{idea.icon}</div>
                  <h4 className="font-bold text-xs line-clamp-1">{idea.title}</h4>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-snug">{idea.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Dream Collection Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`font-serif font-black text-lg ${wallMode === 'universe' ? 'text-rose-300' : 'text-slate-800'}`}>
              Our Future Life Scrapbook
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
               {filteredDreams.length} {filteredDreams.length === 1 ? 'Dream' : 'Dreams'}
            </span>
          </div>

          {filteredDreams.length === 0 ? (
            <div className={`text-center py-20 px-10 border-2 border-dashed rounded-[3rem] ${
              wallMode === 'universe' ? 'border-white/10 bg-slate-900/20' : 'border-rose-200 bg-white/40'
            }`}>
              <Plane size={32} className="text-rose-400 mx-auto mb-4 animate-bounce" />
              <h4 className={`font-bold capitalize ${wallMode === 'universe' ? 'text-white' : 'text-slate-700'}`}>Where does our story go next?</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">There's no dreams pinned under this category. Tap the ➕ button to begin coding the future!</p>
            </div>
          ) : (
            <div className={
              wallMode === 'pinterest' 
                ? 'grid grid-cols-2 gap-4' 
                : 'flex flex-col gap-5'
            }>
              {filteredDreams.map((dream) => {
                const isSecretLocked = dream.isSecret && dream.unlockAt && Date.now() < dream.unlockAt;
                const isCreator = dream.creatorId === userData?.id;

                return (
                  <motion.div
                    key={dream.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-[2.5rem] overflow-hidden border shadow-xl relative transition-all group ${
                      dream.completed 
                        ? 'border-amber-400 bg-gradient-to-br from-amber-500/20 to-yellow-500/10' 
                        : (wallMode === 'universe' ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-white text-slate-800')
                    }`}
                  >
                    {/* Secret overlay screen */}
                    {isSecretLocked && !isCreator ? (
                      <div className="bg-slate-950/90 backdrop-blur-md p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[220px]">
                        <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center text-rose-400 animate-pulse">
                          <Lock size={20} />
                        </div>
                        <div>
                          <h4 className="font-serif font-black text-rose-300">Secret Dream Locked!</h4>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                            Your partner sealed a beautiful heart surprises. It will unlock on {new Date(dream.unlockAt).toLocaleDateString()} ✨
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 space-y-4">
                        {/* Status ribbon for achievements */}
                        {dream.completed && (
                          <div className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider py-1 px-3 rounded-full w-max shadow-sm shadow-amber-500/30">
                            <Sparkle size={10} className="animate-spin-slow" /> Realized Dream Journey
                          </div>
                        )}

                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleDreamCompletion(dream.id, dream.completed)}
                              className={`w-7 h-7 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                dream.completed 
                                  ? 'bg-amber-400 border-amber-500 text-slate-900 shadow-md shadow-amber-400/20' 
                                  : 'border-slate-300 hover:border-rose-400'
                              }`}
                            >
                              {dream.completed && <Check size={14} className="stroke-[3]" />}
                            </button>

                            <div>
                              <h4 className={`font-serif font-black leading-tight ${dream.completed ? 'text-amber-300 line-through' : 'text-lg'}`}>
                                {dream.title}
                              </h4>
                              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-0.5">
                                Add by {isCreator ? 'You' : (dream.creatorName || 'Partner')} • {dream.category}
                              </p>
                            </div>
                          </div>

                          <button 
                            onClick={() => deleteDream(dream.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Secret Tag if sealed */}
                        {dream.isSecret && (
                          <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 py-1 px-3 rounded-full w-max">
                            <Lock size={10} /> Secret Capsule
                          </div>
                        )}

                        {/* Description content */}
                        {dream.description && (
                          <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            {dream.description}
                          </p>
                        )}

                        {/* Interactive conditional card modules */}
                        {dream.type === 'photo' && dream.imageUrl && (
                          <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-100">
                            <img src={dream.imageUrl} alt={dream.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        {dream.type === 'video' && dream.videoUrl && (
                          <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-100 bg-black flex items-center justify-center">
                            <video src={dream.videoUrl} muted autoPlay loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
                            <div className="relative z-10 p-3 rounded-full bg-white/25 backdrop-blur-md text-white border border-white/20">
                              <Video size={20} />
                            </div>
                          </div>
                        )}

                        {dream.type === 'voice' && (
                          <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 flex items-center gap-3 border border-white/10">
                            <button 
                              onClick={() => {
                                triggerHapticFeedback('light');
                                setActiveAudioPlaying(activeAudioPlaying === dream.id ? null : dream.id);
                              }}
                              className="p-3 bg-rose-500 text-white rounded-full shadow-lg"
                            >
                              {activeAudioPlaying === dream.id ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            <div className="flex-1 space-y-1">
                              <div className="h-6 flex items-center gap-0.5">
                                {[...Array(20)].map((_, stepIdx) => (
                                  <motion.div 
                                    key={stepIdx}
                                    className="w-1 bg-rose-400/80 rounded-full"
                                    animate={{
                                      height: activeAudioPlaying === dream.id ? [5, Math.random() * 20 + 5, 5] : 6
                                    }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: stepIdx * 0.05 }}
                                  />
                                ))}
                              </div>
                              <p className="text-[9px] text-slate-400">Audio Promise Clip</p>
                            </div>
                          </div>
                        )}

                        {dream.type === 'trip' && dream.plannedCost && (
                          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/60 p-4 rounded-2xl">
                             <div className="flex items-center gap-2">
                               <Plane size={14} className="text-indigo-400" />
                               <div>
                                 <p className="text-[8px] text-slate-400 uppercase font-black">Planned Budget</p>
                                 <p className="font-bold text-xs">{dream.plannedCost}</p>
                               </div>
                             </div>
                             <div className="flex items-center gap-2">
                               <MapPin size={14} className="text-emerald-400" />
                               <div>
                                 <p className="text-[8px] text-slate-400 uppercase font-black">Status</p>
                                 <p className="font-bold text-xs">{dream.completed ? 'Visited! ✨' : 'Planned'}</p>
                               </div>
                             </div>
                          </div>
                        )}

                        {/* Interactive Promise Box */}
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                          <button
                            onClick={() => toggleGildedPromise(dream.id, `I promise we will realize ${dream.title} together.`)}
                            className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                              dream.promises?.length 
                                ? 'bg-amber-400/10 border-amber-500/30 text-amber-500' 
                                : 'bg-transparent border-slate-200 hover:border-pink-300 hover:text-pink-500'
                            }`}
                          >
                            <ShieldCheck size={12} />
                            {dream.promises?.length ? '🔒 Persistent Gilded Promise Seal Active' : '✍️ Seal Gilded Promise Seal'}
                          </button>
                        </div>

                        {/* Reactions bar */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                          {['❤️', '🥺', '✨', '😭', '🌙', '🔥'].map((emoji) => {
                            const reactCount = dream.reactions?.[emoji]?.length || 0;
                            const didReact = dream.reactions?.[emoji]?.includes(userData?.id || '');

                            return (
                              <button
                                key={emoji}
                                onClick={() => addReaction(dream.id, emoji)}
                                className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-all ${
                                  didReact 
                                    ? 'bg-rose-500/20 border-rose-500/30 border text-white' 
                                    : 'bg-slate-100 dark:bg-slate-900 border border-transparent'
                                }`}
                              >
                                <span>{emoji}</span>
                                {reactCount > 0 && <span className="font-bold text-[9px]">{reactCount}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Comment Section thread */}
                        <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-3">
                          {dream.comments?.map((comment: any, cidx: number) => (
                            <div key={cidx} className="flex gap-2 items-start text-xs">
                              <div className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center text-[8px] font-black text-rose-500 shrink-0">
                                {comment.userName[0]}
                              </div>
                              <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl px-3 py-1.5 flex-1 select-text">
                                <p className="font-bold text-[9px] text-slate-400 leading-none">{comment.userName}</p>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">{comment.text}</p>
                              </div>
                            </div>
                          ))}

                          <div className="flex gap-2 items-center">
                            <input
                              value={commentsThread[dream.id] || ''}
                              onChange={(e) => setCommentsThread(prev => ({ ...prev, [dream.id]: e.target.value }))}
                              placeholder="Add romantic note..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') submitComment(dream.id);
                              }}
                              className="bg-slate-100 dark:bg-slate-900 rounded-full px-4 py-2 text-xs flex-1 border-none focus:outline-none placeholder-slate-400"
                            />
                            <button
                              onClick={() => submitComment(dream.id)}
                              className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow-md shadow-rose-500/20"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Glow Add Future FAB button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { setIsAdding(true); triggerHapticFeedback('heavy'); }}
        className="fixed bottom-28 right-6 z-40 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 p-4 rounded-full text-white shadow-2xl border border-white/20 flex items-center justify-center cursor-pointer animate-pulse"
      >
        <Plus size={24} />
      </motion.button>

      {/* Creation full popup interactive Modal */}
      <AnimatePresence>
        {isAdding && (
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
               className="bg-slate-900 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl relative overflow-hidden border-t sm:border border-white/10"
             >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-rose-500">
                   <Heart size={120} fill="currentColor" />
                </div>

                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-2xl font-serif font-black text-white">Pin a Dream 💭</h3>
                   <button 
                     onClick={() => { setIsAdding(false); triggerHapticFeedback('light'); }} 
                     className="p-2 bg-white/10 rounded-full text-slate-300 hover:bg-white/20"
                   >
                      <ChevronLeft className="w-5 h-5 rotate-270" />
                   </button>
                </div>

                {/* Sub-Tabs of Dream modes */}
                <div className="flex gap-2 pb-4 overflow-x-auto border-b border-white/10 mb-6">
                   {[
                     { key: 'note', label: 'Promise Note', icon: <FileText size={12} /> },
                     { key: 'photo', label: 'Photo Inspiration', icon: <ImageIcon size={12} /> },
                     { key: 'video', label: 'Video Clip', icon: <Video size={12} /> },
                     { key: 'voice', label: 'Voice Dream', icon: <Mic size={12} /> },
                     { key: 'trip', label: 'Map Trip', icon: <Plane size={12} /> }
                   ].map((mode) => (
                     <button
                       key={mode.key}
                       type="button"
                       onClick={() => { setNewDream({...newDream, type: mode.key}); triggerHapticFeedback('light'); }}
                       className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all whitespace-nowrap ${
                         newDream.type === mode.key 
                           ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                           : 'bg-white/5 text-slate-400 hover:bg-white/10'
                       }`}
                     >
                       {mode.icon} {mode.label}
                     </button>
                   ))}
                </div>

                <form onSubmit={handleCreate} className="space-y-4 text-white">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none ml-1">Dream Destination / Goal Name</label>
                      <input 
                        required
                        placeholder="e.g. Kyoto Cherry blossoms 🌸"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 font-bold text-white outline-none focus:border-rose-400"
                        value={newDream.title}
                        onChange={(e) => setNewDream({...newDream, title: e.target.value})}
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none ml-1">Category Shelf</label>
                      <select 
                        className="w-full bg-slate-800 border border-white/10 rounded-2xl py-3 px-4 font-bold text-white outline-none focus:border-rose-400"
                        value={newDream.category}
                        onChange={(e) => setNewDream({...newDream, category: e.target.value})}
                      >
                         {categories.slice(1).map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                         ))}
                      </select>
                   </div>

                   {/* Conditional creation render parameters */}
                   {newDream.type === 'photo' && (
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none ml-1">Inspirations Image URL</label>
                        <input 
                          placeholder="Paste image link... (optional)"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-rose-400"
                          value={newDream.imageUrl}
                          onChange={(e) => setNewDream({...newDream, imageUrl: e.target.value})}
                        />
                     </div>
                   )}

                   {newDream.type === 'video' && (
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none ml-1">Inspirations Video URL</label>
                        <input 
                          placeholder="Paste video stream link... (optional)"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-rose-400"
                          value={newDream.videoUrl}
                          onChange={(e) => setNewDream({...newDream, videoUrl: e.target.value})}
                        />
                     </div>
                   )}

                   {newDream.type === 'voice' && (
                     <div className="space-y-2 py-2 border border-white/5 bg-white/5 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-slate-400">Record a brief promise message to the future</p>
                        <div className="flex items-center justify-center gap-4 mt-2">
                           <button
                             type="button"
                             onClick={handleSimulateRecord}
                             className={`px-6 py-2 rounded-full text-xs font-bold ${
                               isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-rose-500 text-white'
                             }`}
                           >
                              {isRecording ? '⏺️ Recording (Local)...' : '🎙️ Record Sound'}
                           </button>
                           {recordedBlobUrl && (
                             <span className="text-emerald-400 text-[10px] font-black tracking-widest uppercase">✓ Waveform Packed</span>
                           )}
                        </div>
                     </div>
                   )}

                   {newDream.type === 'trip' && (
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none ml-1">Estimated Budget Plane Costs</label>
                        <input 
                          placeholder="e.g. $2500"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-rose-400"
                          value={newDream.plannedCost}
                          onChange={(e) => setNewDream({...newDream, plannedCost: e.target.value})}
                        />
                     </div>
                   )}

                   {/* Secret Capsule settings */}
                   <div className="bg-rose-500/5 p-4 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Lock size={14} className="text-rose-400" />
                            <div>
                               <h5 className="text-[10px] font-black tracking-widest uppercase">Secret Love Capsule Mode</h5>
                               <p className="text-[9px] text-slate-400 leading-none mt-0.5">Seals this card from partner until chosen date</p>
                            </div>
                         </div>
                         <input 
                           type="checkbox"
                           className="w-4 h-4 rounded border-white/10 bg-slate-800 text-rose-500"
                           checked={newDream.isSecret}
                           onChange={(e) => setNewDream({...newDream, isSecret: e.target.checked})}
                         />
                      </div>

                      {newDream.isSecret && (
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Unlock Anniversary Date</label>
                            <input 
                              type="date"
                              required
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl py-2 px-3 text-xs font-bold outline-none text-white focus:border-rose-400"
                              value={newDream.unlockDate}
                              onChange={(e) => setNewDream({...newDream, unlockDate: e.target.value})}
                            />
                         </div>
                      )}
                   </div>

                   <button 
                     type="submit"
                     className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black py-3.5 rounded-full shadow-xl shadow-rose-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-6 text-sm"
                   >
                      Add to Our Sharing Future <Sparkles size={16} />
                   </button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
