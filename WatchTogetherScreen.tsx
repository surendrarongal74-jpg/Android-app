import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Film, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  Heart, 
  Calendar,
  Layers,
  Flame,
  Star,
  CheckCircle2,
  Tv
} from 'lucide-react';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { triggerHapticFeedback } from '../lib/haptics';
import { BottomNav } from '../components/BottomNav';

interface WatchlistItem {
  id: string;
  title: string;
  notes?: string;
  watched: boolean;
  createdAt: number;
  addedBy: string;
}

const PRESET_RECOMMENDATIONS = [
  {
    title: "About Time",
    badge: "Romantic & Whimsical ⏳",
    description: "An incredibly sweet romance about time-travel, family values, and learning to cherish each ordinary day of living together.",
    genre: "Romance / Sci-Fi / Drama",
    rating: "9.2/10 Love Rating",
    iconColor: "text-amber-500 bg-amber-50"
  },
  {
    title: "Before Sunrise",
    badge: "Pure Conversation & Soul Sync 💬",
    description: "Two strangers meet on a train, spend a single night talking in Vienna, and realize they share an unbreakable soul alignment.",
    genre: "Romance / Indie / Drama",
    rating: "9.5/10 Love Rating",
    iconColor: "text-rose-500 bg-rose-50"
  },
  {
    title: "La La Land",
    badge: "Melodic Dreams & Artistry 🎹",
    description: "A gorgeous, vibrant musical about love, sacrifice, and the delicate balance between high ambitions and intimate devotion.",
    genre: "Musical / Romance / Drama",
    rating: "9.0/10 Love Rating",
    iconColor: "text-purple-500 bg-purple-50"
  },
  {
    title: "My Neighbor Totoro",
    badge: "Pure Calm & Sweet Childhood Nostalgia 🌿",
    description: "A cozy, calming studio Ghibli masterpiece full of gentle nature spirits, simple warmth, and sweet, comforting peace.",
    genre: "Animation / Cozy / Fantasy",
    rating: "9.4/10 Love Rating",
    iconColor: "text-emerald-500 bg-emerald-50"
  },
  {
    title: "Amélie",
    badge: "Playful & Vibrant Whimsy 🍧",
    description: "A creative girl in Paris orchestrates tiny, anonymous acts of kindness and playfully discovers her own true affection.",
    genre: "Romance / Comedy / French Art",
    rating: "9.1/10 Love Rating",
    iconColor: "text-sky-500 bg-sky-50"
  }
];

const COZY_PLANNING_CARDS = [
  { id: "blanket_fort", title: "Blanket Fort Cinematic Escape 🪵", mood: "Max Warmth", vibe: "Surround sound, nested blankets, fairy lights, and cold sweet treats." },
  { id: "popcorn_bar", title: "Gourmet Pajamas Popcorn Bar 🍿", mood: "Crunchy & Sweet", vibe: "Matchy pajamas, homemade popcorn with sweet & salty custom toppings." },
  { id: "cozy_candles", title: "Candlelit Classic Night 🕯️", mood: "Soft & Timeless", vibe: "Zero ceiling lights, warm scented candles, and slow black-and-white indie scripts." }
];

