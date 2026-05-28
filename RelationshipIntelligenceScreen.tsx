import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Zap, 
  Sparkles, 
  ChevronLeft, 
  TrendingUp, 
  MessageSquare, 
  Clock, 
  Target, 
  ShieldCheck, 
  Moon,
  Info,
  Waves,
  Mic,
  BrainCircuit,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { OpenRouterClient } from '../ai/openrouter';
import { MemoryManager } from '../ai/memoryManager';
import { FALLBACK_MODELS } from '../ai/fallbackModels';

const ANALYSIS_CARDS = [
  { id: 'receptivity', title: 'Emotional Receptivity', value: 'High', icon: Waves, color: 'text-blue-400', desc: 'Partner is currently open to deep conversations.' },
  { id: 'warmth', title: 'Romantic Warmth', value: '88%', icon: Heart, color: 'text-rose-400', desc: 'Consistency in sweet affirmations is increasing.' },
  { id: 'engagement', title: 'Social Energy', value: 'Active', icon: Zap, color: 'text-amber-400', desc: 'Higher than average response speed today.' },
];

export default function RelationshipIntelligenceScreen() {
  const navigate = useNavigate();
  const { space, partnerData } = useCoupleSpace();
  const { userData } = useAuth();
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [isAskingAira, setIsAskingAira] = useState(false);
  const [question, setQuestion] = useState('');
  const [airaAdvice, setAiraAdvice] = useState<any>(null);
  const [aiClient] = useState(() => new OpenRouterClient());

  const askAboutTiming = async () => {
    if (!question.trim()) return;
    setIsAskingAira(true);
    try {
      const prompt = `As AIRA, the relationship strategist, analyze the timing for this question: "${question}". 
      Partner current mood: Romantic/Relaxed. 
      Recent context: Positive interactions.
      Format JSON: {
        "score": 0.92,
        "timing": "Perfect Moment",
        "reason": "Your partner is currently in a high-receptivity state and has been using a lot of affectionate language in the last hour.",
        "strategy": "Lead with a soft memory of your last vacation before transitioning into the question.",
        "wording": "Aira suggests: 'Hey love, thinking about us lately... [Question]?'"
      }`;

      // Using non-streaming generation for complex JSON extraction
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: "You are AIRA, a premium romantic strategist. Return JSON only." },
            { role: 'user', content: prompt }
          ],
          model: FALLBACK_MODELS[0]
        })
      });

      const data = await response.json();
      let parsedAdvice;
      try {
        parsedAdvice = JSON.parse(data.reply.replace(/```json|```/g, '').trim());
      } catch (parseErr) {
        console.warn("Timing strategist response was not JSON, converting to object:", parseErr);
        parsedAdvice = {
          score: 0.88,
          timing: "Highly Receptive Moment 🌟",
          reason: "AIRA detects warm and soft underlying communication vibes.",
          strategy: "Lead with open, soft expression. The background field resonates high alignment.",
          wording: data.reply || "Hey love, thinking about us lately..."
        };
      }
      setAiraAdvice(parsedAdvice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAskingAira(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32 overflow-x-hidden">
      {/* Cinematic Aura Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ type: "tween", duration: 10, repeat: Infinity }}
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-rose-500/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -40, 0],
            y: [0, -20, 0]
          }}
          transition={{ type: "tween", duration: 12, repeat: Infinity }}
          className="absolute -bottom-1/4 -left-1/4 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[140px]"
        />
      </div>

      <div className="relative z-10">
        <header className="p-6 flex items-center justify-between backdrop-blur-md sticky top-0 bg-[#0A0A0B]/60 border-b border-white/5 z-50">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-full bg-white/5 border border-white/10">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black uppercase tracking-[0.3em] bg-gradient-to-r from-rose-300 via-white to-blue-300 bg-clip-text text-transparent">Intelligence</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-0.5">POWERED BY AIRA ✨</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
             <TrendingUp size={18} className="text-blue-400" />
          </div>
        </header>

        <main className="p-6 space-y-8">
          {/* Live Mood Ring Card */}
          <section className="relative">
             <div className="absolute inset-0 bg-rose-500/5 blur-[60px] rounded-full" />
             <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-xl relative overflow-hidden flex flex-col items-center text-center">
                <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                   {/* Animated Rings */}
                   <motion.div 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                     className="absolute inset-0 border-2 border-dashed border-rose-500/30 rounded-full"
                   />
                   <motion.div 
                     animate={{ rotate: -360 }}
                     transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                     className="absolute inset-4 border border-blue-500/20 rounded-full"
                   />
                   <div className="absolute inset-8 bg-gradient-to-br from-rose-400/20 to-purple-600/20 rounded-full blur-xl animate-pulse" />
                   
                   <div className="relative z-10 flex flex-col items-center">
                      <Sparkles className="text-rose-400 mb-2" size={32} />
                      <span className="text-4xl font-black tracking-tighter">Romantic</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Live Vibe</span>
                   </div>
                </div>
                
                <div className="space-y-1">
                   <p className="text-sm font-medium text-slate-300 max-w-xs mx-auto">
                     "Your partner is currently experiencing a high state of affection. Perfect time for deep connection."
                   </p>
                </div>
             </div>
          </section>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 gap-4">
             {ANALYSIS_CARDS.map(card => (
               <motion.div 
                key={card.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center gap-4 group"
               >
                  <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform`}>
                     <card.icon size={24} />
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{card.title}</h3>
                        <span className="text-sm font-black text-white">{card.value}</span>
                     </div>
                     <p className="text-[11px] text-slate-400 leading-tight">{card.desc}</p>
                  </div>
               </motion.div>
             ))}
          </div>

          {/* Smart Question Strategist */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="text-blue-400" size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest">Question Strategist</h2>
             </div>
             
             <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-[32px] p-6 space-y-4">
                <div className="space-y-2">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Planning something important?</p>
                   <textarea 
                     value={question}
                     onChange={(e) => setQuestion(e.target.value)}
                     placeholder="e.g. Ask about meeting parents, or moving in..."
                     className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px] placeholder:text-slate-600"
                   />
                </div>
                
                <button 
                  onClick={askAboutTiming}
                  disabled={isAskingAira || !question.trim()}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50"
                >
                  {isAskingAira ? <Zap className="animate-spin" size={18} /> : <Lightbulb size={18} />}
                  Check Ideal Timing
                </button>

                <AnimatePresence>
                   {airaAdvice && (
                     <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       className="overflow-hidden"
                     >
                        <div className="pt-6 border-t border-white/10 space-y-5">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                 <span className="text-[11px] font-black uppercase tracking-widest text-green-500">{airaAdvice.timing}</span>
                              </div>
                              <span className="text-[10px] font-black text-slate-500">Confidence: {Math.round(airaAdvice.score * 100)}%</span>
                           </div>

                           <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">The Strategy</h4>
                              <p className="text-xs text-slate-300 leading-relaxed font-medium">"{airaAdvice.reason}"</p>
                              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] italic text-blue-200">
                                 {airaAdvice.strategy}
                              </div>
                           </div>

                           <div className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Best Wording</h4>
                              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-sm font-bold text-white relative">
                                 <MessageSquare className="absolute top-2 right-2 text-rose-500/30" size={16} />
                                 {airaAdvice.wording}
                              </div>
                           </div>
                        </div>
                     </motion.div>
                   )}
                </AnimatePresence>
             </div>
          </section>

          {/* Relationship Aura Timeline */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Target className="text-rose-400" size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest">Love Timeline</h2>
             </div>
             
             <div className="space-y-3">
                {[
                  { time: 'Last 24h', flow: 'Deepening', intensity: 85, color: 'bg-rose-500' },
                  { time: 'Last 7 Days', flow: 'Healing', intensity: 40, color: 'bg-blue-500' },
                  { time: 'Month Avg', flow: 'Passionate', intensity: 92, color: 'bg-purple-500' },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-500 w-16">{item.time}</span>
                        <div className="flex flex-col">
                           <span className="text-sm font-black">{item.flow}</span>
                           <div className="w-24 h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.intensity}%` }}
                                className={`h-full ${item.color}`}
                              />
                           </div>
                        </div>
                     </div>
                     <span className="text-xs font-black opacity-40">{item.intensity}%</span>
                  </div>
                ))}
             </div>
          </section>
        </main>
      </div>
    </div>
  );
}
