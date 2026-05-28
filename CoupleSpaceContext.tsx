import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc, query, collection, limit, getDocs, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { generateAIResponse, AI_MODELS } from '../lib/ai';

export interface LoveMemory {
  id: string;
  type: string;
  url?: string;
  caption?: string;
  date: string;
  [key: string]: any;
}

export interface CoupleSpaceData {
  id: string;
  partner1Id: string;
  partner2Id: string;
  inviteCode: string;
  streak: number;
  lastInteractionAt: number;
  createdAt: number;
  xp: number;
  level: number;
  chatBackground?: string;
  chatMood?: string;
}

export interface PartnerData {
  id: string;
  displayName: string;
  mood?: string;
  moodStatus?: string;
  favoriteEmoji?: string;
  loveLanguage?: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: number;
  fcmToken?: string;
}

interface CoupleSpaceContextType {
  space: CoupleSpaceData | null;
  loading: boolean;
  partnerData: PartnerData | null;
  dailyQuestion: string | null;
  dailyQuote: { text: string; author: string } | null;
  memoryFlashback: LoveMemory | null;
  relationshipLevel: { name: string; icon: string; nextLevelXp: number };
  couplePersonality: { name: string; description: string; badge: string };
  moodAura: string;
  sendHug: () => Promise<void>;
  hugReceived: boolean;
  refreshDailyQuestion: () => Promise<void>;
  addXp: (amount: number) => Promise<void>;
}

const CoupleSpaceContext = createContext<CoupleSpaceContextType>({} as CoupleSpaceContextType);

// Helper error handler
import { handleFirestoreError, OperationType } from '../lib/errorHandler';

