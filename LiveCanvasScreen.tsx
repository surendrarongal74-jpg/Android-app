import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Palette, 
  Eraser, 
  Trash2, 
  Download, 
  Sparkles, 
  Zap, 
  ChevronLeft,
  X,
  Share,
  Undo,
  Circle,
  Wand2,
  Camera
} from 'lucide-react';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import { generateStoryImage, AI_MODELS } from '../lib/ai';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  id: string;
}

const COLORS = [
  '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', 
  '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'
];

export default function LiveCanvasScreen() {
  const navigate = useNavigate();
  const { space } = useCoupleSpace();
  const { userData } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<any>(null);
  
  const [color, setColor] = useState('#FFFFFF');
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Socket Connection
  useEffect(() => {
    if (!space?.id) return;

    socketRef.current = io();
    socketRef.current.emit('join-room', space.id);

    socketRef.current.on('stroke-received', (remoteStroke: Stroke) => {
      drawStroke(remoteStroke, true);
      setStrokes(prev => [...prev, remoteStroke]);
    });

    socketRef.current.on('clear-received', () => {
      clearCanvas(true);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [space?.id]);

  const drawStroke = useCallback((stroke: Stroke, isRemote = false) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Remote strokes get a glowing effect
    if (isRemote) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = stroke.color;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.closePath();
    
    ctx.shadowBlur = 0; // Reset
  }, []);

  const handleStart = (e: any) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    setIsDrawing(true);
    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      points: [{ x, y }],
      color,
      width: lineWidth
    };
    setStrokes(prev => [...prev, newStroke]);
  };

  const handleMove = (e: any) => {
    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    setStrokes(prev => {
      const last = prev[prev.length - 1];
      const updated = { ...last, points: [...last.points, { x, y }] };
      drawStroke(updated);
      return [...prev.slice(0, -1), updated];
    });
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Sync final stroke
    const lastStroke = strokes[strokes.length - 1];
    if (lastStroke && space?.id) {
      socketRef.current?.emit('draw-stroke', { roomId: space.id, strokeData: lastStroke });
    }
  };

  const clearCanvas = (isRemote = false) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    
    if (!isRemote && space?.id) {
      socketRef.current?.emit('canvas-clear', space.id);
    }
  };

  const handeAISynthesize = async () => {
    if (strokes.length === 0) return;
    setIsSynthesizing(true);
    
    try {
      // Create a visual description for the AI image generator
      const canvas = canvasRef.current;
      const dataUrl = canvas?.toDataURL('image/png');
      
      const prompt = `A highly detailed, cinematic romantic anime illustration based on a couple's collaborative sketch. 
      The sketch contains elements like: heart shapes, two figures, soft background.
      Style: Makoto Shinkai aesthetic, emotional lighting, starry night, petals falling, 8k resolution, dreamy atmosphere.`;
      
      const imageUrl = await generateStoryImage(prompt);
      setAiResult(imageUrl);
      
      // Save to memories
      if (space?.id && userData) {
        const memoryRef = collection(db, `coupleSpaces/${space.id}/memories`);
        await addDoc(memoryRef, {
          coupleSpaceId: space.id,
          creatorId: userData.id,
          type: 'artwork',
          url: imageUrl,
          date: new Date().toISOString(),
          title: "Artistic Bond",
          description: "A shared masterpiece turned into reality by AIRA.",
          createdAt: Date.now()
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md relative z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-bold">Live Canvas</h1>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Linked with Partner
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => clearCanvas()}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Clear all"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={handeAISynthesize}
            disabled={isSynthesizing || strokes.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20`}
          >
            {isSynthesizing ? <Zap size={14} className="animate-spin" /> : <Wand2 size={14} />}
            AI Art
          </button>
        </div>
      </header>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={window.innerWidth * 0.9}
          height={window.innerHeight * 0.6}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="bg-slate-900/50 border border-white/10 rounded-2xl shadow-2xl cursor-crosshair touch-none"
        />
        
        <AnimatePresence>
          {isSynthesizing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-8 text-center"
            >
              <Sparkles className="text-blue-400 mb-4 animate-bounce" size={48} />
              <h2 className="text-xl font-bold mb-2">AIRA is painting...</h2>
              <p className="text-slate-400 text-sm max-w-xs">Turning your shared connection into a cinematic masterpiece.</p>
              <div className="mt-8 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {aiResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-50 bg-slate-950 p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="text-yellow-400" size={20} /> AI Masterpiece
              </h2>
              <button 
                onClick={() => setAiResult(null)}
                className="p-2 rounded-full bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl relative border border-white/10">
              <img src={aiResult} className="w-full h-full object-cover" />
            </div>
            <div className="mt-6 flex gap-4">
              <button className="flex-1 py-4 rounded-2xl bg-white/10 font-bold flex items-center justify-center gap-2">
                <Download size={20} /> Save
              </button>
              <button className="flex-1 py-4 rounded-2xl bg-blue-600 font-bold flex items-center justify-center gap-2">
                <Share size={20} /> Share
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Toolbar */}
      <footer className="p-6 pb-12 bg-slate-900/80 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2.5">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-1 rounded-full px-3">
             <Circle size={lineWidth + 2} className="text-white" />
             <input 
               type="range" 
               min="2" max="20" 
               value={lineWidth} 
               onChange={(e) => setLineWidth(parseInt(e.target.value))}
               className="w-24 accent-blue-500"
             />
          </div>
        </div>
        
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <Eraser size={24} />
            <span className="text-[10px]">Eraser</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <Undo size={24} />
            <span className="text-[10px]">Undo</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
             <Palette size={24} className="text-blue-400" />
             <span className="text-[10px] text-blue-400">Brush</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <Sparkles size={24} />
            <span className="text-[10px]">Stickers</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
