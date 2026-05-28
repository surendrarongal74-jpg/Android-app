import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { BottomNav } from '../components/BottomNav';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { Heart, Sparkles, AlertCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateLoveLanguageSuggestions } from '../lib/ai';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "It's more meaningful to me when...",
    options: [
      { text: "My partner says 'I love you'", lang: "Words of Affirmation" },
      { text: "My partner hugs me randomly", lang: "Physical Touch" }
    ]
  },
  {
    id: 2,
    question: "I feel most loved when...",
    options: [
      { text: "We spend uninterrupted time together", lang: "Quality Time" },
      { text: "My partner surprises me with a small gift", lang: "Receiving Gifts" }
    ]
  },
  {
    id: 3,
    question: "I appreciate it most when...",
    options: [
      { text: "My partner helps me with a chore without being asked", lang: "Acts of Service" },
      { text: "My partner tells me how proud they are of me", lang: "Words of Affirmation" }
    ]
  },
  {
    id: 4,
    question: "A perfect date includes...",
    options: [
      { text: "Holding hands and cuddling", lang: "Physical Touch" },
      { text: "Doing an activity together where we can just talk", lang: "Quality Time" }
    ]
  },
  {
    id: 5,
    question: "I feel cared for when...",
    options: [
      { text: "My partner brings me my favorite coffee or snack", lang: "Receiving Gifts" },
      { text: "My partner takes care of an errand I was stressing over", lang: "Acts of Service" }
    ]
  }
];

export function LoveLanguageScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { partnerData } = useCoupleSpace();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (userData?.loveLanguage && partnerData?.loveLanguage) {
      loadSuggestions();
    }
  }, [userData?.loveLanguage, partnerData?.loveLanguage]);

  const loadSuggestions = async () => {
    if (!userData?.loveLanguage || !partnerData?.loveLanguage) return;
    setIsLoadingSuggestions(true);
    try {
      const sugs = await generateLoveLanguageSuggestions(partnerData.loveLanguage);
      setSuggestions(sugs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAnswer = (lang: string) => {
    const newAnswers = [...answers, lang];
    setAnswers(newAnswers);
    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      calculateAndSaveResult(newAnswers);
    }
  };

  const calculateAndSaveResult = async (finalAnswers: string[]) => {
    setIsSubmitting(true);
    const counts: Record<string, number> = {};
    for (const ans of finalAnswers) {
      counts[ans] = (counts[ans] || 0) + 1;
    }
    
    let topLang = "";
    let max = 0;
    for (const [lang, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        topLang = lang;
      }
    }

    if (!userData?.id) return;
    try {
      await updateDoc(doc(db, 'users', userData.id), { loveLanguage: topLang });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userData.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuiz = () => {
    const q = QUIZ_QUESTIONS[currentStep];
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[60vh]">
        <div className="w-full bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-rose-100/50 border border-white">
          <div className="flex justify-between items-center mb-8 text-rose-400 font-bold text-sm">
            <span>Question {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
            <div className="flex gap-1.5">
              {QUIZ_QUESTIONS.map((_, idx) => (
                <div key={idx} className={`h-2 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-rose-500' : idx < currentStep ? 'w-2 bg-rose-300' : 'w-2 bg-rose-100'}`} />
              ))}
            </div>
          </div>
          
          <h2 className="text-2xl font-serif text-rose-950 text-center mb-8">{q.question}</h2>
          
          <div className="space-y-4">
            {q.options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => handleAnswer(opt.lang)}
                className="w-full p-4 bg-white hover:bg-rose-50 rounded-2xl border border-rose-100 shadow-sm text-left text-rose-800 transition-all active:scale-95 group flex items-center justify-between"
              >
                <span>{opt.text}</span>
                <div className="w-6 h-6 rounded-full border-2 border-rose-200 group-hover:border-rose-400 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full group-hover:bg-rose-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className="p-6 space-y-6 pb-32">
        <h1 className="text-3xl font-serif font-bold text-rose-950 text-center mt-6">Love Languages</h1>
        
        <div className="grid grid-cols-2 gap-4">
          {/* User's result */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg shadow-rose-200/50 border border-white text-center flex flex-col items-center">
             <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 rounded-full flex items-center justify-center mb-3">
               <Heart className="w-6 h-6 fill-current" />
             </div>
             <span className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Your Style</span>
             <span className="font-serif font-bold text-lg text-rose-950">{userData?.loveLanguage}</span>
             <button 
               onClick={() => { setCurrentStep(0); setAnswers([]); updateDoc(doc(db, 'users', userData!.id), { loveLanguage: "" }); }}
               className="mt-4 text-xs font-semibold text-rose-400 hover:text-rose-600 flex items-center gap-1"
             >
               <RefreshCw className="w-3 h-3" /> Retake Quiz
             </button>
          </div>

          {/* Partner's result */}
          <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-3xl p-6 shadow-lg shadow-rose-300/50 text-center flex flex-col items-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm relative z-10">
               <Heart className="w-6 h-6 fill-current" />
             </div>
             <span className="text-xs font-bold text-rose-100 uppercase tracking-widest mb-1 relative z-10">{partnerData?.displayName}'s</span>
             {partnerData?.loveLanguage ? (
                <span className="font-serif font-bold text-lg relative z-10">{partnerData.loveLanguage}</span>
             ) : (
                <span className="font-medium text-sm text-rose-100 mt-1 relative z-10">Hasn't taken quiz yet</span>
             )}
          </div>
        </div>

        {/* AI Suggestions */}
        {partnerData?.loveLanguage ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg shadow-purple-200/50 border border-white mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-rose-950">AI Magic Suggestions</h3>
                <p className="text-xs text-rose-500">Ways to show love to {partnerData.displayName}</p>
              </div>
            </div>

            {isLoadingSuggestions ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Sparkles className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="text-sm text-purple-400 font-medium">Brewing romantic ideas...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="space-y-3">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50 items-start">
                    <span className="w-6 h-6 rounded-full bg-purple-200/50 text-purple-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                    <span className="text-sm text-rose-800">{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <button 
                onClick={loadSuggestions}
                className="w-full bg-purple-50 text-purple-600 font-bold py-3 rounded-xl hover:bg-purple-100 transition-colors"
               >
                Generate Ideas
              </button>
            )}
          </div>
        ) : (
          <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100 text-center flex flex-col items-center gap-3 mt-6">
            <AlertCircle className="w-8 h-8 text-rose-300" />
            <p className="text-sm text-rose-600">Waiting for {partnerData?.displayName} to take the quiz so we can give you personalized tips!</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-rose-50 relative">
      <div className="absolute top-6 left-6 z-50">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white rounded-full shadow-md text-rose-500 hover:bg-rose-50 hover:scale-105 transition-all border border-rose-100 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      {isSubmitting ? (
         <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
           <Heart className="w-10 h-10 text-rose-400 animate-pulse fill-rose-200" />
           <p className="font-medium text-rose-500 animate-pulse">Calculating your Love Language...</p>
         </div>
      ) : userData?.loveLanguage ? (
        renderResults()
      ) : (
        renderQuiz()
      )}
      <BottomNav />
    </div>
  );
}
