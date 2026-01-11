import React, { useState, useCallback } from 'react';
import { GameLoop } from './components/GameLoop';
import { GameState, ScoreEvent, GameConfig } from './types';
import { getCommentary } from './services/geminiService';

const WINNING_SCORE = 5;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [commentary, setCommentary] = useState<string>("System Online. Nya~");
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Game Configuration State
  const [config, setConfig] = useState<GameConfig>({
    aiLevel: 1, // Default Normal
    speedMulti: 1.0,
    difficultyName: "NORMAL"
  });

  const handleStartGame = () => {
    setScores({ player: 0, ai: 0 });
    setGameState(GameState.PLAYING);
    setCommentary(getPredefinedPhrase('start'));
  };

  const handleExitGame = () => {
    setGameState(GameState.MENU);
    setScores({ player: 0, ai: 0 });
    setCommentary("See you later, human! Nya~");
  };

  // Local Dictionary for fast responses (Taunts)
  const getPredefinedPhrase = (event: ScoreEvent): string => {
    const PHRASES: Record<string, string[]> = {
      start: ["Let's play! Nya! 😼", "Ready to lose?", "Combat Mode: ON"],
      aiHit: ["Weak!", "Too slow!", "Hah!", "Predictable!", "Meow!", "Nyaha!"],
      playerScored: ["Nya?!", "System Error!", "Lucky!", "Grr..."],
      aiScored: ["Too easy! 😸", "Calculated.", "Weakness identified."]
    };
    const list = PHRASES[event] || ["Nya?"];
    return list[Math.floor(Math.random() * list.length)];
  };

  const updateCommentary = useCallback(async (event: ScoreEvent, currentScores: { player: number, ai: number }) => {
    // For fast-paced events like 'aiHit', use local dictionary to avoid API latency
    if (event === 'aiHit') {
      setCommentary(getPredefinedPhrase('aiHit'));
      return;
    }

    // For scoring events, use Gemini (or fallback)
    setIsCommentaryLoading(true);
    // Optimistically set a fallback first
    const fallback = getPredefinedPhrase(event);
    setCommentary(fallback);
    
    // Then try API
    try {
        const text = await getCommentary(event, currentScores);
        if (text) setCommentary(text);
    } catch(e) {
        // Ignore error
    } finally {
        setIsCommentaryLoading(false);
    }
  }, []);

  const handleScore = (event: ScoreEvent) => {
    // Only process actual score events
    if (event !== 'playerScored' && event !== 'aiScored') {
        updateCommentary(event, scores); // Taunts
        return;
    }

    setScores(prev => {
      const newScores = { ...prev };
      if (event === 'playerScored') newScores.player += 1;
      if (event === 'aiScored') newScores.ai += 1;

      // Check win condition
      if (newScores.player >= WINNING_SCORE || newScores.ai >= WINNING_SCORE) {
        setGameState(GameState.GAME_OVER);
      } else {
        updateCommentary(event, newScores);
      }
      return newScores;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleConfigChange = (key: keyof GameConfig, value: any) => {
    setConfig(prev => {
        const next = { ...prev, [key]: value };
        if (key === 'aiLevel') {
            const names = ["EASY", "NORMAL", "HARD", "NEKO GOD"];
            next.difficultyName = names[Number(value)];
        }
        return next;
    });
  };

  return (
    <div className="relative w-full h-full bg-slate-900 text-white overflow-hidden flex flex-col font-sans select-none">
      
      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="text-cyan-400 font-bold text-lg md:text-2xl drop-shadow-lg flex flex-col">
            <span>YOU</span>
            <span className="text-xs text-slate-500 font-normal">HUMAN</span>
        </div>
        
        <div className="flex gap-4 text-5xl md:text-7xl font-black italic tracking-tighter absolute left-1/2 -translate-x-1/2 top-2">
          <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">{scores.player}</span>
          <span className="text-slate-600 opacity-50">-</span>
          <span className="text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">{scores.ai}</span>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="text-pink-500 font-bold text-lg md:text-2xl drop-shadow-lg text-right">
              NEKO-CPU
              <div className="text-xs text-pink-300 font-normal opacity-80">{config.difficultyName}</div>
          </div>
          {gameState === GameState.PLAYING && (
            <button 
              onClick={handleExitGame}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-4 py-1 rounded-full border border-slate-600 text-xs font-bold uppercase tracking-wider backdrop-blur-sm transition active:scale-95"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Main Game Canvas */}
      <div className="flex-grow relative z-0">
        <GameLoop 
          isPlaying={gameState === GameState.PLAYING} 
          config={config}
          onScore={handleScore} 
        />
      </div>

      {/* Chat Bubble */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg px-2 pointer-events-none z-20 transition-all duration-300 ${gameState === GameState.GAME_OVER ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-slate-900/80 border border-pink-500/30 rounded-full md:rounded-2xl p-3 md:p-4 shadow-xl backdrop-blur-md flex items-center gap-3">
           <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-xl md:text-2xl shadow-lg border-2 border-white/20 animate-bounce">
             🐱
           </div>
           <div className="flex-1 min-w-0">
             <div className="text-pink-400 text-[10px] md:text-xs font-bold uppercase mb-0.5 tracking-wider flex justify-between">
                 <span>Opponent</span>
                 <span className="text-slate-500 font-mono text-[9px]">ONLINE</span>
             </div>
             <p className={`text-sm md:text-base leading-tight text-white/90 font-medium truncate ${isCommentaryLoading ? 'opacity-50' : 'opacity-100'}`}>
               {commentary}
             </p>
           </div>
        </div>
      </div>

      {/* Menu Overlay */}
      {gameState === GameState.MENU && !showOptions && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
            <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-2 italic tracking-tighter drop-shadow-2xl text-center leading-none">
                NEKO<br/>PONG
            </h1>
            <div className="text-pink-500 font-mono text-xs md:text-sm animate-pulse mb-8">VER 2.5 // ONLINE</div>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={handleStartGame} className="w-full py-4 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_0_25px_rgba(236,72,153,0.4)] transition-all hover:scale-105 active:scale-95 text-xl">
                    START GAME
                </button>
                <button onClick={() => setShowOptions(true)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 text-sm">
                    OPTIONS
                </button>
            </div>
        </div>
      )}

      {/* Options Overlay */}
      {showOptions && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
            <h2 className="text-4xl font-bold text-white mb-8 tracking-tight">SYSTEM SETTINGS</h2>
            <div className="w-full max-w-sm space-y-8">
                {/* Difficulty */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm uppercase tracking-wider font-bold text-pink-400">
                        <span>AI Difficulty</span>
                        <span>{config.difficultyName}</span>
                    </div>
                    <input 
                        type="range" min="0" max="3" step="1" 
                        value={config.aiLevel}
                        onChange={(e) => handleConfigChange('aiLevel', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>EASY</span><span>NORM</span><span>HARD</span><span>GOD</span>
                    </div>
                </div>

                {/* Speed */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm uppercase tracking-wider font-bold text-cyan-400">
                        <span>Game Speed</span>
                        <span>x{config.speedMulti.toFixed(1)}</span>
                    </div>
                    <input 
                        type="range" min="0.8" max="2.0" step="0.2"
                        value={config.speedMulti}
                        onChange={(e) => handleConfigChange('speedMulti', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Fullscreen */}
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-slate-300 font-bold text-sm">FULLSCREEN MODE</span>
                    <button onClick={toggleFullscreen} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-mono transition">TOGGLE</button>
                </div>
            </div>
            <button onClick={() => setShowOptions(false)} className="mt-12 px-8 py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-full font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105">
                APPLY & BACK
            </button>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md p-4">
          <h2 className={`text-5xl md:text-7xl font-black mb-4 text-center ${scores.player > scores.ai ? 'text-cyan-400' : 'text-pink-500'}`}>
            {scores.player > scores.ai ? 'YOU WIN!' : 'NEKO WINS!'}
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 font-mono">
            FINAL: {scores.player} - {scores.ai}
          </p>
          <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm">
            <button onClick={handleStartGame} className="flex-1 py-3 bg-pink-500 hover:bg-pink-400 text-white rounded-lg font-bold uppercase tracking-widest shadow-lg transition-transform hover:scale-105 active:scale-95">Rematch</button>
            <button onClick={handleExitGame} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-cyan-300 border border-cyan-500/50 rounded-lg font-bold uppercase tracking-widest shadow-lg transition-transform hover:scale-105 active:scale-95">Menu</button>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default App;
