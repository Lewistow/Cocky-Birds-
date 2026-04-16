/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Shield, Zap, Skull, Target, Flame, Share2 } from 'lucide-react';

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
  type?: 'NORMAL' | 'FIRE';
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
  "WEAK!",
  "SKILL ISSUE!",
  "GET GUD!",
  "TRASH!",
  "EZ!",
  "CLOWN!",
  "DELETE APP!",
  "STILL 0?",
  "GO HOME!",
  "YAWN!",
  "U STINK!",
  "NOOB!",
  "CHOKE!",
  "GIVE UP!",
  "PATHETIC!",
  "MID!",
  "L + RATIO!",
  "CRY!",
  "SO BAD!",
  "RETIRE!",
  "DOG WATER!",
  "EMBARRASSING!",
  "BOT!",
  "FREE!",
  "WASHED!",
  "COOKED!",
  "FRAUD!",
  "NPC!",
  "UNINSTALL!",
  "SAD!",
  "WHIFF!",
  "TERRIBLE!",
  "LOSER!",
  "GIFTED!",
  "AFK?",
  "SLEEPING?",
  "MY GRANDMA?",
  "ZERO AURA!",
  "FLOP!",
  "BRONZE!",
  "IRON!",
  "SKILL GAP!",
  "COULDN'T BE ME!",
  "CLIPPED!",
  "SIT DOWN!",
  "RENT FREE!",
  "STAY MAD!",
  "GO TOUCH GRASS!",
  "LACKING!",
  "FREE ELO!",
  "GG NO RE!",
  "HOLD THIS L!",
  "IMAGINE MISSING!",
  "YOU'RE DONE!",
  "GO BACK TO LOBBY!",
  "WHO ARE YOU?",
  "EMOTE ON EM!",
  "CHECK YOUR MONITOR!",
  "LAGGING?",
  "CONTROLLER DISCONNECTED?",
  "GHOSTED!"
];

// Audio URLs
const MENU_AUDIO_URL = 'https://image2url.com/r2/default/audio/1773065729481-2e4a9e71-6179-4f3e-91b7-a673ae7f7873.mp3';
const PLAY_AUDIO_URL = 'https://image2url.com/r2/default/audio/1773065854849-861d272d-8080-439e-b668-888f3a413ada.mp3';

const COLORS = {
  ORANGE: '#FF3E00',
  CYAN: '#00F0FF',
  YELLOW: '#FFF000',
  GREEN: '#00FF41',
  PURPLE: '#BC00FF',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  DARK_BG: '#0a0a0c',
  DARK_ACCENT: '#141419'
};

