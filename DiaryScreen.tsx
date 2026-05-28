import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { Book, Plus, Lock, Unlock, X, Edit3, Trash2, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiaryEntry {
  id: string;
  coupleSpaceId: string;
  authorId: string;
  content: string;
  date: string;
  locked: boolean;
}

export function DiaryScreen() {
  const navigate = useNavigate();
  const { space } = useCoupleSpace();
  const { userData } = useAuth();
  
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  
  const [content, setContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/diaryEntries`),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiaryEntry[];
      setEntries(entriesData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/diaryEntries`);
    });

    return () => unsubscribe();
  }, [space?.id]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !userData?.id || !content.trim()) return;

    try {
      if (editingEntryId) {
        await updateDoc(doc(db, `coupleSpaces/${space.id}/diaryEntries`, editingEntryId), {
          content,
          locked: isLocked
        });
      } else {
        const id = `diary_${Date.now()}`;
        await setDoc(doc(db, `coupleSpaces/${space.id}/diaryEntries`, id), {
          id,
          coupleSpaceId: space.id,
          authorId: userData.id,
          content,
          date: new Date().toISOString(),
          locked: isLocked
        });
      }
      
      setIsEditing(false);
      setEditingEntryId(null);
      setContent('');
      setIsLocked(false);
    } catch (err) {
      handleFirestoreError(err, editingEntryId ? OperationType.UPDATE : OperationType.CREATE, `coupleSpaces/${space.id}/diaryEntries`);
    }
  };

  const handleToggleLock = async (entry: DiaryEntry) => {
    if (!space?.id) return;
    try {
      await updateDoc(doc(db, `coupleSpaces/${space.id}/diaryEntries`, entry.id), {
        locked: !entry.locked
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `coupleSpaces/${space.id}/diaryEntries`);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!space?.id) return;
    try {
      await deleteDoc(doc(db, `coupleSpaces/${space.id}/diaryEntries`, entryId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `coupleSpaces/${space.id}/diaryEntries`);
    }
  };

  const openEditor = (entry?: DiaryEntry) => {
    if (entry) {
      if (entry.locked) return; // cannot edit locked entry from UI until unlocked
      setEditingEntryId(entry.id);
      setContent(entry.content);
      setIsLocked(entry.locked);
    } else {
      setEditingEntryId(null);
      setContent('');
      setIsLocked(false);
    }
    setIsEditing(true);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFBF7] relative pb-20">
      
      <div className="px-6 py-8 pb-4 bg-[#FDFBF7] z-10 sticky top-0 shadow-sm border-b border-[#E8E4D9]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-white rounded-full shadow-sm text-[#A67C52] hover:bg-[#F9F7F2] transition-colors border border-[#E8E4D9] flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-serif font-bold text-[#4A4036] flex items-center gap-2">
              Our Diary <Book className="w-6 h-6 text-[#A67C52]" />
            </h1>
          </div>
          <button 
            onClick={() => openEditor()}
            className="p-3 bg-[#A67C52] text-white rounded-full shadow-lg hover:bg-[#8A6642] transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-[#8C7A6B] font-medium mt-1 font-serif italic pl-11">
          Shared moments, written together
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {entries.map((entry) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={entry.id} 
            className="bg-white rounded-md shadow-sm border border-[#E8E4D9] p-6 relative overflow-hidden notebook-bg"
            style={{
               backgroundImage: 'linear-gradient(transparent 95%, #F0EBDF 5%)',
               backgroundSize: '100% 2rem',
               lineHeight: '2rem'
            }}
          >
            {/* Red margin line to simulate notebook */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-rose-200/50"></div>
            
            <div className="pl-6 relative z-10">
              <div className="flex justify-between items-start mb-2 h-8">
                <span className="text-xs font-serif font-bold text-[#A67C52] uppercase tracking-widest bg-white/80 px-2 py-0.5 rounded">
                  {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <div className="flex items-center gap-2 bg-white/80 px-2 rounded">
                  <button 
                    onClick={() => handleToggleLock(entry)}
                    className="p-1.5 text-[#8C7A6B] hover:text-[#A67C52] transition-colors"
                    title={entry.locked ? "Unlock" : "Lock"}
                  >
                    {entry.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  {!entry.locked && (
                    <button 
                      onClick={() => openEditor(entry)}
                      className="p-1.5 text-[#8C7A6B] hover:text-[#A67C52] transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {entry.authorId === userData?.id && (
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="font-serif text-[#4A4036] text-lg mt-2 whitespace-pre-wrap">
                {entry.content}
              </div>
            </div>
          </motion.div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-20 px-6">
            <Book className="w-16 h-16 text-[#E8E4D9] mx-auto mb-4" />
            <p className="text-[#8C7A6B] font-serif italic text-lg">Your diary is empty. Start your first entry today!</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#FDFBF7] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-[#E8E4D9] flex justify-between items-center bg-white">
                <h3 className="font-serif font-bold text-[#4A4036] text-lg flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#A67C52]" />
                  {editingEntryId ? 'Edit Entry' : 'New Entry'}
                </h3>
                <button onClick={() => setIsEditing(false)} className="p-2 text-[#8C7A6B] hover:bg-[#F0EBDF] rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <form id="diary-form" onSubmit={handleCreateOrUpdate} className="h-full flex flex-col">
                  <textarea
                    autoFocus
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Dear Diary..."
                    className="flex-1 w-full bg-transparent resize-none outline-none font-serif text-[#4A4036] text-lg min-h-[200px]"
                    style={{
                       backgroundImage: 'linear-gradient(transparent 95%, #E8E4D9 5%)',
                       backgroundSize: '100% 2rem',
                       lineHeight: '2rem'
                    }}
                  />
                </form>
              </div>

              <div className="p-4 bg-white border-t border-[#E8E4D9] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    isLocked ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {isLocked ? 'Locked' : 'Unlocked'}
                </button>
                <button
                  type="submit"
                  form="diary-form"
                  disabled={!content.trim()}
                  className="bg-[#A67C52] text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-[#8A6642] disabled:opacity-50 transition-colors"
                >
                  Save Entry
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
