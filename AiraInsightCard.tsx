import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Heart, Info, Loader2, BrainCircuit } from 'lucide-react';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateAIResponse, AI_MODELS } from '../lib/ai';
import { useNavigate } from 'react-router-dom';

import { triggerHapticFeedback } from '../lib/haptics';

export function AiraInsightCard() {
  const { space } = useCoupleSpace();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState('connected');

  const handleClick = () => {
    triggerHapticFeedback('light');
    navigate('/pulse');
  };

  const fetchInsight = async () => {
    if (!space?.id || loading) return;
    setLoading(true);

    try {
      // Fetch some context: recent messages or memories
      const q = query(
        collection(db, `coupleSpaces/${space.id}/messages`),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const messages = snap.docs.map(d => d.data().content).join('\n');

      const prompt = `Analyze this couple's recent interactions:
      ${messages || "They are just starting their journey."}
      
      Provide a short, 2-sentence romantic insight or a "weekly prediction" for their love. 
      Be encouraging, poetic, and slightly mysterious.
      Also include a one-word mood for the relationship aura.
      Format: Mood | Insight`;

      const response = await generateAIResponse([
        { role: 'system', content: "You are AIRA, the guardian of their Love Link. Output format: Mood | Insight" },
        { role: 'user', content: prompt }
      ], { model: AI_MODELS.smart });
      const [newMood, newInsight] = response.split('|').map(s => s.trim());
      
      setMood(newMood || 'Romantic');
      setInsight(newInsight || response);
    } catch (err) {
      console.error("Failed to get Aira insight", err);
      setInsight("Your hearts are beating in sync. The universe smiles upon your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [space?.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="w-full max-w-sm bg-gradient-to-br from-indigo-50/50 to-rose-50/50 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white shadow-xl shadow-rose-100/20 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
    >
      <div className="absolute top-0 right-0 p-4">
        <BrainCircuit className="w-5 h-5 text-rose-300 animate-pulse group-hover:text-rose-500 transition-colors" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-rose-50">
          <TrendingUp className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-slate-800">Connection Pulse</h3>
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Guardian AIRA Analysis</p>
        </div>
      </div>

      <div className="bg-white/60 rounded-3xl p-5 border border-white shadow-inner relative min-h-[100px] flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest animate-pulse">Consulting the orbits...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={insight}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded-full uppercase tracking-tighter">
                  {mood} Aura
                </span>
                <div className="h-[1px] flex-1 bg-rose-100/50" />
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">
                "{insight}"
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-rose-500 transition-colors">
        <Sparkles className="w-3 h-3" /> View Analytical Depth
      </div>
    </motion.div>
  );
}
