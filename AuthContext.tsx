import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, googleProvider, messaging } from '../lib/firebase';

export interface UserSettings {
  liveDrawingSync: boolean;
  showDrawingOnHome: boolean;
  livePhotoShare: boolean;
  showPhotosOnHome: boolean;
  blurSensitiveContent: boolean;
}

export interface UserData {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coupleSpaceId: string;
  mood?: string;
  moodStatus?: string;
  favoriteEmoji?: string;
  loveLanguage?: string;
  settings?: UserSettings;
  isOnline?: boolean;
  lastSeen?: number;
  fcmToken?: string;
  setupComplete?: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateMood: (mood: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const updatePresence = async (isOnline: boolean) => {
       if (auth.currentUser) {
          try {
             let currentToken = undefined;
             try {
                if (messaging && isOnline && Notification.permission !== 'denied') {
                   // Usually requires a VAPID key. If omitted, will try default but might fail.
                   currentToken = await getToken(messaging);
                }
             } catch(err) {
                console.warn("FCM Token fetch failed:", err);
             }

             const updatePayload: any = {
                isOnline,
                lastSeen: Date.now()
             };
             if (currentToken) {
                updatePayload.fcmToken = currentToken;
             }

             await updateDoc(doc(db, 'users', auth.currentUser.uid), updatePayload);
          } catch (e: any) {
             if (e?.code === 'permission-denied') {
                console.log('Presence update skipped. Firestore rules need to be updated to allow isOnline and lastSeen fields on users.');
             } else {
                console.error("Failed to update presence", e);
             }
          }
       }
    };

    const handleVisibilityChange = () => {
       if (document.visibilityState === 'visible') {
          updatePresence(true);
       } else {
          updatePresence(false);
       }
    };

    const handleBeforeUnload = () => {
       updatePresence(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Setup realtime listener for user doc
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', currentUser.uid), async (userDoc) => {
          if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() } as UserData);
          } else {
            // Create initial user doc
            const newUserData: UserData = {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Anonymous User',
              coupleSpaceId: '',
            };
            try {
              await setDoc(doc(db, 'users', currentUser.uid), newUserData);
            } catch (e) {
              console.error("Failed to create user doc", e);
            }
          }
          setLoading(false);
        }, (err) => {
          console.error("User doc error", err);
          setLoading(false);
        });
        
        // Initial presence update
        updatePresence(true);
      } else {
        setUserData(null);
        setLoading(false);
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = undefined;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const refreshUserData = async () => {
    // Kept for backward compatibility if called explicitly, but mainly solved by onSnapshot
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const signOut = async () => {
    await auth.signOut();
  };

  const updateMood = async (mood: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { mood });
    } catch (e) {
      console.error("Failed to update mood", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signOut, refreshUserData, updateMood }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
