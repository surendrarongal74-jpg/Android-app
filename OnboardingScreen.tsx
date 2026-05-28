import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Copy, ArrowRight, Link, ChevronLeft } from 'lucide-react';
import { getDoc } from 'firebase/firestore';
import { LinkedCelebration } from '../components/LinkedCelebration';
import { triggerHapticFeedback } from '../lib/haptics';

export function OnboardingScreen() {
  const { userData, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [partnerName, setPartnerName] = useState('');

  if (userData?.coupleSpaceId && !showCelebration) {
    return <Navigate to="/" />;
  }

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCancelSpace = async () => {
    if (!userData) return;
    triggerHapticFeedback('medium');
    try {
      await updateDoc(doc(db, 'users', userData.id), {
        coupleSpaceId: ''
      });
      setGeneratedCode(null);
      await refreshUserData();
    } catch (e) {
      console.error("Failed to cancel generated space:", e);
    }
  };

  const createSpace = async () => {
    if (!userData) return;
    setIsCreating(true);
    try {
      const code = generateInviteCode();
      const spaceId = code;
      const newSpace = {
        id: spaceId,
        partner1Id: userData.id,
        partner2Id: '',
        inviteCode: code,
        streak: 0,
        lastInteractionAt: Date.now(),
        createdAt: Date.now(),
        xp: 0,
        level: 1
      };
      await setDoc(doc(db, 'coupleSpaces', spaceId), newSpace);
      await updateDoc(doc(db, 'users', userData.id), { coupleSpaceId: spaceId });
      
      setGeneratedCode(code);
      await refreshUserData();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'coupleSpaces');
    }
    setIsCreating(false);
  };

  const joinSpace = async () => {
    if (!userData) return;
    setErrorMsg(null);
    
    if (!inviteCodeInput || inviteCodeInput.trim().length !== 6) {
      setErrorMsg("Please enter a valid 6-digit invite code.");
      return;
    }
    
    setIsJoining(true);
    try {
      const code = inviteCodeInput.trim().toUpperCase();
      const spaceDocRef = doc(db, 'coupleSpaces', code);
      const spaceSnap = await getDoc(spaceDocRef);
      
      if (!spaceSnap.exists()) {
        setErrorMsg("Invalid invite code");
        setIsJoining(false);
        return;
      }

      const spaceData = spaceSnap.data();

      if (spaceData.partner1Id === userData.id || spaceData.partner2Id === userData.id) {
        // Rejoining own space, no document creation needed
      } else if (spaceData.partner2Id && spaceData.partner2Id !== userData.id) {
        setErrorMsg("This space is already full.");
        setIsJoining(false);
        return;
      } else {
        await updateDoc(spaceDocRef, {
          partner2Id: userData.id
        });
      }

      await updateDoc(doc(db, 'users', userData.id), {
        coupleSpaceId: code
      });
      
      const p2Id = spaceData.partner1Id === userData.id ? spaceData.partner2Id : spaceData.partner1Id;
      if (p2Id) {
         try {
           const pDoc = await getDoc(doc(db, 'users', p2Id));
           if (pDoc.exists()) setPartnerName(pDoc.data().displayName);
         } catch(e) {}
      }

      setShowCelebration(true);
      await refreshUserData();
      
      setTimeout(() => {
        navigate('/');
      }, 4000);
      
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'coupleSpaces');
    }
    setIsJoining(false);
  };

  if (showCelebration) {
    return <LinkedCelebration partnerName={partnerName} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 text-rose-950 px-6 py-12 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-20 right-0 w-64 h-64 bg-pink-200/40 rounded-full blur-3xl -mr-20 -mt-20"></div>
      
      <h1 className="text-4xl font-serif font-bold text-center mb-8 relative z-10 bg-gradient-to-r from-rose-600 to-purple-600 text-transparent bg-clip-text pb-1">Connect with your partner</h1>
      
      {generatedCode ? (
        <div className="relative w-full max-w-md mx-auto z-10">
          {/* Back button above card */}
          <button
            type="button"
            onClick={handleCancelSpace}
            className="mb-4 flex items-center gap-2 text-rose-500 font-semibold hover:text-rose-650 transition-colors py-2.5 px-4 bg-white/80 backdrop-blur-md rounded-2xl border border-rose-100 shadow-sm cursor-pointer hover:scale-102 active:scale-98 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-rose-500" /> Go Back
          </button>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-rose-200/50 text-center border border-white"
          >
          <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Link className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2">Space Created!</h2>
          <p className="text-rose-500 mb-8 font-medium">Send this code to your partner to join your private space.</p>
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-3xl flex items-center justify-between mb-8 border border-white shadow-sm">
            <span className="text-3xl font-mono font-bold tracking-[0.2em] text-rose-950">{generatedCode}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  triggerHapticFeedback('light');
                }}
                className="p-4 bg-white text-rose-500 rounded-2xl hover:bg-rose-50 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button 
                onClick={async () => {
                  triggerHapticFeedback('medium');
                  const shareData = {
                    title: 'Join our Love Link space! ❤️',
                    text: `Hey! join our private couple space on Love Link using my code: ${generatedCode}`,
                    url: window.location.origin
                  };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch (e) {}
                  } else {
                    navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                    alert("Invite copied to clipboard!");
                  }
                }}
                className="p-4 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <Link className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-rose-400 font-medium">
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="ml-2">Waiting for partner to join...</span>
          </div>
        </motion.div>
       </div>
      ) : (
        <div className="space-y-8 relative z-10 mt-auto mb-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-rose-200/30 border border-white"
          >
            <h2 className="text-xl font-serif font-bold mb-2">Start a new space</h2>
            <p className="text-rose-400 text-sm mb-6">Create a space and invite your partner.</p>
            <button 
              onClick={createSpace}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-rose-300 hover:shadow-xl hover:shadow-rose-400 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 active:scale-95"
            >
              {isCreating ? 'Creating...' : 'Create Space'} <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>

          <div className="flex items-center gap-4 px-4">
            <div className="h-px bg-rose-200 flex-1" />
            <span className="text-rose-400 font-serif italic font-medium">or</span>
            <div className="h-px bg-rose-200 flex-1" />
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-rose-200/30 border border-white"
          >
            <h2 className="text-xl font-serif font-bold mb-2">Join existing space</h2>
            <p className="text-rose-400 text-sm mb-6">Enter the code from your partner.</p>
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Enter 6-digit code"
                value={inviteCodeInput}
                onChange={e => { setInviteCodeInput(e.target.value.toUpperCase()); setErrorMsg(null); }}
                className="w-full bg-rose-50 border-2 border-transparent rounded-2xl px-6 py-4 font-mono font-bold tracking-[0.2em] text-center text-lg outline-none focus:border-rose-300 focus:bg-white placeholder:text-rose-300 placeholder:font-sans placeholder:tracking-normal transition-all"
                maxLength={6}
              />
              {errorMsg && (
                <p className="text-red-500 text-sm font-medium text-center">{errorMsg}</p>
              )}
              <button 
                onClick={joinSpace}
                disabled={isJoining}
                className="w-full bg-rose-950 text-white font-semibold py-4 rounded-2xl shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                Join Space
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