export function CoupleSpaceProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const [space, setSpace] = useState<CoupleSpaceData | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<string | null>(null);
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string } | null>(null);
  const [memoryFlashback, setMemoryFlashback] = useState<LoveMemory | null>(null);
  const [hugReceived, setHugReceived] = useState(false);
  const [loading, setLoading] = useState(true);

  const getCouplePersonality = (streak: number, xp: number) => {
    if (streak > 30) return { name: "Eternal Souls", description: "You are inseparable and deeply connected.", badge: "🌌" };
    if (xp > 1000) return { name: "Golden Pair", description: "Your energy is warm, bright and full of life.", badge: "☀️" };
    if (streak > 7) return { name: "Midnight Soulmates", description: "You thrive in late night talks and deep secrets.", badge: "🌙" };
    return { name: "Dreamy Pair", description: "You are building a beautiful world together.", badge: "✨" };
  };

  const getMoodAura = (lastInteraction: number) => {
    const hoursSince = (Date.now() - lastInteraction) / (1000 * 60 * 60);
    if (hoursSince < 1) return "romance";
    if (hoursSince < 6) return "cozy";
    if (hoursSince < 24) return "calm";
    return "missing";
  };

  const sendHug = async () => {
    if (!userData?.coupleSpaceId || !userData.id) return;
    try {
      const msgRef = collection(db, `coupleSpaces/${userData.coupleSpaceId}/messages`);
      await addDoc(msgRef, {
        id: `hug_${Date.now()}`,
        coupleSpaceId: userData.coupleSpaceId,
        senderId: userData.id,
        type: 'reaction',
        content: '🫂',
        createdAt: Date.now(),
        seen: false
      });
      await addXp(2);
    } catch (e) {
      console.warn("Hug failed", e);
    }
  };

  useEffect(() => {
    if (!userData?.coupleSpaceId) return;

    const messagesRef = collection(db, `coupleSpaces/${userData.coupleSpaceId}/messages`);
    const qMessages = query(messagesRef, limit(1));
    
    // Listen for incoming hugs for local animation
    const unsubscribeHugs = onSnapshot(messagesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.type === 'reaction' && data.content === '🫂' && data.senderId !== userData.id) {
            setHugReceived(true);
            setTimeout(() => setHugReceived(false), 5000);
          }
        }
      });
    });

    return () => unsubscribeHugs();
  }, [userData?.coupleSpaceId]);

  const getRelationshipLevel = (xp: number) => {
    const level = Math.floor(xp / 100) + 1;
    const levels = [
      { name: "New Hearts", icon: "🌱" },
      { name: "Secret Smile", icon: "😊" },
      { name: "Sweet Pair", icon: "🌸" },
      { name: "Soft Glow", icon: "✨" },
      { name: "Warm Hug", icon: "🫂" },
      { name: "Deep Bond", icon: "💎" },
      { name: "Pure Harmony", icon: "🎵" },
      { name: "Twin Flames", icon: "🔥" },
      { name: "Soulmates", icon: "🌌" },
      { name: "Eternal Love", icon: "♾️" }
    ];
    const index = Math.min(level - 1, levels.length - 1);
    return {
      ...levels[index],
      nextLevelXp: level * 100
    };
  };

  const refreshDailyQuestion = async () => {
    if (!userData?.coupleSpaceId) return;
    
    try {
      // Use cached AI response if possible or fetch new
      const question = await generateAIResponse([
        { role: 'system', content: "You are Aira, a romantic psychologist. Output only one deep question for a couple." },
        { role: 'user', content: "One question for today." }
      ], { model: AI_MODELS.smart });
      setDailyQuestion(question.trim().replace(/^"|"$/g, ''));
    } catch (e) {
      setDailyQuestion("What's a small thing I did recently that made you smile? ❤️");
    }
  };

  const fetchDailyQuote = async () => {
    try {
      const quotes = [
        { text: "Love isn't something you find. Love is something that finds you.", author: "Loretta Young" },
        { text: "Where there is love there is life.", author: "Mahatma Gandhi" },
        { text: "The best thing to hold onto in life is each other.", author: "Audrey Hepburn" },
        { text: "To love and be loved is to feel the sun from both sides.", author: "David Viscott" }
      ];
      setDailyQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    } catch (e) {
      setDailyQuote({ text: "Love is the bridge between two hearts.", author: "Aira" });
    }
  };

  const fetchMemoryFlashback = async () => {
    if (!userData?.coupleSpaceId) return;
    try {
      const q = query(
        collection(db, `coupleSpaces/${userData.coupleSpaceId}/memories`),
        limit(20)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Pick a random memory as a "flashback"
        const docs = snap.docs;
        const randomDoc = docs[Math.floor(Math.random() * docs.length)];
        setMemoryFlashback({ id: randomDoc.id, ...randomDoc.data() } as LoveMemory);
      }
    } catch (e) {
      console.warn("Flashback failed", e);
    }
  };

  useEffect(() => {
    if (userData?.coupleSpaceId) {
      refreshDailyQuestion();
      fetchDailyQuote();
      fetchMemoryFlashback();
    }
  }, [userData?.coupleSpaceId]);

  useEffect(() => {
    if (!userData?.coupleSpaceId) {
      setSpace(null);
      setPartnerData(null);
      setLoading(false);
      return;
    }

    const spaceRef = doc(db, 'coupleSpaces', userData.coupleSpaceId);
    setLoading(true);

    let unsubscribePartner: (() => void) | undefined;

    const unsubscribe = onSnapshot(spaceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as CoupleSpaceData;
        setSpace(data);

        // Fetch partner info
        const partnerId = data.partner1Id === userData.id ? data.partner2Id : data.partner1Id;
        if (partnerId) {
          if (!unsubscribePartner) {
            unsubscribePartner = onSnapshot(doc(db, 'users', partnerId), (pDoc) => {
              if (pDoc.exists() && pDoc.data()?.coupleSpaceId === data.id) {
                setPartnerData({ 
                  id: partnerId, 
                  displayName: pDoc.data()?.displayName,
                  mood: pDoc.data()?.mood,
                  moodStatus: pDoc.data()?.moodStatus,
                  favoriteEmoji: pDoc.data()?.favoriteEmoji,
                  loveLanguage: pDoc.data()?.loveLanguage,
                  photoURL: pDoc.data()?.photoURL,
                  isOnline: pDoc.data()?.isOnline,
                  lastSeen: pDoc.data()?.lastSeen,
                  fcmToken: pDoc.data()?.fcmToken
                });
              } else {
                setPartnerData(null);
              }
            }, (err) => {
              handleFirestoreError(err, OperationType.GET, `users/${partnerId}`);
            });
          }
        } else {
          setPartnerData(null);
          if (unsubscribePartner) {
            unsubscribePartner();
            unsubscribePartner = undefined;
          }
        }
      } else {
        setSpace(null);
        setPartnerData(null);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `coupleSpaces/${userData.coupleSpaceId}`);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribePartner) {
        unsubscribePartner();
      }
    };
  }, [userData?.coupleSpaceId]);

  const addXp = async (amount: number) => {
    if (!userData?.coupleSpaceId) return;
    try {
      const spaceRef = doc(db, 'coupleSpaces', userData.coupleSpaceId);
      await updateDoc(spaceRef, {
        xp: increment(amount),
        lastInteractionAt: Date.now()
      });
    } catch (e) {
      console.warn("Failed to add XP", e);
    }
  };

  const relationshipLevel = getRelationshipLevel(space?.xp || 0);
  const couplePersonality = getCouplePersonality(space?.streak || 0, space?.xp || 0);
  const moodAura = getMoodAura(space?.lastInteractionAt || Date.now());

  return (
    <CoupleSpaceContext.Provider value={{ 
      space, 
      loading, 
      partnerData, 
      dailyQuestion, 
      dailyQuote,
      memoryFlashback,
      relationshipLevel,
      couplePersonality,
      moodAura,
      sendHug,
      hugReceived,
      refreshDailyQuestion,
      addXp
    }}>
      {children}
    </CoupleSpaceContext.Provider>
  );
}

export const useCoupleSpace = () => useContext(CoupleSpaceContext);

