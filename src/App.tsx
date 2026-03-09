/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Shield, Zap, Skull, Target, Flame } from 'lucide-react';

// Constants
const PIPE_WIDTH = 60;
const DEFAULT_GAP_SIZE = 150;
const SLAM_SPEED = 45;
const OPEN_SPEED = 15;
const BIRD_BASE_SPEED = 3.5;
const WARMUP_FRAMES = 600; // ~10 seconds at 60fps
const MAX_INTEGRITY = 100;
const CHAOS_LIMIT = 100;

type GameState = 'START' | 'PLAYING' | 'GAME_OVER';
type BirdType = 'NORMAL' | 'SNIPER' | 'DIVER' | 'TANK';

interface Bird {
  id: number;
  x: number;
  y: number;
  baseY: number;
  type: BirdType;
  health: number;
  maxHealth: number;
  vx: number;
  vy: number;
  size: number;
  state: 'FLYING' | 'CRUSHED' | 'PASSED';
  lastShot: number;
  taunt?: string;
  tauntTime: number;
  flapFrame: number;
  oscSpeed: number;
  oscAmp: number;
  oscPhase: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type: 'FEATHER' | 'SPARK' | 'TEXT';
  text?: string;
}

const TAUNTS = [
  "LAME!",
  "TOO SLOW!",
  "MISS!",
  "LOL!",
  "BYE!",
  "ZOOOOM!",
  "TRY HARDER!",
  "WEAK!"
];