interface PipeFragment {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
  color: string;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const totalSmashedRef = useRef(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('cocky-birds-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [totalBirdsSmashed, setTotalBirdsSmashed] = useState(() => {
    const saved = localStorage.getItem('cocky-birds-total-smashed');
    const val = saved ? parseInt(saved, 10) : 0;
    totalSmashedRef.current = val;
    return val;
  });
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(() => {
    const saved = localStorage.getItem('cocky-birds-total-games');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [hasSeenShareBanner, setHasSeenShareBanner] = useState(() => {
    return localStorage.getItem('cocky-birds-share-banner-seen') === 'true';
  });
  const [showShareBanner, setShowShareBanner] = useState(false);
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
  const divineEndTimeRef = useRef(0);
  const flashEndTimeRef = useRef(0);
  const shakeEndTimeRef = useRef(0);
  const killStreakRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const scoreRef = useRef(0);
  const integrityRef = useRef(MAX_INTEGRITY);
  const animationFrameId = useRef<number>(0);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dimensions = useRef({ width: 0, height: 0 });
  const mousePos = useRef({ x: 0, y: 0 });
  const pipeFragments = useRef<PipeFragment[]>([]);
  const isCrumbling = useRef(false);
  const birdIdCounter = useRef(0);
  const isWarmupActiveRef = useRef(false);
  const thunderActiveForSlam = useRef(false);
  const tauntDeck = useRef<string[]>([]);

  const getNextTaunt = useCallback(() => {
    if (tauntDeck.current.length === 0) {
      const deck = [...TAUNTS];
      // Fisher-Yates Shuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      tauntDeck.current = deck;
    }
    return tauntDeck.current.pop() || "LAME!";
  }, []);

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
    pipeFragments.current = [];
    isCrumbling.current = false;
    gapY.current = height / 2;
    mousePos.current = { x: width / 2, y: height / 2 };
    currentGapSize.current = DEFAULT_GAP_SIZE;
    isSlamming.current = false;
    thunderActiveForSlam.current = false;
    frameCount.current = 0;
    setScore(0);
    scoreRef.current = 0;
    
    // Increment total games played
    setTotalGamesPlayed(prev => {
      const next = prev + 1;
      localStorage.setItem('cocky-birds-total-games', next.toString());
      
      // Check for share banner trigger (3rd game for first timers)
      if (next === 3 && !hasSeenShareBanner) {
        setShowShareBanner(true);
      }
      
      return next;
    });

    killStreakRef.current = 0;
    lastMilestoneRef.current = 0;
    setIntegrity(MAX_INTEGRITY);
    integrityRef.current = MAX_INTEGRITY;
    setChaos(0);
    chaosRef.current = 0;
    setIsThunderReady(false);
    isThunderReadyRef.current = false;
    setIsDivine(false);
    isDivineRef.current = false;
    divineEndTimeRef.current = 0;
    flashEndTimeRef.current = 0;
    shakeEndTimeRef.current = 0;
    stopThunderRumble();
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setIsFlashing(false);
    setIsShaking(false);
    setIsDivine(false);
    
    const tutorialDone = localStorage.getItem('cocky-birds-tutorial-done') === 'true';
    if (!tutorialDone) {
      setIsWarmup(true);
      isWarmupActiveRef.current = true;
    } else {
      isWarmupActiveRef.current = false;
    }
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const isAudioUnlockedRef = useRef(false);
  const menuBufferRef = useRef<AudioBuffer | null>(null);
  const playBufferRef = useRef<AudioBuffer | null>(null);
  const menuGainNodeRef = useRef<GainNode | null>(null);
  const playGainNodeRef = useRef<GainNode | null>(null);
  const milestoneGainNodeRef = useRef<GainNode | null>(null);
  const isLoopingStartedRef = useRef(false);
  const thunderRumbleSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const thunderRumbleGainRef = useRef<GainNode | null>(null);
  const thunderRumbleLFORef = useRef<OscillatorNode | null>(null);

  const startAudio = useCallback(() => {
    if (isLoopingStartedRef.current) return;
    
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Initialize GainNodes if they don't exist
    if (!menuGainNodeRef.current) {
      const menuGain = ctx.createGain();
      menuGain.gain.value = 0.3;
      menuGain.connect(ctx.destination);
      menuGainNodeRef.current = menuGain;
    }
    if (!playGainNodeRef.current) {
      const playGain = ctx.createGain();
      playGain.gain.value = 0;
      playGain.connect(ctx.destination);
      playGainNodeRef.current = playGain;
    }

    if (!milestoneGainNodeRef.current) {
      const milestoneGain = ctx.createGain();
      milestoneGain.gain.value = 0;
      milestoneGain.connect(ctx.destination);
      milestoneGainNodeRef.current = milestoneGain;
    }

    audioStarted.current = true;

    if (menuBufferRef.current || playBufferRef.current) {
      const scheduleLoop = (buffer: AudioBuffer, gainNode: GainNode) => {
        let nextStartTime = ctx.currentTime + 0.1;
        
        const playNext = () => {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
          
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(gainNode);
          source.start(nextStartTime);
          
          const duration = buffer.duration;
          nextStartTime += duration;
          
          const delay = (nextStartTime - ctx.currentTime - 1.0) * 1000;
          setTimeout(playNext, Math.max(0, delay));
        };
        
        playNext();
      };

      if (menuBufferRef.current) {
        scheduleLoop(menuBufferRef.current, menuGainNodeRef.current!);
      }
      if (playBufferRef.current) {
        scheduleLoop(playBufferRef.current, playGainNodeRef.current!);
      }
      
      isLoopingStartedRef.current = true;
      isAudioUnlockedRef.current = true;
    }
  }, []);

  // Initialize Audio
  useEffect(() => {
    const loadBuffers = async () => {
      const loadOne = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ab = await res.arrayBuffer();
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const buffer = await audioCtxRef.current.decodeAudioData(ab);
          console.log(`Successfully loaded ${name}`);
          return buffer;
        } catch (e) {
          console.warn(`Failed to load ${name} from ${url}:`, e);
          return null;
        }
      };

      const [menuBuffer, playBuffer] = await Promise.all([
        loadOne(MENU_AUDIO_URL, 'Menu Audio'),
        loadOne(PLAY_AUDIO_URL, 'Play Audio')
      ]);

      menuBufferRef.current = menuBuffer;
      playBufferRef.current = playBuffer;

      if (audioStarted.current) {
        startAudio();
      }
    };

    loadBuffers();

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [startAudio]);

  const playMetallicSound = useCallback((isMiss: boolean) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = isMiss ? 0.7 : 2.0;
    
    const masterGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isMiss ? 1500 : 1000, now);
    filter.frequency.exponentialRampToValueAtTime(isMiss ? 400 : 200, now + 0.5);
    filter.Q.setValueAtTime(1, now);

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(isMiss ? 0.4 : 0.6, now + 0.005);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    // Metallic partials for a 'clang' sound (inharmonic ratios)
    const frequencies = isMiss 
      ? [400, 700, 900, 1200, 1500].map(f => f * (0.95 + Math.random() * 0.1)) // Randomize pitch slightly for miss
      : [120, 233, 310, 480, 720, 1100, 1500, 2200];
      
    const oscillators: { osc: OscillatorNode; g: GainNode }[] = [];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      
      // Mix of sine and triangle for metallic texture
      osc.type = i % 3 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      // Higher partials decay faster
      const decay = duration / (1 + i * 0.5);
      g.gain.setValueAtTime(isMiss ? 0.2 : 0.3, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      
      osc.connect(g);
      g.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
      
      oscillators.push({ osc, g });
    });

