/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Shield, Zap, Skull, Target, Flame, Share2 } from 'lucide-react';
import { initGA, trackSlam, trackClout, trackPageView } from './lib/analytics';

// Constants
const PIPE_WIDTH = 60;
const DEFAULT_GAP_SIZE = 200;
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
  mood: 'SMUG' | 'MOCKING';
  lastShot: number;
  shotsFired: number;
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
  type?: 'NORMAL' | 'FIRE' | 'ICE' | 'SLUDGE';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type: 'FEATHER' | 'SPARK' | 'TEXT' | 'FIRE_TRAIL' | 'ICE_SHARD' | 'MUD_SPLAT';
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
  "GHOSTED!",
  "NEGATIVE AURA!",
  "RIZZLESS!",
  "SKIBIDI NOPE!",
  "MOGGED BY A BIRD!",
  "MAIN CHARACTER DIES FIRST!",
  "CAUGHT IN 8K!",
  "SIGMA DOWNFALL!",
  "FANUM TAXED YOUR HP!",
  "OHIO TIER AIM!",
  "GYATT TO BE KIDDING!",
  "GLAZING THE PIPES!",
  "LET HIM COOK? NAH.",
  "DELUSIONAL!",
  "CHRONICALLY ONLINE!",
  "BRAIN ROT DETECTED!",
  "STAY IN THE NEST!",
  "CHICKEN BEHAVIOR!",
  "NUGGET PROCESSED!",
  "FRYING PAN READY!",
  "CLAWED YOUR PR!",
  "BEAK TO THE FACE!",
  "FEATHERED RATIO!",
  "BIRD FEEDER!",
  "NESTING AT 0!",
  "FLAPPY FAIL!",
  "WINGS OF SHAME!",
  "EGG ON YOUR FACE!",
  "COLONIZER OF Ls!",
  "NOT THE VIBE!",
  "LOW TAPER FADE!",
  "GOATED AT WHIFFING!",
  "SIGMA SQUAWK ENERGY!",
  "ABSOLUTE CANON EVENT!",
  "BORN TO FLOP!",
  "MODS, BAN THIS NOOB!",
  "CHATT, IS HE FR?",
  "EDGING THE GAME OVER!",
  "MEWING TILL THE PIPE!",
  "LOOKSMAX LEVEL: 0!",
  "ALPHA BIRD ENERGY!",
  "SKIBIDI DISASTER!",
  "NEGATIVE RIZZ DETECTED!",
  "OHIO FINAL BOSS DESTROYED!",
  "BABY GRONK TIER!",
  "FANUM TAX ON YOUR SCORE!",
  "LIVVY DUNNE NOT IMPRESSED!",
  "GYATT FOR THE GAPS!",
  "STAYING IN THE TRENCHES!",
  "ZERO AURA MOMENT!",
  "MOGGED BY A METAL PIPE!",
  "MAIN CHARACTER SYNDROME!",
  "POV: YOU'RE TRASH!",
  "I'M HIM. YOU'RE NOT.",
  "UNLIMITED COPE!",
  "MALIGNANT MIDNESS!",
  "FRAUDWATCH ACTIVATED!",
  "NPC ENERGY PEAKING!",
  "EMOTE ON YOUR RUINS!",
  "CROWNLESS KING!",
  "THRONED IN SHAME!",
  "MY EYES ARE BLEEDING!",
  "STOP THE COUNT!",
  "ELECTION INTERFERENCE!",
  "PIPES ARE YOUR FATHER!",
  "ADOPTED BY GAP!",
  "PARENTAL DISAPPOINTMENT!",
  "LOST THE PLOT!",
  "NO SCRIPT!",
  "IMPROVISED FAILURE!",
  "RANDOM BULLSHIT GO!",
  "TACTICAL RETREAT?",
  "WHITE FLAG MOMENT!",
  "SURRENDER YOUR SOUL!",
  "DIVER FED ON U!",
  "SNIPER NO-SCOPED U!",
  "TANK BURIED U!",
  "BIO-HAZARD VICTIM!",
  "SQUELCHED INTO DEFEAT!",
  "SLUSHY BRAIN!",
  "MUD IN YOUR EYES!",
  "DIRTY L!",
  "ABSOLUTE DESPAIR!",
  "VOID ACCEPTS YOU!",
  "GAME OVER FOREVER!",
  "L STREAMER!",
  "DONO WALLING!",
  "L + RATIO + FEATHERLESS!",
  "MEWING STREAK: BROKEN!",
  "NEGATIVE AURA x1000!",
  "SKIBIDI SURCHARGE!",
  "FANUM STOLE YOUR IQ!",
  "OHIO FINAL BOSS POV!",
  "SUB ONLY FAILURE!",
  "CLIP THAT L!",
  "NOT EVEN TOP 1%!",
  "AURA DEBT!",
  "GOONING FOR THE PIPES!",
  "LOOKSMAXING FAIL!",
  "EDGE FOR THE W!",
  "CHAT SAYS SKIP!",
  "L-RIZZ ENERGY!",
  "SIGMA DOWNFALL 2.0!",
  "KICKED FOR INACTIVITY!",
  "MANUAL BREATHING: ON!",
  "YOU'RE A FILLER EPISODE!",
  "SIDE CHARACTER ENERGY!",
  "BACKGROUND NPC!",
  "FINAL BOSS OF WHIFFING!",
  "SPEEDRUN TO 0!",
  "PERMABANNED FROM Ws!",
  "MUTED IRL!",
  "L + RATIO + NO WINGS!",
  "GLAZED BY THE TANK!",
  "ICED BY THE SNIPER!",
  "COOKED BY THE DIVER!",
  "SQUELCHED BY REALITY!",
  "ABSOLUTE CINEMA (NOT)!",
  "UNPOGGERS MOMENT!",
  "SADGE IN THE CHAT!",
  "PEPEHANDS SCORE!",
  "KEKW LEVEL BAD!",
  "POGGERS BUT REVERSE!",
  "WOMP WOMP!",
  "DELETE SYSTEM32!",
  "ALT+F4 MOTIVATION!",
  "BLUE SCREEN MINDSET!",
  "TOUCH GRASS SIMULATOR!",
  "SHOWER ENTHUSIASTS ONLY!",
  "SOAP IS FREE!",
  "DEODORANT GAP!",
  "STINKY STREAK!",
  "BIOHAZARD BRAIN!",
  "SLUDGE LOGIC!",
  "PEAK BRAINROT!"
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
  const birdImagesRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const assets = {
      TANK: 'purple_tank.png',
      SNIPER: 'blue_sniper.png',
      DIVER: 'fire_diver.png',
      NORMAL: 'yellow_diver.png'
    };

    Object.entries(assets).forEach(([type, filename]) => {
      const img = new Image();
      img.src = filename;
      img.onload = () => {
        birdImagesRef.current[type] = img;
      };
    });
  }, []);

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
  const gameStateRef = useRef<GameState>(gameState);
  const [chaos, setChaos] = useState(0);

  useEffect(() => {
    initGA();
    trackPageView(window.location.pathname);
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  const [isThunderReady, setIsThunderReady] = useState(false);
  const [lastDamageTime, setLastDamageTime] = useState(0);
  const [lastKillTime, setLastKillTime] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isDivine, setIsDivine] = useState(false);
  const [isWarmup, setIsWarmup] = useState(false);
  const isWarmupRef = useRef(false);
  useEffect(() => {
    isWarmupRef.current = isWarmup;
  }, [isWarmup]);
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

    const width = 600;
    const height = 1300;
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
      isWarmupActiveRef.current = false; // Start inactive, button will activate
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
      burstGain.gain.exponentialRampToValueAtTime(0.8, startTime + 0.04);
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

  const playNormalBirdCue = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    // 4-burst "Priority One" insistent phone alarm vibe
    for (let i = 0; i < 4; i++) {
        const time = now + i * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        
        // High pitch with a panicked frequency slide
        const freq = 1400 + (i * 50); 
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, time + 0.08); 
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.35, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.08);
    }
  }, []);

  const playSniperBirdCue = useCallback(() => {
     if (!audioCtxRef.current) return;
     const ctx = audioCtxRef.current;
     if (ctx.state === 'suspended') ctx.resume();
     const now = ctx.currentTime;
     
     // Descending target lock-on tones
     [1000, 800, 600].forEach((freq, i) => {
         const time = now + i * 0.15;
         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         osc.type = 'sine';
         osc.frequency.setValueAtTime(freq, time);
         gain.gain.setValueAtTime(0, time);
         gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
         gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
         osc.connect(gain);
         gain.connect(ctx.destination);
         osc.start(time);
         osc.stop(time + 0.14);
     });
  }, []);

  const playTankBirdCue = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    // Heavy mechanical clunk - Dragged out
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(50, now); // Lower pitch for weight
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    g.gain.setValueAtTime(1.2, now); // Increased from 0.7
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
    
    // Low rumble during clunk
    const lowOsc = ctx.createOscillator();
    const lowGain = ctx.createGain();
    lowOsc.type = 'sine';
    lowOsc.frequency.setValueAtTime(40, now);
    lowGain.gain.setValueAtTime(0.8, now); // Increased from 0.4
    lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    lowOsc.connect(lowGain);
    lowGain.connect(ctx.destination);
    lowOsc.start(now);
    lowOsc.stop(now + 0.6);
    
    // Dragged Hydraulic hiss
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now + 0.4);
    noiseGain.gain.linearRampToValueAtTime(0.7, now + 0.5); // Increased from 0.4
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now + 0.4);
    noise.stop(now + 1.0);
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
      pulseGain.gain.exponentialRampToValueAtTime(0.9, startTime + 0.05);
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

  const playIceShatterSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    // High-pitched "clink"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2500, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    // Crackle noise
    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  }, []);

  const playSquelchSound = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
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
    let size = 42;
    let oscSpeed = 0.15 + Math.random() * 0.08;
    let oscAmp = 25 + Math.random() * 25;

    const createBird = (t: BirdType, h: number, v: number, s: number, os: number, oa: number) => {
      if (gameStateRef.current !== 'PLAYING') return;

      const minY = dimensions.current.height * 0.2 + 50; // Start at sun level, accounting for oscillation
      const maxY = dimensions.current.height * 0.85; // Avoid hitting ground
      
      const bird: Bird = {
        id: birdIdCounter.current++,
        x: dimensions.current.width + 100,
        y: 0,
        baseY: Math.random() * (maxY - minY) + minY,
        type: t,
        health: h,
        maxHealth: h,
        vx: v,
        vy: 0,
        size: s,
        state: 'FLYING',
        mood: 'SMUG',
        lastShot: 0,
        shotsFired: 0,
        tauntTime: 0,
        flapFrame: 0,
        oscSpeed: os,
        oscAmp: oa,
        oscPhase: Math.random() * Math.PI * 2
      };

      birds.current.push(bird);
    };

    if (rand > 0.88) {
      type = 'TANK';
      health = 3;
      vx = -1.8;
      size = 85; // Massive Presence
      oscSpeed = 0.08;
      oscAmp = 50;
      playTankBirdCue();
    } else if (rand > 0.73) {
      type = 'DIVER';
      vx = -6;
      size = 55;
      oscSpeed = 0.3;
      oscAmp = 70;
      playFireDiverCue();
    } else if (rand > 0.48) {
      type = 'SNIPER';
      vx = -2.5;
      size = 36;
      oscSpeed = 0.12;
      oscAmp = 20;
      playSniperBirdCue();
    } else {
      type = 'NORMAL';
      playNormalBirdCue();
    }

    const t = type;
    const h = health;
    const v = vx;
    const s = size;
    const os = oscSpeed;
    const oa = oscAmp;

    const spawnDelay = t === 'TANK' ? 1000 : 500;

    setTimeout(() => {
      createBird(t, h, v, s, os, oa);
    }, spawnDelay);
  }, [playFireDiverCue, playNormalBirdCue, playSniperBirdCue, playTankBirdCue]);

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

  const createParticles = (x: number, y: number, color: string, count: number, type: 'FEATHER' | 'SPARK' | 'TEXT' | 'ICE_SHARD' | 'MUD_SPLAT' = 'FEATHER', text?: string) => {
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
    if (isWarmupRef.current) return; // THE PAUSE ⏸️

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
    gapY.current += (targetGapY - gapY.current) * 0.5;

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
              // Reduced particle counts for Divine Strike to prevent lag spikes
              createParticles(bird.x, bird.y, COLORS.CYAN, 12, 'SPARK'); 
              createParticles(bird.x, bird.y, COLORS.YELLOW, 8, 'FEATHER');
            }
          });
        } else {
          // Normal crush check - only if NOT divine
          if (!isDivineRef.current) {
            let hitAny = false;
            birds.current.forEach(bird => {
              const horizontalTolerance = 80 + bird.size;
              if (bird.state === 'FLYING' && 
                  bird.x > dimensions.current.width / 2 - horizontalTolerance && 
                  bird.x < dimensions.current.width / 2 + horizontalTolerance) {
                
                // Precise vertical collision based on bird size
                const collisionRange = bird.size * 1.6; // Much more generous hitbox for better feel
                if (Math.abs(bird.y - gapY.current) < collisionRange) {
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

    birds.current.forEach(bird => {
      // Logic for expressions
      const pipeX = dimensions.current.width / 2;
      const pipeLeft = pipeX - PIPE_WIDTH / 2;
      const pipeRight = pipeX + PIPE_WIDTH / 2;

      if (bird.state === 'FLYING') {
        bird.x += bird.vx;
        bird.flapFrame += 0.2;

        // Transition expressions
        if (bird.x < pipeLeft - 20) {
          bird.mood = 'MOCKING';
        }
        
        // Flight Path
        const oscTime = frameCount.current * bird.oscSpeed + bird.oscPhase;
        const targetY = bird.baseY + Math.sin(oscTime) * bird.oscAmp;
        
        bird.y = targetY;

        // Calculate vy for squash/stretch
        bird.vy = Math.cos(oscTime) * bird.oscAmp * bird.oscSpeed;

        // --- TURBO SOUL EMISSION ---
        if (bird.type === 'DIVER') {
          const particleCount = 1 + Math.floor(Math.abs(bird.vy) * 0.2);
          for (let i = 0; i < particleCount; i++) {
            particles.current.push({
              x: bird.x,
              y: bird.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() * 2 + 1), // Drift right
              vy: (Math.random() - 0.5) * 2,
              life: 1.0,
              color: Math.random() > 0.4 ? '#FF4500' : (Math.random() > 0.5 ? '#FFA500' : '#FFFF00'),
              size: Math.random() * 8 + 4,
              type: 'FIRE_TRAIL'
            });
          }
        }

        const warmupFactor = isWarmupActiveRef.current ? Math.min(1, frameCount.current / WARMUP_FRAMES) : 1;
        const shootRate = bird.type === 'SNIPER' ? 50 : 100;
        const canShoot = isWarmupActiveRef.current ? (frameCount.current > WARMUP_FRAMES) : true;
        const maxShots = bird.type === 'SNIPER' ? 2 : 1;

        if (canShoot && bird.shotsFired < maxShots && frameCount.current - bird.lastShot > shootRate && bird.x > dimensions.current.width / 2) {
          bird.lastShot = frameCount.current;
          bird.shotsFired++;
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

          const bulletType = bird.type === 'SNIPER' ? 'ICE' : (bird.type === 'DIVER' ? 'FIRE' : (bird.type === 'TANK' ? 'SLUDGE' : 'NORMAL'));
          const bulletSpeed = bulletType === 'SLUDGE' ? -4 : -10;
          
          bullets.current.push({
            x: bird.x - bird.size/2,
            y: bird.y,
            vx: bulletSpeed,
            vy: bulletVy * (bulletType === 'SLUDGE' ? 0.4 : 1),
            color: bird.type === 'SNIPER' ? COLORS.CYAN : bird.type === 'DIVER' ? '#FF4500' : (bird.type === 'TANK' ? '#2b1b0b' : COLORS.PURPLE),
            type: bulletType
          });
        }

        if (bird.x < dimensions.current.width / 2 - PIPE_WIDTH) {
          bird.state = 'PASSED';
          bird.mood = 'MOCKING';
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
        
        bird.x += bird.vx;
        bird.flapFrame += 0.25; // RESCUE THE FLUIDITY! Keep flapping!
        
        // --- FLUIDITY SURGERY ---
        // Ensure the water-like oscillation continues after passing
        const oscTime = frameCount.current * bird.oscSpeed + bird.oscPhase;
        bird.y = bird.baseY + Math.sin(oscTime) * bird.oscAmp;
        
        // CRITICAL: Update vy so the squash/stretch in draw() keeps working
        bird.vy = Math.cos(oscTime) * bird.oscAmp * bird.oscSpeed;
        
        // --- TURBO SOUL EMISSION (PASSED) ---
        if (bird.type === 'DIVER') {
          const particleCount = 1 + Math.floor(Math.abs(bird.vy) * 0.2);
          for (let i = 0; i < particleCount; i++) {
            particles.current.push({
              x: bird.x,
              y: bird.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() * 2 + 1), 
              vy: (Math.random() - 0.5) * 2,
              life: 1.0,
              color: Math.random() > 0.4 ? '#FF4500' : (Math.random() > 0.5 ? '#FFA500' : '#FFFF00'),
              size: Math.random() * 8 + 4,
              type: 'FIRE_TRAIL'
            });
          }
        }

        if (bird.tauntTime > 0) bird.tauntTime--;
      }
    });

    // Update bullets
    bullets.current.forEach(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      if (bullet.x < dimensions.current.width / 2 + PIPE_WIDTH / 2 && 
          bullet.x > dimensions.current.width / 2 - PIPE_WIDTH / 2) {
        
        const isGap = bullet.y > gapY.current - currentGapSize.current / 2 && 
                      bullet.y < gapY.current + currentGapSize.current / 2;
        
        if (!isGap) {
          if (!isSlamming.current) {
            integrityRef.current = Math.max(0, integrityRef.current - 10);
            setLastDamageTime(Date.now());
            if (bullet.type === 'FIRE') {
              playFireHitSound();
            } else if (bullet.type === 'ICE') {
              playIceShatterSound();
            } else if (bullet.type === 'SLUDGE') {
              playSquelchSound();
            } else {
              playBulletHitSound();
            }
            killStreakRef.current = 0;
          }
          if (bullet.type === 'FIRE') {
            createParticles(bullet.x, bullet.y, '#FF4500', 10, 'SPARK');
            createParticles(bullet.x, bullet.y, '#FFA500', 5, 'SPARK');
          } else if (bullet.type === 'ICE') {
            createParticles(bullet.x, bullet.y, '#00FFFF', 15, 'ICE_SHARD');
            createParticles(bullet.x, bullet.y, '#FFFFFF', 10, 'ICE_SHARD');
          } else if (bullet.type === 'SLUDGE') {
            createParticles(bullet.x, bullet.y, '#5d3a1a', 12, 'MUD_SPLAT');
          } else {
            createParticles(bullet.x, bullet.y, COLORS.WHITE, 5, 'SPARK');
          }
          bullet.life = 0; // Mark for removal
        }
      }
    });
    bullets.current = bullets.current.filter(b => b.x > -100 && (b.life === undefined || b.life > 0));

    // Update particles
    particles.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'FIRE_TRAIL') {
        p.vy -= 0.15; // Fire drifts UP
        p.vx *= 0.98; // Slow down drift
        p.size *= 0.95; // Shrink fire
      } else if (p.type === 'MUD_SPLAT') {
        p.vy = Math.min(2, p.vy + 0.1); // Slow slide down
        p.vx *= 0.5; // Stop horizontal movement fast
        p.size *= 0.99; 
      } else if (p.type !== 'TEXT') {
        p.vy += 0.4;
      }
      p.life -= p.type === 'TEXT' ? 0.01 : 0.025;
    });
    particles.current = particles.current.filter(p => p.life > 0);
    // Hard cap for performance
    if (particles.current.length > 400) {
      particles.current = particles.current.slice(-400);
    }

    birds.current = birds.current.filter(b => b.x > -200 && b.state !== 'CRUSHED');
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

    // Background - Industrial Atmosphere
    const isPowerSurge = isSlamming.current && Math.random() > 0.7;
    
    if (isPowerSurge) {
      ctx.fillStyle = COLORS.WHITE;
      ctx.fillRect(0, 0, width, height);
    } else {
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#4a1400'); // Deep dark top
      bgGradient.addColorStop(0.5, COLORS.ORANGE); // Radiant center
      bgGradient.addColorStop(1, '#6b2000'); // Dusty bottom
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    // Draw Sun with Heat Glow
    const sunX = width * 0.75;
    const sunY = height * 0.2;
    const sunR = 70;
    
    // Massive Hazy Glow
    const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3);
    sunGlow.addColorStop(0, 'rgba(255, 180, 0, 0.4)');
    sunGlow.addColorStop(0.6, 'rgba(255, 60, 0, 0.1)');
    sunGlow.addColorStop(1, 'rgba(255, 40, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - sunR * 3, sunY - sunR * 3, sunR * 6, sunR * 6);
    
    // Sun Core - Slightly Textured
    ctx.fillStyle = COLORS.YELLOW;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
    
    // Subtle internal sun highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(sunX - sunR/3, sunY - sunR/3, sunR/3, 0, Math.PI * 2);
    ctx.fill();

    // Parallax Mountains - Receding into haze
    const layers = [
      { width: 800, speed: 0.15, opacity: 0.2, peakShift: 120, heightMult: 0.25, color: '#300a00' }, // Far
      { width: 600, speed: 0.45, opacity: 0.4, peakShift: 80, heightMult: 0.4, color: '#5a1200' },  // Middle
      { width: 900, speed: 1.2, opacity: 0.8, peakShift: 200, heightMult: 0.55, color: '#8a2500' }   // Close
    ];

    layers.forEach((layer, lIdx) => {
      const layerOffset = (frameCount.current * layer.speed) % layer.width;
      
      for (let i = -layer.width; i < width + layer.width; i += layer.width) {
        const xStart = i - layerOffset;
        const xEnd = xStart + layer.width;
        const xPeak = xStart + layer.width / 2 + layer.peakShift;
        const xBaseMid = xStart + layer.width / 2;
        const pyramidHeight = height * layer.heightMult;
        const yBase = height;
        const yPeak = height - pyramidHeight;

        // Apply distance haze by blending with background color
        ctx.save();
        ctx.globalAlpha = layer.opacity;

        // Left Face (Light Side)
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(xStart, yBase);
        ctx.lineTo(xPeak, yPeak);
        ctx.lineTo(xBaseMid, yBase);
        ctx.fill();

        // Right Face (Shadow Side - Now less dark)
        ctx.fillStyle = '#2d0c00'; // Lightened from #1a0500 for better visibility
        ctx.beginPath();
        ctx.moveTo(xBaseMid, yBase);
        ctx.lineTo(xPeak, yPeak);
        ctx.lineTo(xEnd, yBase);
        ctx.fill();
        
        ctx.restore();
      }
    });

    // Draw Scanning Line
    const scanY = (frameCount.current * 1.5) % height;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, scanY, width, 2);

    // Draw Visual Particles (Trailing behind birds)
    ctx.save();
    
    // Group fire particles to use 'screen' blending once
    const fireParticles = particles.current.filter(p => p.type === 'FIRE_TRAIL');
    const otherParticles = particles.current.filter(p => p.type !== 'FIRE_TRAIL' && p.type !== 'TEXT');

    // Draw regular particles
    otherParticles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (p.type === 'FEATHER') {
        ctx.ellipse(p.x, p.y, p.size, p.size/2, frameCount.current * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'ICE_SHARD') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(frameCount.current * 0.2 + p.vx * 0.1);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Crystalline triangle
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, p.size * 0.5);
        ctx.lineTo(-p.size * 0.8, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'MUD_SPLAT') {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Slushy blob
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });

    // Draw fire particles with high performance "soul" additive blending
    if (fireParticles.length > 0) {
      ctx.globalCompositeOperation = 'screen';
      fireParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life * 0.7; // Softer fire
        
        // Use a simple radial gradient for "deep" glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // Draw Birds
    birds.current.forEach(bird => {
      if (bird.state === 'CRUSHED') return;

      ctx.save();
      ctx.translate(bird.x, bird.y);
      
      // Taunt Bubble
      if (bird.taunt && bird.tauntTime > 0) {
        ctx.save();
        ctx.font = '900 28px Bangers'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const words = bird.taunt.split(' ');
        let lines = [bird.taunt];
        if (bird.taunt.length > 12 && words.length > 1) {
          const mid = Math.ceil(words.length / 2);
          lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        }

        let maxWidth = 0;
        lines.forEach(line => {
          maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
        });

        const paddingH = 24;
        const paddingV = 16;
        const bW = Math.max(80, maxWidth + paddingH * 2);
        const lH = 30;
        const bH = lines.length * lH + paddingV;
        const bY = -bird.size - bH/2 - 20;
        
        ctx.translate((Math.random()-0.5)*4, bY + (Math.random()-0.5)*4);
        ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 4;
        
        const r = 15;
        const bx = -bW / 2;
        const by = -bH / 2;
        
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bW - r, by);
        ctx.quadraticCurveTo(bx + bW, by, bx + bW, by + r);
        ctx.lineTo(bx + bW, by + bH - r);
        ctx.quadraticCurveTo(bx + bW, by + bH, bx + bW - r, by + bH);
        ctx.lineTo(12, by + bH);
        ctx.lineTo(0, by + bH + 15);
        ctx.lineTo(-12, by + bH);
        ctx.lineTo(bx + r, by + bH);
        ctx.quadraticCurveTo(bx, by + bH, bx, by + bH - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.BLACK;
        lines.forEach((line, i) => {
          ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lH);
        });
        ctx.restore();
      }

      // Squash & Stretch
      const flap = Math.sin(bird.flapFrame) * 0.2;
      const vStretch = Math.min(0.5, Math.abs(bird.vy) * 0.03);
      ctx.scale(-(1 + flap - vStretch), 1 - flap + vStretch);

      if (bird.mood === 'MOCKING') {
        ctx.translate(0, Math.sin(frameCount.current * 0.8) * 5);
      }

      // --- COCKY BIRDS DESIGN ---
      const img = birdImagesRef.current[bird.type];
      
      if (img) {
        // Render at natural aspect ratio
        const aspect = img.width / img.height;
        const drawW = bird.size * 1.1; // Slightly larger for visual weight
        const drawH = drawW / aspect;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        // Fallback procedural drawing
        const isTank = bird.type === 'TANK';
        const isSniper = bird.type === 'SNIPER';
        const isFire = bird.type === 'DIVER';

        // Body
        ctx.fillStyle = isTank ? COLORS.PURPLE : isSniper ? COLORS.CYAN : isFire ? '#FF0000' : COLORS.YELLOW;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, bird.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye & Eyepatch (Minimal fallback)
        ctx.save();
        ctx.rotate(0.1); 
        ctx.fillStyle = COLORS.WHITE;
        ctx.beginPath();
        ctx.arc(bird.size/4.5, -bird.size/10, bird.size/5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = COLORS.BLACK;
        ctx.beginPath();
        ctx.arc(bird.size/4, -bird.size/10, bird.size/10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.moveTo(-bird.size/2, -bird.size/3);
        ctx.lineTo(bird.size/2, bird.size/8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-bird.size/8, -bird.size/6, bird.size/3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Beak
        ctx.fillStyle = COLORS.BLACK;
        ctx.beginPath();
        const bxX = bird.size / 2.5;
        const bxY = bird.size / 15;
        if (bird.mood === 'MOCKING') {
          ctx.moveTo(bxX, bxY); ctx.lineTo(bxX+bird.size/6, bxY-bird.size/12); ctx.lineTo(bxX, bxY-bird.size/6);
          ctx.moveTo(bxX, bxY+bird.size/12); ctx.lineTo(bxX+bird.size/6, bxY+bird.size/6); ctx.lineTo(bxX, bxY+bird.size/4);
        } else {
          ctx.moveTo(bxX, bxY); ctx.lineTo(bxX+bird.size/4, bxY+bird.size/10); ctx.lineTo(bxX, bxY+bird.size/5);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }

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
          ctx.fillStyle = Math.random() > 0.4 ? '#FF4500' : '#FFA500';
          ctx.beginPath();
          ctx.arc(tx, ty, Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (b.type === 'ICE') {
        // Frosty Cube effect
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(frameCount.current * 0.1);
        
        const iceGrad = ctx.createLinearGradient(-8, -8, 8, 8);
        iceGrad.addColorStop(0, '#FFFFFF');
        iceGrad.addColorStop(0.5, '#00FFFF');
        iceGrad.addColorStop(1, '#008b8b');
        
        ctx.fillStyle = iceGrad;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.fillRect(-8, -8, 16, 16);
        ctx.strokeRect(-8, -8, 16, 16);
        
        // Internal glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(2, -6);
        ctx.lineTo(-6, 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      } else if (b.type === 'SLUDGE') {
        // The "Real Deal" Faceless 3-Tier Stack (The Brown Payload) - EVEN CHUNKIER
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(frameCount.current * 0.05); // Slow tumble
        ctx.scale(2.2, 2.2); // THE MEGA CHUNK
        
        ctx.strokeStyle = '#1f140a';
        ctx.lineWidth = 1;
        
        const brownGrad = ctx.createLinearGradient(0, -10, 0, 10);
        brownGrad.addColorStop(0, '#7b4c2b');
        brownGrad.addColorStop(1, '#1f140a');
        ctx.fillStyle = brownGrad;

        // Bottom Tier
        ctx.beginPath();
        ctx.ellipse(0, 4, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Middle Tier
        ctx.beginPath();
        ctx.ellipse(0, -1, 8, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Top Tier + Curly Tip
        ctx.beginPath();
        ctx.ellipse(0, -5, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.moveTo(-2, -7);
        ctx.quadraticCurveTo(0, -12, 4, -8);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
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

    // Draw Pipes - Heavy Metal Industrial Style
    if (!isCrumbling.current) {
      let pipeX = width / 2 - PIPE_WIDTH / 2;
      let pipeYOffset = 0;
      const isThunderActive = isThunderReadyRef.current && isSlamming.current;
      
      if (isThunderActive || isDivineRef.current) {
        ctx.save();
        pipeX += (Math.random() - 0.5) * 25; 
        pipeYOffset = (Math.random() - 0.5) * 25;
        ctx.shadowBlur = isDivineRef.current ? 30 : 20; 
        ctx.shadowColor = isDivineRef.current ? COLORS.CYAN : COLORS.YELLOW;
        
        // Draw glow as a separate pass behind the pipes to keep it isolated
        ctx.fillStyle = isDivineRef.current ? COLORS.CYAN : COLORS.YELLOW;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(pipeX - 10, -20, PIPE_WIDTH + 20, height + 40);
        ctx.restore();
      }

      ctx.save();
      ctx.shadowBlur = 0; // CRITICAL: Disable shadow for the heavy metallic rectangles

      const isPepperZone = score >= 50;
      const basePipeColor = isPepperZone ? '#8b0000' : (isThunderReadyRef.current ? '#8b8b00' : '#004d00');
      const lightPipeColor = isPepperZone ? '#ff4d4d' : (isThunderReadyRef.current ? '#ffff4d' : '#00cc00');
      
      if (isPepperZone) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#FF0000';
      }

      // Metallic Pipe Gradient
      const pipeGradient = ctx.createLinearGradient(pipeX, 0, pipeX + PIPE_WIDTH, 0);
      pipeGradient.addColorStop(0, basePipeColor);
      pipeGradient.addColorStop(0.3, lightPipeColor);
      pipeGradient.addColorStop(0.7, lightPipeColor);
      pipeGradient.addColorStop(1, basePipeColor);

      ctx.fillStyle = pipeGradient;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 10; // Thicker brutalist outlines

      // Top Pipe
      const topPipeHeight = gapY.current - currentGapSize.current / 2 + pipeYOffset;
      ctx.fillRect(pipeX, -20, PIPE_WIDTH, topPipeHeight + 20);
      ctx.strokeRect(pipeX, -20, PIPE_WIDTH, topPipeHeight + 20);
      
      // Bottom Pipe
      const bottomPipeY = gapY.current + currentGapSize.current / 2 + pipeYOffset;
      const bottomPipeHeight = height - bottomPipeY;
      ctx.fillRect(pipeX, bottomPipeY, PIPE_WIDTH, bottomPipeHeight + 20);
      ctx.strokeRect(pipeX, bottomPipeY, PIPE_WIDTH, bottomPipeHeight + 20);
      ctx.restore(); // Restore from shadowBlur = 0

      // Internal Lightning for Pipes
      if (isSlamming.current || isDivineRef.current) {
        ctx.save();
        const isSupercharged = isThunderReadyRef.current || isDivineRef.current;
        ctx.strokeStyle = isSupercharged ? COLORS.WHITE : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = isSupercharged ? 6 : 2; 
        ctx.shadowBlur = isSupercharged ? 20 : 0; // Only glow if supercharged
        ctx.shadowColor = COLORS.CYAN;
        
        const drawPipeLightning = (y1: number, y2: number) => {
          const boltCount = isDivineRef.current ? 3 : (isSupercharged ? 2 : 1);
          for (let bIdx = 0; bIdx < boltCount; bIdx++) {
            ctx.beginPath();
            let curY = y1;
            ctx.moveTo(pipeX + Math.random() * PIPE_WIDTH, curY);
            // Use larger steps for better performance
            const stepY = isDivineRef.current ? 40 : 25;
            while (curY < y2) {
              curY += stepY + Math.random() * 20;
              ctx.lineTo(pipeX + Math.random() * PIPE_WIDTH, Math.min(curY, y2));
            }
            ctx.stroke();
          }
        };
        
        drawPipeLightning(0, topPipeHeight);
        drawPipeLightning(bottomPipeY, height);
        ctx.restore();
      }

      // Pre-calculate gradient once for all rivets
      const rivetGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
      rivetGrad.addColorStop(0, '#e0e0e0');
      rivetGrad.addColorStop(1, '#606060');

      const renderRivet = (x: number, y: number) => {
        // Rivet Outer Ring (Shadow)
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Rivet Head
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = rivetGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = COLORS.WHITE;
        ctx.beginPath();
        ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      ctx.shadowBlur = 0; // Ensure no shadow for rivets
      for (let y = 40; y < height; y += 70) {
        if (y < topPipeHeight - 20 || y > bottomPipeY + 20) {
          renderRivet(pipeX + 15, y);
          renderRivet(pipeX + PIPE_WIDTH - 15, y);
        }
      }
    }

    // Draw Screen-Wide Lightning Storm during Divine Wrath (Ultra-Optimized)
    if (isDivineRef.current) {
      ctx.save();
      const boltCount = 3; // Reduced further for maximum speed
      ctx.lineCap = 'round';
      
      for (let b = 0; b < boltCount; b++) {
        let curY = 0;
        let lastX = Math.random() * width;
        
        ctx.beginPath();
        while (curY < height) {
          curY += 60 + Math.random() * 40; // Fewer segments
          const nextX = lastX + (Math.random() - 0.5) * 400;
          ctx.lineTo(nextX, curY);
          lastX = nextX;
        }

        // Outer Glow
        ctx.strokeStyle = COLORS.CYAN;
        ctx.lineWidth = 10;
        ctx.shadowBlur = 10; 
        ctx.shadowColor = COLORS.CYAN;
        ctx.stroke();
        
        // Inner Core
        ctx.strokeStyle = COLORS.WHITE;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 0;
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

    // Draw Text Callouts (On top of everything)
    particles.current.forEach(p => {
      if (p.type !== 'TEXT') return;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 8;
      let fontSize = 48;
      if (p.text === 'THUNDER!!!' || p.text === 'DIVINE WRATH!!!') fontSize = 100;
      else if (p.text?.includes('POINTS!')) fontSize = 80;
      
      ctx.font = `900 ${fontSize}px Bangers`;
      ctx.textAlign = 'center';
      
      const tx = p.x + (Math.random() - 0.5) * 5;
      const ty = p.y + (Math.random() - 0.5) * 5;
      
      const words = p.text!.split(' ');
      let lines = [p.text!];
      if (p.text!.length > 12 && words.length > 1 && !p.text!.includes('!!!') && !p.text!.includes('POINTS!')) {
        const mid = Math.ceil(words.length / 2);
        lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
      }

      lines.forEach((line, i) => {
        const lineY = ty + (i - (lines.length - 1) / 2) * (fontSize * 0.9);
        ctx.strokeText(line, tx, lineY);
        ctx.fillText(line, tx, lineY);
      });
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
    trackClout();
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
      // Ignore AbortError (user canceled)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
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
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mousePos.current = { 
        x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
        y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height)
      };
    } else {
      mousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  return (
    <div 
      className={`relative w-full h-full overflow-hidden font-sans touch-none ${isShaking ? 'shake' : ''}`}
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
          initial={{ opacity: 0, scale: 0.5, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute inset-0 flex items-center justify-center z-[200]"
        >
          <div className="bg-white border-[4px] border-black p-4 md:p-6 shadow-[8px_8px_0px_#000] -rotate-2 max-w-[280px] md:max-w-sm text-center relative pointer-events-auto">
            {/* Slick Black Cancel Button */}
            <button 
              onClick={() => {
                setIsWarmup(false);
                isWarmupActiveRef.current = true;
                frameCount.current = 0; // Reset countdown for the 5s warmup
                localStorage.setItem('cocky-birds-tutorial-done', 'true');
                setIsFirstTime(false);
              }}
              className="absolute -top-4 -right-4 bg-black text-white w-10 h-10 border-[3px] border-black flex items-center justify-center hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none group"
              title="Dismiss Warmup"
            >
              <span className="font-black text-xl group-hover:scale-110 transition-transform">❌</span>
            </button>
            <h2 className="text-4xl md:text-6xl font-black text-black italic leading-none tracking-tighter">WARMUP</h2>
            <p className="text-black font-black uppercase text-xs md:text-lg tracking-widest mt-1 border-b-[3px] border-black/10 pb-2">Birds are slow & peaceful...</p>
            <div className="mt-4 space-y-2">
              <p className="text-orange-600 font-black text-lg md:text-2xl animate-bounce leading-tight">
                MOVE THE PIPE TO CRUSH BIRDS!
              </p>
              <div className="bg-black text-white p-1 text-[10px] md:text-xs font-black uppercase tracking-tighter rotate-1">
                CLICK THE ❌ TO ENGAGE THE GRIND
              </div>
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
                  trackSlam();
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
