import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
// We assume we might want sounds
import useSound from 'use-sound';

export type NotificationType = 'chat' | 'call' | 'reaction' | 'mood' | 'memory' | 'aira' | 'streak' | 'gift';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  createdAt: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  sendNotification: (targetUserId: string, notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  clearNotification: (notificationId: string) => Promise<void>;
  activeToast: Notification | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Play notification sound
  const [playNotify] = useSound('https://assets.mixkit.co/active_storage/sfx/136/136-preview.mp3', { volume: 0.5 });

  useEffect(() => {
    if (!userData?.id) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, `users/${userData.id}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      // Detect new incoming notifications to show toast
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
          // If message is less than 5 seconds old (fresh notification)
          if (Date.now() - notification.createdAt < 5000) {
            triggerToast(notification);
            playNotify();
          }
        }
      });

      setNotifications(newNotifications);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userData.id}/notifications`));

    return unsubscribe;
  }, [userData?.id]);

  const triggerToast = (notification: Notification) => {
    setActiveToast(notification);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 5000);
  };

  const sendNotification = async (targetUserId: string, notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>) => {
    try {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notifData: Notification = {
        ...notification,
        id,
        userId: targetUserId,
        createdAt: Date.now(),
        read: false,
      };

      await setDoc(doc(db, `users/${targetUserId}/notifications`, id), notifData);
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!userData?.id) return;
    try {
      await updateDoc(doc(db, `users/${userData.id}/notifications`, notificationId), {
        read: true
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const clearNotification = async (notificationId: string) => {
    if (!userData?.id) return;
    try {
      await deleteDoc(doc(db, `users/${userData.id}/notifications`, notificationId));
    } catch (err) {
      console.error('Error clearing notification:', err);
    }
  };

  const dismissToast = () => {
    setActiveToast(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      sendNotification, 
      markAsRead, 
      clearNotification,
      activeToast,
      dismissToast
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
