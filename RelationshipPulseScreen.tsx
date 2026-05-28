import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Sparkles, 
  Heart, 
  Zap, 
  Waves, 
  Wind, 
  ShieldCheck, 
  TrendingUp, 
  ChevronLeft, 
  Calendar, 
  MessageSquare, 
  Sparkle, 
  Database,
  BarChart3,
  FlameKindling
} from 'lucide-react';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';
import { analyzeRelationshipPulse } from '../lib/ai';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const MOOD_MAPPING: Record<string, { label: string; score: number; color: string; emoji: string }> = {
  'Sad': { label: 'Quiet / Overwhelmed', score: 1, color: '#60A5FA', emoji: '🌧️' },
  'Quiet': { label: 'Private / Reflective', score: 2, color: '#A78BFA', emoji: '☁️' },
  'Calm': { label: 'Peaceful / Serene', score: 3, color: '#34D399', emoji: '🍃' },
  'Warm': { label: 'Warm / Loving', score: 4, color: '#FB7185', emoji: '💕' },
  'Electric': { label: 'Electric / Spicy', score: 5, color: '#FBBF24', emoji: '⚡' },
};

export function RelationshipPulseScreen() {
  const { space, partnerData } = useCoupleSpace();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  // Custom navigation structure within screens
  const [activeTab, setActiveTab] = useState<'pulse' | 'charts'>('pulse');
  
  // Mood states
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [chartView, setChartView] = useState<'flow' | 'balance'>('flow');
  const [userLoggedMood, setUserLoggedMood] = useState<string>('Warm');
  const [partnerLoggedMood, setPartnerLoggedMood] = useState<string>('Warm');
  const [userLoggedNote, setUserLoggedNote] = useState<string>('');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simulatePartnerInput, setSimulatePartnerInput] = useState<boolean>(true);
  const [logging, setLogging] = useState<boolean>(false);

  const fetchAnalysis = async () => {
    if (!space?.id) return;
    setLoading(true);
    try {
      const q = query(collection(db, `coupleSpaces/${space.id}/messages`), orderBy('createdAt', 'desc'), limit(20));
      const mSnap = await getDocs(q);
      const messages = mSnap.docs.map(d => `${d.data().senderId === userData?.id ? 'Me' : 'Partner'}: ${d.data().content}`);
      
      const memSnap = await getDocs(collection(db, `coupleSpaces/${space.id}/memories`));
      const memoriesCount = memSnap.docs.length;

      const pulse = await analyzeRelationshipPulse(messages, memoriesCount);
      setData(pulse);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoods = async () => {
    if (!space?.id) return;
    try {
      const q = query(
        collection(db, `coupleSpaces/${space.id}/moods`),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(doc => doc.data());
      setMoodHistory(docs);
    } catch (err) {
      console.error("Error fetching moods:", err);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    fetchMoods();
  }, [space?.id]);

  const onAddMood = async () => {
    if (!space?.id || !userData?.id) return;
    setLogging(true);
    try {
      // 1. Log direct user mood
      const ref = doc(collection(db, `coupleSpaces/${space.id}/moods`));
      const payload = {
        id: ref.id,
        coupleSpaceId: space.id,
        userId: userData.id,
        mood: userLoggedMood,
        note: userLoggedNote,
        date: logDate,
        createdAt: Date.now()
      };
      await setDoc(ref, payload);
      
      // 2. Optionally, log simulated partner mood concurrently for immediate dual graphs
      if (simulatePartnerInput && partnerData?.id) {
        const partnerRef = doc(collection(db, `coupleSpaces/${space.id}/moods`));
        await setDoc(partnerRef, {
          id: partnerRef.id,
          coupleSpaceId: space.id,
          userId: partnerData.id,
          mood: partnerLoggedMood,
          note: `Synced mood recorded together.`,
          date: logDate,
          createdAt: Date.now() + 1000
        });
      }

      setUserLoggedNote('');
      fetchMoods();
    } catch (err) {
      console.error(err);
    } finally {
      setLogging(false);
    }
  };

  /**
   * Fast, gorgeous 30-day historical seed to allow immediate interactive Recharts visualization
   */
  const seedHistoricalData = async () => {
    if (!space?.id || !userData?.id) return;
    setLogging(true);
    try {
      const batchList = [];
      const moodsList = ['Sad', 'Quiet', 'Calm', 'Warm', 'Electric'];
      const sampleNotes = [
        "Had coffee, talk felt so therapeutic and special.",
        "Busy day, but loved your sweet evening surprise!",
        "A beautiful, quiet walk around the block holding hands.",
        "Small disagreement on chores, but made up with a warm giant hug.",
        "Excitedly dreaming about our summer vacation goal!",
        "Feeling incredibly connected and safe in each other's spaces.",
        "Missed you deeply today. Can't wait for date night!",
        "Piles of work, but your video note instantly brightened my heart."
      ];

      const pId = partnerData?.id || 'partner_sim';

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Me (User) Entry
        const userMood = moodsList[Math.floor(Math.random() * moodsList.length)];
        const userNote = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
        const userDocRef = doc(collection(db, `coupleSpaces/${space.id}/moods`));
        batchList.push(setDoc(userDocRef, {
          id: userDocRef.id,
          coupleSpaceId: space.id,
          userId: userData.id,
          mood: userMood,
          note: userNote,
          date: dateStr,
          createdAt: d.getTime()
        }));

        // Partner Entry (approx. synched or offset)
        const partnerMood = moodsList[Math.floor(Math.random() * moodsList.length)];
        const partnerNote = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
        const partnerDocRef = doc(collection(db, `coupleSpaces/${space.id}/moods`));
        batchList.push(setDoc(partnerDocRef, {
          id: partnerDocRef.id,
          coupleSpaceId: space.id,
          userId: pId,
          mood: partnerMood,
          note: partnerNote,
          date: dateStr,
          createdAt: d.getTime() + 1000
        }));
      }

      await Promise.all(batchList);
      fetchMoods();
    } catch (err) {
      console.error("Seeding failed", err);
    } finally {
      setLogging(false);
    }
  };

  const getAuraIcon = (mood: string) => {
    const m = mood.toLowerCase();
    if (m.includes('electric') || m.includes('spicy')) return <Zap className="w-12 h-12 text-yellow-400 fill-yellow-100" />;
    if (m.includes('serene') || m.includes('peaceful')) return <Waves className="w-12 h-12 text-blue-400" />;
    if (m.includes('warm') || m.includes('connected')) return <Heart className="w-12 h-12 text-rose-400 fill-rose-100" />;
    return <Wind className="w-12 h-12 text-purple-400" />;
  };

  // Convert raw Firestore timeline docs to structured Recharts daily dual logs
  const getProcessedFlowData = () => {
    const grouped: Record<string, { date: string; user?: number; partner?: number; userMood?: string; partnerMood?: string; userNote?: string; partnerNote?: string }> = {};
    
    moodHistory.forEach(entry => {
      const dateStr = entry.date;
      if (!grouped[dateStr]) {
        grouped[dateStr] = { date: dateStr };
      }
      const score = MOOD_MAPPING[entry.mood]?.score || 3;
      if (entry.userId === userData?.id) {
        grouped[dateStr].user = score;
        grouped[dateStr].userMood = entry.mood;
        grouped[dateStr].userNote = entry.note;
      } else {
        grouped[dateStr].partner = score;
        grouped[dateStr].partnerMood = entry.mood;
        grouped[dateStr].partnerNote = entry.note;
      }
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getProcessedBalanceData = () => {
    const counts: Record<string, number> = {};
    moodHistory.forEach(entry => {
      counts[entry.mood] = (counts[entry.mood] || 0) + 1;
    });

    return Object.keys(counts).map(key => ({
      name: MOOD_MAPPING[key]?.label || key,
      value: counts[key],
      color: MOOD_MAPPING[key]?.color || '#F43F5E',
      emoji: MOOD_MAPPING[key]?.emoji || '✨',
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-xs max-w-[280px]">
          <p className="font-bold text-slate-400 mb-2 font-mono">{label}</p>
          {payload.map((p: any) => {
            const isUser = p.name === 'Me';
            const o = p.payload;
            const moodStr = isUser ? o.userMood : o.partnerMood;
            const noteStr = isUser ? o.userNote : o.partnerNote;
            const config = MOOD_MAPPING[moodStr] || { emoji: '✨' };
            
            return (
              <div key={p.name} className="mb-2 last:mb-0">
                <div className="flex items-center gap-1.5 font-semibold" style={{ color: p.color }}>
                  <span>{isUser ? 'Me' : partnerData?.displayName || 'Partner'}</span>
                  <span>•</span>
                  <span>{config.emoji} {moodStr}</span>
                </div>
                {noteStr && (
                  <p className="text-slate-300 italic mt-0.5 pl-2 border-l border-white/10 break-words leading-relaxed select-none">
                    "{noteStr}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden relative pb-10">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.15)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.1)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 pt-16 px-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 hover:bg-white/15 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-serif font-bold tracking-tight">Emotional Pulse</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Guardian AIRA Monitoring</span>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Premium Pill Tabs */}
      <div className="relative z-10 mx-6 mt-6 p-1 bg-white/5 border border-white/10 rounded-full flex justify-between">
        <button
          onClick={() => setActiveTab('pulse')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-full transition-all ${
            activeTab === 'pulse' 
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          AIRA AI Insight
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-full transition-all ${
            activeTab === 'charts' 
              ? 'bg-gradient-to-r from-purple-500 via-rose-500 to-pink-500 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Mood Analytics
        </button>
      </div>

      <div className="relative z-10 px-6 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'pulse' ? (
            <motion.div
              key="pulse-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                     <BrainCircuit className="w-16 h-16 text-rose-500/50" />
                  </motion.div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Scanning emotional resonance...</p>
                </div>
              ) : (
                <div className="w-full space-y-8">
                  {/* The Aura Sphere */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-64 h-64 flex items-center justify-center">
                      <motion.div 
                         animate={{ scale: [1, 1.05, 1], rotate: [0, 360] }}
                         transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                         className="absolute inset-0 bg-gradient-to-tr from-rose-500/30 via-purple-500/20 to-blue-500/30 rounded-full blur-3xl opacity-60"
                      />
                      <div className="relative z-10 bg-white/5 border border-white/10 w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl">
                        {getAuraIcon(data?.mood || 'Warm')}
                        <div className="mt-2 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Current Aura</p>
                          <h2 className="text-2xl font-serif font-black text-white">{data?.mood || 'Warm / Loving'}</h2>
                        </div>
                      </div>
                      
                      {/* Floating Stats */}
                      <motion.div 
                        initial={{ x: 20, opacity: 0 }} 
                        animate={{ x: 0, opacity: 1 }} 
                        transition={{ delay: 0.2 }}
                        className="absolute top-0 right-0 bg-white/10 border border-white/10 p-3 rounded-2xl shadow-xl"
                      >
                        <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sync Level</p>
                        <p className="text-lg font-black text-emerald-400">{data?.connectionLevel || 98}%</p>
                      </motion.div>
                    </div>
                  </div>

                  {/* AI Insight Card */}
                  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6">
                      <Sparkles className="w-6 h-6 text-rose-500 group-hover:animate-spin transition-all" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-rose-500 mb-4">Aira Insight</h3>
                    <p className="text-xl font-medium text-slate-200 leading-relaxed italic">
                      "{data?.insight || 'Your connection with each other glows under high sync values and deep conversational consistency. Cherish this emotional sanctuary.'}"
                    </p>
                  </div>

                  {/* Predicted Love Language */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                      <ShieldCheck className="w-5 h-5 text-blue-400 mb-3" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Primary Pattern</p>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">{data?.loveLanguagePrediction || 'Quality Time'}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                      <Heart className="w-5 h-5 text-rose-400 mb-3" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Partner Tone</p>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">{partnerData?.mood || 'Calm'}</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => navigate('/cloudhearts')}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-sm shadow-xl shadow-rose-900/40 hover:scale-[1.01] active:scale-95 hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Zap className="w-5 h-5" /> Enhance Connection
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="charts-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 w-full"
            >
              {/* Controls & Mini Stats Header */}
              <div className="flex justify-between items-center bg-white/5 border border-white/1 w-full p-4 rounded-3xl border-white/10">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-bold">Rhythms History</span>
                </div>
                <div className="flex gap-1.5 p-0.5 bg-black/40 rounded-xl">
                  <button
                    onClick={() => setChartView('flow')}
                    className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all ${
                      chartView === 'flow' ? 'bg-white/10 text-white' : 'text-slate-400'
                    }`}
                  >
                    Flow
                  </button>
                  <button
                    onClick={() => setChartView('balance')}
                    className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all ${
                      chartView === 'balance' ? 'bg-white/10 text-white' : 'text-slate-400'
                    }`}
                  >
                    Balance
                  </button>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="bg-slate-900/80 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative">
                {moodHistory.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center justify-center gap-4">
                    <Database className="w-12 h-12 text-slate-500 animate-bounce mb-2" />
                    <p className="font-serif italic text-base text-slate-300">No mood records stored in connection history yet.</p>
                    <p className="text-xs text-slate-400 max-w-xs">Populate your history or start logging daily vibes to view premium relation graphs!</p>
                    
                    <button
                      onClick={seedHistoricalData}
                      disabled={logging}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 via-rose-500 to-pink-500 rounded-full font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {logging ? "Populating..." : "Seed 30-Day Loving Record"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="h-[280px] w-full">
                      {chartView === 'flow' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getProcessedFlowData()} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FB7185" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#FB7185" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="partnerGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#ffffff30" 
                              fontSize={9} 
                              tickLine={false} 
                              tickFormatter={(tick) => {
                                const parts = tick.split('-');
                                return parts.length > 2 ? `${parts[1]}/${parts[2]}` : tick;
                              }}
                            />
                            <YAxis 
                              stroke="#ffffff30" 
                              fontSize={9} 
                              domain={[1, 5]} 
                              tickLine={false}
                              ticks={[1, 2, 3, 4, 5]}
                              tickFormatter={(tick) => {
                                const labels: Record<number, string> = { 1: '🌧️', 2: '☁️', 3: '🍃', 4: '💕', 5: '⚡' };
                                return labels[tick] || '';
                              }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 10, opacity: 0.8, paddingTop: 10 }} />
                            <Area 
                              name="Me" 
                              type="monotone" 
                              dataKey="user" 
                              stroke="#FB7185" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#userGrad)" 
                              connectNulls
                            />
                            <Area 
                              name={partnerData?.displayName || "Partner"} 
                              type="monotone" 
                              dataKey="partner" 
                              stroke="#A78BFA" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#partnerGrad)" 
                              connectNulls
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getProcessedBalanceData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {getProcessedBalanceData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any, name: any) => [`${value} entries`, name]} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 10, opacity: 0.8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    
                    {/* Tiny stats or clear action */}
                    <div className="mt-4 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400 pl-2">
                      <div className="flex items-center gap-1.5">
                        <FlameKindling className="w-3.5 h-3.5 text-orange-400" />
                        <span>{moodHistory.length} Total Connection Records</span>
                      </div>
                      <button 
                        onClick={seedHistoricalData}
                        disabled={logging}
                        className="text-purple-400 hover:text-purple-300 font-black cursor-pointer bg-none border-none disabled:opacity-50"
                      >
                        Reset / Re-Seed Timeline
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Log Mood Card Form */}
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkle className="w-5 h-5 text-rose-500 animate-pulse" />
                  <h3 className="text-md font-serif font-semibold text-white">Share Today's Aura</h3>
                </div>

                {/* Mood selector list */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1 block">My Current Feeling:</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Object.keys(MOOD_MAPPING).map(mKey => {
                      const m = MOOD_MAPPING[mKey];
                      const selected = userLoggedMood === mKey;
                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => setUserLoggedMood(mKey)}
                          className={`py-3.5 px-1 rounded-2xl border flex flex-col items-center transition-all ${
                            selected 
                              ? 'bg-white/10 border-white text-white scale-105 shadow-md' 
                              : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'
                          }`}
                        >
                          <span className="text-xl mb-1">{m.emoji}</span>
                          <span className="text-[8px] font-bold text-center uppercase tracking-tight truncate w-full">{mKey}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Joint Logging */}
                {partnerData && (
                  <div className="bg-black/30 p-4 rounded-3xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black tracking-widest uppercase text-purple-400">Log Partner's Mood Together?</label>
                      <input 
                        type="checkbox"
                        checked={simulatePartnerInput}
                        onChange={(e) => setSimulatePartnerInput(e.target.checked)}
                        className="w-4 h-4 text-purple-500 rounded border-white/10 focus:ring-purple-500"
                        id="check-simulate"
                      />
                    </div>
                    {simulatePartnerInput && (
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {Object.keys(MOOD_MAPPING).map(mKey => {
                          const m = MOOD_MAPPING[mKey];
                          const selected = partnerLoggedMood === mKey;
                          return (
                            <button
                              key={`partner-${mKey}`}
                              type="button"
                              onClick={() => setPartnerLoggedMood(mKey)}
                              className={`py-2 px-1 rounded-2xl border flex flex-col items-center transition-all ${
                                selected 
                                  ? 'bg-purple-500/20 border-purple-400 text-white scale-105 shadow-md' 
                                  : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'
                              }`}
                            >
                              <span className="text-lg mb-0.5">{m.emoji}</span>
                              <span className="text-[8px] font-bold text-center uppercase tracking-tight truncate w-full">{mKey}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Text whisper note input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black tracking-widest uppercase text-slate-400">Emotional Whisper (Note):</label>
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={userLoggedNote}
                    onChange={(e) => setUserLoggedNote(e.target.value)}
                    placeholder="Briefly whisper your thoughts..."
                    maxLength={100}
                    className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-4 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-400 transition-all"
                  />
                </div>

                {/* Date select picker */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black tracking-widest uppercase text-slate-400">Target Date:</label>
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-400 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={onAddMood}
                  disabled={logging}
                  className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 h-13 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:scale-[1.01] active:scale-95 hover:brightness-110 active:brightness-95 transition-all text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {logging ? "Recording Rhythm..." : "Record Daily Rhythm"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}

