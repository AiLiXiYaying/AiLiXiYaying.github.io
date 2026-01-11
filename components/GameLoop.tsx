import React, { useRef, useEffect, useCallback } from 'react';
import { Particle, ScoreEvent, GameConfig } from '../types';

interface GameLoopProps {
  onScore: (event: ScoreEvent) => void;
  isPlaying: boolean;
  config: GameConfig;
}

// CONSTANTS
const CONSTANTS = {
    PADDLE_HEIGHT_RATIO: 0.15, // 15% of screen height
    PADDLE_WIDTH_RATIO: 0.015, // 1.5% of screen width
    BALL_RADIUS: 8,
    PADDLE_MARGIN: 10,
    BASE_SPEED: 5
};

export const GameLoop: React.FC<GameLoopProps> = ({ onScore, isPlaying, config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const timerRef = useRef<number>();
  
  // Mutable game state
  const gameState = useRef({
    ball: { x: 0, y: 0, speed: CONSTANTS.BASE_SPEED, dx: 0, dy: 0 },
    playerY: 0,
    targetPlayerY: 0,
    aiY: 0,
    particles: [] as Particle[],
    width: 0,
    height: 0,
    countdownValue: 0,
    inputActive: false,
    
    // AI Specific State
    aiErrorOffset: 0 // Simulates human error
  });

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      // Use window inner dimensions to avoid dpr issues on mobile
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      gameState.current.width = canvas.width;
      gameState.current.height = canvas.height;
      
      const pHeight = canvas.height * CONSTANTS.PADDLE_HEIGHT_RATIO;
      // Center paddles if uninitialized
      if (gameState.current.playerY === 0) {
        const centerY = canvas.height / 2 - pHeight / 2;
        gameState.current.playerY = centerY;
        gameState.current.targetPlayerY = centerY;
        gameState.current.aiY = centerY;
      }
    };
    
    window.addEventListener('resize', updateSize);
    updateSize();
    
    return () => window.removeEventListener('resize', updateSize);
  };

  const startCountdown = (direction: number) => {
    const state = gameState.current;
    state.countdownValue = 3;
    
    // Reset AI error
    state.aiErrorOffset = 0;

    // Reset Ball Pos
    const pWidth = Math.max(10, state.width * CONSTANTS.PADDLE_WIDTH_RATIO);
    state.ball.y = state.height / 2;
    if (direction === 1) state.ball.x = CONSTANTS.PADDLE_MARGIN + pWidth + 20;
    else state.ball.x = state.width - (CONSTANTS.PADDLE_MARGIN + pWidth + 20);

    state.ball.dx = 0;
    state.ball.dy = 0;
    state.ball.speed = CONSTANTS.BASE_SPEED * config.speedMulti;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      gameState.current.countdownValue -= 1;
      if (gameState.current.countdownValue <= 0) {
        clearInterval(timerRef.current);
        launchBall(direction);
      }
    }, 1000);
  };

  const launchBall = (direction: number) => {
    const state = gameState.current;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); 
    state.ball.dx = direction * state.ball.speed * Math.cos(angle);
    state.ball.dy = state.ball.speed * Math.sin(angle);
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      gameState.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color
      });
    }
  };

  const update = () => {
    if (!isPlaying) return;

    const state = gameState.current;
    const { width, height } = state;
    const pHeight = height * CONSTANTS.PADDLE_HEIGHT_RATIO;
    const pWidth = Math.max(10, width * CONSTANTS.PADDLE_WIDTH_RATIO);

    // --- Particle Physics ---
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.05;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // --- Player Movement (Lerp) ---
    if (state.countdownValue > 0) state.targetPlayerY = (height - pHeight) / 2;
    state.playerY += (state.targetPlayerY - state.playerY) * 0.2;

    // --- AI LOGIC (Predictive + Configurable) ---
    let aiDestY = state.aiY;

    if (state.countdownValue > 0) {
        aiDestY = (height - pHeight) / 2;
    } else {
        let targetY = state.ball.y;
        
        if (state.ball.dx > 0) { // Ball coming towards AI
            // 1. Calculate trajectory prediction
            const distToPaddle = (width - CONSTANTS.PADDLE_MARGIN - pWidth) - state.ball.x;
            if (distToPaddle > 0) {
                const timeToImpact = distToPaddle / state.ball.dx;
                let predictedY = state.ball.y + (state.ball.dy * timeToImpact);
                
                // Handle bounces in prediction
                // Simple folding approximation for single bounce
                if (predictedY < 0) predictedY = -predictedY;
                if (predictedY > height) {
                    const over = predictedY - height;
                    const bounces = Math.floor(over / height);
                    if (bounces % 2 === 0) predictedY = height - (over % height);
                    else predictedY = over % height;
                }
                
                targetY = predictedY;
                
                // 2. Add Error based on Config
                // AI Level 0 = High Error, 3 = No Error
                const errorFactor = Math.max(0, 0.4 - (config.aiLevel * 0.12)); 
                
                // If we don't have an error yet, generate one
                if (state.aiErrorOffset === 0 && Math.random() < 0.05) {
                    state.aiErrorOffset = (Math.random() - 0.5) * height * errorFactor;
                }
                // Reduce error as ball gets closer
                const confidence = 1 - (distToPaddle / width); // 0 (far) to 1 (hit)
                if (confidence > 0.8) state.aiErrorOffset *= 0.8; // Correct quickly at the end
                
                targetY += state.aiErrorOffset;
            }
        } else {
             // Ball moving away
             targetY = height / 2;
             state.aiErrorOffset = 0; // Reset error
        }
        
        aiDestY = targetY - (pHeight / 2);
    }

    // Clamp AI
    aiDestY = Math.max(0, Math.min(height - pHeight, aiDestY));
    
    // AI Reaction Speed (Lerp Factor) based on Config
    const aiLerp = [0.05, 0.08, 0.15, 0.35][config.aiLevel];
    state.aiY += (aiDestY - state.aiY) * aiLerp;


    // STOP logic if countdown
    if (state.countdownValue > 0) return;

    // --- Ball Physics ---
    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;

    // Top/Bottom Walls
    if (state.ball.y < CONSTANTS.BALL_RADIUS || state.ball.y > height - CONSTANTS.BALL_RADIUS) {
        state.ball.dy *= -1;
        state.ball.y = Math.max(CONSTANTS.BALL_RADIUS, Math.min(height - CONSTANTS.BALL_RADIUS, state.ball.y));
        createParticles(state.ball.x, state.ball.y, '#fff');
    }

    // --- Collisions ---
    // Player
    if (state.ball.dx < 0 && 
        state.ball.x - CONSTANTS.BALL_RADIUS < CONSTANTS.PADDLE_MARGIN + pWidth && 
        state.ball.x > CONSTANTS.PADDLE_MARGIN) {
        
        if (state.ball.y + CONSTANTS.BALL_RADIUS > state.playerY && 
            state.ball.y - CONSTANTS.BALL_RADIUS < state.playerY + pHeight) {
            handleHit(state.playerY, 1, pHeight);
            createParticles(state.ball.x, state.ball.y, '#06b6d4');
        }
    }

    // AI
    if (state.ball.dx > 0 && 
        state.ball.x + CONSTANTS.BALL_RADIUS > width - (CONSTANTS.PADDLE_MARGIN + pWidth) && 
        state.ball.x < width - CONSTANTS.PADDLE_MARGIN) {
        
        if (state.ball.y + CONSTANTS.BALL_RADIUS > state.aiY && 
            state.ball.y - CONSTANTS.BALL_RADIUS < state.aiY + pHeight) {
            handleHit(state.aiY, -1, pHeight);
            createParticles(state.ball.x, state.ball.y, '#ec4899');
            
            // Trigger Taunt
            if (Math.random() < 0.4) onScore('aiHit'); 
        }
    }

    // --- Scoring ---
    if (state.ball.x < -30) {
        onScore('aiScored');
        startCountdown(1);
    } else if (state.ball.x > width + 30) {
        onScore('playerScored');
        startCountdown(-1);
    }
  };

  const handleHit = (paddleY: number, direction: number, pHeight: number) => {
    const state = gameState.current;
    const center = paddleY + pHeight / 2;
    const diff = (state.ball.y - center) / (pHeight / 2);
    const angle = diff * (Math.PI / 3); 

    // Increase speed (Cap at 2.5x initial setting)
    const maxSpeed = CONSTANTS.BASE_SPEED * config.speedMulti * 2.5;
    state.ball.speed = Math.min(state.ball.speed * 1.05, maxSpeed);
    
    state.ball.dx = direction * state.ball.speed * Math.cos(angle);
    state.ball.dy = state.ball.speed * Math.sin(angle);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const state = gameState.current;
    const { width, height } = state;
    const pHeight = height * CONSTANTS.PADDLE_HEIGHT_RATIO;
    const pWidth = Math.max(10, width * CONSTANTS.PADDLE_WIDTH_RATIO);

    // BG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Center Line
    ctx.beginPath();
    ctx.setLineDash([10, 20]);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);

    // Player
    ctx.fillStyle = '#06b6d4';
    ctx.shadowBlur = 15; ctx.shadowColor = '#06b6d4';
    roundRect(ctx, CONSTANTS.PADDLE_MARGIN, state.playerY, pWidth, pHeight, 6);
    ctx.fill();

    // AI
    ctx.fillStyle = '#ec4899';
    ctx.shadowBlur = 15; ctx.shadowColor = '#ec4899';
    roundRect(ctx, width - CONSTANTS.PADDLE_MARGIN - pWidth, state.aiY, pWidth, pHeight, 6);
    ctx.fill();

    // Ball
    if (state.countdownValue <= 0 || isPlaying) {
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, CONSTANTS.BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20; ctx.shadowColor = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Countdown
    if (state.countdownValue > 0 && isPlaying) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 100px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.countdownValue.toString(), width / 2, height / 2);
    }
  };

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Handle Input
  const handleInput = useCallback((y: number) => {
    gameState.current.inputActive = true;
    const state = gameState.current;
    const pHeight = state.height * CONSTANTS.PADDLE_HEIGHT_RATIO;
    // Calculate raw position first
    let target = y - pHeight / 2;
    // Clamp
    target = Math.max(0, Math.min(state.height - pHeight, target));
    state.targetPlayerY = target;
  }, []);

  const onTouchMove = (e: React.TouchEvent) => handleInput(e.touches[0].clientY);
  const onMouseMove = (e: React.MouseEvent) => handleInput(e.clientY);

  const loop = () => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    setupCanvas();
    if (isPlaying) {
        startCountdown(Math.random() > 0.5 ? 1 : -1);
        requestRef.current = requestAnimationFrame(loop);
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        // Draw one frame to show waiting state
        const timer = setTimeout(() => draw(), 100);
        return () => clearTimeout(timer);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, config]); // Re-run if config changes (e.g. speed)

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block cursor-crosshair touch-none"
      onTouchStart={onTouchMove}
      onTouchMove={onTouchMove}
      onMouseMove={onMouseMove}
    />
  );
};