    setTimeout(() => {
      oscillators.forEach(item => {
        item.osc.disconnect();
        item.g.disconnect();
      });
      masterGain.disconnect();
      filter.disconnect();
    }, duration * 1000 + 100);
  }, []);

  const stopThunderRumble = useCallback(() => {
    const source = thunderRumbleSourceRef.current;
    const gain = thunderRumbleGainRef.current;
    const lfo = thunderRumbleLFORef.current;

    if (gain && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    }

    setTimeout(() => {
      if (source) {
        try { source.stop(); } catch(e) {}
        source.disconnect();
      }
      if (lfo) {
        try { lfo.stop(); } catch(e) {}
        lfo.disconnect();
      }
    }, 150);

    thunderRumbleSourceRef.current = null;
    thunderRumbleGainRef.current = null;
    thunderRumbleLFORef.current = null;
  }, []);

  const playThunderRumble = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Stop existing if any
    stopThunderRumble();

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    
    // LFO for rumble movement
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 1);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    thunderRumbleSourceRef.current = source;
    thunderRumbleGainRef.current = gain;
    thunderRumbleLFORef.current = lfo;
  }, [stopThunderRumble]);

  const playDivineStrike = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // --- Sound 1: Broadband Strike & Long Rumble (3s) ---
    const s1Duration = 3;
    const s1Buffer = ctx.createBuffer(1, ctx.sampleRate * s1Duration, ctx.sampleRate);
    const s1Data = s1Buffer.getChannelData(0);
    for (let i = 0; i < s1Data.length; i++) s1Data[i] = Math.random() * 2 - 1;
    
    const s1Noise = ctx.createBufferSource();
    s1Noise.buffer = s1Buffer;
    const s1Filter = ctx.createBiquadFilter();
    s1Filter.type = 'lowpass';
    s1Filter.frequency.setValueAtTime(12000, now);
    s1Filter.frequency.exponentialRampToValueAtTime(60, now + s1Duration);
    const s1Gain = ctx.createGain();
    s1Gain.gain.setValueAtTime(0.0001, now);
    s1Gain.gain.exponentialRampToValueAtTime(1.0, now + 0.01);
    s1Gain.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
    s1Gain.gain.exponentialRampToValueAtTime(0.7, now + 0.12);
    s1Gain.gain.exponentialRampToValueAtTime(0.15, now + 0.25);
    s1Gain.gain.exponentialRampToValueAtTime(0.4, now + 0.35);
    s1Gain.gain.exponentialRampToValueAtTime(0.05, now + 1.5);
    s1Gain.gain.exponentialRampToValueAtTime(0.0001, now + s1Duration);
    
    s1Noise.connect(s1Filter);
    s1Filter.connect(s1Gain);
    s1Gain.connect(ctx.destination);
    s1Noise.start(now);

    // --- Sound 2: Sharp Crack & Bolt Flickering (4s) ---
    const s2Duration = 4;
    const s2Buffer = ctx.createBuffer(1, ctx.sampleRate * s2Duration, ctx.sampleRate);
    const s2Data = s2Buffer.getChannelData(0);
    for (let i = 0; i < s2Data.length; i++) s2Data[i] = Math.random() * 2 - 1;
    
    const s2Noise = ctx.createBufferSource();
    s2Noise.buffer = s2Buffer;
    const s2Filter = ctx.createBiquadFilter();
    s2Filter.type = 'lowpass';
    s2Filter.frequency.setValueAtTime(4000, now);
    s2Filter.frequency.exponentialRampToValueAtTime(40, now + s2Duration);
    s2Filter.Q.setValueAtTime(10, now);
    s2Filter.Q.linearRampToValueAtTime(1, now + 0.5);
    const s2Gain = ctx.createGain();
    s2Gain.gain.setValueAtTime(0, now);
    s2Gain.gain.linearRampToValueAtTime(1, now + 0.005);
    s2Gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
    s2Gain.gain.exponentialRampToValueAtTime(0.8, now + 0.07);
    s2Gain.gain.exponentialRampToValueAtTime(0.1, now + 0.12);
    s2Gain.gain.exponentialRampToValueAtTime(0.4, now + 0.18);
    s2Gain.gain.exponentialRampToValueAtTime(0.001, now + s2Duration);
    
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.8, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    s2Noise.connect(s2Filter);
    s2Filter.connect(s2Gain);
    s2Gain.connect(ctx.destination);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    s2Noise.start(now);
    subOsc.start(now);

    // --- Sound 3: Punchy Impact (2s) ---
    const s3Duration = 2;
    const s3Buffer = ctx.createBuffer(1, ctx.sampleRate * s3Duration, ctx.sampleRate);
    const s3Data = s3Buffer.getChannelData(0);
    for (let i = 0; i < s3Data.length; i++) s3Data[i] = Math.random() * 2 - 1;
    
    const s3Noise = ctx.createBufferSource();
    s3Noise.buffer = s3Buffer;
    const s3Filter = ctx.createBiquadFilter();
    s3Filter.type = 'lowpass';
    s3Filter.frequency.setValueAtTime(1000, now);
    s3Filter.frequency.exponentialRampToValueAtTime(40, now + s3Duration);
    const s3Gain = ctx.createGain();
    s3Gain.gain.setValueAtTime(1, now);
    s3Gain.gain.exponentialRampToValueAtTime(0.001, now + s3Duration);
    
    const s3Osc = ctx.createOscillator();
    const s3OscGain = ctx.createGain();
    s3Osc.type = 'triangle';
    s3Osc.frequency.setValueAtTime(160, now);
    s3Osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    s3OscGain.gain.setValueAtTime(1.0, now);
    s3OscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    s3Noise.connect(s3Filter);
    s3Filter.connect(s3Gain);
    s3Gain.connect(ctx.destination);
    s3Osc.connect(s3OscGain);
    s3OscGain.connect(ctx.destination);
    s3Noise.start(now);
    s3Osc.start(now);

    // Cleanup
    setTimeout(() => {
      [s1Noise, s2Noise, s3Noise, subOsc, s3Osc].forEach(n => { try { n.stop(); n.disconnect(); } catch(e){} });
    }, s1Duration * 1000 + 100);
  }, []);

  const playSquashSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const duration = 0.6;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(20, now + duration);

    oscGain.gain.setValueAtTime(0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.Q.setValueAtTime(15, now);
    noiseFilter.frequency.setValueAtTime(1500, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(60, now + duration * 0.8);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const dist = ctx.createWaveShaper();
    const curve = new Float32Array(44100);
    for (let i = 0; i < 44100; i++) {
      const x = (i * 2) / 44100 - 1;
      curve[i] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x));
    }
    dist.curve = curve;

    osc.connect(oscGain);
    oscGain.connect(dist);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dist);
    dist.connect(masterGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + duration);
    noise.stop(now + duration);

    setTimeout(() => {
      osc.disconnect();
      noise.disconnect();
      oscGain.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
      dist.disconnect();
      masterGain.disconnect();
    }, duration * 1000 + 100);
  }, []);

  const playSmallBirdLaugh = useCallback((birdSpeed: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    // Speed up the laugh if the bird is fast
    const speedFactor = Math.max(0.5, Math.min(2.5, Math.abs(birdSpeed) / 3));
    const numBursts = 6;
    const burstInterval = 0.18 / speedFactor;
    const burstDuration = 0.14 / speedFactor;

    for (let i = 0; i < numBursts; i++) {
      const startTime = now + (i * burstInterval);
      const stopTime = startTime + burstDuration;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const burstGain = ctx.createGain();

      osc.type = 'sawtooth';
      
      const startFreq = (220 - (i * 5)) * speedFactor;
      const endFreq = (170 - (i * 5)) * speedFactor;
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, stopTime);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, startTime);
      filter.Q.value = 5;

      burstGain.gain.setValueAtTime(0.0001, startTime);
      burstGain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.04);
      burstGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(filter);
      filter.connect(burstGain);
      burstGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(stopTime);

      osc.onended = () => {
        osc.disconnect();
        filter.disconnect();
        burstGain.disconnect();
        if (i === numBursts - 1) {
          masterGain.disconnect();
        }
      };
    }
  }, []);

  const playFireDiverCue = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    const duration = 1.2;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    
    // Jet engine / Vroom sound
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    
    // Pitch sweep up to simulate approaching speed
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + duration);
    
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.4, now + 0.4);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    // Add some noise for the "jet" texture
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(80, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(1200, now + duration);
    noiseFilter.Q.value = 1.5;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    osc.start(now);
    noise.start(now);
    osc.stop(now + duration);
    noise.stop(now + duration);
    
    setTimeout(() => {
      osc.disconnect();
      noise.disconnect();
      oscGain.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
      masterGain.disconnect();
    }, duration * 1000 + 100);
  }, []);

  const playBigBirdLaugh = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const compressor = ctx.createDynamicsCompressor();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 10;

    masterGain.connect(filter);
    filter.connect(compressor);
    compressor.connect(ctx.destination);

    const numPulses = 6;
    const pulseGap = 0.25;

    for (let i = 0; i < numPulses; i++) {
      const startTime = now + (i * pulseGap);
      const duration = 0.2;
      const endTime = startTime + duration;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const pulseGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      const baseFreq = 70 - (i * 4);
      osc1.frequency.setValueAtTime(baseFreq, startTime);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, endTime);
      
      osc2.frequency.setValueAtTime(baseFreq * 1.05, startTime);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, endTime);

      pulseGain.gain.setValueAtTime(0.001, startTime);
      pulseGain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.05);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc1.connect(pulseGain);
      osc2.connect(pulseGain);
      pulseGain.connect(masterGain);

      osc1.start(startTime);
      osc1.stop(endTime);
      osc2.start(startTime);
      osc2.stop(endTime);
    }

    masterGain.gain.setValueAtTime(1, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + (numPulses * pulseGap) + 0.5);

    setTimeout(() => {
      masterGain.disconnect();
      filter.disconnect();
      compressor.disconnect();
    }, (numPulses * pulseGap + 1) * 1000);
  }, []);

  const playShootSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }, []);

  const playFireShootSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    // Low frequency noise for fire "whoosh"
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(now);
    noise.stop(now + 0.1);
  }, []);

  const playBulletHitSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }, []);

  const playFireHitSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    // Sizzling sound
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, now);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(now);
    noise.stop(now + 0.2);
  }, []);

  // Handle Visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        audioCtxRef.current?.suspend();
      } else if (isAudioUnlockedRef.current) {
        audioCtxRef.current?.resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    // High score is now updated immediately during gameplay
  }, [gameState, score, highScore]);

  const playCrumbleSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    // Low frequency crunch
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 1.5);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // Metallic clangs
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100 + Math.random() * 100, now + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(40, now + i * 0.1 + 0.3);
      oGain.gain.setValueAtTime(0.2, now + i * 0.1);
      oGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(oGain);
      oGain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    }
  }, []);

  const triggerCrumble = useCallback(() => {
    if (isCrumbling.current) return;
    isCrumbling.current = true;
    playCrumbleSound();
    setIsShaking(true);
    shakeEndTimeRef.current = Date.now() + 500;
    setIsDivine(false);
    isDivineRef.current = false;
    divineEndTimeRef.current = 0;
    setIsThunderReady(false);
    isThunderReadyRef.current = false;
    stopThunderRumble();
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashEndTimeRef.current = 0;

    const { width, height } = dimensions.current;
    const pipeX = width / 2 - PIPE_WIDTH / 2;
    const topPipeHeight = gapY.current - currentGapSize.current / 2;
    const bottomPipeY = gapY.current + currentGapSize.current / 2;
    const bottomPipeHeight = height - bottomPipeY;

    const createFragments = (x: number, y: number, w: number, h: number) => {
      const rows = Math.ceil(h / 30);
      const cols = Math.ceil(w / 20);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          pipeFragments.current.push({
            x: x + c * (w / cols),
            y: y + r * (h / rows),
            w: w / cols,
            h: h / rows,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 2) * 5,
            rotation: Math.random() * Math.PI * 2,
            vRotation: (Math.random() - 0.5) * 0.2,
            color: isThunderReadyRef.current ? COLORS.YELLOW : COLORS.GREEN
          });
        }
      }
    };

    createFragments(pipeX, 0, PIPE_WIDTH, topPipeHeight);
    createFragments(pipeX, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);

    // Delay the actual Game Over state
    setTimeout(() => {
      setGameState('GAME_OVER');
    }, 1500);
  }, [playCrumbleSound]);

  useEffect(() => {
    if (integrity <= 0 && gameState === 'PLAYING') {
      triggerCrumble();
    }
  }, [integrity, gameState, triggerCrumble]);

  const spawnBird = useCallback(() => {
    const rand = Math.random();
    let type: BirdType = 'NORMAL';
    let health = 1;
    const warmupFactor = isWarmupActiveRef.current ? Math.min(1, frameCount.current / WARMUP_FRAMES) : 1;
    const speedMultiplier = 0.5 + 0.5 * warmupFactor;

    let vx = -(BIRD_BASE_SPEED + Math.random() * 2) * speedMultiplier;
    let size = 25;
    let oscSpeed = 0.1 + Math.random() * 0.05;
    let oscAmp = 15 + Math.random() * 15;

    const createBird = (t: BirdType, h: number, v: number, s: number, os: number, oa: number) => {
      const bird: Bird = {
        id: birdIdCounter.current++,
        x: dimensions.current.width + 100,
        y: 0,
        baseY: Math.random() * (dimensions.current.height - 300) + 150,
        type: t,
        health: h,
        maxHealth: h,
        vx: v,
        vy: 0,
        size: s,
        state: 'FLYING',
        lastShot: 0,
        tauntTime: 0,
        flapFrame: 0,
        oscSpeed: os,
        oscAmp: oa,
        oscPhase: Math.random() * Math.PI * 2
      };
      birds.current.push(bird);
    };

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
      
      // Play cue and delay spawn
      playFireDiverCue();
      setTimeout(() => {
        createBird('DIVER', 1, -6, 20, 0.2, 45);
      }, 500);
      return;
    } else if (rand > 0.65) {
      type = 'SNIPER';
      vx = -2.5;
      size = 25;
      oscSpeed = 0.08;
      oscAmp = 10;
    }

    createBird(type, health, vx, size, oscSpeed, oscAmp);
  }, [playFireDiverCue]);

  const playMilestoneSound = () => {
    const ctx = audioCtxRef.current;
    const gain = milestoneGainNodeRef.current;
    if (!ctx || !gain) return;

    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    // Victory Fanfare Chord (C Majorish)
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.5);
      
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.2, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 1);
      
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start(now);
      osc.stop(now + 1.5);
    });
  };

  const createParticles = (x: number, y: number, color: string, count: number, type: 'FEATHER' | 'SPARK' | 'TEXT' = 'FEATHER', text?: string) => {
    for (let i = 0; i < count; i++) {
      const isText = type === 'TEXT';
      particles.current.push({
        x,
        y,
        vx: isText ? 0 : (Math.random() - 0.5) * 15,
        vy: isText ? (text === 'DIVINE WRATH!!!' ? 0 : -2) : (Math.random() - 0.5) * 15,
        life: 1,
        color,
        size: isText ? 40 : Math.random() * 8 + 2,
        type,
        text
      });
    }
  };

  const update = useCallback(() => {
    if (gameState !== 'PLAYING' && !isCrumbling.current) return;

    frameCount.current++;

    // Update Fragments
    pipeFragments.current.forEach(f => {
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.5; // Gravity
      f.rotation += f.vRotation;
    });

    // Update Visual Effect States based on timestamps
    const now = Date.now();
    
    if (isDivineRef.current && now > divineEndTimeRef.current) {
      isDivineRef.current = false;
      setIsDivine(false);
    }
    
    if (isFlashing && now > flashEndTimeRef.current) {
      setIsFlashing(false);
    }
    
    if (isShaking && now > shakeEndTimeRef.current) {
      setIsShaking(false);
    }

    if (gameState !== 'PLAYING') return;

    // Thunder Ready logic - Use Ref for logic, State for UI
    if (chaosRef.current >= CHAOS_LIMIT && !isThunderReadyRef.current) {
      isThunderReadyRef.current = true;
      setIsThunderReady(true);
      playThunderRumble();
      // Force slam state to false to ensure they must tap again
      isSlamming.current = false;
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
        flashEndTimeRef.current = now + 50;

        // Thunder Strike Trigger - Check Ref AND if it was ready when slam started
        if (isThunderReadyRef.current && thunderActiveForSlam.current) {
          isThunderReadyRef.current = false;
          setIsThunderReady(false);
          stopThunderRumble();
          playDivineStrike();
          chaosRef.current = 0;
          setChaos(0);
          
          isDivineRef.current = true;
          setIsDivine(true);
          divineEndTimeRef.current = now + 1200;
          
          setIsShaking(true);
          shakeEndTimeRef.current = now + 1200;
          
          setIsFlashing(true);
          flashEndTimeRef.current = now + 1200;
          
          // Kill ALL birds
          birds.current.forEach(bird => {
            if (bird.state !== 'CRUSHED') {
              bird.state = 'CRUSHED';
              
              scoreRef.current++;
              const next = scoreRef.current;
              
              // Update high score immediately
              if (next > highScore) {
                setHighScore(next);
                localStorage.setItem('cocky-birds-high-score', next.toString());
              }

              // Update total smashed ref
              totalSmashedRef.current++;

              if (next % 10 === 0 && next > lastMilestoneRef.current) {
                lastMilestoneRef.current = next;
                integrityRef.current = MAX_INTEGRITY;
                createParticles(dimensions.current.width / 2, gapY.current, COLORS.YELLOW, 1, 'TEXT', `${next} POINTS!`);
                createParticles(dimensions.current.width / 2, gapY.current, COLORS.GREEN, 1, 'TEXT', 'HEALTH REPLENISHED!');
                playMilestoneSound();
                setIsShaking(true);
                shakeEndTimeRef.current = now + 300;
              }

              killStreakRef.current++;
              if (killStreakRef.current % 2 === 0) {
                integrityRef.current = Math.min(MAX_INTEGRITY, integrityRef.current + 2);
                createParticles(dimensions.current.width / 2, gapY.current, COLORS.GREEN, 1, 'TEXT', '+2 HP');
              }
              playSquashSound();
              createParticles(bird.x, bird.y, COLORS.CYAN, 30, 'SPARK');
              createParticles(bird.x, bird.y, COLORS.YELLOW, 20, 'FEATHER');
            }
          });
        } else {
          // Normal crush check - only if NOT divine
          if (!isDivineRef.current) {
            let hitAny = false;
            birds.current.forEach(bird => {
              if (bird.state === 'FLYING' && 
                  bird.x > dimensions.current.width / 2 - PIPE_WIDTH / 2 - 20 && 
                  bird.x < dimensions.current.width / 2 + PIPE_WIDTH / 2 + 20) {
                
                if (bird.y > gapY.current - DEFAULT_GAP_SIZE/2 && bird.y < gapY.current + DEFAULT_GAP_SIZE/2) {
                  hitAny = true;
                  bird.health--;
                  if (bird.health <= 0) {
                    bird.state = 'CRUSHED';
                    
                    scoreRef.current++;
                    const next = scoreRef.current;

                    // Update high score immediately
                    if (next > highScore) {
                      setHighScore(next);
                      localStorage.setItem('cocky-birds-high-score', next.toString());
                    }

                    // Update total smashed ref
                    totalSmashedRef.current++;

                    if (next % 10 === 0 && next > lastMilestoneRef.current) {
                      lastMilestoneRef.current = next;
                      integrityRef.current = MAX_INTEGRITY;
                      createParticles(dimensions.current.width / 2, gapY.current, COLORS.YELLOW, 1, 'TEXT', `${next} POINTS!`);
                      createParticles(dimensions.current.width / 2, gapY.current, COLORS.GREEN, 1, 'TEXT', 'HEALTH REPLENISHED!');
                      playMilestoneSound();
                      setIsShaking(true);
                      shakeEndTimeRef.current = now + 300;
                    }

                    killStreakRef.current++;
                    if (killStreakRef.current % 2 === 0) {
                      integrityRef.current = Math.min(MAX_INTEGRITY, integrityRef.current + 2);
                      createParticles(dimensions.current.width / 2, gapY.current, COLORS.GREEN, 1, 'TEXT', '+2 HP');
                    }
                    playSquashSound();
                    
                    chaosRef.current = Math.min(CHAOS_LIMIT, chaosRef.current + 15);
                    setChaos(chaosRef.current);
                    setLastKillTime(Date.now());
                    
                    // Graphic Effects
                    createParticles(bird.x, bird.y, COLORS.YELLOW, 25, 'FEATHER');
                    createParticles(bird.x, bird.y, COLORS.WHITE, 1, 'TEXT', 'SQUASH!');
                    setIsShaking(true);
                    shakeEndTimeRef.current = now + 300;
                  } else {
                    createParticles(bird.x, bird.y, COLORS.WHITE, 1, 'TEXT', 'CLANG!');
                    bird.vx = -0.5; // Stun
                    playMetallicSound(false); // Clang sound
                  }
                }
              }
            });

            if (!hitAny) {
              playMetallicSound(true); // Miss sound
            }
          }
        }
      }
    } else {
      currentGapSize.current += OPEN_SPEED;
      if (currentGapSize.current >= DEFAULT_GAP_SIZE) {
        currentGapSize.current = DEFAULT_GAP_SIZE;
      }
    }

    // Spawn birds
    const spawnRate = Math.max(15, 80 - Math.floor(scoreRef.current / 5) * 4);
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
        const canShoot = isWarmupActiveRef.current ? (frameCount.current > WARMUP_FRAMES) : true;

        if (canShoot && frameCount.current - bird.lastShot > shootRate && bird.x > dimensions.current.width / 2) {
          bird.lastShot = frameCount.current;
          if (bird.type === 'DIVER') {
            playFireShootSound();
          } else {
            playShootSound();
          }
          
          const dx = bird.x - dimensions.current.width / 2;
          const timeToReach = dx / 10;
          let bulletVy = (gapY.current - bird.y) * 0.015;

          if (timeToReach > 0) {
            // Aim for the pipes (above or below the gap)
            // If we aim for the gap center, we miss the pipes!
            // So we target a point slightly offset from the gap center
            const pipeTargetOffset = (currentGapSize.current / 2) + 30 + (Math.random() * 40);
            const targetY = gapY.current + (Math.random() > 0.5 ? pipeTargetOffset : -pipeTargetOffset);
            
            const perfectVy = (targetY - bird.y) / timeToReach;
            
            if (bird.type === 'SNIPER') {
              // Snipers are very accurate at hitting the pipe edges
              const spread = (Math.random() - 0.5) * 0.2; 
              bulletVy = perfectVy + spread;
            } else {
              // Other birds have more spread but still target the pipes
              const spread = (Math.random() - 0.5) * 1.2;
              bulletVy = perfectVy + spread;
            }
          }

          bullets.current.push({
            x: bird.x - bird.size/2,
            y: bird.y,
            vx: -10,
            vy: bulletVy,
            color: bird.type === 'SNIPER' ? COLORS.CYAN : bird.type === 'DIVER' ? '#FF4500' : COLORS.PURPLE,
            type: bird.type === 'DIVER' ? 'FIRE' : 'NORMAL'
          });
        }

        if (bird.x < dimensions.current.width / 2 - PIPE_WIDTH) {
          bird.state = 'PASSED';
          bird.taunt = getNextTaunt();
          bird.tauntTime = 120;
          integrityRef.current = Math.max(0, integrityRef.current - 10); // Increased breach damage to 10
          setLastDamageTime(Date.now());
          killStreakRef.current = 0; // Reset streak on breach

          if (bird.type === 'TANK') {
            playBigBirdLaugh();
          } else {
            playSmallBirdLaugh(bird.vx);
          }
        }
      } else if (bird.state === 'PASSED') {
        if (bird.x > -100 && bird.x < -50) { // Just passed
          killStreakRef.current = 0; // Reset streak on pass
        }
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
          if (!isSlamming.current) {
            integrityRef.current = Math.max(0, integrityRef.current - 10); // Increased bullet damage to 10
            setLastDamageTime(Date.now());
            if (bullet.type === 'FIRE') {
              playFireHitSound();
            } else {
              playBulletHitSound();
            }
            killStreakRef.current = 0; // Reset streak on damage
          }
          if (bullet.type === 'FIRE') {
            createParticles(bullet.x, bullet.y, '#FF4500', 10, 'SPARK');
            createParticles(bullet.x, bullet.y, '#FFA500', 5, 'SPARK');
          } else {
            createParticles(bullet.x, bullet.y, COLORS.WHITE, 5, 'SPARK');
          }
          bullets.current.splice(bIdx, 1);
        }
      }
    });

    // Update particles
    particles.current.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.type !== 'TEXT') {
        p.vy += 0.4; // Gravity for feathers/sparks
      }
      p.life -= p.type === 'TEXT' ? 0.01 : 0.025; // Text lasts longer
      if (p.life <= 0) particles.current.splice(i, 1);
    });

    birds.current = birds.current.filter(b => b.x > -200);
    bullets.current = bullets.current.filter(b => b.x > -100);

    // Sync state for UI
    setScore(scoreRef.current);
    setIntegrity(integrityRef.current);
    
    // Sync total smashed to state and localStorage
    if (totalBirdsSmashed !== totalSmashedRef.current) {
      setTotalBirdsSmashed(totalSmashedRef.current);
      localStorage.setItem('cocky-birds-total-smashed', totalSmashedRef.current.toString());
    }
  }, [gameState, spawnBird, totalBirdsSmashed, highScore]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensions.current;
    ctx.clearRect(0, 0, width, height);

    // Background - Brutalist Shapes
    const isPowerSurge = isSlamming.current && Math.random() > 0.7;
    ctx.fillStyle = isPowerSurge ? COLORS.WHITE : COLORS.ORANGE;
    ctx.fillRect(0, 0, width, height);
    
    // Draw Sun
    const sunX = width * 0.8;
    const sunY = height * 0.15;
    const sunR = 60;
    
    // Sun Glow
    const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 2);
    sunGlow.addColorStop(0, 'rgba(255, 240, 0, 0.4)');
    sunGlow.addColorStop(1, 'rgba(255, 240, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - sunR * 2, sunY - sunR * 2, sunR * 4, sunR * 4);
    
    // Sun Core
    ctx.fillStyle = COLORS.YELLOW;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Parallax Shapes - 3D Pyramids (Multi-layered for depth)
    const layers = [
      { width: 600, speed: 0.2, opacity: 0.3, peakShift: 50, heightMult: 0.3 }, // Distant
      { width: 400, speed: 0.6, opacity: 0.6, peakShift: 30, heightMult: 0.45 }, // Middle
      { width: 800, speed: 1.5, opacity: 1.0, peakShift: 100, heightMult: 0.6 }  // Close
    ];

    layers.forEach(layer => {
      const layerOffset = (frameCount.current * layer.speed) % layer.width;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(0,0,0,${0.08 * layer.opacity})`;
      
      for (let i = -layer.width; i < width + layer.width; i += layer.width) {
        const xStart = i - layerOffset;
        const xEnd = xStart + layer.width;
        const xPeak = xStart + layer.width / 2 + layer.peakShift;
        const xBaseMid = xStart + layer.width / 2;
        const pyramidHeight = height * layer.heightMult;
        const yBase = height;
        const yPeak = height - pyramidHeight;

        // Left Face (Light side - now a subtle dark overlay)
        ctx.fillStyle = `rgba(0,0,0,${0.15 * layer.opacity})`;
        ctx.beginPath();
        ctx.moveTo(xStart, yBase);
        ctx.lineTo(xPeak, yPeak);
        ctx.lineTo(xBaseMid, yBase);
        ctx.fill();
        ctx.stroke();

        // Right Face (Shadow side - deeper dark overlay)
        ctx.fillStyle = `rgba(0,0,0,${0.45 * layer.opacity})`;
        ctx.beginPath();
        ctx.moveTo(xBaseMid, yBase);
        ctx.lineTo(xPeak, yPeak);
        ctx.lineTo(xEnd, yBase);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Scanning Line
    const scanY = (frameCount.current * 1.5) % height;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, scanY, width, 2);

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
        
        const words = bird.taunt.split(' ');
        let lines = [bird.taunt];
        if (bird.taunt.length > 10 && words.length > 1) {
          const mid = Math.ceil(words.length / 2);
          lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        }

        lines.forEach((line, i) => {
          const yOffset = -bird.size - 20 + shakeY - (lines.length - 1 - i) * 35;
          ctx.strokeText(line, shakeX, yOffset);
          ctx.fillText(line, shakeX, yOffset);
        });
        ctx.restore();
      }

      // Squash & Stretch synced with movement
      // User requested birds face forward (they move left, so we flip X)
      const flap = Math.sin(bird.flapFrame) * 0.1;
      const velocityStretch = Math.abs(bird.vy) * 0.02;
      ctx.scale(-(1 + flap - velocityStretch), 1 - flap + velocityStretch);

      // Bird Body - Graphic Style
      const color = bird.type === 'TANK' ? COLORS.PURPLE : bird.type === 'SNIPER' ? COLORS.CYAN : bird.type === 'DIVER' ? '#FF0000' : COLORS.YELLOW;
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
      if (b.type === 'FIRE') {
        // Fireball effect
        const gradient = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 12);
        gradient.addColorStop(0, '#FFF');
        gradient.addColorStop(0.3, '#FFD700');
        gradient.addColorStop(0.6, '#FF4500');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Fire trail
        for (let i = 0; i < 3; i++) {
          const tx = b.x + Math.random() * 10;
          const ty = b.y + (Math.random() - 0.5) * 10;
          ctx.fillStyle = Math.random() > 0.5 ? '#FF4500' : '#FFA500';
          ctx.beginPath();
          ctx.arc(tx, ty, Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = b.color;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Draw Pipes - Brutalist Style
    if (!isCrumbling.current) {
      let pipeX = width / 2 - PIPE_WIDTH / 2;
      let pipeYOffset = 0;
      const isThunderActive = isThunderReadyRef.current && isSlamming.current;
      
      if (isThunderActive || isDivineRef.current) {
        pipeX += (Math.random() - 0.5) * 25; // More shake
        pipeYOffset = (Math.random() - 0.5) * 25;
        ctx.shadowBlur = isDivineRef.current ? 80 : 40;
        ctx.shadowColor = isDivineRef.current ? COLORS.CYAN : COLORS.YELLOW;
      }

      const isPepperZone = score >= 50;
      const pipeColor = isPepperZone ? '#FF0000' : (isThunderReadyRef.current ? COLORS.YELLOW : COLORS.GREEN);
      
      if (isPepperZone) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#FF0000';
      }

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

    // Draw Pipe Fragments
    pipeFragments.current.forEach(f => {
      ctx.save();
      ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
      ctx.rotate(f.rotation);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2;
      ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.restore();
    });

    // Draw Particles
    particles.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      if (p.type === 'TEXT') {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 8;
        let fontSize = 48;
        if (p.text === 'THUNDER!!!' || p.text === 'DIVINE WRATH!!!') fontSize = 100;
        else if (p.text?.includes('POINTS!')) fontSize = 80;
        
        ctx.font = `900 ${fontSize}px Bangers`;
        ctx.textAlign = 'center';
        
        // Add a slight shake to the text itself
        const tx = p.x + (Math.random() - 0.5) * 5;
        const ty = p.y + (Math.random() - 0.5) * 5;
        
        const words = p.text!.split(' ');
        let lines = [p.text!];
        // Only split if it's long and has spaces, but don't split special big messages
        if (p.text!.length > 12 && words.length > 1 && !p.text!.includes('!!!') && !p.text!.includes('POINTS!')) {
          const mid = Math.ceil(words.length / 2);
          lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        }

        lines.forEach((line, i) => {
          const lineY = ty + (i - (lines.length - 1) / 2) * (fontSize * 0.9);
          ctx.strokeText(line, tx, lineY);
          ctx.fillText(line, tx, lineY);
        });
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
  }, [gameState, score]); // Added score dependency

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    // Handle Audio Fading in Game Loop
    const menuGain = menuGainNodeRef.current;
    const playGain = playGainNodeRef.current;
    if (menuGain && playGain) {
      const isPlaying = gameState === 'PLAYING';
      const menuTarget = isPlaying ? 0 : (gameState === 'GAME_OVER' ? 0.7 : 0.3);
      const playTarget = isPlaying ? 0.01 : 0;

      // Fade Menu
      const mCurrent = menuGain.gain.value;
      const mDiff = menuTarget - mCurrent;
      if (Math.abs(mDiff) < 0.005) {
        menuGain.gain.value = menuTarget;
      } else {
        menuGain.gain.value = Math.max(0, Math.min(1, mCurrent + mDiff * 0.05));
      }

      // Fade Play
      const pCurrent = playGain.gain.value;
      const pDiff = playTarget - pCurrent;
      if (Math.abs(pDiff) < 0.005) {
        playGain.gain.value = playTarget;
      } else {
        playGain.gain.value = Math.max(0, Math.min(1, pCurrent + pDiff * 0.05));
      }
    }

    if (ctx) {
      update();
      draw(ctx);
    }
    animationFrameId.current = requestAnimationFrame(loop);
  }, [gameState, update, draw]); // Added update and draw to dependencies

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [loop]);

  const handleShare = async () => {
    const shareData = {
      title: 'Cocky Birds',
      text: `I just squashed ${score} birds in Cocky Birds! Can you beat my score? 🐦🕶️`,
      url: 'https://cocky-birds.vercel.app'
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        createParticles(dimensions.current.width / 2, dimensions.current.height / 2, COLORS.GREEN, 1, 'TEXT', 'LINK COPIED!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleInteraction = (e: React.PointerEvent | React.MouseEvent) => {
    startAudio();
    if (gameState === 'PLAYING') {
      isSlamming.current = true;
      // Capture readiness state at the start of the slam
      thunderActiveForSlam.current = isThunderReadyRef.current;
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
      {/* Divine Wrath Overlay */}
      <AnimatePresence>
        {isDivine && (
          <motion.div 
            key="divine-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden bg-cyan-500/20 backdrop-blur-[2px]"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Version 1: Horizontal Centered */}
              <motion.h2 
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [1, 1.2, 1], rotate: [-20, 5, -5] }}
                className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white italic drop-shadow-[0_10px_30px_rgba(0,0,0,1)] pointer-events-none uppercase tracking-tighter text-center px-4 z-10"
              >
                DIVINE WRATH!!!
              </motion.h2>

              {/* Version 2: Stacked on the Side (Left) */}
              <motion.div 
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 0.6 }}
                className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 hidden md:flex flex-col leading-[0.75] font-black text-white italic drop-shadow-2xl uppercase tracking-tighter text-7xl lg:text-[10rem] select-none"
              >
                <span>DIVINE</span>
                <span>WRATH!</span>
              </motion.div>

              {/* Version 2: Stacked on the Side (Right) */}
              <motion.div 
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 0.6 }}
                className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-end leading-[0.75] font-black text-white italic drop-shadow-2xl uppercase tracking-tighter text-7xl lg:text-[10rem] select-none"
              >
                <span>DIVINE</span>
                <span>WRATH!</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal Impact Flash */}
      <AnimatePresence>
        {isFlashing && !isDivine && (
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 z-50 impact-flash pointer-events-none" 
          />
        )}
      </AnimatePresence>
      
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
                className="brutalist-btn w-full py-3 md:py-6 text-lg md:text-3xl font-black text-black flex items-center justify-center gap-2 md:gap-4 bg-[#00FF41]"
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
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 z-[200]"
          >
            {showShareBanner && (
              <motion.div 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-4 bg-yellow-400 border-4 border-black p-4 shadow-[8px_8px_0px_#000] -rotate-2 max-w-sm w-full relative"
              >
                <button 
                  onClick={() => {
                    setShowShareBanner(false);
                    setHasSeenShareBanner(true);
                    localStorage.setItem('cocky-birds-share-banner-seen', 'true');
                  }}
                  className="absolute -top-4 -right-4 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black border-2 border-white"
                >
                  X
                </button>
                <h3 className="text-xl font-black text-black uppercase leading-none mb-2">YOU'RE GETTING GOOD!</h3>
                <p className="text-black font-bold text-sm mb-4">Share your best score of {highScore} and see if your friends can beat it! 🐦🕶️</p>
                <button 
                  onClick={() => {
                    handleShare();
                    setShowShareBanner(false);
                    setHasSeenShareBanner(true);
                    localStorage.setItem('cocky-birds-share-banner-seen', 'true');
                  }}
                  className="w-full bg-black text-white py-2 font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors border-2 border-black"
                >
                  SHARE NOW
                </button>
              </motion.div>
            )}

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
                <div className="bg-white/10 p-2 border border-white/20">
                  <p className="text-[6px] md:text-[8px] font-black uppercase text-white/60">Total Smashed (Lifetime)</p>
                  <p className="text-xs md:text-lg font-black text-white italic">{totalBirdsSmashed}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="brutalist-btn w-full py-2 md:py-4 text-sm md:text-xl font-black text-black flex items-center justify-center gap-2 md:gap-3 bg-[#FFF000]"
                >
                  <Share2 size={16} md:size={24} strokeWidth={3} />
                  SHARE SCORE
                </motion.button>

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
