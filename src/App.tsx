import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, RefreshCcw } from 'lucide-react';

const TRACKS = [
  { id: 1, title: 'Neon Pulse (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Digital Odyssey (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  { id: 3, title: 'Synthwave Dreams (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
];

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const BOARD_SIZE = 400;

export default function App() {
  // ---- Music Player State ----
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrackIndex((i) => (i + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrackIndex((i) => (i === 0 ? TRACKS.length - 1 : i - 1));

  // ---- Game State Refs ----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const scoreRef = useRef(0);
  const snakeRef = useRef([{x: 10, y: 10}]);
  const dirRef = useRef({x: 0, y: -1});
  const nextDirRef = useRef({x: 0, y: -1});
  const foodRef = useRef({x: 5, y: 5});
  const lastTimeRef = useRef(0);
  const reqRef = useRef<number>();

  const spawnFood = () => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      if (!snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    foodRef.current = newFood;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = BOARD_SIZE / GRID_SIZE;

    // Clear board
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Draw Grid (Neon style)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
       ctx.beginPath();
       ctx.moveTo(i * cellSize, 0);
       ctx.lineTo(i * cellSize, BOARD_SIZE);
       ctx.stroke();
       ctx.beginPath();
       ctx.moveTo(0, i * cellSize);
       ctx.lineTo(BOARD_SIZE, i * cellSize);
       ctx.stroke();
    }

    // Draw Food (Fuchsia Neon)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#d946ef';
    ctx.fillStyle = '#d946ef';
    ctx.beginPath();
    ctx.arc(foodRef.current.x * cellSize + cellSize/2, foodRef.current.y * cellSize + cellSize/2, cellSize/2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw Snake (Cyan/Green Neon)
    ctx.shadowColor = '#22d3ee'; // Cyan 400
    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#67e8f9' : '#22d3ee';
      ctx.shadowBlur = index === 0 ? 20 : 10;
      
      const sizeOffset = index === 0 ? 0 : 2; 
      ctx.fillRect(
        segment.x * cellSize + sizeOffset, 
        segment.y * cellSize + sizeOffset, 
        cellSize - sizeOffset * 2, 
        cellSize - sizeOffset * 2
      );
    });
  }, []);

  const gameLoop = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    // Speed up slightly as score increases (max cap)
    const speed = Math.max(60, INITIAL_SPEED - (scoreRef.current * 1.5));

    if (deltaTime >= speed) {
      lastTimeRef.current = time;
      dirRef.current = nextDirRef.current;
      
      const head = snakeRef.current[0];
      const newHead = {
        x: head.x + dirRef.current.x,
        y: head.y + dirRef.current.y
      };

      // Check Wall Collision
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE || 
        newHead.y < 0 || newHead.y >= GRID_SIZE
      ) {
         setGameOver(true);
         setGameStarted(false);
         draw();
         return; 
      }

      // Check Self Collision
      if (snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y)) {
         setGameOver(true);
         setGameStarted(false);
         draw();
         return;
      }

      snakeRef.current.unshift(newHead);

      // Check Food
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        scoreRef.current += 10;
        setScore(scoreRef.current);
        spawnFood();
      } else {
        snakeRef.current.pop();
      }
    }

    draw();

    if (reqRef.current !== undefined) {
       reqRef.current = requestAnimationFrame(gameLoop);
    }
  }, [draw]);

  const resetGame = () => {
    snakeRef.current = [{x: 10, y: 10}];
    dirRef.current = {x: 0, y: -1};
    nextDirRef.current = {x: 0, y: -1};
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    spawnFood();
    lastTimeRef.current = performance.now();
    
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    reqRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      // Start game on arrow press if not playing
      if (!gameStarted && !gameOver && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
         setGameStarted(true);
         lastTimeRef.current = performance.now();
         
         if (reqRef.current) cancelAnimationFrame(reqRef.current);
         reqRef.current = requestAnimationFrame(gameLoop);
      }
      
      const currentDir = dirRef.current;
      switch (e.key) {
        case 'ArrowUp':
          if (currentDir.y === 0) nextDirRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (currentDir.y === 0) nextDirRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (currentDir.x === 0) nextDirRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (currentDir.x === 0) nextDirRef.current = { x: 1, y: 0 };
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [gameStarted, gameOver, gameLoop]);

  // Initial draw
  useEffect(() => {
    draw();
  }, [draw]);


  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans tracking-wide relative overflow-hidden">
      {/* Background Neon Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-600 opacity-[0.15] blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600 opacity-[0.15] blur-[140px] rounded-full pointer-events-none" />

      <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-6 md:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10 transition-all duration-300">
        Neon Snake
      </h1>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-start z-10 w-full max-w-5xl px-6 justify-center">
        
        {/* Game Area Segment */}
        <div className="flex flex-col items-center w-full max-w-[400px]">
          <div className="flex justify-between w-full mb-3 px-1">
             <div className="text-cyan-400 font-mono text-xl drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
               SCORE: {score.toString().padStart(4, '0')}
             </div>
             {gameOver && (
                <div className="text-fuchsia-500 font-mono text-xl animate-pulse drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">
                  SYSTEM FAILURE
                </div>
             )}
          </div>
          
          <div className="relative p-1 rounded-xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 shadow-[0_0_40px_rgba(34,211,238,0.2)] ring-1 ring-white/10 backdrop-blur-md">
            <canvas 
              ref={canvasRef} 
              width={BOARD_SIZE} 
              height={BOARD_SIZE}
              className="rounded-lg bg-[#0a0a0f] w-full"
            />
            {gameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg backdrop-blur-[4px]">
                 <button 
                   onClick={resetGame}
                   className="flex items-center gap-2 px-6 py-3 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 text-fuchsia-400 border border-fuchsia-500/50 rounded-full font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]"
                 >
                   <RefreshCcw size={20} /> Restart System
                 </button>
              </div>
            )}
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg backdrop-blur-[2px]">
                 <div className="px-6 py-3 text-cyan-400 font-mono animate-pulse uppercase tracking-widest text-sm drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                   Press Arrow Key to Start
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Music Player Segment */}
        <div className="w-full max-w-[340px] bg-[#0c0c12] border border-white/5 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group">
          {/* Subtle inner glow top */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-transparent opacity-60" />
          
          <audio 
            ref={audioRef} 
            src={TRACKS[currentTrackIndex].url}
            onEnded={nextTrack}
          />

          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-8 opacity-80 border-b border-cyan-500/20 pb-2 flex justify-between">
            <span>Audio System</span>
            <span className={isPlaying ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" : "text-gray-600"}>
              {isPlaying ? "Active" : "Standby"}
            </span>
          </div>

          <div className="mb-10">
             <div className="text-xl font-bold text-white mb-2 truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
               {TRACKS[currentTrackIndex].title}
             </div>
             <div className="text-sm font-mono text-fuchsia-400 opacity-80 drop-shadow-[0_0_4px_rgba(217,70,239,0.4)]">
               Track {String(currentTrackIndex + 1).padStart(2, '0')} / {String(TRACKS.length).padStart(2, '0')}
             </div>
          </div>

          {/* Audio Visualizer */}
          <div className="flex gap-[4px] items-end h-12 mb-10 opacity-80 backdrop-blur-sm rounded-lg p-2 border border-white/5 bg-black/20">
             {[...Array(24)].map((_, i) => {
               // Pseudo-randomizer for smooth varying bars
               const delay = (i * 0.05) % 1;
               return (
                 <div 
                   key={i} 
                   className={`flex-1 bg-cyan-400 rounded-sm transition-opacity duration-300 shadow-[0_0_8px_rgba(34,211,238,0.5)] ${isPlaying ? 'animate-equalizer' : 'h-[2px] opacity-30'}`}
                   style={isPlaying ? { 
                     animationDelay: `${delay}s`,
                     animationDuration: `${0.8 + (i % 3) * 0.2}s`
                   } : {}}
                 />
               );
             })}
          </div>

          <div className="flex items-center justify-between px-2">
            <button 
              onClick={prevTrack}
              className="p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all transform hover:scale-110 active:scale-95"
            >
              <SkipBack size={28} fill="currentColor" />
            </button>
            
            <button 
              onClick={togglePlay}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all border border-cyan-500/40"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>

            <button 
              onClick={nextTrack}
              className="p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all transform hover:scale-110 active:scale-95"
            >
              <SkipForward size={28} fill="currentColor" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
