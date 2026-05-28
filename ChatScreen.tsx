import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { collection, query, orderBy, limit, onSnapshot, serverTimestamp, setDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { Send, Heart, Smile, Sparkles, Volume2, VolumeX, Mic, Square, Trash2, Play, Pause, Loader2, ArrowLeft, Phone, Video, Plus, Image, Camera, MapPin, Music, Edit2, UserPlus, Film, Info, Palette, X, Eye, EyeOff, Check, CheckCheck, Paperclip, MoreVertical, Wand2, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { format } from 'date-fns';
import { generateAIResponse, AI_MODELS } from '../lib/ai';
import { OpenRouterClient } from '../ai/openrouter';
import { MemoryManager } from '../ai/memoryManager';
import { generateChatAtmosphere } from '../services/visualPromptGenerator';
import io from 'socket.io-client';

async function uploadMediaWithFallback(blob: Blob | File, path: string, fallbackDataUrl?: string): Promise<string> {
  try {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  } catch (err) {
    console.warn("Firebase Storage upload failed, falling back to local base64 representation:", err);
    if (fallbackDataUrl) {
      return fallbackDataUrl;
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert blob to data url"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(blob);
    });
  }
}

function parseTheme(bgString?: string) {
  const defaultTheme = {
    chatBackground: 'default',
    gradientColors: 'linear-gradient(180deg, #FFF6F9 0%, #FFE8EF 45%, #F8EEFF 100%)',
    blurStyle: 'light',
    wallpaperUrl: '',
    particlesEnabled: true
  };
  
  if (!bgString) return defaultTheme;
  
  if (bgString.trim().startsWith('{')) {
    try {
      return { ...defaultTheme, ...JSON.parse(bgString) };
    } catch (e) {
      console.warn("Theme parsing failed, treating as simple string", e);
    }
  }
  
  if (bgString === 'soft_cloud') {
    return {
      chatBackground: 'soft_cloud',
      gradientColors: 'linear-gradient(180deg, #FFD5E1 0%, #FFE9ED 40%, #FFF5F7 100%)',
      blurStyle: 'light',
      wallpaperUrl: '',
      particlesEnabled: true
    };
  }
  if (bgString === 'moonlight') {
    return {
      chatBackground: 'moonlight',
      gradientColors: 'linear-gradient(180deg, #0C081A 0%, #170E2B 50%, #2B1440 100%)',
      blurStyle: 'dark',
      wallpaperUrl: '',
      particlesEnabled: true
    };
  }
  if (bgString === 'sunset_love') {
    return {
      chatBackground: 'sunset_love',
      gradientColors: 'linear-gradient(180deg, #FF8E9E 0%, #FCD3EE 50%, #FFD194 100%)',
      blurStyle: 'light',
      wallpaperUrl: '',
      particlesEnabled: true
    };
  }
  if (bgString === 'dreamscape') {
    return {
      chatBackground: 'dreamscape',
      gradientColors: 'linear-gradient(180deg, #090616 0%, #150D2E 50%, #2A103D 100%)',
      blurStyle: 'dark',
      wallpaperUrl: '',
      particlesEnabled: true
    };
  }
  
  if (bgString.startsWith('http') || bgString.startsWith('data:')) {
    return {
      chatBackground: 'custom',
      gradientColors: '',
      blurStyle: 'light',
      wallpaperUrl: bgString,
      particlesEnabled: false
    };
  }
  
  if (bgString.startsWith('linear-gradient') || bgString.startsWith('#')) {
    return {
      chatBackground: 'custom',
      gradientColors: bgString,
      blurStyle: 'light',
      wallpaperUrl: '',
      particlesEnabled: true
    };
  }
  
  return defaultTheme;
}

const REACTION_OPTIONS = ['❤️', '🌸', '😭', '🥺', '✨', '💋', '😡', '😂'];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200'
];

const ReactionMenu = React.memo(function ReactionMenu({ onSelect, onBlur }: { onSelect: (emoji: string) => void, onBlur: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-45 bg-transparent" onClick={(e) => { e.stopPropagation(); onBlur(); }} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.75, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.75, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 bg-[#FFF6F9]/90 backdrop-blur-3xl border border-[#F2A7BE]/30 rounded-full px-3.5 py-1.5 shadow-[0_12px_40px_rgba(232,84,122,0.18)] flex items-center gap-1.5"
      >
        {REACTION_OPTIONS.map(emoji => (
          <button 
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(emoji);
            }}
            className="text-2xl p-1 hover:scale-135 active:scale-80 transition-all duration-200 hover:rotate-6 select-none"
          >
            {emoji}
          </button>
        ))}
      </motion.div>
    </>
  );
});

const HeartAnimation = React.memo(function HeartAnimation({ x, y }: { x: number, y: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 0.5, x, y }}
      animate={{ 
        opacity: 0, 
        scale: 1.5, 
        y: y - 100,
        x: x + (Math.random() - 0.5) * 50
      }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="pointer-events-none fixed z-[60] text-pink-500"
    >
      <Heart className="w-8 h-8 fill-current" />
    </motion.div>
  );
});

const preloadedMessages = [
  "I love you ❤️",
  "You mean everything to me 💖",
  "Thinking of you... 💕",
  "Can't wait to see you! 🥰",
  "You are my sunshine ☀️"
];

const MOOD_CHIPS = [
  { emoji: '🌙', text: 'Missing you' },
  { emoji: '✨', text: 'Good morning' },
  { emoji: '💌', text: 'Soft thought' },
  { emoji: '🎧', text: 'Whisper' },
  { emoji: '💭', text: 'Thinking of us' }
];

const VoiceMessageBubble = React.memo(function VoiceMessageBubble({ url, duration, isMe, currentlyPlaying, setCurrentlyPlaying, messageId, onDelete }: { url: string, duration: number, isMe: boolean, currentlyPlaying: string | null, setCurrentlyPlaying: (id: string | null) => void, messageId: string, onDelete?: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentlyPlaying !== messageId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlaying, messageId, isPlaying]);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentlyPlaying(null);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [url, setCurrentlyPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentlyPlaying(null);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
      setCurrentlyPlaying(messageId);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3.5 w-68 p-2.5 pr-5 rounded-[26px] transition-all border border-white/20 backdrop-blur-md group/voice relative overflow-hidden shadow-sm ${
      isMe 
        ? 'bg-gradient-to-br from-[#E8547A] to-[#BD3B5E] text-white shadow-[0_4px_15px_rgba(232,84,122,0.15)]' 
        : 'bg-gradient-to-br from-[#FFF0F3] to-[#FFF9FA] text-[#2B1A2E] border-[#F2A7BE]/30 shadow-[0_4px_15px_rgba(43,26,46,0.02)]'
    }`}>
      {/* Intimate Glow Ring Backdrop */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-xl opacity-35 ${isMe ? 'bg-white' : 'bg-[#F2A7BE]'}`} />

      <button 
        onClick={togglePlay}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-[0.88] relative ${
          isMe 
            ? 'bg-white text-[#E8547A] shadow-[0_4px_12px_rgba(255,255,255,0.25)]' 
            : 'bg-gradient-to-br from-[#E8547A] to-[#C84B6E] text-white shadow-[0_4px_12px_rgba(232,84,122,0.25)]'
        }`}
      >
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full border-2 z-0 ${isMe ? 'border-white' : 'border-[#E8547A]'}`}
            />
          )}
        </AnimatePresence>
        <span className="relative z-10">
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
        </span>
      </button>
      
      <div className="flex-1 overflow-hidden relative h-8 flex items-center">
        {/* Waveform Visualization (Blush Gradient Backdrop) */}
        <div className="flex items-center gap-[3px] w-full h-full absolute left-0 top-0 opacity-20">
           {[...Array(22)].map((_, i) => {
             const height = [4, 8, 14, 18, 12, 6, 16, 10, 4, 12, 22, 10, 8, 6, 14, 10, 7, 16, 9, 5, 11, 4][i] || 4;
             return (
              <div 
                key={i}
                className={`w-[2.5px] rounded-full ${isMe ? 'bg-white' : 'bg-[#E8547A]'}`} 
                style={{ height: `${height}%` }}
              />
             )
           })}
        </div>
        
        {/* Active Progress Waveform (Glowing Blush Waveform) */}
        <div className="flex items-center gap-[3px] w-full h-full absolute left-0 top-0" style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}>
           {[...Array(22)].map((_, i) => {
             const height = [4, 8, 14, 18, 12, 6, 16, 10, 4, 12, 22, 10, 8, 6, 14, 10, 7, 16, 9, 5, 11, 4][i] || 4;
             return (
               <motion.div 
                 key={i}
                 animate={{ height: isPlaying ? [height, height * 1.4, height] : height }}
                 transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.035 }}
                 className={`w-[2.5px] rounded-full ${isMe ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]' : 'bg-gradient-to-t from-[#E8547A] to-[#FF8E9E] shadow-[0_0_8px_rgba(232,84,122,0.6)]'}`} 
                 style={{ height: `${height}%` }}
               />
             )
           })}
        </div>
      </div>
      
      <div className="flex flex-col items-end shrink-0 relative z-10">
        <span className={`text-[10px] font-bold uppercase tracking-wider leading-none ${isMe ? 'text-white/80' : 'text-[#9B7A87]'}`}>{formatTime(duration)}</span>
        {isPlaying && (
          <span className={`text-[7px] font-black uppercase tracking-widest mt-0.5 animate-pulse ${isMe ? 'text-pink-100' : 'text-[#E8547A]'}`}>
            Whispering...
          </span>
        )}
      </div>

      {isMe && onDelete && (
         <button onClick={onDelete} className="absolute -left-10 opacity-0 group-hover/voice:opacity-100 transition-opacity p-2 text-white/50 hover:text-white rounded-full">
            <Trash2 className="w-4 h-4" />
         </button>
      )}
    </div>
  );
});

import { useCall } from '../contexts/CallContext';

const RainEffect = React.memo(function RainEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: Math.random() * 100 + '%' }}
          animate={{ y: '110vh' }}
          transition={{
            type: "tween",
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "linear"
          }}
          className="absolute w-[1px] h-4 bg-blue-400/30 blur-[0.5px]"
        />
      ))}
    </div>
  );
});

const StarEffect = React.memo(function StarEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: Math.random(), 
            scale: Math.random() * 0.5 + 0.5,
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%'
          }}
          animate={{ 
            opacity: [0.1, 0.8, 0.1],
            scale: [1, 1.2, 1]
          }}
          transition={{
            type: "tween",
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_5px_white]"
        />
      ))}
    </div>
  );
});

const SparkleEffect = React.memo(function SparkleEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0,
            scale: 0,
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%'
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180]
          }}
          transition={{
            type: "tween",
            duration: 1.5 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 5
          }}
          className="absolute"
        >
          <Sparkles className="w-3 h-3 text-yellow-400/40 fill-current" />
        </motion.div>
      ))}
    </div>
  );
});

const SoftCloudTheme = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: -200, y: 80 + i * 140, opacity: 0.15 + i * 0.05, scale: 0.8 + i * 0.15 }}
          animate={{ x: '110vw' }}
          transition={{
            duration: 40 + i * 15,
            repeat: Infinity,
            ease: "linear",
            delay: i * -15
          }}
          className="absolute text-[#FFAEC9] drop-shadow-sm filter blur-[2px]"
        >
          <svg className="w-40 h-24 fill-current opacity-70" viewBox="0 0 100 60">
            <path d="M 20 40 a 20 20 0 0 1 10 -30 a 18 18 0 0 1 30 -5 a 25 25 0 0 1 35 15 a 15 15 0 0 1 -5 20 z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

