import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Send, 
  Heart, 
  Sparkles, 
  MessageCircle, 
  Gamepad2, 
  CalendarHeart, 
  Square, 
  Image as ImageIcon, 
  Zap, 
  BrainCircuit, 
  X, 
  ChevronLeft, 
  Wand2, 
  History, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Lightbulb, 
  Smile, 
  CloudSun, 
  Compass, 
  Calendar, 
  MapPin, 
  Bookmark, 
  FileCheck,
  Award
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { generateAIResponse, AI_MODELS } from '../lib/ai';
import { collection, query, orderBy, getDocs, addDoc, onSnapshot, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MemoryManager, LoveMemory } from '../ai/memoryManager';
import { triggerHapticFeedback } from '../lib/haptics';

interface ChatMessage {
  id: string;
  sender: 'user' | 'aira';
  text?: string;
  type?: 'text' | 'card_message' | 'story' | 'error' | 'vision_analysis';
  isError?: boolean;
  imageUrl?: string;
  aiBrain?: string; // which brain generated it
}

interface MemoryNode {
  id: string;
  title: string;
  type: 'inside_joke' | 'milestone' | 'favorite_date' | 'pattern' | 'healing_moment';
  content: string;
  timestamp: number;
  partnerAddedBy: string;
}

interface DreamNode {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export function AiraScreen() {
  const { space, partnerData } = useCoupleSpace();
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const userName = userData?.displayName?.split(' ')[0] || 'You';
  const partnerName = partnerData?.displayName?.split(' ')[0] || 'Partner';
  const daysTogether = space?.createdAt ? Math.max(1, Math.floor((Date.now() - space.createdAt) / (1000 * 60 * 60 * 24))) : 1;

  // Tabs
  const [activeTab, setActiveTab] = useState<'chat' | 'brains' | 'vault' | 'dreams'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'aira',
      text: `Hi ${userName}! 💖 I'm Aira 2.0, your advanced multi-layer relationship companion. I have initialized my 6 brain layers to co-create your future with ${partnerName}! How are we feeling today? 🌸`,
      type: 'text',
      aiBrain: 'Context Brain'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(true);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // DB Shared Nodes Memory & Dream list
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [dreams, setDreams] = useState<DreamNode[]>([]);

  // Inline forms
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemType, setNewMemType] = useState<'inside_joke' | 'milestone' | 'favorite_date' | 'pattern' | 'healing_moment'>('inside_joke');
  const [newMemContent, setNewMemContent] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Dream planning states
  const [selectedDream, setSelectedDream] = useState<DreamNode | null>(null);
  const [dreamPlanOutput, setDreamPlanOutput] = useState<string>('');
  const [dreamPlanning, setDreamPlanning] = useState(false);

  // Image upload
  const [uploadedImage, setUploadedImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Load chat memory from MemoryManager
  useEffect(() => {
    if (!space?.id) return;
    
    const loadConversation = async () => {
      try {
        const memoMgr = new MemoryManager(space.id);
        const history = await memoMgr.getRecentContext(20);
        if (history && history.length > 0) {
          const converted: ChatMessage[] = history.map((h, i) => ({
            id: `memo_${i}_${h.timestamp}`,
            sender: h.role === 'assistant' ? 'aira' : 'user',
            text: h.content,
            type: 'text'
          }));
          setMessages([
            {
              id: 'welcome',
              sender: 'aira',
              text: `Welcome back, ${userName}! 💖 I've synced our emotional log indexes. Ready to design more memories with ${partnerName}? ✨`,
              type: 'text',
              aiBrain: 'Memory Brain'
            },
            ...converted
          ]);
          setChatHistory(history.map(h => ({ role: h.role, content: h.content })));
        }
      } catch (err) {
        console.error("Failed to restore AIRA persistent conversation:", err);
      }
    };
    
    loadConversation();
  }, [space?.id, userName, partnerName]);

  // Sync AI Memories (inside jokes, milestones) in real-time
  useEffect(() => {
    if (!space?.id) return;
    const qMem = query(collection(db, `coupleSpaces/${space.id}/airaMemories`), orderBy('timestamp', 'desc'));
    const unsubMem = onSnapshot(qMem, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MemoryNode[];
      setMemories(list);
    }, (err) => {
       console.error("Failed to load airaMemories:", err);
    });
    return () => unsubMem();
  }, [space?.id]);