const COLORS = {
  ORANGE: '#FF3E00',
  CYAN: '#00F0FF',
  YELLOW: '#FFF000',
  GREEN: '#00FF41',
  PURPLE: '#BC00FF',
  BLACK: '#000000',
  WHITE: '#FFFFFF'
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('cocky-birds-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [integrity, setIntegrity] = useState(MAX_INTEGRITY);
  const [chaos, setChaos] = useState(0);
  const [isThunderReady, setIsThunderReady] = useState(false);
  const [lastDamageTime, setLastDamageTime] = useState(0);
  const [lastKillTime, setLastKillTime] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isDivine, setIsDivine] = useState(false);
  const [isWarmup, setIsWarmup] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(() => {
    return localStorage.getItem('cocky-birds-tutorial-done') !== 'true';
  });

  // Audio Refs
  const bgMusic = useRef<HTMLAudioElement | null>(null);
  const audioStarted = useRef(false);

  // Game state refs
  const chaosRef = useRef(0);
  const isThunderReadyRef = useRef(false);
  const birds = useRef<Bird[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const gapY = useRef(0);
  const currentGapSize = useRef(DEFAULT_GAP_SIZE);
  const isSlamming = useRef(false);
  const frameCount = useRef(0);
  const isDivineRef = useRef(false);
  const animationFrameId = useRef<number>(0);
  const dimensions = useRef({ width: 0, height: 0 });
  const mousePos = useRef({ x: 0, y: 0 });
  const birdIdCounter = useRef(0);
  const isWarmupActiveRef = useRef(false);

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    dimensions.current = { width, height };

    birds.current = [];
    bullets.current = [];
    particles.current = [];
    gapY.current = height / 2;
    mousePos.current = { x: width / 2, y: height / 2 };
    currentGapSize.current = DEFAULT_GAP_SIZE;
    isSlamming.current = false;
    frameCount.current = 0;
    setScore(0);
    setIntegrity(MAX_INTEGRITY);
    setChaos(0);
    chaosRef.current = 0;
    setIsThunderReady(false);
    isThunderReadyRef.current = false;
    
    const tutorialDone = localStorage.getItem('cocky-birds-tutorial-done') === 'true';
    if (!tutorialDone) {
      setIsWarmup(true);
      isWarmupActiveRef.current = true;
    } else {
      isWarmupActiveRef.current = false;
    }
  }, []);

  // Initialize Audio
  useEffect(() => {
    // Using a very reliable, high-compatibility arcade loop
    const audio = new Audio('https://files.catbox.moe/81gbow.mp3');
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    bgMusic.current = audio;

    // Force load
    audio.load();

    return () => {
      audio.pause();
      bgMusic.current = null;
    };
  }, []);

  // Handle Volume Fading
  useEffect(() => {
    if (!bgMusic.current) return;

    // Slightly higher volumes to ensure it's audible
    const targetVolume = gameState === 'PLAYING' ? 0.4 : (gameState === 'GAME_OVER' ? 0.1 : 0.2);
    
    const fadeInterval = setInterval(() => {
      if (!bgMusic.current) return;
      const current = bgMusic.current.volume;
      const diff = targetVolume - current;
      
      if (Math.abs(diff) < 0.01) {
        bgMusic.current.volume = targetVolume;
        clearInterval(fadeInterval);
      } else {
        bgMusic.current.volume = Math.max(0, Math.min(1, current + diff * 0.1));
      }
    }, 50);

    return () => clearInterval(fadeInterval);
  }, [gameState]);

  const startAudio = useCallback(() => {
    if (bgMusic.current) {
      // If it's already playing, don't restart, but ensure volume is up
      if (bgMusic.current.paused) {
        bgMusic.current.play()
          .then(() => {
            audioStarted.current = true;
            console.log("Audio started successfully");
          })
          .catch(e => {
            console.warn("Audio play failed:", e);
          });
      }
    }
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      startAudio();
      // Once we've successfully started, we can remove these listeners
      if (audioStarted.current) {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
      }
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [startAudio]);

  useEffect(() => {
    initGame();
    window.addEventListener('resize', initGame);
    return () => window.removeEventListener('resize', initGame);
  }, [initGame]);

  useEffect(() => {
    if (gameState === 'GAME_OVER') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('cocky-birds-high-score', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  useEffect(() => {
    if (integrity <= 0 && gameState === 'PLAYING') {
      setGameState('GAME_OVER');
    }
  }, [integrity, gameState]);

  const spawnBird = () => {
    const rand = Math.random();
    let type: BirdType = 'NORMAL';
    let health = 1;
    const warmupFactor = isWarmupActiveRef.current ? Math.min(1, frameCount.current / WARMUP_FRAMES) : 1;
    const speedMultiplier = 0.5 + 0.5 * warmupFactor;

    let vx = -(BIRD_BASE_SPEED + Math.random() * 2) * speedMultiplier;
    let size = 25;
    let oscSpeed = 0.1 + Math.random() * 0.05;
    let oscAmp = 15 + Math.random() * 15;

    if (rand > 0.92) {
      type = 'TANK';
      health = 3;
      vx = -1.8;
      size = 45;
      oscSpeed = 0.05;
      oscAmp = 30;
    } else if (rand > 0.8) {
      type = 'DIVER';
      vx = -6;
      size = 20;
      oscSpeed = 0.2;
      oscAmp = 45;
    } else if (rand > 0.65) {
      type = 'SNIPER';
      vx = -2.5;
      size = 25;
      oscSpeed = 0.08;
      oscAmp = 10;
    }

    const bird: Bird = {
      id: birdIdCounter.current++,
      x: dimensions.current.width + 100,
      y: 0,
      baseY: Math.random() * (dimensions.current.height - 300) + 150,
      type,
      health,
      maxHealth: health,
      vx,
      vy: 0,
      size,
      state: 'FLYING',
      lastShot: 0,
      tauntTime: 0,
      flapFrame: 0,
      oscSpeed,
      oscAmp,
      oscPhase: Math.random() * Math.PI * 2
    };
    birds.current.push(bird);
  };

  const createParticles = (x: number, y: number, color: string, count: number, type: 'FEATHER' | 'SPARK' | 'TEXT' = 'FEATHER', text?: string) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1,
        color,
        size: Math.random() * 8 + 2,
        type,
        text
      });
    }
  };

  const update = () => {
    if (gameState !== 'PLAYING') return;

    frameCount.current++;

    // Thunder Ready logic - Use Ref for logic, State for UI
    if (chaosRef.current >= CHAOS_LIMIT && !isThunderReadyRef.current) {
      isThunderReadyRef.current = true;
      setIsThunderReady(true);
    }

    // Gap logic
    const targetGapY = mousePos.current.y;
    gapY.current += (targetGapY - gapY.current) * 0.25;

    if (isSlamming.current) {
      currentGapSize.current -= SLAM_SPEED;
      if (currentGapSize.current <= 0) {
        currentGapSize.current = 0;
        isSlamming.current = false;
        
        // Impact Frame
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 50);

        // Thunder Strike Trigger - Check Ref
        if (isThunderReadyRef.current) {
          isThunderReadyRef.current = false;
          setIsThunderReady(false);
          chaosRef.current = 0;
          setChaos(0);
          setIsDivine(true);
          isDivineRef.current = true;
          
          // Kill ALL birds
          birds.current.forEach(bird => {
            if (bird.state !== 'CRUSHED') {
              bird.state = 'CRUSHED';
              setScore(s => s + 1);
              createParticles(bird.x, bird.y, COLORS.CYAN, 30, 'SPARK');
              createParticles(bird.x, bird.y, COLORS.YELLOW, 20, 'FEATHER');
            }
          });
          
          createParticles(dimensions.current.width / 2, gapY.current, COLORS.WHITE, 1, 'TEXT', 'DIVINE WRATH!!!');
          setIsShaking(true);
          setIsFlashing(true); // Extra long flash
          setTimeout(() => {
            setIsShaking(false);
            setIsFlashing(false);
            setIsDivine(false);
            isDivineRef.current = false;
          }, 1000); // Full second of god mode
        } else {
          // Normal crush check
          birds.current.forEach(bird => {
            if (bird.state === 'FLYING' && 
                bird.x > dimensions.current.width / 2 - PIPE_WIDTH / 2 - 20 && 
                bird.x < dimensions.current.width / 2 + PIPE_WIDTH / 2 + 20) {
              
              if (bird.y > gapY.current - DEFAULT_GAP_SIZE/2 && bird.y < gapY.current + DEFAULT_GAP_SIZE/2) {
                bird.health--;
                if (bird.health <= 0) {
                  bird.state = 'CRUSHED';
                  setScore(s => s + 1);
                  
                  chaosRef.current = Math.min(CHAOS_LIMIT, chaosRef.current + 15);
                  setChaos(chaosRef.current);
                  setLastKillTime(Date.now());
                  
                  // Graphic Effects
                  createParticles(bird.x, bird.y, COLORS.YELLOW, 25, 'FEATHER');
                  createParticles(bird.x, bird.y, COLORS.WHITE, 1, 'TEXT', 'SQUASH!');
                  setIsShaking(true);
                  setTimeout(() => setIsShaking(false), 300);
                } else {
                  createParticles(bird.x, bird.y, COLORS.WHITE, 1, 'TEXT', 'CLANG!');
                  bird.vx = -0.5; // Stun
                }
              }
            }
          });
        }
      }
    } else {
      currentGapSize.current += OPEN_SPEED;
      if (currentGapSize.current >= DEFAULT_GAP_SIZE) {
        currentGapSize.current = DEFAULT_GAP_SIZE;
      }
    }

    // Spawn birds
    const spawnRate = Math.max(15, 80 - Math.floor(score / 5) * 4);
    if (frameCount.current % spawnRate === 0) {
      spawnBird();
    }

    // Update birds
    birds.current.forEach(bird => {
      if (bird.state === 'FLYING') {
        bird.x += bird.vx;
        bird.flapFrame += 0.2;
        
        // Erratic Bouncy Flight Path
        const oscTime = frameCount.current * bird.oscSpeed + bird.oscPhase;
        const targetY = bird.baseY + Math.sin(oscTime) * bird.oscAmp;
        
        // Frantic flapping when close to pipes
        const distToPipe = Math.abs(bird.x - dimensions.current.width / 2);
        if (distToPipe < 300) {
          bird.flapFrame += 0.1;
          // Add some panic jitter
          bird.y = targetY + (Math.random() - 0.5) * 10;
        } else {
          bird.y = targetY;
        }

        // Calculate vy for squash/stretch
        bird.vy = Math.cos(oscTime) * bird.oscAmp * bird.oscSpeed;

        const warmupFactor = isWarmupActiveRef.current ? Math.min(1, frameCount.current / WARMUP_FRAMES) : 1;
        const shootRate = bird.type === 'SNIPER' ? 50 : 100;
        const canShoot = isWarmupActiveRef.current ? (frameCount.current > WARMUP_FRAMES / 3) : true;

        if (canShoot && frameCount.current - bird.lastShot > shootRate && bird.x > dimensions.current.width / 2) {
          bird.lastShot = frameCount.current;
          bullets.current.push({
            x: bird.x - bird.size/2,
            y: bird.y,
            vx: -10,
            vy: (gapY.current - bird.y) * 0.015,
            color: bird.type === 'SNIPER' ? COLORS.PURPLE : COLORS.CYAN
          });
        }

        if (bird.x < dimensions.current.width / 2 - PIPE_WIDTH) {
          bird.state = 'PASSED';
          bird.taunt = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
          bird.tauntTime = 120;
          setIntegrity(prev => Math.max(0, prev - 10));
          setLastDamageTime(Date.now());
        }
      } else if (bird.state === 'PASSED') {
        bird.x += bird.vx * 1.5;
        // Still bobbing while passing
        const oscTime = frameCount.current * bird.oscSpeed + bird.oscPhase;
        bird.y = bird.baseY + Math.sin(oscTime) * bird.oscAmp;
        if (bird.tauntTime > 0) bird.tauntTime--;
      }
    });

    // Update bullets
    bullets.current.forEach((bullet, bIdx) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      if (bullet.x < dimensions.current.width / 2 + PIPE_WIDTH / 2 && 
          bullet.x > dimensions.current.width / 2 - PIPE_WIDTH / 2) {
        
        const isGap = bullet.y > gapY.current - currentGapSize.current / 2 && 
                      bullet.y < gapY.current + currentGapSize.current / 2;
        
        if (!isGap) {
          setIntegrity(prev => Math.max(0, prev - 1.5));
          setLastDamageTime(Date.now());
          createParticles(bullet.x, bullet.y, COLORS.WHITE, 5, 'SPARK');
          bullets.current.splice(bIdx, 1);
        }
      }
    });

    // Update particles
    particles.current.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // Gravity for feathers
      p.life -= 0.025;
      if (p.life <= 0) particles.current.splice(i, 1);
    });

    birds.current = birds.current.filter(b => b.x > -200);
    bullets.current = bullets.current.filter(b => b.x > -100);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensions.current;
    ctx.clearRect(0, 0, width, height);

    // Background - Brutalist Shapes
    ctx.fillStyle = COLORS.ORANGE;
    ctx.fillRect(0, 0, width, height);
    
    // Parallax Shapes
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    const offset = (frameCount.current * 0.5) % 400;
    for (let i = -400; i < width + 400; i += 400) {
      ctx.beginPath();
      ctx.moveTo(i - offset, height);
      ctx.lineTo(i - offset + 200, 0);
      ctx.lineTo(i - offset + 400, height);
      ctx.fill();
    }

    // Draw Birds
    birds.current.forEach(bird => {
      if (bird.state === 'CRUSHED') return;

      ctx.save();
      ctx.translate(bird.x, bird.y);
      
      // Taunt Bubble - Moved outside scale block for crispness
      if (bird.taunt && bird.tauntTime > 0) {
        ctx.save();
        ctx.fillStyle = COLORS.BLACK;
        ctx.font = '900 32px Bangers';
        ctx.textAlign = 'center';
        ctx.strokeStyle = COLORS.WHITE;
        ctx.lineWidth = 6;
        
        // Add a slight "shout" shake
        const shakeX = (Math.random() - 0.5) * 4;
        const shakeY = (Math.random() - 0.5) * 4;
        
        ctx.strokeText(bird.taunt, shakeX, -bird.size - 20 + shakeY);
        ctx.fillText(bird.taunt, shakeX, -bird.size - 20 + shakeY);
        ctx.restore();
      }

      // Squash & Stretch synced with movement
      const flap = Math.sin(bird.flapFrame) * 0.1;
      const velocityStretch = Math.abs(bird.vy) * 0.02;
      ctx.scale(1 + flap - velocityStretch, 1 - flap + velocityStretch);

      // Bird Body - Graphic Style
      const color = bird.type === 'TANK' ? COLORS.PURPLE : bird.type === 'SNIPER' ? COLORS.CYAN : COLORS.YELLOW;
      ctx.fillStyle = color;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 6;
      
      // Body
      ctx.beginPath();
      ctx.arc(0, 0, bird.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye - Angry
      ctx.fillStyle = COLORS.WHITE;
      ctx.beginPath();
      ctx.arc(bird.size/4, -bird.size/6, bird.size/4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = COLORS.BLACK;
      ctx.beginPath();
      ctx.arc(bird.size/3, -bird.size/6, bird.size/8, 0, Math.PI * 2);
      ctx.fill();

      // Sunglasses
      ctx.fillStyle = COLORS.BLACK;
      ctx.fillRect(-bird.size/2, -bird.size/3, bird.size, bird.size/3);
      
      // Beak
      ctx.fillStyle = COLORS.ORANGE;
      ctx.beginPath();
      ctx.moveTo(bird.size/3, 0);
      ctx.lineTo(bird.size/1.5, bird.size/6);
      ctx.lineTo(bird.size/3, bird.size/3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });

    // Draw Bullets
    bullets.current.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Pipes - Brutalist Style
    let pipeX = width / 2 - PIPE_WIDTH / 2;
    let pipeYOffset = 0;
    const isThunderActive = isThunderReadyRef.current && isSlamming.current;
    
    if (isThunderActive || isDivineRef.current) {
      pipeX += (Math.random() - 0.5) * 25; // More shake
      pipeYOffset = (Math.random() - 0.5) * 25;
      ctx.shadowBlur = isDivineRef.current ? 80 : 40;
      ctx.shadowColor = isDivineRef.current ? COLORS.CYAN : COLORS.YELLOW;
    }

    const pipeColor = isThunderReadyRef.current ? COLORS.YELLOW : COLORS.GREEN;
    
    ctx.fillStyle = pipeColor;
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 8;

    // Top Pipe
    const topPipeHeight = gapY.current - currentGapSize.current / 2 + pipeYOffset;
    ctx.fillRect(pipeX, -10, PIPE_WIDTH, topPipeHeight + 10);
    ctx.strokeRect(pipeX, -10, PIPE_WIDTH, topPipeHeight + 10);
    
    // Bottom Pipe
    const bottomPipeY = gapY.current + currentGapSize.current / 2 + pipeYOffset;
    const bottomPipeHeight = height - bottomPipeY;
    ctx.fillRect(pipeX, bottomPipeY, PIPE_WIDTH, bottomPipeHeight + 10);
    ctx.strokeRect(pipeX, bottomPipeY, PIPE_WIDTH, bottomPipeHeight + 10);

    // Internal Lightning for Pipes - Now appears on EVERY slam
    if (isSlamming.current || isDivineRef.current) {
      ctx.save();
      const isSupercharged = isThunderReadyRef.current || isDivineRef.current;
      ctx.strokeStyle = isSupercharged ? COLORS.WHITE : 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = isSupercharged ? 6 : 2; // Thicker lightning
      ctx.shadowBlur = isSupercharged ? 30 : 8; // More glow
      ctx.shadowColor = isSupercharged ? COLORS.CYAN : COLORS.WHITE;
      
      const drawPipeLightning = (y1: number, y2: number) => {
        const boltCount = isDivineRef.current ? 4 : (isSupercharged ? 2 : 1);
        for (let i = 0; i < boltCount; i++) {
          ctx.beginPath();
          let curY = y1;
          ctx.moveTo(pipeX + Math.random() * PIPE_WIDTH, curY);
          while (curY < y2) {
            curY += 15 + Math.random() * 25; // More jagged
            ctx.lineTo(pipeX + Math.random() * PIPE_WIDTH, Math.min(curY, y2));
          }
          ctx.stroke();
        }
      };
      
      drawPipeLightning(0, topPipeHeight);
      drawPipeLightning(bottomPipeY, height);
      ctx.restore();
    }

    // Pipe Details (Rivets)
    ctx.fillStyle = COLORS.BLACK;
    ctx.shadowBlur = 0; // Reset shadow for rivets
    for (let y = 40; y < height; y += 80) {
      if (y < topPipeHeight - 15 || y > bottomPipeY + 15) {
        ctx.beginPath(); ctx.arc(pipeX + 12, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(pipeX + PIPE_WIDTH - 12, y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Draw Screen-Wide Lightning Storm during Divine Wrath
    if (isDivineRef.current) {
      ctx.save();
      const boltCount = 12; // 12 massive bolts per frame
      for (let b = 0; b < boltCount; b++) {
        const segments: { x1: number, y1: number, x2: number, y2: number }[] = [];
        let curY = 0;
        let lastX = Math.random() * width;
        
        while (curY < height) {
          const nextY = curY + Math.random() * 40 + 20;
          const nextX = lastX + (Math.random() - 0.5) * 300; // Wide spread
          segments.push({ x1: lastX, y1: curY, x2: nextX, y2: nextY });
          
          if (Math.random() > 0.7) {
            const branchX = nextX + (Math.random() - 0.5) * 200;
            const branchY = nextY + Math.random() * 60;
            segments.push({ x1: nextX, y1: nextY, x2: branchX, y2: branchY });
          }
          
          lastX = nextX;
          curY = nextY;
        }

        // Outer Glow
        ctx.strokeStyle = COLORS.CYAN;
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 40;
        ctx.shadowColor = COLORS.CYAN;
        ctx.beginPath();
        segments.forEach(seg => {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        });
        ctx.stroke();
        
        // Inner Core
        ctx.strokeStyle = COLORS.WHITE;
        ctx.lineWidth = 5;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        segments.forEach(seg => {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        });
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Particles
    particles.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      if (p.type === 'TEXT') {
        ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 8;
        const fontSize = p.text === 'THUNDER!!!' ? 120 : 48;
        ctx.font = `900 ${fontSize}px Bangers`;
        ctx.textAlign = 'center';
        
        // Add a slight shake to the text itself
        const tx = p.x + (Math.random() - 0.5) * 5;
        const ty = p.y + (Math.random() - 0.5) * 5;
        
        ctx.strokeText(p.text!, tx, ty);
        ctx.fillText(p.text!, tx, ty);
      } else {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (p.type === 'FEATHER') {
          ctx.ellipse(p.x, p.y, p.size, p.size/2, frameCount.current * 0.1, 0, Math.PI * 2);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  };

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      update();
      draw(ctx);
    }
    animationFrameId.current = requestAnimationFrame(loop);
  }, [gameState]); // Only depend on gameState to avoid frequent loop restarts

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [loop]);

  const handleInteraction = (e: React.PointerEvent | React.MouseEvent) => {
    startAudio();
    if (gameState === 'PLAYING') {
      isSlamming.current = true;
    }
  };

  const handleMove = (e: React.PointerEvent | React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden font-sans touch-none ${isShaking ? 'shake' : ''}`}
      onPointerDown={handleInteraction}
      onPointerMove={handleMove}
    >
      <div className="absolute inset-0 halftone" />
      {isFlashing && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${isDivine ? 'strobe' : 'impact-flash'}`}>
          {isDivine && (
            <motion.h2 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [1, 1.5, 1.2], rotate: [-20, 5, -5] }}
              className="text-6xl md:text-[12rem] font-black text-white italic drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] pointer-events-none uppercase tracking-tighter"
            >
              Divine Wrath
            </motion.h2>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Warmup Indicator */}
      {gameState === 'PLAYING' && isWarmup && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 1.2] }}
          transition={{ duration: 5, times: [0, 0.1, 0.8, 1] }}
          onAnimationComplete={() => {
            setIsWarmup(false);
            localStorage.setItem('cocky-birds-tutorial-done', 'true');
            setIsFirstTime(false);
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-white border-4 border-black p-4 md:p-8 shadow-[8px_8px_0px_#000] -rotate-3 max-w-md text-center">
            <h2 className="text-4xl md:text-8xl font-black text-black italic leading-none">WARMUP</h2>
            <p className="text-black font-black uppercase text-xs md:text-xl tracking-widest mt-2">Birds are slow & peaceful...</p>
            <div className="mt-4 pt-4 border-t-2 border-black/10">
              <p className="text-orange-600 font-black text-lg md:text-2xl animate-bounce">
                MOVE THE PIPE TO CRUSH BIRDS!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-0 left-0 w-full p-2 md:p-8 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1 md:gap-4">
            {/* Integrity Bar */}
            <motion.div 
              animate={lastDamageTime > Date.now() - 200 ? { x: [-2, 2, -2, 2, 0] } : {}}
              className="bg-white border-[1.5px] md:border-4 border-black shadow-[2px_2px_0px_#000] md:shadow-[6px_6px_0px_#000] p-1 md:p-4 flex items-center gap-1 md:gap-4"
            >
              <Shield className={integrity < 30 ? "text-red-600 animate-pulse" : "text-black"} size={10} md:size={24} strokeWidth={3} />
              <div className="w-16 md:w-40 h-2 md:h-6 bg-black/10 border-[1px] border-black relative overflow-hidden">
                {/* Ghost Bar for Damage */}
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-red-500/30"
                  animate={{ width: `${integrity}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {/* Main Integrity Bar */}
                <motion.div 
                  className="absolute top-0 left-0 h-full"
                  initial={false}
                  animate={{ 
                    width: `${integrity}%`,
                    backgroundColor: integrity < 30 ? '#FF0000' : integrity < 60 ? '#FFD700' : '#00FF41'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
            </motion.div>

            {/* Chaos Bar */}
            <motion.div 
              animate={lastKillTime > Date.now() - 200 ? { scale: [1, 1.1, 1] } : {}}
              className={`bg-white border-[1.5px] md:border-4 border-black shadow-[2px_2px_0px_#000] md:shadow-[6px_6px_0px_#000] p-1 md:p-4 flex items-center gap-1 md:gap-4 ${isThunderReady ? 'animate-pulse bg-yellow-400' : ''}`}
            >
              <Zap className={`text-black ${isThunderReady ? 'animate-bounce' : ''}`} size={10} md:size={24} strokeWidth={3} />
              <div className="w-16 md:w-40 h-2 md:h-6 bg-black/10 border-[1px] border-black relative overflow-hidden">
                {/* Ghost Bar for Filling */}
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-white/50"
                  animate={{ width: `${chaos}%` }}
                  transition={{ duration: 0.2 }}
                />
                {/* Main Chaos Bar */}
                <motion.div 
                  className="absolute top-0 left-0 h-full"
                  animate={{ 
                    width: `${chaos}%`,
                    backgroundColor: isThunderReady ? ['#000', '#FFF000', '#000'] : '#00F0FF'
                  }}
                  transition={isThunderReady ? { repeat: Infinity, duration: 0.5 } : { type: 'spring', stiffness: 500, damping: 25 }}
                />
              </div>
            </motion.div>
          </div>

          <div className="bg-white border-[1.5px] md:border-4 border-black shadow-[2px_2px_0px_#000] md:shadow-[8px_8px_0px_#000] p-1.5 md:p-6 text-center min-w-[40px] md:min-w-[80px]">
            <h1 className="text-xl md:text-6xl font-black text-black font-display italic leading-none">
              {score}
            </h1>
            <p className="text-black font-black uppercase text-[6px] md:text-xs tracking-widest mt-0.5">KILLS</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {gameState === 'START' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <div className="brutalist-card p-4 md:p-12 flex flex-col items-center max-w-[280px] md:max-w-md w-full">
              <motion.div 
                animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mb-3 md:mb-8"
              >
                <div className="w-16 h-16 md:w-32 md:h-32 bg-[#FFF000] rounded-full border-4 md:border-8 border-black flex items-center justify-center shadow-[4px_4px_0px_#000] md:shadow-[8px_8px_0px_#000]">
                  <Skull size={32} md:size={72} className="text-black" />
                </div>
              </motion.div>
              
              <h1 className="text-4xl md:text-8xl font-black text-black mb-1 tracking-tighter font-display italic text-center leading-none">
                COCKY<br/>BIRDS
              </h1>
              <p className="bg-black text-white px-2 py-0.5 font-black mb-6 md:mb-12 uppercase tracking-[0.2em] text-[8px] md:text-sm rotate-[-2deg]">
                REVENGE IS A PIPE
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  startAudio();
                  initGame();
                  setGameState('PLAYING');
                }}
                className="brutalist-btn w-full py-3 md:py-6 text-lg md:text-3xl font-black text-black flex items-center justify-center gap-2 md:gap-4"
              >
                <Play fill="currentColor" size={20} md:size={32} />
                CRUSH 'EM!
              </motion.button>
            </div>
          </motion.div>
        )}

        {gameState === 'GAME_OVER' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="brutalist-card p-4 md:p-12 w-full max-w-[260px] md:max-w-sm text-center relative overflow-hidden bg-[#FF3E00]">
              <div className="absolute top-0 left-0 w-full h-2 md:h-4 bg-black" />
              
              <h2 className="text-3xl md:text-7xl font-black text-white mb-4 md:mb-10 italic font-display leading-none drop-shadow-[3px_3px_0px_#000] md:drop-shadow-[6px_6px_0px_#000]">
                PIPES<br/>BUSTED!
              </h2>

              <div className="space-y-3 md:space-y-6 mb-6 md:mb-12">
                <div className="bg-white border-2 md:border-4 border-black p-3 md:p-6 shadow-[4px_4px_0px_#000] md:shadow-[8px_8px_0px_#000]">
                  <p className="text-black/40 font-black uppercase text-[7px] md:text-xs tracking-widest mb-0.5">Total Squashed</p>
                  <span className="text-3xl md:text-7xl font-black text-black italic font-display">{score}</span>
                </div>
                <div className="bg-black text-white p-2 md:p-4 border-2 md:border-4 border-white">
                  <p className="font-black uppercase text-[7px] md:text-xs tracking-widest">Best Record: {highScore}</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  startAudio();
                  initGame();
                  setGameState('PLAYING');
                }}
                className="brutalist-btn w-full py-3 md:py-6 text-base md:text-2xl font-black text-black flex items-center justify-center gap-2 md:gap-4 bg-[#00F0FF]"
              >
                <RotateCcw size={20} md:size={32} strokeWidth={3} />
                RETRY!
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thunder Ready Overlay */}
      <AnimatePresence>
        {isThunderReady && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <div className="absolute inset-0 border-[15px] md:border-[30px] border-yellow-400 mix-blend-overlay opacity-50 animate-pulse" />
            <div className="absolute top-20 md:top-40 left-0 w-full flex justify-center">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [-1, 1, -1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="bg-black text-yellow-400 px-4 md:px-12 py-1 md:py-4 border-2 md:border-8 border-yellow-400 font-black text-sm md:text-4xl font-display italic shadow-[4px_4px_0px_#000] md:shadow-[10px_10px_0px_#000]"
              >
                THUNDER READY!!!
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