const MoonlightTheme = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Translucent Crescent Moon with Soft Radial Glow */}
      <div className="absolute top-16 right-12 w-28 h-28 flex items-center justify-center">
        <div className="absolute inset-0 bg-[#A084E8]/20 rounded-full blur-2xl animate-pulse" />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="text-[#EDE3FF] relative z-10"
        >
          <svg className="w-16 h-16 fill-current filter drop-shadow-[0_0_15px_rgba(237,227,255,0.8)]" viewBox="0 0 24 24">
            <path d="M12 3a9 9 0 1 0 9 9 9.75 9.75 0 0 0-.67-3.41 7.14 7.14 0 0 1-7.92-7.92A9.75 9.75 0 0 0 12 3z" />
          </svg>
        </motion.div>
      </div>

      {/* Constellations and Twinkles */}
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0.1 + Math.random() * 0.7, 
            scale: Math.random() * 0.4 + 0.6,
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%'
          }}
          animate={{ opacity: [0.1, 0.9, 0.1], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-1.5 h-1.5 bg-indigo-200 rounded-full shadow-[0_0_8px_rgba(237,227,255,1)]"
        />
      ))}
    </div>
  );
};

const SunsetLoveTheme = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Floating Sparkles and Soft Heart Outlines */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0.1, 
            scale: Math.random() * 0.5 + 0.5,
            x: Math.random() * 100 + '%',
            y: '105vh'
          }}
          animate={{ 
            opacity: [0, 0.45, 0], 
            y: ['105vh', '-10vh'],
            x: Math.random() * 100 + '%' 
          }}
          transition={{ duration: 18 + Math.random() * 8, repeat: Infinity, ease: "easeOut", delay: i * -4 }}
          className="absolute text-[#F2A7BE]"
        >
          {i % 2 === 0 ? (
            <svg className="w-6 h-6 fill-none stroke-current stroke-1 opacity-60" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <Sparkles className="w-5 h-5 text-amber-200 opacity-50" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

const DreamscapeTheme = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Nebulous Aurora Haze Flows */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
        className="absolute w-[180%] h-[180%] -top-1/2 -left-1/2 rounded-full opacity-35 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.2),transparent_60%)] filter blur-3xl"
      />
      {[...Array(35)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0.1, 
            scale: Math.random() * 0.5 + 0.5,
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%'
          }}
          animate={{ opacity: [0.1, 0.7, 0.1], scale: [1, 1.3, 1] }}
          transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-1 h-1 bg-pink-200 rounded-full shadow-[0_0_10px_#FFAEC9]"
        />
      ))}
    </div>
  );
};

import { triggerHapticFeedback } from '../lib/haptics';
let touchHoldTimer: any = null;

