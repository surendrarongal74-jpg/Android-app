import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Heart } from 'lucide-react';

export function LinkedCelebration({ partnerName }: { partnerName?: string }) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const myCanvas = document.createElement('canvas');
    myCanvas.style.width = '100vw';
    myCanvas.style.height = '100vh';
    myCanvas.style.position = 'fixed';
    myCanvas.style.inset = '0';
    myCanvas.style.pointerEvents = 'none';
    myCanvas.style.zIndex = '9999';
    document.body.appendChild(myCanvas);

    const myConfetti = confetti.create(myCanvas, {
      resize: true,
      useWorker: false
    });

    const frame = () => {
      myConfetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f43f5e', '#fb7185', '#fda4af']
      });
      myConfetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f43f5e', '#fb7185', '#fda4af']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          myCanvas.remove();
        }, 3000);
      }
    };
    frame();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-rose-500 flex flex-col items-center justify-center text-white"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
        className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl relative"
      >
        <Heart className="w-16 h-16 text-rose-500 fill-rose-500 animate-pulse relative z-10" />
      </motion.div>
      <motion.h2 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-4xl font-serif font-bold text-center mb-2 px-4"
      >
        You are now linked
      </motion.h2>
      {partnerName && (
        <motion.p 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.8 }}
           className="text-rose-100 text-lg font-medium"
        >
          with {partnerName} ❤️
        </motion.p>
      )}
    </motion.div>
  );
}