export function WatchTogetherScreen() {
  const navigate = useNavigate();
  const { space, partnerData, addXp } = useCoupleSpace();
  const { userData } = useAuth();
  const { sendNotification } = useNotifications();

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'presets' | 'planning'>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync watchlist live
  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/watchlist`)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as WatchlistItem[];

      items.sort((a, b) => b.createdAt - a.createdAt);
      setWatchlist(items);
    }, (err) => {
      console.error("Watchlist loading failed:", err);
    });

    return () => unsubscribe();
  }, [space?.id]);

  const handleAddMovie = async (titleStr: string, noteStr: string = '') => {
    if (!space?.id || !userData?.id || !titleStr.trim()) return;
    setIsSubmitting(true);
    triggerHapticFeedback('medium');

    const movieId = `movie_${Date.now()}`;
    const newItem: WatchlistItem = {
      id: movieId,
      title: titleStr.trim(),
      notes: noteStr.trim() || undefined,
      watched: false,
      createdAt: Date.now(),
      addedBy: userData.id
    };

    try {
      await setDoc(doc(db, `coupleSpaces/${space.id}/watchlist`, movieId), newItem);
      addXp(10); // Cozy reward for adding a screen memory goal!
      setNewTitle('');
      setNewNotes('');

      // Send silent but sweet push/notification
      if (partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'chat',
          title: 'New Movie Idea! 🍿',
          body: `${userData.displayName || 'Partner'} added "${titleStr.trim()}" to our watchlist.`,
          priority: 'medium'
        });
      }
    } catch (e) {
      console.error("Failed to add movie:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleWatched = async (movie: WatchlistItem) => {
    if (!space?.id) return;
    triggerHapticFeedback('heavy');

    try {
      const newStatus = !movie.watched;
      await updateDoc(doc(db, `coupleSpaces/${space.id}/watchlist`, movie.id), {
        watched: newStatus
      });

      if (newStatus) {
        addXp(15); // Celebration XP reward!
        if (partnerData?.id) {
          sendNotification(partnerData.id, {
            type: 'reaction',
            title: 'Movie Watched! 🎉',
            body: `You both watched "${movie.title}" together!`,
            priority: 'medium'
          });
        }
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const handleDeleteMovie = async (id: string, name: string) => {
    if (!space?.id) return;
    triggerHapticFeedback('light');

    try {
      await deleteDoc(doc(db, `coupleSpaces/${space.id}/watchlist`, id));
    } catch (e) {
      console.error("Failed to delete item:", e);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50/20 text-slate-800 flex flex-col font-sans relative pb-32">
      {/* Premium Header */}
      <div className="pt-12 pb-6 px-6 relative z-10 shrink-0 flex items-center gap-4 bg-white/75 backdrop-blur-2xl border-b border-rose-100/50 shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 bg-white rounded-full shadow-sm text-rose-400 hover:bg-rose-50 transition-colors border border-rose-100 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-rose-500" />
        </button>
        <div className="flex-1 text-center pr-8">
          <h1 className="text-xl font-serif font-black text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
            Cinema Playlist <Tv className="w-5 h-5 text-rose-400 fill-rose-50" />
          </h1>
          <p className="text-[10px] uppercase font-black tracking-widest text-rose-400 mt-0.5">Watch Together Later</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-4 px-6 relative z-10">
        <div className="grid grid-cols-3 bg-white/80 backdrop-blur-md p-1.5 rounded-[1.7rem] border border-rose-100 shadow-sm">
          <button 
            type="button"
            onClick={() => { triggerHapticFeedback('light'); setActiveTab('list'); }}
            className={`py-3 rounded-[1.4rem] font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-1.5 ${activeTab === 'list' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Film size={14} /> Our List {watchlist.length > 0 && `(${watchlist.length})`}
          </button>
          <button 
            type="button"
            onClick={() => { triggerHapticFeedback('light'); setActiveTab('presets'); }}
            className={`py-3 rounded-[1.4rem] font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-1.5 ${activeTab === 'presets' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Sparkles size={14} fill={activeTab === 'presets' ? "currentColor" : "none"} /> Choice Ideas
          </button>
          <button 
            type="button"
            onClick={() => { triggerHapticFeedback('light'); setActiveTab('planning'); }}
            className={`py-3 rounded-[1.4rem] font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-1.5 ${activeTab === 'planning' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Layers size={14} /> Cozy Cards
          </button>
        </div>
      </div>

      {/* Inner Area */}
      <div className="flex-1 px-6 overflow-y-auto relative z-10">
        <AnimatePresence mode="wait">
          
          {/* Tab 1: Direct List & Form */}
          {activeTab === 'list' && (
            <motion.div 
              key="list-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Form Input Container */}
              <div className="bg-white/80 border border-rose-100 shadow-xl shadow-rose-100/50 rounded-[2.5rem] p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                    <Heart size={16} fill="currentColor" />
                  </div>
                  <h3 className="font-serif font-black text-slate-800 text-sm">Add a shared screening dream</h3>
                </div>
                
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What should we watch?"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:bg-white transition-all shadow-inner"
                />

                <input 
                  type="text" 
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes (e.g. 'Cozy pillows & ice-cream bar')"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:bg-white transition-all shadow-inner"
                />

                <button 
                  type="button"
                  disabled={isSubmitting || !newTitle.trim()}
                  onClick={() => handleAddMovie(newTitle, newNotes)}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <Plus size={16} /> Save Movie Idea
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF8FAB]">Our Screen Queue</h4>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    {watchlist.filter(m => !m.watched).length} Pending / {watchlist.filter(m => m.watched).length} Finished
                  </span>
                </div>

                {watchlist.length === 0 ? (
                  <div className="bg-white/40 border-2 border-dashed border-rose-200/50 rounded-[2.5rem] p-12 text-center text-slate-400 italic font-medium text-xs py-16 space-y-3">
                    <Film size={32} className="mx-auto text-rose-300 animate-pulse" />
                    <p>No titles listed yet.</p>
                    <p className="text-[10px] tracking-tight uppercase not-italic font-semibold text-slate-400 bg-white/70 px-3 py-1 rounded-full border border-rose-100 w-fit mx-auto">
                      Explore choice suggestions in the top tab!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {watchlist.map(movie => (
                      <motion.div
                        key={movie.id}
                        layout
                        className={`bg-white/90 border rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 relative overflow-hidden ${movie.watched ? 'border-emerald-100 opacity-60 bg-emerald-50/10' : 'border-[#FFF0F5]'}`}
                      >
                        {/* Checked Status Gradient Backing */}
                        {movie.watched && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-500" />
                        )}

                        <div className="flex items-start gap-3.5 flex-1 select-none">
                          <button
                            type="button"
                            onClick={() => handleToggleWatched(movie)}
                            className={`w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all border outline-none cursor-pointer ${movie.watched ? 'bg-emerald-500 border-emerald-400 text-white shadow-inner shadow-emerald-400/20' : 'bg-[#FFF0F5] hover:bg-rose-100/50 border-[#FFEDF1] text-rose-500'}`}
                          >
                            {movie.watched ? <CheckCircle2 size={18} /> : <Film size={16} />}
                          </button>
                          
                          <div className="text-left">
                            <h3 className={`font-serif font-black text-sm text-slate-800 leading-tight ${movie.watched ? 'line-through text-slate-400' : ''}`}>
                              {movie.title}
                            </h3>
                            {movie.notes && (
                              <p className="text-[11px] font-medium text-slate-500 tracking-tight mt-1">
                                💬 {movie.notes}
                              </p>
                            )}
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 block">
                              Suggested by {movie.addedBy === userData?.id ? 'Me' : partnerData?.displayName || 'Partner'}
                            </span>
                          </div>
                        </div>

                        {/* Delete action button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMovie(movie.id, movie.title)}
                          className="w-8 h-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center flex-shrink-0"
                          title="Remove choice option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Curated Recommendation Cards */}
          {activeTab === 'presets' && (
            <motion.div 
              key="preset-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <div className="bg-white/60 p-4 rounded-[1.8rem] border border-rose-100/30 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF8FAB] block mb-1">Aira Recommendations 💫</span>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Hand-crafted classic screen recommendations for couples seeking high-quality physical or virtual movie night emotional intimacy.
                </p>
              </div>

              {PRESET_RECOMMENDATIONS.map((preset, index) => {
                const alreadyOnList = watchlist.some(w => w.title.toLowerCase() === preset.title.toLowerCase());
                return (
                  <motion.div
                    key={preset.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/95 border border-rose-100 shadow-sm rounded-[2.2rem] p-5 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col gap-3.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-left space-y-1">
                        <span className="text-[9px] font-black tracking-widest text-rose-400 uppercase leading-none block">
                          {preset.badge}
                        </span>
                        <h3 className="font-serif font-black text-slate-800 text-base leading-none">
                          {preset.title}
                        </h3>
                        <span className="text-[9px] font-mono text-slate-400 block mt-1.5">
                          {preset.genre} • {preset.rating}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        disabled={alreadyOnList}
                        onClick={() => handleAddMovie(preset.title, `Adding preset: ${preset.badge}`)}
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${alreadyOnList ? 'bg-emerald-500 text-white shadow-inner shadow-emerald-500/20' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md active:scale-95'}`}
                      >
                        {alreadyOnList ? <Check size={18} /> : <Plus size={18} />}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium text-left">
                      {preset.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Tab 3: Watch Together Cozy Vibe Cards */}
          {activeTab === 'planning' && (
            <motion.div 
              key="planning-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <div className="bg-white/60 p-4 rounded-[1.8rem] border border-rose-100/30 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF8FAB] block mb-1">Make Love Memorable</span>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Romantic movie date formats to choose, coordinate, or trigger. Add to watchlist to document your progress!
                </p>
              </div>

              {COZY_PLANNING_CARDS.map((card, index) => {
                const alreadyOnList = watchlist.some(w => w.title.includes(card.title));
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-2 border-indigo-400 rounded-[2.5rem] shadow-xl relative overflow-hidden text-left"
                  >
                    {/* Glowing Accent */}
                    <div className="absolute -right-12 -top-12 w-24 h-24 bg-pink-500/10 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <span className="text-[9px] font-black text-rose-300 uppercase tracking-widest">{card.mood}</span>
                        <h4 className="font-serif font-black text-base text-white mt-0.5">{card.title}</h4>
                      </div>
                      
                      <button
                        type="button"
                        disabled={alreadyOnList}
                        onClick={() => handleAddMovie(card.title, `Let's make this date night real: ${card.vibe}`)}
                        className={`px-3.5 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${alreadyOnList ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-950 hover:bg-slate-100 active:scale-95'}`}
                      >
                        {alreadyOnList ? 'Added' : 'Plan Vibe'}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {card.vibe}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
export default WatchTogetherScreen;