export function ChatScreen() {
  const navigate = useNavigate();
  const { space, partnerData, addXp, couplePersonality, moodAura, relationshipLevel } = useCoupleSpace();
  const { userData } = useAuth();
  const { startCall } = useCall();
  const { sendNotification } = useNotifications();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiMoodResult, setAiMoodResult] = useState<{title: string, description: string, messageSuggestion?: string} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [showVoicePopup, setShowVoicePopup] = useState(false);
  const [latestVoiceMsg, setLatestVoiceMsg] = useState<any>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const [aiClient] = useState(() => new OpenRouterClient());
  const memoryManager = useRef<MemoryManager | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingImageCaption, setPendingImageCaption] = useState("");
  const [isUploadingMoment, setIsUploadingMoment] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowAttachments(false);
  };

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editStatusText, setEditStatusText] = useState("");
  const [editFavoriteEmoji, setEditFavoriteEmoji] = useState("🌸");
  const [avatarChoice, setAvatarChoice] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openProfileEditor = () => {
    setEditNickname(userData?.displayName || "");
    setEditStatusText(userData?.moodStatus || "");
    setEditFavoriteEmoji(userData?.favoriteEmoji || "🌸");
    setAvatarChoice(userData?.photoURL || "");
    setShowProfileEditor(true);
  };

  const handleSaveProfile = async () => {
    if (!userData?.id) return;
    setIsSavingProfile(true);
    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        displayName: editNickname,
        moodStatus: editStatusText,
        favoriteEmoji: editFavoriteEmoji,
        photoURL: avatarChoice
      });
      setShowProfileEditor(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [partnerTypingText, setPartnerTypingText] = useState<string | null>(null);
  const [sendAsViewOnce, setSendAsViewOnce] = useState(false);
  const [airaSuggestions, setAiraSuggestions] = useState<string[]>([]);
  const [isAiraThinking, setIsAiraThinking] = useState(false);
  const [showMagicIdeas, setShowMagicIdeas] = useState(false);
  const [magicIdeas, setMagicIdeas] = useState<string[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);

  const getMagicIdeas = async () => {
    setIsGeneratingIdeas(true);
    setShowMagicIdeas(true);
    try {
      const resp = await generateAIResponse([
        { role: 'system', content: "You are Aira, a romantic assistant. Generate 3 short, sweet, and unique things a person could say to their partner right now. Output as a JSON array of strings only." },
        { role: 'user', content: "Give me 3 sweet ideas." }
      ], { model: AI_MODELS.smart });
      const ideas = JSON.parse(resp.match(/\[.*\]/s)?.[0] || '[]');
      setMagicIdeas(ideas);
    } catch (e) {
      setMagicIdeas(["I'm thinking of you ❤️", "You make my day better ✨", "I love our little world 🌎"]);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const selectMagicIdea = (idea: string) => {
    setNewMessage(idea);
    setShowMagicIdeas(false);
    triggerHapticFeedback('light');
  };
  const [airaMood, setAiraMood] = useState<{ emotion: string, color: string, intensity: number, theme?: string } | null>(null);
  const [autoMoodEnabled, setAutoMoodEnabled] = useState(true);
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);

  useEffect(() => {
    if (messages.length > 5 && messages.length % 5 === 0) {
      calculateMood();
    }
  }, [messages.length]);

  const calculateMood = async () => {
    if (isAiraThinking || !autoMoodEnabled) return;
    setIsAiraThinking(true);

    try {
      const recentMessages = messages.slice(-10).map(m => m.content).filter(Boolean).join('\n');
      if (!recentMessages) return;

      const system = `Analyze the emotional tone of these romantic chat messages.
          Detect primary emotion (one word: Romantic, Flirty, Happy, Calm, Excited, Cute, Emotional, Sad, Lonely, Angry, Shy, Caring, Late-night vibes).
          Provide intensity (0.1 - 1.0).
          Return JSON ONLY: {"emotion": "...", "intensity": 0.8, "color": "hex_color"}`;

      const text = await generateAIResponse([
        { role: 'system', content: system },
        { role: 'user', content: recentMessages }
      ], { model: AI_MODELS.smart });
      
      let result;
      try {
        let cleanText = text || '{}';
        if (cleanText.includes('```')) {
          cleanText = cleanText.split('```json')[1]?.split('```')[0] || cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
        } else if (cleanText.includes('{')) {
          const startIdx = cleanText.indexOf('{');
          const endIdx = cleanText.lastIndexOf('}');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleanText = cleanText.substring(startIdx, endIdx + 1);
          }
        }
        result = JSON.parse(cleanText);
      } catch (parseErr) {
        console.warn("calculateMood JSON parse failed, falling back:", parseErr);
        result = {
          emotion: text?.includes('Romantic') ? 'Romantic' : text?.includes('Flirty') ? 'Flirty' : text?.includes('Happy') ? 'Happy' : text?.includes('Calm') ? 'Calm' : 'Calm',
          intensity: 0.8,
          color: '#F472B6'
        };
      }
      
      const themeMap: Record<string, string> = {
        'Romantic': 'rose',
        'Flirty': 'fuchsia',
        'Happy': 'amber',
        'Calm': 'blue',
        'Excited': 'sparkle',
        'Sad': 'rain',
        'Lonely': 'rain',
        'Late-night vibes': 'stars'
      };

      setAiraMood({
        emotion: result.emotion || 'Calm',
        color: result.color || '#F472B6',
        intensity: result.intensity || 0.5,
        theme: themeMap[result.emotion] || 'default'
      });
    } catch (err) {
      console.error('Mood error:', err);
    } finally {
      setIsAiraThinking(false);
    }
  };

  const generateDynamicBackground = async (mood: string) => {
    if (!space?.id) return;
    setIsGeneratingBg(true);
    try {
      const timeOfDay = new Date().getHours() > 18 || new Date().getHours() < 6 ? 'night' : 'day';
      const url = await generateChatAtmosphere(mood, space?.xp ? (space.xp % 100) : 50, timeOfDay);
      if (url) {
        await updateDoc(doc(db, 'coupleSpaces', space.id), {
          chatBackground: url,
          chatMood: mood
        });
      }
    } catch (e) {
      console.error("Failed to generate background", e);
    } finally {
      setIsGeneratingBg(false);
      setShowMoodMenu(false);
    }
  };
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number, x: number, y: number }[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (space?.id) {
      memoryManager.current = new MemoryManager(space.id);
    }
    // We use a safe mixkit loop or similar calm track
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/135/135-preview.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;

    if (space?.id) {
      const lockKey = `chatLocked_${space.id}`;
      if (localStorage.getItem(lockKey) === 'unlocked' || !localStorage.getItem(lockKey + '_pin')) {
        setIsLocked(false);
      }

      // Socket.io connection for typing indicator
      socketRef.current = io(window.location.origin);
      socketRef.current.emit('join-room', space.id);

      socketRef.current.on('typing', (user: string) => {
        setPartnerTypingText(`${user} is typing...`);
      });

      socketRef.current.on('stop_typing', () => {
        setPartnerTypingText(null);
      });
    }

    return () => {
      audioRef.current?.pause();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [space?.id]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const lockKey = `chatLocked_${space?.id}`;
    const savedPin = localStorage.getItem(lockKey + '_pin');
    
    if (!savedPin) {
      if (passcode.length >= 4) {
        localStorage.setItem(lockKey + '_pin', passcode);
        localStorage.setItem(lockKey, 'unlocked');
        setIsLocked(false);
      } else {
        setPasscodeError(true);
      }
      return;
    }

    if (passcode === savedPin) {
      localStorage.setItem(lockKey, 'unlocked');
      setIsLocked(false);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
      setTimeout(() => setPasscodeError(false), 2000);
      setPasscode('');
    }
  };

  const playLatestVoice = () => {
    if (latestVoiceMsg) {
      setCurrentlyPlaying(latestVoiceMsg.id);
      setShowVoicePopup(false);
    }
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      audioRef.current?.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current?.play().catch(() => {});
      setIsMusicPlaying(true);
    }
  };

  useEffect(() => {
    if (!space?.id) return;
    const q = query(
      collection(db, `coupleSpaces/${space.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setMessages(msgs);
      
      msgs.forEach((msg) => {
        if (msg.senderId !== userData?.id && !msg.seen && !isLocked) {
          updateDoc(doc(db, `coupleSpaces/${space.id}/messages`, msg.id), { seen: true })
            .catch(e => console.warn("Failed to mark as seen", e));
        }
      });
      
      const latestVoice = [...msgs].reverse().find(m => m.type === 'voice' && m.senderId !== userData?.id);
      if (latestVoice && (!latestVoiceMsg || latestVoice.id !== latestVoiceMsg.id)) {
        setLatestVoiceMsg(latestVoice);
        if (!isLocked) {
          setShowVoicePopup(true);
        }
      }

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/messages`));

    return unsubscribe;
  }, [space?.id, isLocked, userData?.id]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please grant permission in your browser settings for voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const deleteMessage = async (msgId: string) => {
    if (!space?.id) return;
    try {
      await deleteDoc(doc(db, `coupleSpaces/${space.id}/messages`, msgId));
    } catch (err) {
      console.error('Error deleting message:', err);
      handleFirestoreError(err, OperationType.DELETE, `coupleSpaces/${space.id}/messages`);
    }
  };

  const PREDEFINED_BACKGROUNDS = [
    { id: 'soft_cloud', type: 'theme', value: 'soft_cloud', preview: 'linear-gradient(180deg, #FFD5E1 0%, #FFF5F7 100%)', name: '🌸 Soft Cloud' },
    { id: 'moonlight', type: 'theme', value: 'moonlight', preview: 'linear-gradient(180deg, #0C081A 0%, #2B1440 100%)', name: '🌙 Moonlight' },
    { id: 'sunset_love', type: 'theme', value: 'sunset_love', preview: 'linear-gradient(180deg, #FF8E9E 0%, #FFD194 100%)', name: '🍑 Sunset Love' },
    { id: 'dreamscape', type: 'theme', value: 'dreamscape', preview: 'linear-gradient(180deg, #090616 0%, #2A103D 100%)', name: '✨ Dreamscape' },
  ];

  const handleCustomBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !space || !userData) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 5MB.");
      return;
    }

    setIsUploadingBackground(true);
    try {
      const storageRef = ref(storage, `coupleSpaces/${space.id}/background_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const themeConfig = {
        chatBackground: 'custom',
        gradientColors: '',
        blurStyle: 'light',
        wallpaperUrl: url,
        particlesEnabled: false
      };
      
      await updateDoc(doc(db, 'coupleSpaces', space.id), {
        chatBackground: JSON.stringify(themeConfig)
      });
      setShowBackgroundPicker(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `coupleSpaces/${space.id}`);
    } finally {
      setIsUploadingBackground(false);
    }
  };

  const selectPredefinedBackground = async (bgValue: string) => {
    if (!space) return;
    try {
      const themeConfig = {
        chatBackground: bgValue,
        gradientColors: bgValue === 'soft_cloud' 
          ? 'linear-gradient(180deg, #FFD5E1 0%, #FFE9ED 40%, #FFF5F7 100%)'
          : bgValue === 'moonlight'
          ? 'linear-gradient(180deg, #0C081A 0%, #170E2B 50%, #2B1440 100%)'
          : bgValue === 'sunset_love'
          ? 'linear-gradient(180deg, #FF8E9E 0%, #FCD3EE 50%, #FFD194 100%)'
          : 'linear-gradient(180deg, #090616 0%, #150D2E 50%, #2A103D 100%)',
        blurStyle: (bgValue === 'moonlight' || bgValue === 'dreamscape') ? 'dark' : 'light',
        wallpaperUrl: '',
        particlesEnabled: true
      };
      
      await updateDoc(doc(db, 'coupleSpaces', space.id), {
        chatBackground: JSON.stringify(themeConfig)
      });
      setShowBackgroundPicker(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `coupleSpaces/${space.id}`);
    }
  };

  const handleImageUploadFinal = async () => {
    const file = pendingImageFile;
    const localUrl = pendingImageUrl;
    if (!file || !space?.id || !userData?.id || !localUrl) return;

    const captionToSend = pendingImageCaption;
    const sendOnce = sendAsViewOnce;

    // Instantly reset the modal state so the user is thrown back into the chat screen without delays or freezes
    setSendAsViewOnce(false);
    setPendingImageFile(null);
    setPendingImageUrl(null);
    setPendingImageCaption("");

    const tempId = `msg_temp_${Date.now()}_${userData.id}`;
    const optimisticMessage = {
      id: tempId,
      coupleSpaceId: space.id,
      senderId: userData.id,
      content: localUrl,
      type: 'image',
      viewOnce: sendOnce,
      viewed: false,
      seen: false,
      caption: captionToSend || "",
      createdAt: Date.now(),
      isOptimistic: true
    };

    // Append standard optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    // Background asynchronous upload task
    (async () => {
      try {
        const imgId = `img_${Date.now()}_${userData.id}`;
        const finalUrl = await uploadMediaWithFallback(file, `coupleSpaces/${space.id}/chatImages/${imgId}`, localUrl);

        const realId = `msg_${Date.now()}_${userData.id}`;
        const messageData = {
          id: realId,
          coupleSpaceId: space.id,
          senderId: userData.id,
          content: finalUrl,
          type: 'image',
          viewOnce: sendOnce,
          viewed: false,
          seen: false,
          caption: captionToSend || "",
          createdAt: Date.now()
        };

        await setDoc(doc(db, `coupleSpaces/${space.id}/messages`, realId), messageData);

        if (memoryManager.current) {
          memoryManager.current.saveMessage({
            role: 'user',
            content: `[Image Shared: ${finalUrl}]${captionToSend ? ' with caption: ' + captionToSend : ''}`,
            timestamp: Date.now()
          });
        }

        // Auto-trigger Aira vision analysis on image upload
        handleAiraResponse([{ type: 'image_url', image_url: { url: finalUrl } }]);

        // Notify partner
        if (partnerData?.id) {
          sendNotification(partnerData.id, {
            type: 'chat',
            title: `Moment from ${userData.displayName || 'Partner'} 📸`,
            body: captionToSend || 'Shared a special moment with you',
            priority: 'medium',
            data: { messageId: realId }
          });
        }
      } catch (err) {
        console.error("Error in background image upload:", err);
      }
    })();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const addFloatingHearts = (x: number, y: number) => {
    const id = Date.now();
    setFloatingHearts(prev => [...prev.slice(-10), { id, x, y }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 1500);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    if (socketRef.current && space?.id) {
      socketRef.current.emit('typing', { roomId: space.id, user: userData?.displayName || 'Partner' });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop_typing', { roomId: space.id, user: userData?.displayName || 'Partner' });
      }, 2000);
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!space?.id || !userData?.id) return;
    triggerHapticFeedback('medium');
    addXp(1); // Tiny reward for reacting
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const reactions = { ...(msg.reactions || {}) };
    if (reactions[userData.id] === emoji) {
      delete reactions[userData.id];
    } else {
      reactions[userData.id] = emoji;
      // Trigger effect if it's a heart
      if (emoji === '❤️') {
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;
        addFloatingHearts(x, y);
      }
    }

    try {
      await updateDoc(doc(db, `coupleSpaces/${space.id}/messages`, msgId), {
        reactions
      });
      setReactionTarget(null);

      // Notify partner of reaction if it's new
      if (reactions[userData.id] === emoji && partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'reaction',
          title: 'New Reaction!',
          body: `${userData.displayName || 'Partner'} reacted ${emoji} to your message`,
          priority: 'low',
          data: { messageId: msgId, emoji }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `coupleSpaces/${space.id}/messages/${msgId}`);
    }
  };

  const sendMessage = async (e?: React.FormEvent, content?: string, type: string = 'text') => {
    e?.preventDefault();
    if (!space?.id || !userData?.id) return;

    if (socketRef.current && space?.id) {
      socketRef.current.emit('stop_typing', { roomId: space.id, user: userData?.displayName || 'Partner' });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    if (audioBlob) {
      const currentBlob = audioBlob;
      const currentRecTime = recordingTime;
      // Immediately reset local state so recording screen dismisses instantaneously
      setAudioBlob(null);
      setRecordingTime(0);

      const localVoiceUrl = URL.createObjectURL(currentBlob);
      const tempId = `msg_temp_${Date.now()}_${userData.id}`;
      
      const optimisticMessage = {
        id: tempId,
        coupleSpaceId: space.id,
        senderId: userData.id,
        type: 'voice',
        voiceUrl: localVoiceUrl,
        duration: currentRecTime,
        seen: false,
        createdAt: Date.now(),
        isOptimistic: true
      };

      // Instantly add message locally
      setMessages(prev => [...prev, optimisticMessage]);

      // Start background upload
      (async () => {
        try {
          const voiceId = `voice_${Date.now()}_${userData.id}`;
          const finalUrl = await uploadMediaWithFallback(currentBlob, `coupleSpaces/${space.id}/voiceMessages/${voiceId}.webm`);
          
          const realId = `msg_${Date.now()}_${userData.id}`;
          const messageData = {
            id: realId,
            coupleSpaceId: space.id,
            senderId: userData.id,
            type: 'voice',
            voiceUrl: finalUrl,
            duration: currentRecTime,
            seen: false,
            createdAt: Date.now()
          };
          await setDoc(doc(db, `coupleSpaces/${space.id}/messages`, realId), messageData);

          // Notify partner of voice message
          if (partnerData?.id) {
            sendNotification(partnerData.id, {
              type: 'chat',
              title: 'Voice Note 🎤',
              body: `${userData.displayName || 'Partner'} sent you a voice message`,
              priority: 'medium',
              data: { messageId: realId }
            });
          }
        } catch (err) {
          console.error('Error in background voice recording upload', err);
        }
      })();
      return;
    }

    const messageContent = content !== undefined ? content : newMessage.trim();
    if (!messageContent && type === 'text') return;

    // Award XP for interaction
    addXp(2);

    // Check for romantic keywords to trigger hearts
    const romanticKeywords = ['love', 'miss', 'muah', 'heart', '❤️', '💖', '🥰', 'sweet', 'kiss'];
    if (romanticKeywords.some(kw => messageContent.toLowerCase().includes(kw))) {
      addFloatingHearts(window.innerWidth / 2, window.innerHeight - 100);
    }

    const messageData: any = {
      id: `msg_temp_${Date.now()}_${userData.id}`,
      coupleSpaceId: space.id,
      senderId: userData.id,
      type,
      seen: false,
      createdAt: Date.now(),
      isOptimistic: true // Track it's a local temporary message
    };
    
    if (messageContent) {
      messageData.content = messageContent;
    }

    if (type === 'text') {
      setNewMessage('');
    }

    triggerHapticFeedback('light');

    // Update local state immediately for instant feedback
    setMessages(prev => [...prev, messageData]);
    
    try {
      // Use the proper ID for Firestore
      const realId = `msg_${Date.now()}_${userData.id}`;
      const finalData = { ...messageData, id: realId };
      delete finalData.isOptimistic;

      await setDoc(doc(db, `coupleSpaces/${space.id}/messages`, realId), finalData);

      // Save to AI memory for context
      if (type === 'text' && memoryManager.current) {
        memoryManager.current.saveMessage({
          role: 'user',
          content: messageContent,
          timestamp: Date.now()
        });

        // Trigger Aira if mentioned or randomly 10% of time or if question is asked
        if (messageContent.toLowerCase().includes('aira') || messageContent.includes('?')) {
          handleAiraResponse();
        }
      }

      // Notify partner of text/other message
      if (partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'chat',
          title: `Message from ${userData.displayName || 'Partner'}`,
          body: messageContent || 'Sent a message',
          priority: 'medium',
          data: { messageId: messageData.id }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupleSpaces/${space.id}/messages`);
    }
  };

  const handleAiraResponse = async (mediaParts?: any[]) => {
    if (!space?.id || isStreaming) return;
    
    setIsStreaming(true);
    setStreamingText("");
    
    // Gather dynamic relationship context
    let recentMemoriesText = "None saved yet.";
    let recentDreamsText = "None saved yet.";
    let recentAiraMemoriesText = "None saved yet.";

    try {
      const memoriesRef = collection(db, `coupleSpaces/${space.id}/memories`);
      const qMems = query(memoriesRef, orderBy('createdAt', 'desc'), limit(3));
      const memsSnap = await getDocs(qMems);
      if (!memsSnap.empty) {
        recentMemoriesText = memsSnap.docs.map(docSnapshot => {
          const d = docSnapshot.data();
          return `- ${d.title || d.caption || 'Memory'}: ${d.description || ''}${d.date ? ' (' + d.date + ')' : ''}`;
        }).join('\n');
      }
    } catch (e) {
      console.warn("Skipping Memories retrieval:", e);
    }

    try {
      const dreamsRef = collection(db, `coupleSpaces/${space.id}/dreams`);
      const qDreams = query(dreamsRef, orderBy('createdAt', 'desc'), limit(3));
      const dreamsSnap = await getDocs(qDreams);
      if (!dreamsSnap.empty) {
        recentDreamsText = dreamsSnap.docs.map(docSnapshot => {
          const d = docSnapshot.data();
          return `- ${d.title || d.content || d.text || 'Dream'}`;
        }).join('\n');
      }
    } catch (e) {
      console.warn("Skipping Dreams retrieval:", e);
    }

    try {
      const airaMemsRef = collection(db, `coupleSpaces/${space.id}/airaMemories`);
      const qAiraMems = query(airaMemsRef, orderBy('timestamp', 'desc'), limit(3));
      const airaMemsSnap = await getDocs(qAiraMems);
      if (!airaMemsSnap.empty) {
        recentAiraMemoriesText = airaMemsSnap.docs.map(docSnapshot => {
          const d = docSnapshot.data();
          return `- [${d.type || 'insight'}] ${d.insight || d.content || ''}`;
        }).join('\n');
      }
    } catch (e) {
      console.warn("Skipping Aira Memories retrieval:", e);
    }

    const rawContext = await memoryManager.current?.getRecentContext(15) || [];
    
    const activeMood = space.chatMood || moodAura || 'Warm';
    const personalityTag = couplePersonality ? `${couplePersonality.name} ${couplePersonality.badge}` : 'Midnight Soulmates 🌙';
    const levelTag = relationshipLevel ? `Level ${relationshipLevel.name} (Icon: ${relationshipLevel.icon})` : 'Level 1';
    const currentLocTime = new Date().toISOString();
    
    const contextHeader = `
=== RELATIONSHIP REALITY DATA (DO NOT RETELL THE USER THIS FORMAT) ===
- System Clock: ${currentLocTime}
- Room Aura Mood: ${activeMood}
- Couple Dynamic Persona: ${personalityTag} (${levelTag})
- Active Memories Database:
${recentMemoriesText}
- Active Dreams Database:
${recentDreamsText}
- Latest Aira Insight Logs:
${recentAiraMemoriesText}
=================================
`;

    // Map messages payload to include mediaParts or contextual header
    const messagesPayload = rawContext.map((msg, idx) => {
      const isLastMessage = idx === rawContext.length - 1;
      
      if (isLastMessage && msg.role === 'user' && mediaParts) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: `${contextHeader}\n\n[ACTION: Image attachment trigger] ${msg.content || ''}` },
            ...mediaParts
          ]
        };
      }
      
      if (isLastMessage && msg.role === 'user') {
        return {
          role: 'user',
          content: `${contextHeader}\n\n${msg.content}`
        };
      }
      
      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      };
    });

    if (messagesPayload.length === 0) {
      messagesPayload.push({
        role: 'user',
        content: mediaParts 
          ? [ { type: 'text', text: `${contextHeader}\n\nShared moment.` }, ...mediaParts ] as any
          : `${contextHeader}\n\nHow is our love link looking right now?`
      });
    }

    const airaMsgId = `msg_aira_${Date.now()}`;
    
    const tempAiraMsg = {
      id: airaMsgId,
      coupleSpaceId: space.id,
      senderId: 'aira',
      content: "",
      type: 'text',
      createdAt: Date.now(),
      isStreaming: true
    };
    
    await aiClient.streamChat(messagesPayload, {
      spaceId: space.id,
      onToken: (token) => {
        setStreamingText(prev => prev + token);
      },
      onComplete: async (fullText) => {
        setIsStreaming(false);
        setStreamingText("");
        
        // Anti-repetition program: save to localStorage
        try {
          const stored = localStorage.getItem(`aira_recent_responses_${space.id}`);
          const previousList: string[] = stored ? JSON.parse(stored) : [];
          const updated = [fullText, ...previousList].slice(0, 20);
          localStorage.setItem(`aira_recent_responses_${space.id}`, JSON.stringify(updated));
        } catch (err) {
          console.warn("Aira histories writing failure:", err);
        }

        const finalMsg = {
          ...tempAiraMsg,
          content: fullText,
          isStreaming: false
        };
        
        await setDoc(doc(db, `coupleSpaces/${space.id}/messages`, airaMsgId), finalMsg);
        
        if (memoryManager.current) {
          memoryManager.current.saveMessage({
            role: 'assistant',
            content: fullText,
            timestamp: Date.now()
          });
        }
      },
      onError: (err) => {
        console.error("Aira Stream Error:", err);
        setIsStreaming(false);
      }
    });
  };

  const generateReplySuggestions = async (tone: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setAiSuggestions([]);
    
    // Get last few messages as context
    const contextMessages = messages.slice(-20).map(m => `${m.senderId === userData?.id ? (userData?.displayName?.split(' ')[0] || 'Me') : (partnerData?.displayName?.split(' ')[0] || 'Partner')}: ${m.type === 'text' ? m.content : '[' + m.type + ' message]'}`).join('\n');
    const context = contextMessages || 'We haven\'t chatted much recently.';
    
    try {
      const prompt = `Act as an AI communication assistant for a couple's chat. 
      User's name: ${userData?.displayName || 'User'}
      Partner's name: ${partnerData?.displayName || 'Partner'}
      Here is the recent chat history:\n${context}\n\n
      Generate 3 short, distinct, ${tone} reply options for ${userData?.displayName || 'User'} to send next.
      Return ONLY a JSON array of 3 strings. Example: ["reply 1", "reply 2", "reply 3"]`;
      
      const res = await generateAIResponse([
        { role: 'system', content: "You are a helpful relationship assistant AI. Output JSON only." },
        { role: 'user', content: prompt }
      ], { model: AI_MODELS.smart });

      let cleanJson = res || '[]';
      try {
        if (cleanJson.includes('```')) {
          cleanJson = cleanJson.split('```json')[1]?.split('```')[0] || cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
        } else if (cleanJson.includes('[')) {
          const startIdx = cleanJson.indexOf('[');
          const endIdx = cleanJson.lastIndexOf(']');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleanJson = cleanJson.substring(startIdx, endIdx + 1);
          }
        }
        const options = JSON.parse(cleanJson);
        setAiSuggestions(options);
      } catch (parseErr) {
        console.warn("AI suggestions json parse failed, using text fallback:", parseErr);
        const fallbackLines = cleanJson.split('\n').map(l => l.replace(/^[-\s*0-9.]+|"|'/g, '').trim()).filter(l => l.length > 5).slice(0, 3);
        setAiSuggestions(fallbackLines.length > 0 ? fallbackLines : ["Thinking of you!", "How's your day going?", "You make me smile!"]);
      }
    } catch (e) {
      console.error(e);
      setAiSuggestions(["Sorry, AI error."]);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectSuggestion = (text: string) => {
     setNewMessage(text);
     setShowAIAssist(false);
  };

  const checkVibe = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setAiSuggestions([]);
    setAiMoodResult(null);

    const contextMessages = messages.slice(-20).map(m => `${m.senderId === userData?.id ? (userData?.displayName?.split(' ')[0] || 'Me') : (partnerData?.displayName?.split(' ')[0] || 'Partner')}: ${m.type === 'text' ? m.content : '[' + m.type + ' message]'}`).join('\n');
    
    try {
      const prompt = `Act as an AI relationship coach. Analyze the recent chat history between ${userData?.displayName || 'User'} and ${partnerData?.displayName || 'Partner'}:\n${contextMessages || "(No recent messages)"}\n\n
      What is the overall vibe? Is there any tension, or is it loving/platonic?
      Also suggest a sweet action one of them can take right now.
      Return ONLY a JSON object: {"title": "The vibe...", "description": "Action suggestion...", "messageSuggestion": "optional quick message..."}`;
      
      const res = await generateAIResponse([
        { role: 'system', content: "You are a relationship advice AI. Output JSON only." },
        { role: 'user', content: prompt }
      ], { model: AI_MODELS.premium });

      let cleanJson = res || '{}';
      try {
        if (cleanJson.includes('```')) {
          cleanJson = cleanJson.split('```json')[1]?.split('```')[0] || cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
        } else if (cleanJson.includes('{')) {
          const startIdx = cleanJson.indexOf('{');
          const endIdx = cleanJson.lastIndexOf('}');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleanJson = cleanJson.substring(startIdx, endIdx + 1);
          }
        }
        setAiMoodResult(JSON.parse(cleanJson));
      } catch (parseErr) {
        console.warn("AI vibe check json parse failed, using fallback:", parseErr);
        setAiMoodResult({
          title: "Loving Harmony",
          description: "Aira is detecting a beautiful, secure warmth in your conversation history.",
          messageSuggestion: "Thinking of us today. I love you!"
        });
      }
    } catch (e) {
      console.error(e);
      setAiMoodResult({title: "Couldn't read the vibe", description: "Are you guys even talking? 😂"});
    } finally {
      setIsGenerating(false);
    }
  };

  const sendReaction = async (emoji: string) => {
    if (!space?.id || !userData?.id) return;
    const messageData = {
      id: `msg_${Date.now()}_${userData.id}`,
      coupleSpaceId: space.id,
      senderId: userData.id,
      content: emoji,
      type: 'reaction',
      seen: false,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, `coupleSpaces/${space.id}/messages`, messageData.id), messageData);

      // Notify partner of reaction
      if (partnerData?.id) {
        sendNotification(partnerData.id, {
          type: 'reaction',
          title: 'Reaction!',
          body: `${userData.displayName || 'Partner'} reacted ${emoji}`,
          priority: 'low',
          data: { messageId: messageData.id, emoji }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupleSpaces/${space.id}/messages`);
    }
  };

  const currentTheme = parseTheme(space?.chatBackground);

  return (
    <div className="flex flex-col h-[100dvh] relative overflow-hidden font-sans">
      
      {/* Premium Breathing Romantic Background System */}
      <div 
        className="absolute inset-0 pointer-events-none -z-30 overflow-hidden transition-all duration-1000" 
        style={{
          background: currentTheme.wallpaperUrl 
            ? `url(${currentTheme.wallpaperUrl}) center/cover no-repeat`
            : currentTheme.gradientColors
        }}
      >
        {/* Render Live Customized Animations */}
        {currentTheme.particlesEnabled && (
          <>
            {currentTheme.chatBackground === 'soft_cloud' && <SoftCloudTheme />}
            {currentTheme.chatBackground === 'moonlight' && <MoonlightTheme />}
            {currentTheme.chatBackground === 'sunset_love' && <SunsetLoveTheme />}
            {currentTheme.chatBackground === 'dreamscape' && <DreamscapeTheme />}
          </>
        )}

        {/* Legend Image Darken overlay */}
        {currentTheme.wallpaperUrl && (
          <div className="absolute inset-0 bg-[#FFF6F9]/10 backdrop-blur-[2px]" />
        )}

        {/* Mood Specific Effects */}
        <AnimatePresence>
          {airaMood?.theme === 'rain' && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0"><RainEffect /></motion.div>}
          {airaMood?.theme === 'stars' && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0"><StarEffect /></motion.div>}
          {airaMood?.theme === 'sparkle' && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0"><SparkleEffect /></motion.div>}
        </AnimatePresence>

        {/* Ambient Floating Orbs with slow elegant easing */}
        <div className="absolute inset-0 opacity-45">
          <motion.div 
            animate={{ 
              x: [0, 90, -40, 0], 
              y: [0, -60, 30, 0],
              scale: [1, 1.15, 0.9, 1]
            }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
            style={{ backgroundColor: airaMood?.color || '#FFD9E4' }}
            className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full blur-[130px] transition-colors duration-[3000ms]"
          />
          <motion.div 
            animate={{ 
              x: [0, -70, 50, 0], 
              y: [0, 50, -40, 0],
              scale: [1, 0.95, 1.1, 1]
            }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
            style={{ backgroundColor: '#EDE3FF' }}
            className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[140px]"
          />
          {/* Subtle light leaks */}
          <motion.div 
            animate={{ opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 left-1/4 w-[280px] h-[280px] bg-amber-200/20 rounded-full blur-[90px]"
          />
        </div>

        {/* Soft Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.012] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
      </div>
      
      {/* Readability Overlays */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none -z-20 backdrop-blur-[15px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/40 pointer-events-none -z-10" />

      {/* Floating Hearts Effects */}
      <AnimatePresence>
        {floatingHearts.map(heart => (
          <HeartAnimation key={heart.id} x={heart.x} y={heart.y} />
        ))}
      </AnimatePresence>
      
      {/* Redesigned Glass-morphism Floating Header */}
      <div className="px-5 pt-8 pb-4 bg-[#FFF6F9]/75 backdrop-blur-2xl border-b border-[#F2A7BE]/20 shadow-[0_4px_30px_rgba(232,84,122,0.03)] flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-1.5 text-[#2B1A2E] hover:bg-[#F2A7BE]/15 rounded-full transition-all active:scale-95">
             <ArrowLeft className="w-5.5 h-5.5" />
          </Link>
          
                    <div 
            onClick={openProfileEditor}
            className="flex items-center gap-3 cursor-pointer group/header hover:bg-white/20 px-2.5 py-1.5 rounded-2xl border border-transparent hover:border-[#F2A7BE]/20 transition-all"
          >
            <div className="relative">
              {/* Glowing animated pulse around avatar */}
              <motion.div 
                animate={{ 
                  boxShadow: ['0 0 10px rgba(242,167,190,0.4)', '0 0 25px rgba(232,84,122,0.6)', '0 0 10px rgba(242,167,190,0.4)'],
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="relative w-12 h-12 bg-cover bg-center rounded-full border-2 border-white shadow-xl overflow-hidden flex items-center justify-center font-bold text-white bg-gradient-to-br from-[#F2A7BE] to-[#E8547A] z-10"
              >
                 {partnerData?.photoURL ? (
                   <img src={partnerData.photoURL} className="w-full h-full object-cover" alt="Partner" />
                 ) : (
                   partnerData?.displayName?.[0]?.toUpperCase() || 'P'
                 )}
              </motion.div>
              
              {/* Pulsing Breathing Aura */}
              <div className="absolute -inset-1.5 bg-[#FFF6F9]/45 rounded-full blur-md -z-0" />
              
              {partnerData?.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#FFF6F9] rounded-full flex items-center justify-center shadow-md z-20 border border-[#F2A7BE]/30">
                   <div className="w-2.5 h-2.5 bg-[#E8547A] rounded-full animate-ping opacity-60 absolute" />
                   <div className="w-2 h-2 bg-[#E8547A] rounded-full shadow-[0_0_6px_#E8547A]" />
                </div>
              )}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h2 className="font-serif italic font-bold text-[#2B1A2E] text-base leading-tight tracking-wide flex items-center gap-1">
                  {partnerData?.displayName || 'Partner'} {partnerData?.favoriteEmoji || "🌸"}
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ type: "tween", repeat: Infinity, duration: 2.5 }}
                  >
                    <Heart className="w-3 h-3 text-[#E8547A] fill-[#E8547A]" />
                  </motion.div>
                </h2>
                {airaMood && (
                  <span className="text-[7.5px] px-2 py-0.5 rounded-full bg-white/90 border border-[#F2A7BE]/30 shadow-sm text-[#9B7A87] font-bold uppercase tracking-wider">
                    {airaMood.emotion}
                  </span>
                )}
              </div>
              
              {/* Dedicated Status Lines (Presence status) */}
              <span className="text-[9.5px] font-sans text-[#9B7A87] font-medium leading-none mt-1 select-none flex items-center gap-1.5">
                {partnerTypingText ? (
                  <span className="text-[#E8547A] animate-pulse font-bold">writing something sweet... 💞</span>
                ) : (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${partnerData?.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-300'}`} />
                    <span className="truncate max-w-[150px]">{partnerData?.moodStatus || (partnerData?.isOnline ? 'under the same moon tonight 🌙' : 'feeling romantic 🌸')}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        
        {/* Rounded Pill Buttons Container with translucent background */}
        <div className="flex items-center gap-1 bg-[#FFD9E4]/25 border border-[#F2A7BE]/20 px-2 py-1 rounded-full shadow-inner shadow-[0_2px_8px_rgba(232,84,122,0.02)]">
           <button onClick={() => navigate('/intelligence')} className="p-2 text-[#9B7A87] hover:text-[#E8547A] hover:bg-white/50 rounded-full transition-all active:scale-90 relative group">
             <BrainCircuit className="w-4.5 h-4.5" />
             <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#E8547A] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
           </button>
           <button onClick={() => startCall('voice')} className="p-2 text-[#9B7A87] hover:text-[#E8547A] hover:bg-white/50 rounded-full transition-all active:scale-90">
             <Phone className="w-4.5 h-4.5" fill="currentColor" />
           </button>
           <button onClick={() => startCall('video')} className="p-2 text-[#9B7A87] hover:text-[#E8547A] hover:bg-white/50 rounded-full transition-all active:scale-90">
             <Video className="w-4.5 h-4.5" fill="currentColor" />
           </button>
           <button onClick={() => setShowBackgroundPicker(true)} className="p-2 text-[#9B7A87] hover:text-[#E8547A] hover:bg-white/50 rounded-full transition-all active:scale-90">
             <MoreVertical className="w-4.5 h-4.5" />
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-rose-100 text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-200">
                <Heart className="w-10 h-10 text-white fill-current" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-rose-950 mb-2">Our Secret Space</h2>
              <p className="text-rose-600/80 mb-8 text-sm">
                {!localStorage.getItem(`chatLocked_${space?.id}_pin`) 
                  ? "Create a 4-digit secret code"
                  : "Enter your secret code 💖"
                }
              </p>
              
              <form onSubmit={handleUnlock}>
                <input
                  type="password"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                  className={`w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-rose-50 rounded-2xl outline-none focus:ring-2 transition-all ${
                    passcodeError ? 'ring-2 ring-red-400 bg-red-50 text-red-600 animate-shake' : 'focus:ring-rose-400 text-rose-950'
                  }`}
                  placeholder="••••"
                  autoFocus
                />
                {passcodeError && (
                  <p className="text-red-500 text-xs mt-3 font-medium">This love is protected 💔</p>
                )}
                <button 
                  type="submit"
                  disabled={passcode.length < 4}
                  className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl py-3.5 font-bold shadow-md shadow-rose-200 disabled:opacity-50 transition-all active:scale-95"
                >
                  Unlock 🔓
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVoicePopup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm bg-white rounded-3xl p-6 shadow-2xl shadow-rose-200/50 border border-rose-100 text-center"
          >
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-rose-400 rounded-full animate-ping opacity-20"></div>
              <Play className="w-8 h-8 text-rose-500 ml-1" />
            </div>
            <h3 className="font-bold text-rose-950 text-lg mb-1">A message from your love 💌</h3>
            <p className="text-rose-600 text-sm mb-6">They sent you a voice note</p>
            <div className="flex gap-3">
              <button onClick={() => setShowVoicePopup(false)} className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-medium hover:bg-gray-100">
                Later
              </button>
              <button onClick={playLatestVoice} className="flex-[2] py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:brightness-110 shadow-md shadow-rose-200">
                Tap to Hear My Voice 🎧
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen View Once Image */}
      <AnimatePresence>
         {viewingImage && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4"
            >
               <div className="absolute top-12 pb-4 pt-12 text-white text-center w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
                 <span className="text-xl font-bold uppercase tracking-[0.2em] animate-pulse glow-text">View Once</span>
               </div>
               <motion.img 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={viewingImage} 
                  className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" 
               />
            </motion.div>
         )}
      </AnimatePresence>

      {/* Floating Image Preview Modal with Blur Backdrop and Optional Caption */}
      <AnimatePresence>
        {pendingImageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[90] bg-[#2B1A2E]/40 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.92, y: 25 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 25 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="bg-[#FFF6F9]/95 border border-[#F2A7BE]/35 rounded-[32px] p-6 shadow-2xl w-full max-w-sm flex flex-col gap-5 text-center relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-[#9B7A87]">Share Your Moment</span>
                <button 
                  onClick={() => { setPendingImageFile(null); setPendingImageUrl(null); }}
                  className="p-1 bg-[#F2A7BE]/15 text-[#9B7A87] hover:text-[#E8547A] rounded-full hover:bg-[#F2A7BE]/25 active:scale-90 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cinematic Corner Image Preview */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-inner border border-[#F2A7BE]/20 bg-[#2B1A2E]/5">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-10" />
                <img src={pendingImageUrl} alt="Moment Preview" className="w-full h-full object-cover" />
                
                {/* View Once Toggle Overlay */}
                <button 
                  type="button"
                  onClick={() => setSendAsViewOnce(!sendAsViewOnce)}
                  className={`absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider transition-all duration-300 shadow-md ${
                    sendAsViewOnce 
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' 
                      : 'bg-white/95 text-[#2B1A2E] hover:bg-white'
                  }`}
                >
                  {sendAsViewOnce ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {sendAsViewOnce ? 'View Once (On)' : 'View Once (Off)'}
                </button>
              </div>

              {/* Caption Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-black text-[#9B7A87] uppercase tracking-wider pl-1 font-sans">Romantic Caption</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={pendingImageCaption}
                    onChange={(e) => setPendingImageCaption(e.target.value)}
                    placeholder="Write a soft thought... 💭"
                    className="w-full bg-white/60 border border-[#F2A7BE]/30 rounded-xl px-4 py-2.5 text-xs text-[#2B1A2E] focus:outline-none focus:border-[#E8547A] transition-colors shadow-inner"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => { setPendingImageFile(null); setPendingImageUrl(null); }}
                  className="flex-1 py-3 bg-white/60 hover:bg-[#F2A7BE]/15 font-bold text-xs uppercase tracking-widest text-[#9B7A87] rounded-xl transition-all border border-[#F2A7BE]/20"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImageUploadFinal}
                  className="flex-[2] py-3 bg-gradient-to-r from-[#E8547A] to-[#C84B6E] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all hover:brightness-105 active:scale-[0.98] shadow-md shadow-[#E8547A]/25 flex items-center justify-center gap-1.5"
                >
                  Share Moment ✨
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sending Moment Overlay */}
      <AnimatePresence>
        {isUploadingMoment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/65 backdrop-blur-xl flex flex-col items-center justify-center gap-4 text-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="text-[#F2A7BE]"
            >
              <Loader2 className="w-10 h-10 animate-spin" />
            </motion.div>
            <motion.p 
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="text-white font-serif italic text-base tracking-wide"
            >
              Sending your moment ✨
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackgroundPicker && (
          <>
            {/* Backdrop click dismiss */}
            <div className="fixed inset-0 z-45 bg-[#2B1A2E]/25 backdrop-blur-sm" onClick={() => setShowBackgroundPicker(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="absolute bottom-0 left-0 right-0 z-50 bg-[#FFF6F9]/95 backdrop-blur-3xl p-7 rounded-t-[32px] border-t border-[#F2A7BE]/35 shadow-[0_-15px_45px_rgba(232,84,122,0.12)] max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-serif italic font-bold text-[#2B1A2E] tracking-wide">Our Universe Themes</h3>
                 <button onClick={() => setShowBackgroundPicker(false)} className="p-1.5 bg-[#F2A7BE]/15 rounded-full text-[#9B7A87] hover:bg-[#F2A7BE]/25 hover:text-[#E8547A] active:scale-90 transition-all">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="space-y-6">
                 <div>
                   <h4 className="text-[10px] font-black text-[#9B7A87] uppercase tracking-widest mb-3">Custom Wallpaper</h4>
                   <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[#F2A7BE]/30 hover:border-[#E8547A]/50 rounded-2xl bg-white/40 hover:bg-[#FFD9E4]/15 transition-all cursor-pointer relative overflow-hidden group">
                      {isUploadingBackground ? (
                        <Loader2 className="w-6 h-6 text-[#E8547A] animate-spin" />
                      ) : (
                        <div className="flex flex-col items-center text-[#9B7A87] group-hover:text-[#E8547A] transition-colors">
                           <Image className="w-6 h-6 mb-1.5" />
                           <span className="text-xs font-bold uppercase tracking-wider font-sans">Upload Love Portrait</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleCustomBackgroundUpload} disabled={isUploadingBackground} />
                   </label>
                 </div>
                 
                 <div>
                    <h4 className="text-[10px] font-black text-[#9B7A87] uppercase tracking-widest mb-3">Candlelight Dynamics</h4>
                    <div className="grid grid-cols-2 gap-3.5">
                       {PREDEFINED_BACKGROUNDS.map((bg) => (
                         <button
                           key={bg.id}
                           onClick={() => selectPredefinedBackground(bg.value)}
                           className="relative h-24 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all active:scale-[0.97] focus:outline-none"
                           style={{ background: bg.preview }}
                         >
                           {/* Decorative Ambient Aura inside Button */}
                           <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />
                           <span className="absolute bottom-3 left-3 text-white text-[11px] font-bold tracking-wide shadow-sm font-sans flex items-center gap-1">
                             {bg.name}
                           </span>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile & Nickname Customization Sheet */}
      <AnimatePresence>
        {showProfileEditor && (
          <>
            {/* Backdrop blurred mask */}
            <div className="fixed inset-0 z-45 bg-[#2B1A2E]/25 backdrop-blur-sm" onClick={() => setShowProfileEditor(false)} />
            <motion.div
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFF6F9]/95 backdrop-blur-3xl px-7 py-8 rounded-t-[32px] border-t border-[#F2A7BE]/30 shadow-[0_-15px_45px_rgba(232,84,122,0.12)] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-serif italic font-bold text-[#2B1A2E] tracking-wide">Our Profiles</h3>
                  <p className="text-[10px] text-[#9B7A87] font-semibold uppercase tracking-wider font-sans mt-0.5">Customize your digital alter ego</p>
                </div>
                <button 
                  onClick={() => setShowProfileEditor(false)} 
                  className="p-1.5 bg-[#F2A7BE]/15 text-[#9B7A87] hover:text-[#E8547A] hover:bg-[#F2A7BE]/25 rounded-full transition-all active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Pet Name input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] pl-1 font-black text-[#9B7A87] uppercase tracking-widest font-sans">My Pet Name / Nickname</label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder="Enter pet name... 🧸"
                    className="w-full bg-white/60 border border-[#F2A7BE]/30 rounded-2xl px-4 py-3 text-sm text-[#2B1A2E] focus:outline-none focus:border-[#E8547A] transition-colors shadow-inner"
                  />
                </div>

                {/* Mood Presence status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] pl-1 font-black text-[#9B7A87] uppercase tracking-widest font-sans">Current Mood Presence status</label>
                  <input
                    type="text"
                    value={editStatusText}
                    onChange={(e) => setEditStatusText(e.target.value)}
                    placeholder="e.g. dreaming about you 🌸"
                    className="w-full bg-white/60 border border-[#F2A7BE]/30 rounded-2xl px-4 py-3 text-sm text-[#2B1A2E] focus:outline-none focus:border-[#E8547A] transition-colors shadow-inner"
                  />
                  <div className="flex gap-1.5 mt-1 overflow-x-auto py-0.5 shrink-0 scrollbar-none">
                    {['awake with you tonight ✨', 'listening quietly 🎧', 'dreaming about us 💭', 'thinking about you 🌸', 'gazing at the stars 🌠'].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setEditStatusText(suggestion)}
                        className="text-[9.5px] whitespace-nowrap bg-[#F2A7BE]/10 hover:bg-[#F2A7BE]/20 active:scale-95 transition-all text-[#9B7A87] font-semibold border border-[#F2A7BE]/15 px-2.5 py-1 rounded-full shrink-0"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Favorite Emoji Picker */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] pl-1 font-black text-[#9B7A87] uppercase tracking-widest font-sans">Favorite Emoji Aura</label>
                  <div className="flex gap-2 justify-between bg-white/40 p-2.5 rounded-2xl border border-[#F2A7BE]/15 shadow-inner">
                    {['🌸', '🌙', '✨', '🧸', '💋', '❤️', '🧁', '🕊️'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditFavoriteEmoji(emoji)}
                        className={`text-2xl p-1.5 rounded-xl transition-all duration-200 active:scale-90 hover:scale-120 hover:rotate-6 ${editFavoriteEmoji === emoji ? 'bg-[#FFD9E4]/60 border border-[#F2A7BE]/45 shadow-sm scale-110' : 'bg-transparent filter grayscale hover:grayscale-0'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset Couple Portrait */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] pl-1 font-black text-[#9B7A87] uppercase tracking-widest font-sans">Our Portrait / Avatar</label>
                  <div className="grid grid-cols-5 gap-3 bg-white/40 p-3 rounded-2xl border border-[#F2A7BE]/15 shadow-inner select-none">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatarChoice(url)}
                        className={`relative aspect-square rounded-xl overflow-hidden shadow-sm transition-all hover:scale-105 active:scale-95 ${avatarChoice === url ? 'ring-2 ring-[#E8547A] ring-offset-2 scale-105 border-white border' : 'opacity-70 saturate-50 hover:opacity-100 hover:saturate-100'}`}
                      >
                        <img src={url} alt={`Avatar Preset ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Portrait File Uploader Option */}
                <div className="flex flex-col gap-2 mt-1">
                  <label className="text-[10px] pl-1 font-black text-[#9B7A87] uppercase tracking-widest font-sans flex items-center justify-between">
                    <span>Or upload custom love portrait</span>
                    {isUploadingAvatar && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8547A]" />}
                  </label>
                  <label className="flex items-center justify-center p-3 border-2 border-dashed border-[#F2A7BE]/30 hover:border-[#E8547A]/50 rounded-xl bg-white/40 hover:bg-[#FFD9E4]/15 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 text-[#9B7A87]">
                       <Camera className="w-4 h-4" />
                       <span className="text-xs font-semibold uppercase tracking-wider font-sans">Pick Photo From Storage</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      disabled={isUploadingAvatar}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !userData?.id) return;
                        setIsUploadingAvatar(true);
                        try {
                          const imgRefPath = `users/${userData.id}/avatar_${Date.now()}`;
                          const url = await uploadMediaWithFallback(file, imgRefPath);
                          setAvatarChoice(url);
                        } catch (err) {
                          console.error("Error uploading custom avatar photo:", err);
                        } finally {
                          setIsUploadingAvatar(false);
                        }
                      }} 
                    />
                  </label>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileEditor(false)}
                    className="flex-1 py-3.5 bg-white/70 hover:bg-[#F2A7BE]/20 text-[#9B7A87] font-bold text-xs uppercase tracking-widest rounded-2xl transition-all border border-[#F2A7BE]/20 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="flex-[2] py-3.5 bg-gradient-to-r from-[#E8547A] to-[#C84B6E] hover:brightness-105 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-md shadow-[#E8547A]/25 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Save Profile ✨</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 relative z-10 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex justify-center p-2 pt-6 pb-12"
            >
              {/* Main Frosted Romantic Card */}
              <div id="secret-haven-banner" className="bg-[#FFF6F9]/45 backdrop-blur-2xl border border-white/60 p-8 rounded-[34px] shadow-[0_15px_45px_rgba(232,84,122,0.08),0_4px_15px_rgba(255,217,228,0.2)] max-w-sm w-full text-center relative overflow-hidden group">
                
                {/* Embedded Glow Layers */}
                <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[#FFD9E4]/40 blur-2xl pointer-events-none -z-10" />
                <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-[#EDE3FF]/50 blur-2xl pointer-events-none -z-10" />

                {/* Overlapping Avatar Floating Visual: (Me) ❤️ (Us) */}
                <div className="relative flex justify-center items-center gap-2.5 h-24 mb-6">
                  {/* Floating Left Orb/Avatar */}
                  <motion.div 
                    animate={{ y: [0, -8, 0], rotate: [0, -3, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-14 h-14 rounded-full border-3 border-white shadow-xl bg-cover bg-center bg-[#F2A7BE] overflow-hidden flex items-center justify-center relative"
                  >
                    {userData?.photoURL ? (
                      <img src={userData.photoURL} alt="Me" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-black uppercase tracking-widest font-sans">Me</span>
                    )}
                  </motion.div>

                  {/* Connecting Heart Icon with pulse */}
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="z-10 text-[#E8547A] drop-shadow-[0_2px_8px_rgba(232,84,122,0.4)]"
                  >
                    <Heart className="w-7 h-7 fill-current" />
                  </motion.div>

                  {/* Floating Right Orb/Avatar */}
                  <motion.div 
                    animate={{ y: [0, 8, 0], rotate: [0, 3, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                    className="w-14 h-14 rounded-full border-3 border-white shadow-xl bg-cover bg-center bg-[#EDE3FF] overflow-hidden flex items-center justify-center relative"
                  >
                    {partnerData?.photoURL ? (
                      <img src={partnerData.photoURL} alt="Us" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#9B7A87] text-xs font-black uppercase tracking-widest font-sans">Us</span>
                    )}
                  </motion.div>
                </div>

                {/* Romantic Title */}
                <h3 className="font-serif italic text-[#2B1A2E] text-2xl tracking-wide mb-3">
                  Our Secret Haven 🌸
                </h3>

                {/* Romantic Description */}
                <p className="text-xs text-[#9B7A87] font-semibold leading-relaxed max-w-[280px] mx-auto mb-8 font-sans">
                  Your private story begins here.<br/>
                  Send whispers, soft moods, view-once moments, and dreamy memories.
                </p>

                {/* Glowing Gradient CTA Button */}
                <motion.button 
                  onClick={() => triggerHapticFeedback('medium')}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full bg-gradient-to-r from-[#E8547A] to-[#C84B6E] text-white rounded-full py-3.5 px-6 font-bold text-xs uppercase tracking-wider shadow-[0_10px_25px_rgba(232,84,122,0.25)] relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />
                  <span className="relative flex items-center justify-center gap-1.5 leading-none">
                    Start Your Beautiful Conversation 💞
                  </span>
                </motion.button>
              </div>
            </motion.div>
          ) : messages.map((msg, index) => {
            const isMe = msg.senderId === userData?.id;
            const reactions = msg.reactions || {};
            const reactionList = Object.entries(reactions);
            
            const isAira = msg.senderId === 'aira';
            
            if (msg.type === 'reaction') {
               return (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <span className="text-6xl animate-bounce drop-shadow-lg">{msg.content}</span>
                </motion.div>
               )
            }

            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: msg.isOptimistic ? 0.7 : 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
              >
                {msg.isOptimistic && isMe && (
                   <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 animate-pulse px-2">Syncing...</span>
                )}
                {isAira && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 mb-2 pl-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shadow-sm">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Aira Assistant</span>
                  </motion.div>
                )}
                <div className={`relative group/bubble max-w-[80%] ${reactionTarget === msg.id ? 'z-[80] scale-[1.04]' : 'z-10'} transition-all duration-300`}>
                  {/* Reaction Menu on Long Press Trigger */}
                  <AnimatePresence>
                    {reactionTarget === msg.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-[70] bg-[#2B1A2E]/25 backdrop-blur-md" 
                          onClick={(e) => { e.stopPropagation(); setReactionTarget(null); }} 
                        />
                        <ReactionMenu 
                          onSelect={(emoji) => { toggleReaction(msg.id, emoji); setReactionTarget(null); }} 
                          onBlur={() => setReactionTarget(null)} 
                         />
                      </>
                    )}
                  </AnimatePresence>

                  <div 
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setReactionTarget(msg.id);
                      triggerHapticFeedback();
                    }}
                    onTouchStart={() => {
                      touchHoldTimer = setTimeout(() => {
                        setReactionTarget(msg.id);
                        triggerHapticFeedback();
                      }, 500);
                    }}
                    onTouchEnd={() => clearTimeout(touchHoldTimer)}
                    onTouchMove={() => clearTimeout(touchHoldTimer)}
                    onMouseDown={() => {
                      touchHoldTimer = setTimeout(() => {
                        setReactionTarget(msg.id);
                        triggerHapticFeedback();
                      }, 500);
                    }}
                    onMouseUp={() => clearTimeout(touchHoldTimer)}
                    onMouseLeave={() => clearTimeout(touchHoldTimer)}
                    className={`px-5 py-3 rounded-[24px] relative transition-all active:scale-[0.99] shadow-inner select-text ${
                    isMe 
                      ? 'bg-gradient-to-br from-[#E8547A] to-[#C84B6E] text-white rounded-br-[4px] shadow-[0_8px_25px_rgba(232,84,122,0.18)]' 
                      : isAira
                        ? 'bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] text-white rounded-bl-[4px] border border-violet-300/40 shadow-[0_10px_25px_rgba(124,58,237,0.15)]'
                        : `bg-[#FFF6F9]/95 text-[#2B1A2E] border border-[#F2A7BE]/20 rounded-bl-[4px] shadow-[0_8px_25px_rgba(43,26,46,0.02)]`
                  }`}
                  style={!isMe && !isAira && airaMood?.color ? { backgroundColor: `${airaMood.color}15` } : {}}
                  >
                    {msg.type === 'voice' ? (
                       <VoiceMessageBubble 
                         url={msg.voiceUrl} 
                         duration={msg.duration} 
                         isMe={isMe} 
                         currentlyPlaying={currentlyPlaying}
                         setCurrentlyPlaying={setCurrentlyPlaying}
                         messageId={msg.id}
                         onDelete={() => deleteMessage(msg.id)}
                       />
                    ) : msg.type === 'image' ? (
                      <div className="rounded-[20px] overflow-hidden -mx-2 -my-1.5 border border-[#F2A7BE]/20 relative min-h-[140px] max-w-[240px] shadow-md bg-[#2B1A2E]/5">
                        {msg.viewOnce ? (
                          isMe || msg.viewed ? (
                            <div className="bg-[#FFF6F9]/80 backdrop-blur-md flex flex-col items-center justify-center p-8 gap-2 border border-white/60 min-h-[160px] max-w-[240px]">
                               <div className="w-10 h-10 rounded-full bg-[#FFD9E4]/60 flex items-center justify-center text-[#E8547A] shadow-inner">
                                 <EyeOff className="w-4.5 h-4.5" />
                               </div>
                               <p className="text-[#9B7A87] font-black text-[9px] uppercase tracking-widest font-sans">
                                 {isMe && !msg.viewed ? 'Secret Image Sent' : 'Moment Viewed'}
                               </p>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setViewingImage(msg.content);
                                setTimeout(async () => {
                                  setViewingImage(null);
                                  try {
                                    await updateDoc(doc(db, `coupleSpaces/${space.id}/messages`, msg.id), { viewed: true });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, `coupleSpaces/${space.id}/messages/${msg.id}`);
                                  }
                                }, 5000);
                              }}
                              className="group relative w-full h-[200px] bg-[#2B1A2E] flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all active:scale-95 shadow-lg"
                            >
                               <div className="absolute inset-0 bg-gradient-to-b from-[#2B1A2E]/70 to-[#E8547A]/30 group-hover:opacity-90 flex flex-col items-center justify-center z-10 transition-all">
                                 <motion.div 
                                   animate={{ scale: [1, 1.12, 1], boxShadow: ['0 0 10px rgba(242,167,190,0.3)', '0 0 20px rgba(232,84,122,0.6)', '0 0 10px rgba(242,167,190,0.3)'] }}
                                   transition={{ repeat: Infinity, duration: 2.5 }}
                                   className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F2A7BE] to-[#E8547A] flex items-center justify-center text-white mb-2"
                                 >
                                   <Eye className="w-4.5 h-4.5" />
                                 </motion.div>
                                 <span className="text-[#FFF6F9] text-[9px] font-black uppercase tracking-[0.25em] font-sans">View Once</span>
                               </div>
                               <img src={msg.content} alt="Hidden" className="absolute inset-0 w-full h-full object-cover blur-[45px] opacity-55 scale-130" />
                            </button>
                          )
                        ) : (
                          <img src={msg.content} alt="Attachment" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 max-h-[260px]" />
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <p className="text-[15px] leading-relaxed break-words font-medium">
                          {(msg.isStreaming && isAira) ? (
                            streamingText ? (
                              <>
                                {streamingText}
                                <motion.span 
                                  animate={{ opacity: [0, 1, 0] }}
                                  transition={{ repeat: Infinity, duration: 0.8 }}
                                  className="inline-block w-1.5 h-4 bg-white/60 ml-1 translate-y-0.5"
                                />
                              </>
                            ) : (
                              <span className="flex items-center gap-3.5 py-1.5 select-none">
                                {/* Soft Breathing Glow Orb */}
                                <span className="relative w-4 h-4 flex items-center justify-center">
                                  <motion.span 
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.85, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                    className="absolute inset-x-[-4px] inset-y-[-4px] rounded-full bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 blur-[3.5px]"
                                  />
                                  <span className="relative w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]" />
                                </span>

                                {/* Premium Waveform Pulse / Soft floating dots */}
                                <span className="flex items-center gap-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.span
                                      key={i}
                                      animate={{ y: [0, -3.5, 0] }}
                                      transition={{
                                        repeat: Infinity,
                                        duration: 0.85,
                                        delay: i * 0.16,
                                        ease: "easeInOut"
                                      }}
                                      className="w-1.5 h-1.5 rounded-full bg-white/75"
                                    />
                                  ))}
                                </span>
                              </span>
                            )
                          ) : msg.content}
                        </p>
                        {msg.isStreaming && isAira && (
                           <div className="flex items-center gap-1.5 mt-2 ml-1">
                              <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white/70"></span>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/50">tuning insights</span>
                           </div>
                        )}
                      </div>
                    )}

                    {/* Reactions display */}
                    {reactionList.length > 0 && (
                      <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex -space-x-1`}>
                          {reactionList.map(([uid, emoji]) => (
                          <div key={uid} className="bg-white border border-gray-100 rounded-full px-1 py-0.5 shadow-sm scale-90">
                            {emoji as string}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 mt-1.5 px-1`}>
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}
                   </span>
                   {isMe && (
                     <div className="text-gray-400">
                        {msg.seen ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> : <Check className="w-3.5 h-3.5" />}
                     </div>
                   )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {partnerTypingText && (
           <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="flex gap-2 w-full max-w-[80%] mb-4 ml-2">
              <div className="bg-white/40 backdrop-blur-md rounded-[24px] rounded-bl-sm p-3 px-5 text-gray-500 shadow-sm border border-white/20 flex gap-2 items-center">
                 <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-200 animate-heartbeat" />
                 <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{partnerData?.displayName?.split(' ')[0]} is typing...</span>
              </div>
           </motion.div>
        )}

        {/* Inline Aira ✨ */}
        <AnimatePresence>
          {showAIAssist && (
            <motion.div 
              initial={{opacity:0, y: 20, scale:0.95}} 
              animate={{opacity:1, y: 0, scale:1}} 
              exit={{opacity:0, y: 20, scale:0.95}} 
              className="flex flex-col gap-3 w-full self-start mb-6 mt-2"
            >
               <div className="flex items-center gap-2 pl-2">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                   <Sparkles className="w-4 h-4 text-white" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Aira ✨</span>
                   <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Romantic Assistant</span>
                 </div>
               </div>
               
               <div className="bg-white/40 backdrop-blur-3xl rounded-[32px] p-6 shadow-2xl border border-white/60">
                  {(!aiSuggestions.length && !aiMoodResult && !isGenerating) ? (
                     <div className="space-y-5">
                        <div className="flex items-center justify-between px-1 mb-2">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aira Wisdom</h4>
                           <button 
                             onClick={() => setAutoMoodEnabled(!autoMoodEnabled)}
                             className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-full transition-all ${autoMoodEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                           >
                             Auto-Mood: {autoMoodEnabled ? 'ON' : 'OFF'}
                           </button>
                        </div>
                        <div>
                           <h4 className="text-[10px] font-black text-slate-400 mb-4 px-1 uppercase tracking-widest">How can I help your connection?</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <button type="button" onClick={() => generateReplySuggestions('sweet and romantic')} className="flex flex-col items-center gap-2 p-4 bg-rose-50/50 hover:bg-rose-100/50 rounded-2xl transition-all border border-rose-100 group">
                                <span className="text-xl group-hover:scale-125 transition-transform">💕</span>
                                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Romantic</span>
                              </button>
                              <button type="button" onClick={() => generateReplySuggestions('funny and cheeky')} className="flex flex-col items-center gap-2 p-4 bg-orange-50/50 hover:bg-orange-100/50 rounded-2xl transition-all border border-orange-100 group">
                                <span className="text-xl group-hover:scale-125 transition-transform">😂</span>
                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Cheeky</span>
                              </button>
                              <button type="button" onClick={() => generateReplySuggestions('caring and supportive')} className="flex flex-col items-center gap-2 p-4 bg-blue-50/50 hover:bg-blue-100/50 rounded-2xl transition-all border border-blue-100 group">
                                <span className="text-xl group-hover:scale-125 transition-transform">🤗</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Supportive</span>
                              </button>
                              <button type="button" onClick={() => generateReplySuggestions('sincere apology')} className="flex flex-col items-center gap-2 p-4 bg-violet-50/50 hover:bg-violet-100/50 rounded-2xl transition-all border border-violet-100 group">
                                <span className="text-xl group-hover:scale-125 transition-transform">😔</span>
                                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Apologize</span>
                              </button>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                          <button type="button" onClick={checkVibe} className="w-full py-4 bg-slate-900 text-white rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest">
                             Check Chat Vibes 🔮
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setShowMoodMenu(!showMoodMenu)} 
                            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"
                          >
                             <Wand2 className="w-4 h-4" /> Visual Atmosphere ✨
                          </button>
                        </div>

                        <AnimatePresence>
                          {showMoodMenu && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 gap-2 p-3 bg-white/50 rounded-2xl border border-white/60">
                                {['Romantic', 'Dreamy', 'Cyberpunk', 'Starry Night', 'Rainy Cafe', 'Anime Sunset'].map(m => (
                                  <button
                                    key={m}
                                    onClick={() => generateDynamicBackground(m)}
                                    disabled={isGeneratingBg}
                                    className="py-3 text-[10px] font-black text-rose-600 bg-white/80 border border-slate-100 rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                  >
                                    {isGeneratingBg && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  ) : isGenerating ? (
                     <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="relative"
                        >
                           <Loader2 className="w-10 h-10 text-indigo-500" />
                           <div className="absolute inset-0 flex items-center justify-center">
                             <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
                           </div>
                        </motion.div>
                        <p className="text-[10px] font-black text-indigo-400 animate-pulse tracking-widest uppercase">Consulting Love Wisdom...</p>
                     </div>
                  ) : aiMoodResult ? (
                     <div className="space-y-4">
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-[24px] p-5">
                           <h5 className="font-black text-sm text-indigo-900 mb-2 uppercase tracking-wide">{aiMoodResult.title}</h5>
                           <p className="text-[15px] text-indigo-800 leading-relaxed font-medium">{aiMoodResult.description}</p>
                        </div>
                        {aiMoodResult.messageSuggestion && (
                           <button type="button" onClick={() => selectSuggestion(aiMoodResult.messageSuggestion!)} className="w-full text-left p-5 bg-white border border-slate-100 shadow-sm text-slate-800 rounded-[24px] hover:bg-slate-50 transition-all group active:scale-[0.98]">
                              <span className="text-[10px] text-indigo-500 block mb-2 font-black uppercase tracking-widest">Suggested Whisper</span>
                              <p className="text-base font-bold italic group-hover:text-rose-500 transition-colors">"{aiMoodResult.messageSuggestion}"</p>
                           </button>
                        )}
                        <button type="button" onClick={() => { setAiMoodResult(null); setShowAIAssist(false); }} className="w-full text-[10px] font-black text-slate-400 hover:text-slate-600 py-2 uppercase tracking-widest transition-colors mt-2">Dismiss</button>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 mb-2 px-1 uppercase tracking-widest text-center">Gentle Suggestions</h4>
                        <div className="space-y-2">
                          {aiSuggestions.map((s, i) => (
                             <button key={i} type="button" onClick={() => selectSuggestion(s)} className="w-full text-left p-5 bg-white/80 border border-slate-100 shadow-sm text-slate-800 rounded-[24px] hover:bg-rose-50 transition-all font-bold text-[15px] active:scale-[0.98]">
                                {s}
                             </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => { setAiSuggestions([]); setShowAIAssist(false); }} className="w-full text-[10px] font-black text-slate-400 hover:text-slate-600 py-2 mt-4 uppercase tracking-widest transition-colors text-center">Dismiss</button>
                     </div>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Floating Bottom Input Area */}
      <div className="z-30 flex flex-col bg-transparent pb-10 px-6 shrink-0 relative">
        
        {/* Horizontal Scrollable Mood Chips Row */}
        <div className="flex gap-2 overflow-x-auto pb-3 px-1 scrollbar-none items-center">
          {MOOD_CHIPS.map((chip, idx) => {
            const isChipActive = activeMood === `${chip.emoji} ${chip.text}`;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setNewMessage(prev => prev ? `${prev} ${chip.emoji} ${chip.text}` : `${chip.emoji} ${chip.text}`);
                  setActiveMood(`${chip.emoji} ${chip.text}`);
                  triggerHapticFeedback('light');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 shadow-sm hover:scale-[1.02] active:scale-95 ${
                  isChipActive
                    ? 'bg-gradient-to-r from-[#E8547A] to-[#C84B6E] text-white shadow-[0_4px_12px_rgba(232,84,122,0.25)] border-none'
                    : 'bg-[#FFF6F9]/90 border border-[#F2A7BE]/20 text-[#9B7A87]'
                }`}
              >
                <span>{chip.emoji}</span>
                <span>{chip.text}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Action Chips Bar */}
        <div className="flex gap-2 mb-3.5 px-1 items-center">
          <button
            type="button"
            onClick={() => { triggerHapticFeedback('light'); startRecording(); }}
            className="flex items-center gap-1 px-3 py-1 bg-[#FFD9E4]/40 border border-[#F2A7BE]/30 text-[#E8547A] rounded-full text-[10px] font-black tracking-wider uppercase transition-all hover:bg-[#FFD9E4]/60 active:scale-95 shadow-sm shadow-[#FFD9E4]/5"
          >
            <span>🎙️</span> Whisper
          </button>
          <button
            type="button"
            onClick={() => { triggerHapticFeedback('light'); setSendAsViewOnce(!sendAsViewOnce); setShowAttachments(true); }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-all active:scale-95 shadow-sm ${
              sendAsViewOnce
                ? 'bg-gradient-to-r from-[#E8547A] to-[#C84B6E] border-none text-white shadow-[0_4px_10px_rgba(232,84,122,0.2)]'
                : 'bg-[#FFD9E4]/40 border border-[#F2A7BE]/30 text-[#E8547A]'
            }`}
          >
            <span>📸</span> {sendAsViewOnce ? 'View Once (On)' : 'View Once'}
          </button>
          <button
            type="button"
            onClick={() => { triggerHapticFeedback('light'); setShowMagicIdeas(!showMagicIdeas); }}
            className="flex items-center gap-1 px-3 py-1 bg-[#FFD9E4]/40 border border-[#F2A7BE]/30 text-[#E8547A] rounded-full text-[10px] font-black tracking-wider uppercase transition-all hover:bg-[#FFD9E4]/60 active:scale-95 shadow-sm shadow-[#FFD9E4]/5"
          >
            <span>🌸</span> Ideas
          </button>
        </div>
        
        {/* Magic Ideas Overlay */}
        <AnimatePresence>
          {showMagicIdeas && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-0 right-0 p-4 pb-0 z-50 px-6 mb-4"
            >
              <div className="bg-[#FFF6F9]/95 backdrop-blur-2xl rounded-[2.5rem] p-5 border border-[#F2A7BE]/20 shadow-2xl flex flex-col gap-3">
                 <div className="flex justify-between items-center px-2 mb-1">
                   <div className="flex items-center gap-2">
                     <Wand2 size={13} className="text-[#E8547A]" />
                     <span className="text-[10px] font-black text-[#E8547A] uppercase tracking-widest">Aira's Sweet Whispers</span>
                   </div>
                   <button onClick={() => setShowMagicIdeas(false)} className="text-[#9B7A87] text-[10px] font-black uppercase tracking-widest hover:text-[#E8547A]">Close</button>
                 </div>
                 {isGeneratingIdeas ? (
                   <div className="flex justify-center p-6">
                     <div className="w-2 h-2 bg-[#E8547A] rounded-full animate-bounce mx-1.5" />
                     <div className="w-2 h-2 bg-[#E8547A] rounded-full animate-bounce mx-1.5 [animation-delay:0.15s]" />
                     <div className="w-2 h-2 bg-[#E8547A] rounded-full animate-bounce mx-1.5 [animation-delay:0.3s]" />
                   </div>
                 ) : (
                   <div className="flex flex-col gap-2.5">
                     {magicIdeas.map((idea, idx) => (
                       <button
                         key={idx}
                         onClick={() => selectMagicIdea(idea)}
                         className="text-left bg-white/75 hover:bg-[#FFD9E4]/40 p-4 rounded-2xl border border-transparent text-[14.5px] font-bold text-[#2B1A2E] hover:text-[#E8547A] transition-all duration-250 active:scale-[0.98]"
                       >
                         {idea}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Attachments Menu */}
        <AnimatePresence>
           {showAttachments && (
             <motion.div 
               initial={{ height: 0, opacity: 0, y: 30 }} 
               animate={{ height: 'auto', opacity: 1, y: 0 }} 
               exit={{ height: 0, opacity: 0, y: 30 }} 
               className="overflow-hidden mb-5"
             >
                <div className="p-7 bg-white/40 backdrop-blur-3xl rounded-[36px] border border-white/60 shadow-2xl grid grid-cols-4 gap-5">
                   <button onClick={() => { sendMessage(undefined, '', 'sync_invite'); setShowAttachments(false); }} className="flex flex-col items-center gap-2 group">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 shadow-xl shadow-blue-200"><Video className="w-7 h-7" /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Live Sync</span>
                   </button>
                   <label className="flex flex-col items-center gap-2 group cursor-pointer relative">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl ${sendAsViewOnce ? 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-purple-200' : 'bg-gradient-to-br from-rose-400 to-pink-600 text-white shadow-pink-200'}`}><Image className="w-7 h-7" /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Gallery</span>
                   </label>
                   <button onClick={() => setSendAsViewOnce(!sendAsViewOnce)} className="flex flex-col items-center gap-2 group">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl ${sendAsViewOnce ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                         {sendAsViewOnce ? <EyeOff className="w-7 h-7" /> : <Eye className="w-7 h-7" />}
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 text-center leading-tight">View Once<br/>{sendAsViewOnce ? 'ON' : 'OFF'}</span>
                   </button>
                   <button className="flex flex-col items-center gap-2 group">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 shadow-xl shadow-orange-200"><MapPin className="w-7 h-7" /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Location</span>
                   </button>
                </div>
             </motion.div>
           )}
        </AnimatePresence>

        <div className="w-full relative flex items-end">
            {isRecording || audioBlob || isUploadingVoice ? (
               <div className="flex-1 flex items-center bg-white/60 backdrop-blur-3xl border border-white/60 rounded-[32px] p-2.5 shadow-2xl min-h-[62px]">
                  {isUploadingVoice ? (
                     <div className="flex-1 flex items-center justify-center gap-3 text-slate-800 font-extrabold text-sm tracking-wide">
                        <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        Syncing Voice Note...
                     </div>
                  ) : audioBlob ? (
                     <div className="flex-1 flex items-center justify-between px-2">
                        <button onClick={cancelRecording} className="p-3 text-slate-400 hover:text-rose-500 transition-colors bg-white shadow-sm rounded-full">
                           <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col items-center gap-0.5">
                           <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Ready to send</div>
                           <div className="text-slate-900 font-black text-base">{formatTime(recordingTime)}</div>
                        </div>
                        <button onClick={() => sendMessage(undefined, undefined, 'voice')} className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-full transition-all active:scale-90 shadow-xl shadow-rose-200 flex items-center justify-center">
                           <Send className="w-5 h-5 ml-0.5" fill="currentColor" />
                        </button>
                     </div>
                  ) : (
                     <div className="flex-1 flex items-center justify-between px-3">
                        <div className="flex items-center gap-4">
                           <div className="relative">
                              <div className="w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping opacity-75" />
                              <div className="absolute inset-0 w-3.5 h-3.5 bg-rose-600 rounded-full" />
                           </div>
                           <div className="flex flex-col">
                              <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Recording</div>
                              <div className="text-slate-900 font-extrabold text-base tracking-widest">{formatTime(recordingTime)}</div>
                           </div>
                        </div>
                        <button onClick={stopRecording} className="w-11 h-11 bg-rose-50 text-rose-600 rounded-full transition-all hover:bg-rose-100 flex items-center justify-center shadow-inner">
                           <Square className="w-4 h-4 fill-current" />
                        </button>
                     </div>
                  )}
               </div>
            ) : (
              <div className="flex-1 flex items-center bg-[#FFF6F9]/80 backdrop-blur-2xl rounded-[30px] h-[58px] border border-[#F2A7BE]/30 shadow-[0_8px_30px_rgba(232,84,122,0.06)] px-3 py-1 transition-all focus-within:ring-3 ring-[#F2A7BE]/45">
                <button 
                  type="button" 
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachments(false); setShowAIAssist(false); }} 
                  className="w-10 h-10 rounded-full hover:bg-rose-50/50 flex items-center justify-center text-xl active:scale-95 transition-transform"
                >
                  😊
                </button>
                
                <textarea 
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Send a soft thought..."
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none text-[#2B1A2E] placeholder:text-[#9B7A87]/70 font-semibold text-[15px] min-w-0 resize-none self-center leading-normal scrollbar-hide py-3 h-[48px] px-3 ml-1"
                />

                <div className="flex items-center gap-1.5 shrink-0 ml-1 select-none">
                  <motion.button 
                    type="button" 
                    onClick={() => { setShowAIAssist(!showAIAssist); setShowEmojiPicker(false); setShowAttachments(false); }}
                    animate={{ scale: isStreaming ? [1, 1.1, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-[#F2A7BE] via-[#E8547A] to-[#EDE3FF] flex items-center justify-center text-white shadow-sm active:scale-95 transition-all"
                  >
                    <Sparkles className="w-[18px] h-[18px] text-white animate-pulse" />
                  </motion.button>

                  {newMessage.trim() ? (
                    <button 
                      type="button" 
                      onClick={(e) => sendMessage(e)}
                      className="w-10 h-10 bg-gradient-to-br from-[#E8547A] to-[#C84B6E] text-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(232,84,122,0.3)] active:scale-90 transition-all"
                    >
                      <Send className="w-4 h-4 ml-0.5" fill="currentColor" />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startRecording} 
                      className="w-10 h-10 text-[#9B7A87] hover:text-[#E8547A] flex items-center justify-center transition-all active:scale-90"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
