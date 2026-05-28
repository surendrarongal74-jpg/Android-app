import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, limit, getDocs, orderBy } from "firebase/firestore";

export interface LoveMemory {
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  timestamp: number;
}

export class MemoryManager {
  private spaceId: string;

  constructor(spaceId: string) {
    this.spaceId = spaceId;
  }

  async saveMessage(message: LoveMemory) {
    const memoryRef = doc(db, 'coupleSpaces', this.spaceId, 'ai_memory', 'v1');
    try {
      const snap = await getDoc(memoryRef);
      if (!snap.exists()) {
        await setDoc(memoryRef, { messages: [message], lastUpdated: Date.now() });
      } else {
        await updateDoc(memoryRef, {
          messages: arrayUnion(message),
          lastUpdated: Date.now()
        });
      }
    } catch (err) {
      console.error("Memory saving failed:", err);
    }
  }

  async getRecentContext(count = 15): Promise<LoveMemory[]> {
    const memoryRef = doc(db, 'coupleSpaces', this.spaceId, 'ai_memory', 'v1');
    try {
      const snap = await getDoc(memoryRef);
      if (snap.exists()) {
        const messages = snap.data().messages || [];
        return messages.slice(-count);
      }
    } catch (err) {
      console.error("Context retrieval failed:", err);
    }
    return [];
  }

  async clearMemory() {
    const memoryRef = doc(db, 'coupleSpaces', this.spaceId, 'ai_memory', 'v1');
    await setDoc(memoryRef, { messages: [], lastUpdated: Date.now() });
  }
}