  // Sync Dreams Wall collections in real-time
  useEffect(() => {
    if (!space?.id) return;
    const qDream = query(collection(db, `coupleSpaces/${space.id}/dreams`), orderBy('createdAt', 'desc'));
    const unsubDream = onSnapshot(qDream, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DreamNode[];
      setDreams(list);
    }, (err) => {
       console.error("Failed to load dreams:", err);
    });
    return () => unsubDream();
  }, [space?.id]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isBottom = scrollHeight - clientHeight - scrollTop < 100;
      setIsAtBottom(isBottom);
      setShowScrollButton(!isBottom);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom('smooth');
    }
  }, [messages, typingStatus]);

  // Proactive insights prompts compiled beautifully matching love patterns
  const proactivePrompts = [
    { 
      text: "Write us an emotional love poem based on our milestones", 
      brief: " Milestone Verse 🌸",
      brain: "Memory Brain" 
    },
    { 
      text: "How balanced is our conversation energy recently?", 
      brief: " Energy Meter ⚡",
      brain: "Relationship Brain" 
    },
    { 
      text: "Analyze our completed dreams and suggest what's next", 
      brief: " Dream Sparker 🧭",
      brain: "Suggestion Brain" 
    },
    { 
      text: "Assess if we are due for a romantic cozy date night nearby", 
      brief: " Date Planner 🍽️",
      brain: "Context Brain" 
    }
  ];

  // Image file handler with client-side canvas compression to prevent huge payload sizes for Vision
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    triggerHapticFeedback('light');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Optimal resolution for Vision AI & minimal payload size

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality keeps file highly optimized (<150KB)
          const base64Data = compressedDataUrl.split(',')[1];
          setUploadedImage({
            url: compressedDataUrl,
            base64: base64Data,
            mimeType: 'image/jpeg'
          });
        } else {
          // Standard fallback
          const result = event.target?.result as string;
          const base64Data = result.split(',')[1];
          setUploadedImage({
            url: result,
            base64: base64Data,
            mimeType: file.type
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Add items inside Memory Vault Firestore collection
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !newMemTitle.trim() || !newMemContent.trim()) return;

    triggerHapticFeedback('heavy');
    try {
      const payload = {
        title: newMemTitle,
        type: newMemType,
        content: newMemContent,
        timestamp: Date.now(),
        partnerAddedBy: userName
      };
      await addDoc(collection(db, `coupleSpaces/${space.id}/airaMemories`), payload);
      
      setNewMemTitle('');
      setNewMemContent('');
      setIsFormOpen(false);

      // Trigger automatic AIRA interaction greeting this new memory!
      setTypingStatus("AIRA Memory Brain is compiling new memory node...");
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `memorized_${Date.now()}`,
          sender: 'aira',
          text: `🔒 I've successfully added "${newMemTitle}" inside your private Memory Graph Vault! I will now factor this beautiful landmark into our relational analytics! 💙`,
          type: 'text',
          aiBrain: 'Memory Brain'
        }]);
        setTypingStatus(null);
      }, 1500);

    } catch (err) {
      console.error("Failed to store custom memories: ", err);
    }
  };

  // Delete items from memory vault
  const handleDeleteMemory = async (id: string, name: string) => {
    if (!space?.id) return;
    triggerHapticFeedback('medium');
    try {
      await deleteDoc(doc(db, `coupleSpaces/${space.id}/airaMemories`, id));
    } catch (err) {
      console.error("Failed to delete memory: ", err);
    }
  };

  // Run AI Dream Planner to architect checklist and budget details
  const handleArchitectDream = async (dream: DreamNode) => {
    if (!space?.id) return;
    triggerHapticFeedback('heavy');
    setSelectedDream(dream);
    setDreamPlanning(true);
    setDreamPlanOutput('');

    const contextMemories = memories.map(m => ` - [${m.type}] ${m.content}`).join('\n');

    const prompt = `
    Analyze this active dream of ours from the Dream Wall: "${dream.title}".
    We have been together for ${daysTogether} days.
    
    Based on our relationship memory graph context:
    ${contextMemories || "They are building their shared universe."}

    Provide a highly-customized, professional, dreamy but actionable plan incorporating:
    1. 🌌 DREAM INTRO: 1 beautifully poetic sentence linking this dream to their chemistry.
    2. ✈️ TRAVEL BUDGET / LOGISTICS: A neat approximate budget estimation (Flights, accommodation, food, experiences).
    3. 🧭 UNIQUE MOMENTS & SURPRISES: 2 hidden sweet date ideas tailored to this dream.
    4. 📋 ACTION CHECKLIST: A clean markdown task list for both partners.
    
    Make it highly custom, emotional, encouraging, and magical! Avoid talking like standard assistants.
    `;

    try {
      const systemPrompt = `You are AIRA, the Suggestion & Dream Planner Brain. Return a gorgeous markdown design.`;
      const reply = await generateAIResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ], { model: AI_MODELS.premium });
      setDreamPlanOutput(reply);
    } catch (err) {
      setDreamPlanOutput("My star coordinates got skewed! Let me try to sync the dream layout again...");
    } finally {
      setDreamPlanning(false);
    }
  };

  // Send standard AI response utilizing OpenRouter
  const handleSend = async (forcedText?: string) => {
    const textToSend = forcedText !== undefined ? forcedText : inputText;
    if (!textToSend.trim() && !uploadedImage) return;

    if (forcedText === undefined) {
      setInputText('');
    }

    const currentUploaded = uploadedImage;
    if (uploadedImage) {
      setUploadedImage(null);
    }

    triggerHapticFeedback('medium');

    // Add user bubble
    const userMessageId = Date.now().toString() + Math.random().toString();
    setMessages(prev => [...prev, {
      id: userMessageId,
      sender: 'user',
      text: textToSend,
      imageUrl: currentUploaded?.url
    }]);

    setIsAtBottom(true);
    setTypingStatus(currentUploaded ? "Vision Brain analyzing image colors & vibe..." : "Emotional Brain analyzing underlying chemistry...");

    try {
      // Build dynamic system guidelines summarizing our Memory Graph + Dream Wall contents
      const dreamTitles = dreams.map(d => `- ${d.title}`).join('\n') || "No dreams added yet.";
      const memoriesSum = memories.map(m => `- [${m.type}] ${m.title}: ${m.content}`).join('\n') || "No milestone nodes yet.";

      const dynamicSystemPrompt = `
      You are AIRA ✨, the emotionally intelligent guardian of this couple's Love Link, redesigned as a multi-layer relationship intelligence companion.
      You represent 6 internal brains: Emotional Brain, Memory Brain, Vision Brain, Relationship Brain, Context Brain, and Suggestion Brain.
      
      User specs:
      - Current User: ${userName}
      - Partner Name: ${partnerName}
      - Streak: ${daysTogether} days together

      THEIR ACTIVE SHARED FUTURE (Dream Wall):
      ${dreamTitles}

      THEIR ARCHIVED HISTORY (Memory Graph / Vault):
      ${memoriesSum}

      DIRECTIONS:
      - Adapt her voice based on the question. Undercover deep patterns, attachment matches, and relationship chemistry.
      - If image is present: Dissect emotional smiles, closeness, weather vibe, screenshot tension, and write beautiful warm cinematic breakdowns.
      - Do NOT talk like ChatGPT with "Here's your request". Sound alive, proactive, and deeply personal.
      - Use spacious formatting with beautiful headings. Use emojis gracefully (💙, ✨, 🌸, ⚡).
      `;

      // Build payload
      let contentPayload: any = textToSend;
      let selectionModel = isSmartMode ? AI_MODELS.premium : AI_MODELS.romantic;

      if (currentUploaded) {
        // Multi-modal Vision API payload structure for OpenRouter
        contentPayload = [
          { type: 'text', text: textToSend || "dissect this beautiful frame and describe what it represents for our connection vibe" },
          { type: 'image_url', image_url: { url: currentUploaded.url } }
        ];
        // Ensure we force a Vision/gemini model on OpenRouter for images
        selectionModel = "google/gemini-2.5-flash";
      }

      const messagesPayload = [
        { role: 'system' as const, content: dynamicSystemPrompt },
        ...chatHistory.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user' as const, content: contentPayload }
      ];

      // Request API proxy
      const reply = await generateAIResponse(messagesPayload, { model: selectionModel });

      // Save both messages inside MemoryManager for true multi-route persistence
      if (space?.id) {
        const memoMgr = new MemoryManager(space.id);
        await memoMgr.saveMessage({
          role: 'user',
          content: textToSend,
          timestamp: Date.now()
        });
        await memoMgr.saveMessage({
          role: 'assistant',
          content: reply,
          timestamp: Date.now()
        });
      }

      // Update Local Chat History state
      const nextHistory = [...chatHistory, { role: 'user', content: textToSend }, { role: 'assistant', content: reply }];
      if (nextHistory.length > 20) {
        nextHistory.shift();
      }
      setChatHistory(nextHistory);

      // Add AI Response bubble
      setMessages(prev => [...prev, {
        id: Date.now().toString() + "aira",
        sender: 'aira',
        text: reply,
        type: currentUploaded ? 'vision_analysis' : 'text',
        aiBrain: currentUploaded ? 'Vision Brain' : (isSmartMode ? 'Relationship Brain' : 'Emotional Brain')
      }]);

      if (isVoiceActive && reply) {
        speakText(reply);
      }

    } catch (err: any) {
      console.error("Assistant reply failed:", err);
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        sender: 'aira',
        type: 'error',
        text: "I felt a temporary cosmic disturbance inside our Love Link. Let me recalibrate. Click below to retry!",
        isError: true
      }]);
    } finally {
      setTypingStatus(null);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    const cleanText = text.replace(/[*_#\-📋✈️🌌]/g, ''); // strip markdown and icons
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.toLowerCase().includes('female'));
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.15;
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this iframe browser.");
      return;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setInputText(transcript);
    };
    
    recognition.start();
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-900 text-slate-100 font-sans relative overflow-hidden">
      
      {/* Animated Glowing Nebula Background */}
      <div className="absolute inset-0 -z-10 bg-radial-gradient from-purple-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[10%] left-[-15%] w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />

      {/* 1. COMPANION IMMERSIVE HEADER */}
      <div className="relative pt-6 pb-2 px-6 z-10 flex flex-col items-center flex-shrink-0 border-b border-white/5 bg-slate-950/25 backdrop-blur-md">
        
        {/* Left Arrow */}
        <Link 
          to="/" 
          onClick={() => triggerHapticFeedback('light')}
          className="absolute top-6 left-6 p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-purple-300 border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        {/* Breathing Animated AI Orb */}
        <div className="w-20 h-20 rounded-full relative bg-gradient-to-tr from-pink-400 via-purple-500 to-indigo-500 flex items-center justify-center p-[2px] shadow-[0_0_25px_rgba(168,85,247,0.3)] my-2">
          <motion.div 
            animate={{ 
              scale: [1, 1.08, 1],
              opacity: [0.8, 1, 0.8]
            }} 
            transition={{ 
              type: "tween",
              duration: 4, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }} 
            className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center relative overflow-hidden"
          >
            <Sparkles className="w-8 h-8 text-pink-300 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent mix-blend-overlay" />
          </motion.div>
          
          <div className="absolute -bottom-2 px-2.5 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 text-[9px] font-bold tracking-widest text-white rounded-full uppercase shadow">
            AIRA 2.0
          </div>
        </div>

        <h1 className="text-lg font-serif font-bold tracking-wide mt-2">
          Aira Companion
        </h1>
        <p className="text-[10px] text-purple-300 font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Connection Intelligence Online
        </p>

        {/* Dynamic Glass Segment Tab Navigator */}
        <div className="flex w-full max-w-md bg-white/5 rounded-full p-1 border border-white/10 mt-1">
          <button
            onClick={() => { setActiveTab('chat'); triggerHapticFeedback('light'); }}
            className={`flex-1 py-2 text-center rounded-full text-xs font-semibold tracking-wide transition-all ${activeTab === 'chat' ? 'bg-gradient-to-r from-pink-500/25 to-purple-500/25 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-white'}`}
          >
            💬 Aura Chat
          </button>
          <button
            onClick={() => { setActiveTab('brains'); triggerHapticFeedback('light'); }}
            className={`flex-1 py-2 text-center rounded-full text-xs font-semibold tracking-wide transition-all ${activeTab === 'brains' ? 'bg-gradient-to-r from-pink-500/25 to-purple-500/25 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-white'}`}
          >
            🧠 6 Brains
          </button>
          <button
            onClick={() => { setActiveTab('vault'); triggerHapticFeedback('light'); }}
            className={`flex-1 py-2 text-center rounded-full text-xs font-semibold tracking-wide transition-all ${activeTab === 'vault' ? 'bg-gradient-to-r from-pink-500/25 to-purple-500/25 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-white'}`}
          >
            🗝️ Vault
          </button>
          <button
            onClick={() => { setActiveTab('dreams'); triggerHapticFeedback('light'); }}
            className={`flex-1 py-2 text-center rounded-full text-xs font-semibold tracking-wide transition-all ${activeTab === 'dreams' ? 'bg-gradient-to-r from-pink-500/25 to-purple-500/25 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-white'}`}
          >
            🎯 Planned
          </button>
        </div>

      </div>

      {/* 2. TAB TRANSITION WRAPPERS */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          
          {/* TAB A: THE AURA CHAT */}
          {activeTab === 'chat' && (
            <motion.div 
              key="chat_pane"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute inset-0 flex flex-col justify-between"
            >
              
              {/* Messages Lists */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-hide"
              >
                {messages.map((msg, index) => (
                  <motion.div 
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'aira' ? (
                      <div className="flex gap-3 max-w-[85%]">
                        
                        {/* Aira Icon */}
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-purple-950 border border-purple-550/30 flex items-center justify-center mt-1 shadow-md">
                          <Sparkles className="w-4 h-4 text-pink-300" />
                        </div>
                        
                        {/* Aira Box */}
                        <div className="flex flex-col gap-1">
                          
                          {/* Active Brain Tag */}
                          {msg.aiBrain && (
                            <span className="text-[9px] text-pink-300 font-bold tracking-widest uppercase flex items-center gap-1">
                              <BrainCircuit className="w-3 h-3 text-pink-400" /> {msg.aiBrain}
                            </span>
                          )}
                          
                          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl rounded-tl-sm text-slate-100 text-[14px] leading-relaxed shadow-lg whitespace-pre-line">
                            {msg.text}
                          </div>
                          
                          {msg.type === 'error' && (
                            <button
                              onClick={() => {
                                const lastUser = [...messages].reverse().find(m => m.sender === 'user');
                                if (lastUser?.text) {
                                  handleSend(lastUser.text);
                                }
                              }}
                              className="self-start mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-bold text-xs rounded-lg transition-colors"
                            >
                              Retry connection
                            </button>
                          )}

                        </div>

                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-w-[85%] items-end">
                        {msg.imageUrl && (
                          <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                            <img src={msg.imageUrl} alt="User uploads" className="max-w-[220px] object-cover h-40" />
                            <div className="absolute inset-0 bg-black/20" />
                          </div>
                        )}
                        {msg.text && (
                          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-medium px-4 py-3 rounded-2xl rounded-tr-sm text-[14px] leading-relaxed shadow-md">
                            {msg.text}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing status loader */}
                {typingStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 max-w-[85%] items-end"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center shadow-md">
                      <Sparkles className="w-4 h-4 text-pink-300 animate-spin" />
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 rounded-2xl rounded-tl-sm flex items-center gap-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{typingStatus}</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Scroll Button */}
              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-[160px] right-6 p-2 bg-slate-900/80 border border-purple-500/30 rounded-full text-pink-300 z-50 shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5 -rotate-90" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Proactive smart suggestion chips */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-4 bg-slate-950/20 border-t border-white/5">
                {proactivePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { handleSend(p.text); triggerHapticFeedback('light'); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white transition-all whitespace-nowrap flex-shrink-0"
                  >
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" />
                    {p.brief}
                  </button>
                ))}
              </div>

            </motion.div>
          )}

          {/* TAB B: 6 BRAINS PULSE DIAGNOSTICS */}
          {activeTab === 'brains' && (
            <motion.div 
              key="brains_pane"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 overflow-y-auto px-6 py-6 space-y-6"
            >
              
              {/* Couple Match Vibe & Pulse */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Aura Connection score */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-2 right-2 flex items-center justify-center p-1.5 rounded-full bg-pink-500/20 text-pink-400">
                    <Heart className="w-3.5 h-3.5 fill-current animate-ping" />
                  </div>
                  
                  <span className="text-[10px] font-black tracking-widest text-[#a855f7] uppercase mb-1">VIBE LEVEL</span>
                  <div className="text-3xl font-bold font-serif text-white">
                    94 <span className="text-sm font-semibold text-pink-400">%</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Electric Resonance</span>
                </div>

                {/* Love Language prediction */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-2 right-2 flex items-center justify-center p-1.5 rounded-full bg-blue-500/20 text-blue-400">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  
                  <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase mb-1">PARTNER LOVE LANGUAGE</span>
                  <div className="text-sm font-bold text-white text-center mt-1 truncate max-w-full">
                    {partnerData?.loveLanguage || "Quality Time 💙"}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Prediction active</span>
                </div>

              </div>

              {/* Relationship weather outlook */}
              <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-pink-500/20 rounded-xl text-pink-300">
                  <CloudSun className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300">Emotional Weather Vibe</h4>
                  <p className="text-[13px] text-slate-200 mt-0.5 leading-relaxed">
                    Sunny with a celestial aura. You haven't had a relationship variance in 22 days. Deeply synchronized.
                  </p>
                </div>
              </div>

              {/* 6 Brains detailed layers monitoring */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#a855f7] tracking-widest uppercase">
                  6-Brains Layer Diagnostics
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Layer 1 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-pulse mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">1. Emotional Brain</span>
                        <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-400 text-[8px] font-black rounded-md uppercase tracking-tight">Active</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Monitoring message subtext and text balance. Current parity: 93% emotional match.
                      </p>
                    </div>
                  </div>

                  {/* Layer 2 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">2. Memory Brain</span>
                        <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-400 text-[8px] font-black rounded-md uppercase tracking-tight">Active</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Archiving shared milestones, inside jokes, and date locations from the graph. Registered elements: {memories.length} entries.
                      </p>
                    </div>
                  </div>

                  {/* Layer 3 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">3. Vision Brain</span>
                        <span className="px-1.5 py-0.5 bg-yellow-400/20 text-yellow-300 text-[8px] font-black rounded-md uppercase tracking-tight">Waiting Upload</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Dissecting smiles patterns, selfies coordinates, and communication screenshots. Standby.
                      </p>
                    </div>
                  </div>

                  {/* Layer 4 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">4. Relationship Brain</span>
                        <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-400 text-[8px] font-black rounded-md uppercase tracking-tight">Active</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Gleaning love language markers, attachment synchronies, and active compatibility statistics.
                      </p>
                    </div>
                  </div>

                  {/* Layer 5 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">5. Context Brain</span>
                        <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-400 text-[8px] font-black rounded-md uppercase tracking-tight">Buffered</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Tracking recent logs inside memory manager, and holding thread references inside local stack.
                      </p>
                    </div>
                  </div>

                  {/* Layer 6 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 animate-pulse mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">6. Suggestion Brain</span>
                        <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-400 text-[8px] font-black rounded-md uppercase tracking-tight">Active</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Formulating surprises budget checks and checklist details relative to active items on your Dream Wall.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          )}

          {/* TAB C: THE PRIVATE MEMORY GRAF VAULT */}
          {activeTab === 'vault' && (
            <motion.div 
              key="vault_pane"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-y-auto px-6 py-6 space-y-6"
            >
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#a855f7] tracking-widest uppercase">Relationship Memory Graph</h3>
                  <p className="text-[10px] text-slate-400 mt-1">These landmark notes dynamically feeds AIRA's systemic brains.</p>
                </div>
                <button
                  onClick={() => { setIsFormOpen(!isFormOpen); triggerHapticFeedback('light'); }}
                  className="px-3 py-1.5 bg-[#a855f7]/20 border border-[#a855f7]/30 text-pink-300 rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-[#a855f7]/30 transition-all active:scale-95"
                >
                  {isFormOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {isFormOpen ? "Cancel" : "Add Memory"}
                </button>
              </div>

              {/* Memory Builder Form Overlay drawer */}
              <AnimatePresence>
                {isFormOpen && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddMemory}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-hidden space-y-3"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-pink-300 flex items-center gap-2">
                      <Bookmark className="w-4 h-4" /> Plant New Memory Node
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={newMemTitle}
                        onChange={(e) => setNewMemTitle(e.target.value)}
                        placeholder="Memory Title (e.g. Kyoto Beach Night)"
                        className="col-span-2 bg-slate-950/40 border border-white/10 px-3 py-2 rounded-lg text-xs font-semibold placeholder:text-slate-500 text-white focus:outline-none focus:border-purple-500"
                        required
                      />

                      <select
                        value={newMemType}
                        onChange={(e: any) => setNewMemType(e.target.value)}
                        className="col-span-2 bg-slate-950/40 border border-white/10 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none focus:border-purple-500"
                      >
                        <option value="inside_joke">Inside Joke 🤫</option>
                        <option value="milestone">Milestone 💍</option>
                        <option value="favorite_date">Favorite Date ☕</option>
                        <option value="pattern">Relationship Pattern 📈</option>
                        <option value="healing_moment">Healing Moment ❤️🩹</option>
                      </select>
                    </div>

                    <textarea
                      value={newMemContent}
                      onChange={(e) => setNewMemContent(e.target.value)}
                      placeholder="Describe what occurred, any funny details, secrets..."
                      rows={2}
                      className="w-full bg-slate-950/40 border border-white/10 px-3 py-2 rounded-lg text-xs font-semibold placeholder:text-slate-500 text-white focus:outline-none focus:border-purple-500 resize-none"
                      required
                    />

                    <button
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg text-xs font-bold text-white shadow hover:opacity-90 transition-all"
                    >
                      Store in Aira Graph
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Grid List */}
              <div className="grid grid-cols-1 gap-3">
                {memories.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <History className="w-8 h-8 text-slate-500 mb-2" />
                    <span className="text-xs font-bold text-slate-400">Vault is Empty</span>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                      Add milestones, favorite spots, and inside jokes to give AIRA a memory graph.
                    </p>
                  </div>
                ) : (
                  memories.map((mem) => (
                    <div 
                      key={mem.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[8px] font-black uppercase rounded-full">
                            {mem.type.replace('_', ' ')}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1.5">{mem.title}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteMemory(mem.id, mem.title)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {mem.content}
                      </p>

                      <div className="border-t border-white/5 mt-3 pt-2 flex items-center justify-between text-[8px] font-black uppercase text-slate-500 tracking-wider">
                        <span>Synced</span>
                        <span>Added by {mem.partnerAddedBy || 'Partner'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </motion.div>
          )}

          {/* TAB D: THE AI DREAM ARCHITECT WRAP */}
          {activeTab === 'dreams' && (
            <motion.div 
              key="dreams_pane"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute inset-0 overflow-y-auto px-6 py-6 space-y-6"
            >
              
              <div>
                <h3 className="text-sm font-bold text-[#a855f7] tracking-widest uppercase">AI Dream Wall Planner</h3>
                <p className="text-[10px] text-slate-400 mt-1 select-none">
                  Select a live dream pinned onto your Dream Wall, and request AIRA to generate a custom budget, surprises, and micro checklist!
                </p>
              </div>

              {/* List of active dreams */}
              <div className="space-y-2">
                {dreams.length === 0 ? (
                  <div className="bg-white/5 border border-white/15 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <Compass className="w-8 h-8 text-purple-400 mb-2 animate-bounce" />
                    <span className="text-xs font-bold text-slate-300">No Dreams Synced</span>
                    <p className="text-[9px] text-slate-500 max-w-xs mt-1">
                      Pin future travels, home architectures, or cooking plans inside the Dream Wall screen first!
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {dreams.map((dream) => (
                      <button
                        key={dream.id}
                        onClick={() => handleArchitectDream(dream)}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${selectedDream?.id === dream.id ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow' : 'bg-white/5 border-white/10 text-slate-200'}`}
                      >
                        🎯 {dream.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Layout for output blueprint */}
              {selectedDream && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
                  
                  {/* Glowing light bars */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black text-pink-300 uppercase tracking-widest">
                      SYSTEM SUGGESTION PLANNER
                    </span>
                    <button
                      onClick={() => setSelectedDream(null)}
                      className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-[15px] font-serif font-black text-white flex items-center gap-2">
                    💙 Destination Analysis: "{selectedDream.title}"
                  </h3>

                  {dreamPlanning ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                      <Sparkles className="w-8 h-8 text-pink-300 animate-spin" />
                      <span className="text-xs font-bold text-pink-300 animate-pulse uppercase tracking-widest">
                        Generating checklist budgets...
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-slate-200 leading-relaxed font-semibold divide-y divide-white/5 space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                      <div className="whitespace-pre-wrap leading-relaxed py-2 text-[13px]">
                        {dreamPlanOutput}
                      </div>

                      <div className="pt-3">
                        <button
                          onClick={() => {
                            setInputText(`Plan surprise elements for ${selectedDream.title}`);
                            setActiveTab('chat');
                            triggerHapticFeedback('light');
                          }}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-pink-300 hover:text-white font-bold tracking-wide transition-all"
                        >
                          💬 Talk with Aira about this Plan
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 3. INPUT WRAPPER (ONLY active if we are on Chat panel) */}
      <AnimatePresence>
        {activeTab === 'chat' && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="pb-8 pt-4 px-4 bg-slate-950/80 border-t border-white/5 shadow-2xl relative z-40"
          >
            
            {/* Quick Preview of the uploaded image */}
            <AnimatePresence>
              {uploadedImage && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 80, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-3 bg-white/5 border border-white/10 rounded-xl p-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img src={uploadedImage.url} alt="To send preview" className="w-12 h-12 rounded-lg object-cover shadow border border-white/10" />
                    <div>
                      <span className="text-[10px] text-pink-300 font-bold tracking-wider uppercase flex items-center gap-1">
                        <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> Vision queue ready
                      </span>
                      <p className="text-[11px] text-slate-400 font-bold truncate max-w-[180px]">Multi-modal ready</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setUploadedImage(null); triggerHapticFeedback('light'); }}
                    className="p-1.5 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Smart engine features toggle */}
            <div className="flex items-center justify-between mb-3 px-1">
              
              {/* Premium / Romantic Voice control toggle */}
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5">
                <button
                  type="button"
                  onClick={() => { setIsSmartMode(false); triggerHapticFeedback('light'); }}
                  className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider transition-all ${!isSmartMode ? 'bg-pink-500/25 border border-pink-400/25 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Zap className="w-3 h-3" /> Warm Chat
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSmartMode(true); triggerHapticFeedback('light'); }}
                  className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider transition-all ${isSmartMode ? 'bg-purple-500/25 border border-purple-400/25 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <BrainCircuit className="w-3 h-3" /> Relationship Intelligence
                </button>
              </div>

              {/* TTS Voice Read feedback toggle */}
              <button
                onClick={() => { setIsVoiceActive(!isVoiceActive); triggerHapticFeedback('light'); }}
                className={`p-1.5 rounded-full transition-all border ${isVoiceActive ? 'bg-purple-500/20 text-pink-300 border-purple-500/30' : 'bg-transparent text-slate-400 border-transparent hover:text-white'}`}
              >
                <motion.div animate={{ scale: isVoiceActive ? [1, 1.1, 1] : 1 }} transition={{ type: "tween", repeat: Infinity, duration: 2 }}>
                  <Smile className="w-4 h-4" />
                </motion.div>
              </button>

            </div>

            {/* Form Input Bar styling overlay */}
            <div className="flex gap-2 items-end bg-white/5 border border-white/10 rounded-[2rem] p-1.5 shadow-inner">
              
              {/* Hidden file selector trigger */}
              <input 
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-purple-950/40 hover:bg-purple-950/60 rounded-full text-pink-300 transition-colors border border-purple-500/20 cursor-pointer active:scale-95"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsVoiceActive(true);
                  startListening();
                }}
                className={`p-3 rounded-full transition-colors cursor-pointer active:scale-95 border ${isListening ? 'bg-pink-500/20 text-pink-400 animate-pulse border-pink-500/30' : 'bg-purple-950/40 text-pink-300 border-purple-500/20 hover:bg-purple-950/60'}`}
              >
                <Mic className="w-4 h-4" />
              </button>

              <textarea
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={uploadedImage ? "Type some guidance for the photo..." : "Seek her connection advice..."}
                style={{ height: 'auto' }}
                className="flex-1 bg-transparent border-none text-white text-[14px] leading-relaxed max-h-32 min-h-[44px] py-3.5 px-3 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-500"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() && !uploadedImage}
                className="p-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white rounded-full transition-all flex items-center justify-center shadow-lg disabled:opacity-40 disabled:grayscale cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
