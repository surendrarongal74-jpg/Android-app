import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Heart, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export function ProfileSetupScreen() {
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [loveLanguage, setLoveLanguage] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || '');
      setLoveLanguage(userData.loveLanguage || '');
      setPhotoURL(userData.photoURL || '');
    }
  }, [userData]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        loveLanguage,
        photoURL,
        setupComplete: true
      });
      navigate('/onboarding');
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-white via-rose-50 to-purple-50 text-slate-800 px-6 py-12 relative overflow-hidden font-sans">
      {/* Decorative Blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-200/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl -ml-20 -mb-20"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto w-full relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl shadow-rose-200/50 mb-4 border border-rose-100">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-200" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Create Your Profile</h1>
          <p className="text-slate-500 italic">Let your partner know it's you</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8 bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-rose-200/20 border border-white">
          {/* Photo Upload */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] bg-rose-100/50 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-10 h-10 text-rose-300" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-white text-rose-500 p-3 rounded-2xl shadow-lg border border-rose-50 cursor-pointer hover:scale-110 active:scale-95 transition-all">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-rose-400">Profile Photo</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Your Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How should your partner call you?"
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:border-rose-200 focus:bg-white transition-all text-slate-800 font-medium placeholder:text-slate-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Your Love Language</label>
              <select 
                value={loveLanguage}
                onChange={e => setLoveLanguage(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:border-rose-200 focus:bg-white transition-all text-slate-800 font-medium"
              >
                <option value="">Select Love Language (Optional)</option>
                <option value="Words of Affirmation">Words of Affirmation</option>
                <option value="Acts of Service">Acts of Service</option>
                <option value="Receiving Gifts">Receiving Gifts</option>
                <option value="Quality Time">Quality Time</option>
                <option value="Physical Touch">Physical Touch</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving || isUploading || !displayName}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-5 rounded-2xl shadow-xl shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Save & Continue
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
