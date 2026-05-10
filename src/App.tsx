/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Shield, Zap, Skull, Target, Flame, Share2, Globe } from 'lucide-react';
import { initGA, trackSlam, trackClout, trackPageView } from './lib/analytics';

// Constants
const PIPE_WIDTH = 80;
const DEFAULT_GAP_SIZE = 240;
const SLAM_SPEED = 3300; // Pixels per second
const OPEN_SPEED = 1080;
const BIRD_BASE_SPEED = 85;
const WARMUP_SECONDS = 10;
const MAX_INTEGRITY = 100;
const CHAOS_LIMIT = 100;
const GRAVITY = 1400; // Pixels per second squared
const GROUND_HEIGHT = 80;

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
  baseVx: number;
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


const PLANETS = [
  { 
    id: 'earth', 
    name: 'EARTH', 
    url: 'https://i.ibb.co/C5GMT8WF/earth-backgroud.jpg', 
    foregroundUrl: 'https://i.ibb.co/N6NmjbNV/earthforeground-asset.jpg',
    primaryColor: '#4FA2FF',
    mountainColor: '#1E8928',
    description: 'HOME SWEET HOME',
    unlockScore: 0
  },
  { 
    id: 'ares_anvil', 
    name: "ARES' ANVIL", 
    url: 'https://i.ibb.co/4nnGR0vR/ares-anvil-background.png', 
    foregroundUrl: 'https://i.ibb.co/qqtJ9wR/ares-anvilforeground-asset.jpg',
    primaryColor: '#FF4500',
    mountainColor: '#3d1000',
    description: 'FORGED IN COSMIC FIRE',
    unlockScore: 10
  },
  { 
    id: 'neon_nebula', 
    name: 'THE NEON NEBULA', 
    url: 'https://i.ibb.co/v4xVyv8Y/theneonnebula-background.png', 
    foregroundUrl: 'https://i.ibb.co/3mTdkg2n/theneonnebulaforeground-asset.jpg',
    primaryColor: '#FF00FF',
    mountainColor: '#2d004a',
    description: 'A LUCID SPACE DREAM',
    unlockScore: 20
  },
  { 
    id: 'stardust_crater', 
    name: 'STARDUST CRATER', 
    url: 'https://i.ibb.co/ch5NqsvH/stardustcrater-background.png', 
    foregroundUrl: 'https://i.ibb.co/rG67rNJ5/stardustcraterforeground-asset.jpg',
    primaryColor: '#87CEFA',
    mountainColor: '#1a2a4a',
    description: 'REMAINS OF A DEAD STAR',
    unlockScore: 30
  },
  { 
    id: 'eclipse_ridge', 
    name: 'ECLIPSE RIDGE', 
    url: 'https://i.ibb.co/bM433Qk8/eclipseridge.png', 
    foregroundUrl: 'https://i.ibb.co/2121dZdy/eclipseridgeforeground-asset.jpg',
    primaryColor: '#4B0082',
    mountainColor: '#0c001a',
    description: 'BEYOND THE SHADOWS',
    unlockScore: 40
  },
  { 
    id: 'solstice_prime', 
    name: 'SOLSTICE PRIME', 
    url: 'https://i.ibb.co/G47859j6/solsticeprime-bacground.png', 
    foregroundUrl: 'https://i.ibb.co/YT0qPnnH/solsticeprimeforeground-asset.jpg',
    primaryColor: '#FFD700',
    mountainColor: '#4a3f00',
    description: 'ETERNAL STELLAR LIGHT',
    unlockScore: 50
  },
  { 
    id: 'saturn_shallows', 
    name: 'THE SATURN SHALLOWS', 
    url: 'https://i.ibb.co/vxCXcj4Q/thesaturnshallows-background.png', 
    foregroundUrl: 'https://i.ibb.co/dw9hW3xG/thesaturnshallowsforeground-asset.jpg',
    primaryColor: '#F4A460',
    mountainColor: '#3d250a',
    description: 'DRIFTING THROUGH THE RINGS',
    unlockScore: 60
  },
  { 
    id: 'violet_void', 
    name: 'VIOLET VOID', 
    url: 'https://i.ibb.co/RGTBdkLB/violetvoid-background.png', 
    foregroundUrl: 'https://i.ibb.co/fGx1SSwG/violetvoidforeground-asset.jpg',
    primaryColor: '#8A2BE2',
    mountainColor: '#1e0a3d',
    description: 'WHERE REALITY FADES',
    unlockScore: 70
  },
  { 
    id: 'asteroid_graveyard', 
    name: 'THE ASTEROID GRAVEYARD', 
    url: 'https://i.ibb.co/0RvHsPD1/theasteroidgraveyard-background.png', 
    foregroundUrl: 'https://i.ibb.co/3YPBZfd3/theasteroidgraveyardforeground-asset.jpg',
    primaryColor: '#708090',
    mountainColor: '#22282e',
    description: 'ECHOES OF ANCIENT COLLISIONS',
    unlockScore: 80
  },
  { 
    id: 'azure_outpost', 
    name: 'AZURE OUTPOST', 
    url: 'https://i.ibb.co/j9vRH5WY/azureoutpost-background.png', 
    foregroundUrl: 'https://i.ibb.co/PvrCT016/azureoutpostforeground-asset.jpg',
    primaryColor: '#007FFF',
    mountainColor: '#001a33',
    description: 'FRONTIER OF THE DEEP BLUE',
    unlockScore: 90
  },
  { 
    id: 'nova_citadel', 
    name: 'NOVA CITADEL', 
    url: 'https://i.ibb.co/Q7SkX0Ln/novacitadel-background.png', 
    foregroundUrl: 'https://i.ibb.co/KJLsZNR/novacitadelforeground-asset.jpg',
    primaryColor: '#E0FFFF',
    mountainColor: '#003366',
    description: 'GLORY OF THE DYING SUN',
    unlockScore: 100
  },
];

const CHARACTER_INFO = [
  { 
    id: 'TANK', 
    img: 'https://i.ibb.co/wNVzWX6R/purple-tank.png', 
    text: 'https://i.ibb.co/Wvnc3S3g/purple-tanktext.png',
    description: "🟣 THE TANK: Big, slow, and takes 3 hits to crush. He’s the muscle. 🧱💪"
  },
  { 
    id: 'SNIPER', 
    img: 'https://i.ibb.co/Ld2Q2zsr/blue-sniper.png', 
    text: 'https://i.ibb.co/ksfCNnqG/blue-snipertext.png',
    description: "🔵 THE SNIPER: Small, blue, and shoots with 99% accuracy. He doesn't miss. 🎯⚡️"
  },
  { 
    id: 'NORMAL', 
    img: 'https://i.ibb.co/8gtLm9qB/yellow-diver.png', 
    text: 'https://i.ibb.co/3Jjds2K/yellow-divertext.png',
    description: "🟡 THE DIVER: The original speed demon. Blink and he’s already past you. 🏎️💨"
  },
  { 
    id: 'DIVER', 
    img: 'https://i.ibb.co/pjNspj7Q/fire-diver.png', 
    text: 'https://i.ibb.co/qLXCR6Nv/fire-divertext.png',
    description: "🔴 THE FIRE DIVER (NEW!): A literal pyromaniac. He’s red, he’s fast, and he breathes fire."
  },
];

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
  const planetImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const planetForegroundImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const featherImagesRef = useRef<{ blue?: HTMLImageElement; yellow?: HTMLImageElement }>({});

  useEffect(() => {
    const birdAssets = {
      TANK: 'https://i.ibb.co/wNVzWX6R/purple-tank.png',
      SNIPER: 'https://i.ibb.co/Ld2Q2zsr/blue-sniper.png',
      DIVER: 'https://i.ibb.co/pjNspj7Q/fire-diver.png',
      NORMAL: 'https://i.ibb.co/8gtLm9qB/yellow-diver.png',
      PIPE: 'https://i.ibb.co/SDzcVyM3/pipe-asset.png'
    };

    Object.entries(birdAssets).forEach(([type, filename]) => {
      const img = new Image();
      img.src = filename;
      img.onload = () => {
        birdImagesRef.current[type] = img;
      };
    });

    PLANETS.forEach(planet => {
      const img = new Image();
      img.src = planet.url;
      img.onload = () => {
        planetImagesRef.current[planet.id] = img;
      };

      if (planet.foregroundUrl) {
        const fgImg = new Image();
        fgImg.src = planet.foregroundUrl;
        fgImg.onload = () => {
          planetForegroundImagesRef.current[planet.id] = fgImg;
        };
      }
    });

    // Preload custom feathers
    const blueFeather = new Image();
    blueFeather.src = 'https://i.ibb.co/R4v3ZxnC/blue-birdfeather.png';
    blueFeather.referrerPolicy = 'no-referrer';
    blueFeather.onload = () => { featherImagesRef.current.blue = blueFeather; };

    const yellowFeather = new Image();
    yellowFeather.src = 'https://i.ibb.co/99DCvMLF/yellow-birdfeather.png';
    yellowFeather.referrerPolicy = 'no-referrer';
    yellowFeather.onload = () => { featherImagesRef.current.yellow = yellowFeather; };
  }, []);

  const [isBirdsCharactersOpen, setIsBirdsCharactersOpen] = useState(false);
  const [showBirdTooltip, setShowBirdTooltip] = useState(false);
  const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const infoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);

  useEffect(() => {
    if (isBirdsCharactersOpen) {
      const runCycle = () => {
        setShowBirdTooltip(false);
        
        // Step 1: Bird enters and stays centered
        infoTimeoutRef.current = setTimeout(() => {
          // Step 2: Show tooltip, bird moves aside
          setShowBirdTooltip(true);
        }, 1500);

        // Step 3: Wait for a readable duration then cycle
        cycleTimeoutRef.current = setTimeout(() => {
          setShowBirdTooltip(false);
          // Wait for tooltip exit animation before showing next bird
          infoTimeoutRef.current = setTimeout(() => {
            setCurrentCharacterIndex(prev => (prev + 1) % CHARACTER_INFO.length);
            runCycle();
          }, 800);
        }, 7500);
      };

      runCycle();
    } else {
      setShowBirdTooltip(false);
      if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
      if (infoTimeoutRef.current) clearTimeout(infoTimeoutRef.current);
    }

    return () => {
      if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
      if (infoTimeoutRef.current) clearTimeout(infoTimeoutRef.current);
    };
  }, [isBirdsCharactersOpen]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentPlanetIndex, setCurrentPlanetIndex] = useState(() => {
    // Default to index 0 (EARTH)
    const saved = localStorage.getItem('cocky-birds-current-planet');
    if (!saved) return 0;
    const idx = parseInt(saved, 10);
    return (isNaN(idx) || idx < 0 || idx >= PLANETS.length) ? 0 : idx;
  });
  const [previewPlanetIndex, setPreviewPlanetIndex] = useState(currentPlanetIndex);
  const [isPlanetSelectorOpen, setIsPlanetSelectorOpen] = useState(false);
  const autoCycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoCycle = useCallback(() => {
    if (autoCycleTimerRef.current) clearInterval(autoCycleTimerRef.current);
    autoCycleTimerRef.current = setInterval(() => {
      setPreviewPlanetIndex(prev => (prev + 1) % PLANETS.length);
    }, 4500); 
  }, []);

  const stopAutoCycle = useCallback(() => {
    if (autoCycleTimerRef.current) {
      clearInterval(autoCycleTimerRef.current);
      autoCycleTimerRef.current = null;
    }
  }, []);

  // Sync preview when opening selector and start auto-cycle
  useEffect(() => {
    if (isPlanetSelectorOpen) {
      setPreviewPlanetIndex(currentPlanetIndex);
      startAutoCycle();
    } else {
      stopAutoCycle();
    }
    return () => stopAutoCycle();
  }, [isPlanetSelectorOpen, currentPlanetIndex, startAutoCycle, stopAutoCycle]);
  const [score, setScore] = useState(0);
  const totalSmashedRef = useRef(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('cocky-birds-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  useEffect(() => {
    // Analytics
    initGA();
    trackPageView(PLANETS[currentPlanetIndex].name);
  }, [currentPlanetIndex]);
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
  const [seenPlanetIds, setSeenPlanetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('cocky-birds-seen-planets');
    return saved ? JSON.parse(saved) : ['earth'];
  });

  const getUnlockedPlanets = useCallback(() => {
    return PLANETS.filter(p => highScore >= p.unlockScore).map(p => p.id);
  }, [highScore]);

  const hasNewUnseenPlanets = useMemo(() => {
    const unlocked = getUnlockedPlanets();
    return unlocked.some(id => !seenPlanetIds.includes(id));
  }, [getUnlockedPlanets, seenPlanetIds]);

  const markAllUnlockedAsSeen = useCallback(() => {
    const unlocked = getUnlockedPlanets();
    const newSeen = Array.from(new Set([...seenPlanetIds, ...unlocked]));
    setSeenPlanetIds(newSeen);
    localStorage.setItem('cocky-birds-seen-planets', JSON.stringify(newSeen));
  }, [getUnlockedPlanets, seenPlanetIds]);

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
  const highScoreRef = useRef(highScore);
  const totalBirdsSmashedRef = useRef(totalBirdsSmashed);
  const lastTimeRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);
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
    spawnTimerRef.current = 0;
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
    lastTimeRef.current = null;
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

    oscGain.gain.setValueAtTime(2.5, now);
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
    noiseGain.gain.setValueAtTime(1.5, now);
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
      burstGain.gain.exponentialRampToValueAtTime(2.5, startTime + 0.04);
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
      pulseGain.gain.exponentialRampToValueAtTime(3.0, startTime + 0.05);
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
    
    // 1. DEEP CRUNCH (Heavy low-frequency noise)
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(30, now + 2.0);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(3.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // 2. METALLIC CLANGS (Resonant pings for falling pipes)
    for (let i = 0; i < 9; i++) {
      const clangOsc = ctx.createOscillator();
      const clangGain = ctx.createGain();
      
      const baseFreq = 200 + Math.random() * 400;
      clangOsc.type = i % 2 === 0 ? 'sine' : 'triangle';
      clangOsc.frequency.setValueAtTime(baseFreq, now + i * 0.08);
      clangOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + i * 0.08 + 0.5);
      
      clangGain.gain.setValueAtTime(1.5, now + i * 0.08);
      clangGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
      
      const resFilter = ctx.createBiquadFilter();
      resFilter.type = 'bandpass';
      resFilter.frequency.value = baseFreq * 2.5; 
      resFilter.Q.value = 12; // Striking a resonant metal piece
      
      clangOsc.connect(resFilter);
      resFilter.connect(clangGain);
      clangGain.connect(ctx.destination);
      
      clangOsc.start(now + i * 0.08);
      clangOsc.stop(now + i * 0.08 + 0.5);
    }

    // 3. IMPACT THUD (The big initial hit)
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(150, now);
    thud.frequency.exponentialRampToValueAtTime(35, now + 0.4);
    thudGain.gain.setValueAtTime(4.0, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.4);
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
    const bottomPipeHeight = height - bottomPipeY - GROUND_HEIGHT;

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
            vx: (Math.random() - 0.5) * 600,
            vy: (Math.random() - 2) * 300,
            rotation: Math.random() * Math.PI * 2,
            vRotation: (Math.random() - 0.5) * 12,
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
    const warmupFactor = isWarmupActiveRef.current ? Math.min(1, frameCount.current / WARMUP_SECONDS) : 1;
    const speedMultiplier = 0.5 + 0.5 * warmupFactor;

    let vx = -(BIRD_BASE_SPEED + Math.random() * 60) * speedMultiplier;
    let size = 52;
    let oscSpeed = 9 + Math.random() * 5;
    let oscAmp = 25 + Math.random() * 25;

    const createBird = (t: BirdType, h: number, v: number, s: number, os: number, oa: number) => {
      if (gameStateRef.current !== 'PLAYING') return;

      const minY = dimensions.current.height * 0.2 + 50; 
      const maxY = dimensions.current.height * 0.85; 
      
      const bird: Bird = {
        id: birdIdCounter.current++,
        x: dimensions.current.width + 100,
        y: 0,
        baseY: Math.random() * (maxY - minY) + minY,
        type: t,
        health: h,
        maxHealth: h,
        vx: v,
        baseVx: v,
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
      vx = -60;
      size = 105; 
      oscSpeed = 4.8;
      oscAmp = 50;
      playTankBirdCue();
    } else if (rand > 0.73) {
      type = 'DIVER';
      vx = -220;
      size = 65;
      oscSpeed = 18;
      oscAmp = 70;
      playFireDiverCue();
    } else if (rand > 0.48) {
      type = 'SNIPER';
      vx = -110;
      size = 46;
      oscSpeed = 7.2;
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

    createBird(t, h, v, s, os, oa);
  }, [playFireDiverCue, playNormalBirdCue, playSniperBirdCue, playTankBirdCue]);

  const playPointSound = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;

    const playNote = (freq: number, startTime: number, duration: number, isLast: boolean = false) => {
      // Layer 1: The "Bite" (Sawtooth for high energy punch)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc1.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + duration);
      
      // Volume boost
      gain1.gain.setValueAtTime(50.0, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Layer 2: The "Sparkle" (High Sine for the chime effect)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      
      gain2.gain.setValueAtTime(35.0, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, startTime + duration * (isLast ? 2 : 1));
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + duration);
      osc2.start(startTime);
      osc2.stop(startTime + duration * (isLast ? 2 : 1));
    };

    // Rapid 3-note arpeggio (C6 -> E6 -> G6) with high volume
    playNote(1046.50, now, 0.08);        // C6
    playNote(1318.51, now + 0.06, 0.1);  // E6
    playNote(1567.98, now + 0.12, 0.3, true); // G6 (Dopamine Tail)
  };

  const playMilestoneSound = () => {
    const ctx = audioCtxRef.current;
    const gain = milestoneGainNodeRef.current;
    if (!ctx || !gain) return;

    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(2.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    // Victory Fanfare Chord (C Majorish)
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.5);
      
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.8, now);
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
      let finalColor = color;
      if (type === 'FEATHER') {
        finalColor = Math.random() > 0.5 ? '#3B82F6' : COLORS.YELLOW;
      }
      
      particles.current.push({
        x,
        y,
        vx: isText ? 0 : (Math.random() - 0.5) * 800,
        vy: isText ? (text === 'DIVINE WRATH!!!' ? 0 : -120) : (Math.random() - 0.75) * 1000,
        life: 1,
        color: finalColor,
        size: isText ? 40 : Math.random() * 8 + 3,
        type,
        text,
        rotation: Math.random() * Math.PI * 2
      });
    }
  };

  const update = useCallback((dt: number) => {
    if (gameStateRef.current !== 'PLAYING' && !isCrumbling.current) return;
    if (isWarmupRef.current) return; // THE PAUSE ⏸️

    frameCount.current += dt;

    // Update Fragments
    pipeFragments.current.forEach(f => {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += GRAVITY * dt; // Gravity
      f.rotation += f.vRotation * dt;
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

    if (gameStateRef.current !== 'PLAYING') return;

    // Thunder Ready logic - Use Ref for logic, State for UI
    if (chaosRef.current >= CHAOS_LIMIT && !isThunderReadyRef.current) {
      isThunderReadyRef.current = true;
      setIsThunderReady(true);
      playThunderRumble();
      // Force slam state to false to ensure they must tap again
      isSlamming.current = false;
    }

    // Gap logic
    const targetGapY = Math.min(dimensions.current.height - GROUND_HEIGHT - 40, Math.max(40, mousePos.current.y));
    // Normalized lerp for dt: 1 - (1 - lerp)^dt_frames
    // Increased to 0.75 for tight, non-sliding movement
    const lerpFactor = 1 - Math.pow(Math.max(0, 1 - 0.75), dt * 60);
    gapY.current += (targetGapY - gapY.current) * lerpFactor;

    if (isSlamming.current) {
      currentGapSize.current -= SLAM_SPEED * dt;
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
              if (next > highScoreRef.current) {
                highScoreRef.current = next;
                setHighScore(next);
                localStorage.setItem('cocky-birds-high-score', next.toString());
              }

              // Update total smashed ref
              totalSmashedRef.current++;

              if (next % 5 === 0 && next > lastMilestoneRef.current) {
                lastMilestoneRef.current = next;
                createParticles(dimensions.current.width / 2, gapY.current, COLORS.YELLOW, 1, 'TEXT', `${next} POINTS!`);
                
                if (next % 10 === 0) {
                  integrityRef.current = MAX_INTEGRITY;
                  createParticles(dimensions.current.width / 2, gapY.current, COLORS.GREEN, 1, 'TEXT', 'HEALTH REPLENISHED!');
                  playMilestoneSound();
                } else {
                  playPointSound();
                }
                
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
              const birdColor = bird.type === 'SNIPER' ? '#3B82F6' : 
                                bird.type === 'DIVER' ? COLORS.YELLOW : 
                                bird.type === 'TANK' ? '#BC00FF' : '#FF3E00';
              createParticles(bird.x, bird.y, COLORS.CYAN, 12, 'SPARK'); 
              createParticles(bird.x, bird.y, birdColor, 8, 'FEATHER');
            }
          });
        } else {
          // Normal crush check - only if NOT divine
          if (!isDivineRef.current) {
            let hitAny = false;
            birds.current.forEach(bird => {
              const horizontalTolerance = 52 + bird.size * 0.65;
              if (bird.state === 'FLYING' && 
                  bird.x > dimensions.current.width / 2 - horizontalTolerance && 
                  bird.x < dimensions.current.width / 2 + horizontalTolerance) {
                
                // Precise vertical collision based on bird size
                const collisionRange = bird.size * 0.95; // Slightly more balanced hitbox
                if (Math.abs(bird.y - gapY.current) < collisionRange) {
                  hitAny = true;
                  bird.health--;
                  if (bird.health <= 0) {
                    bird.state = 'CRUSHED';
                    
                    scoreRef.current++;
                    const next = scoreRef.current;

                    // Update high score immediately
                    if (next > highScoreRef.current) {
                      highScoreRef.current = next;
                      setHighScore(next);
                      localStorage.setItem('cocky-birds-high-score', next.toString());
                    }

                    // Update total smashed ref
                    totalSmashedRef.current++;

                    if (next % 5 === 0 && next > lastMilestoneRef.current) {
                      lastMilestoneRef.current = next;
                      createParticles(dimensions.current.width / 2, gapY.current, COLORS.YELLOW, 1, 'TEXT', `${next} POINTS!`);
                      
                      if (next % 10 === 0) {
                        integrityRef.current = MAX_INTEGRITY;
                        createParticles(dimensions.current.width / 2, gapY.current, COLORS.GREEN, 1, 'TEXT', 'HEALTH REPLENISHED!');
                        playMilestoneSound();
                      } else {
                        playPointSound();
                      }
                      
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
                    const birdColor = bird.type === 'SNIPER' ? '#3B82F6' : 
                                    bird.type === 'DIVER' ? COLORS.YELLOW : 
                                    bird.type === 'TANK' ? '#BC00FF' : '#FF3E00';
                    createParticles(bird.x, bird.y, birdColor, 20, 'FEATHER');
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
      currentGapSize.current += OPEN_SPEED * dt;
      if (currentGapSize.current >= DEFAULT_GAP_SIZE) {
        currentGapSize.current = DEFAULT_GAP_SIZE;
      }
    }

    // Spawn birds logic using a dedicated timer Ref
    // Slowed down: base interval starts larger, minimum is 40 frames (0.66s), curve is much flatter
    const spawnRateBase = Math.max(40, 120 - Math.floor(scoreRef.current / 5) * 8);
    const spawnInterval = spawnRateBase / 60; // seconds per spawn
    
    spawnTimerRef.current += dt;
    if (spawnTimerRef.current >= spawnInterval) {
      // Reset with random jitter to prevent birds from stacking perfectly
      spawnTimerRef.current = -(Math.random() * 0.3);
      spawnBird();
    }

    birds.current.forEach(bird => {
      // Logic for expressions
      const pipeX = dimensions.current.width / 2;
      const pipeLeft = pipeX - PIPE_WIDTH / 2;
      const pipeRight = pipeX + PIPE_WIDTH / 2;

      if (bird.state === 'FLYING') {
        // Recover speed from stun
        if (bird.vx > bird.baseVx) {
          bird.vx = Math.max(bird.baseVx, bird.vx - 60 * dt);
        } else if (bird.vx < bird.baseVx) {
          bird.vx = Math.min(bird.baseVx, bird.vx + 60 * dt);
        }

        bird.x += bird.vx * dt;
        bird.flapFrame += 12 * dt;

        // Transition expressions
        if (bird.x < pipeLeft - 20) {
          bird.mood = 'MOCKING';
        }
        
        // Flight Path
        const oscTime = frameCount.current * bird.oscSpeed + bird.oscPhase;
        const targetY = bird.baseY + Math.sin(oscTime) * bird.oscAmp;
        
        bird.y = targetY;

        // Calculate vy for squash/stretch (in pixels per second)
        bird.vy = Math.cos(oscTime) * bird.oscAmp * bird.oscSpeed;

        // --- TURBO SOUL EMISSION ---
        if (bird.type === 'DIVER') {
          const particleCount = 1 + Math.floor(Math.abs(bird.vy) * 0.003);
          for (let i = 0; i < particleCount; i++) {
            particles.current.push({
              x: bird.x,
              y: bird.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() * 120 + 60), // Drift right
              vy: (Math.random() - 0.5) * 120,
              life: 1.0,
              color: Math.random() > 0.4 ? '#FF4500' : (Math.random() > 0.5 ? '#FFA500' : '#FFFF00'),
              size: Math.random() * 8 + 4,
              type: 'FIRE_TRAIL'
            });
          }
        }

        const shootRate = bird.type === 'SNIPER' ? 0.8 : 1.6;
        const canShoot = isWarmupActiveRef.current ? (frameCount.current > WARMUP_SECONDS) : true;
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
          const bulletSpeed = bird.type === 'TANK' ? -240 : -600;
          const timeToReach = dx / (-bulletSpeed);
          let bulletVy = (gapY.current - bird.y) * 0.9; // Base fallback

          if (timeToReach > 0) {
            // Aim for the pipes (above or below the gap)
            const pipeTargetOffset = (currentGapSize.current / 2) + 30 + (Math.random() * 40);
            const targetY = gapY.current + (Math.random() > 0.5 ? pipeTargetOffset : -pipeTargetOffset);
            
            bulletVy = (targetY - bird.y) / timeToReach;
            
            if (bird.type === 'SNIPER') {
              // Snipers are very accurate at hitting the pipe edges
              const spread = (Math.random() - 0.5) * 12; 
              bulletVy += spread;
            } else {
              // Other birds have more spread but still target the pipes
              const spread = (Math.random() - 0.5) * 72;
              bulletVy += spread;
            }
          }

          const bulletType = bird.type === 'SNIPER' ? 'ICE' : (bird.type === 'DIVER' ? 'FIRE' : (bird.type === 'TANK' ? 'SLUDGE' : 'NORMAL'));
          
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
          bird.tauntTime = 2.0;
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
        
        bird.x += bird.vx * dt;
        bird.flapFrame += 15 * dt; 
        
        const oscTime = frameCount.current * bird.oscSpeed + bird.oscPhase;
        bird.y = bird.baseY + Math.sin(oscTime) * bird.oscAmp;
        bird.vy = Math.cos(oscTime) * bird.oscAmp * bird.oscSpeed;
        
        if (bird.type === 'DIVER') {
          const particleCount = 1 + Math.floor(Math.abs(bird.vy) * 0.003);
          for (let i = 0; i < particleCount; i++) {
            particles.current.push({
              x: bird.x,
              y: bird.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() * 120 + 60), 
              vy: (Math.random() - 0.5) * 120,
              life: 1.0,
              color: Math.random() > 0.4 ? '#FF4500' : (Math.random() > 0.5 ? '#FFA500' : '#FFFF00'),
              size: Math.random() * 8 + 4,
              type: 'FIRE_TRAIL'
            });
          }
        }

        if (bird.tauntTime > 0) bird.tauntTime -= dt;
      }
    });

    // Update bullets
    bullets.current.forEach(bullet => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

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
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'FIRE_TRAIL') {
        p.vy -= 540 * dt; // Fire drifts UP
        p.vx *= Math.pow(0.3, dt); // Slow down drift
        p.size *= Math.pow(0.1, dt); // Shrink fire
      } else if (p.type === 'MUD_SPLAT') {
        p.vy = Math.min(120, p.vy + 360 * dt); // Slow slide down
        p.vx *= Math.pow(0.0001, dt); // Stop horizontal movement fast
        p.size *= Math.pow(0.5, dt); 
      } else if (p.type !== 'TEXT') {
        p.vy += 1440 * dt;
      }
      p.life -= (p.type === 'TEXT' ? 0.6 : 1.5) * dt;
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
    if (totalBirdsSmashedRef.current !== totalSmashedRef.current) {
        totalBirdsSmashedRef.current = totalSmashedRef.current;
        setTotalBirdsSmashed(totalSmashedRef.current);
        localStorage.setItem('cocky-birds-total-smashed', totalSmashedRef.current.toString());
    }
  }, [spawnBird]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensions.current;
    ctx.clearRect(0, 0, width, height);

    // Background - Planetary Atmosphere
    const isPowerSurge = isSlamming.current && Math.random() > 0.7;
    const currentPlanet = PLANETS[currentPlanetIndex];
    const planetImage = planetImagesRef.current[currentPlanet.id];
    
    if (isPowerSurge) {
      ctx.fillStyle = COLORS.WHITE;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.save();
      // Draw a base color fill first
      ctx.fillStyle = currentPlanet.primaryColor + '22'; // Very subtle tint
      ctx.fillRect(0, 0, width, height);

      if (planetImage) {
        // Draw the planet background image
        // We want to fill the background while maintaining aspect ratio (cover)
        const imgAspect = planetImage.width / planetImage.height;
        const canvasAspect = width / height;
        let drawW, drawH, drawX, drawY;

        if (canvasAspect > imgAspect) {
          drawW = width;
          drawH = width / imgAspect;
          drawX = 0;
          drawY = (height - drawH) / 2;
        } else {
          drawH = height;
          drawW = height * imgAspect;
          drawX = (width - drawW) / 2;
          drawY = 0;
        }
        ctx.drawImage(planetImage, drawX, drawY, drawW, drawH);
      } else {
        // Fallback to gradient if image not loaded
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#000000');
        bgGradient.addColorStop(0.5, currentPlanet.primaryColor);
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }
    
    // Draw Scanning Line
    const scanY = (frameCount.current * 90) % height;
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
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation || 0) + frameCount.current * 0.1);
        ctx.globalAlpha = p.life;
        
        // Use the color assigned at creation to pick the asset
        const asset = p.color === '#3B82F6' ? featherImagesRef.current.blue : featherImagesRef.current.yellow;
        
        if (asset) {
          const drawSize = p.size * 8; 
          ctx.drawImage(asset, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5);
          ctx.quadraticCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.2, p.size * 1.5);
          ctx.lineTo(-p.size * 0.2, p.size * 1.5);
          ctx.quadraticCurveTo(-p.size * 0.8, -p.size * 0.5, 0, -p.size * 1.5);
          ctx.fill();
        }
        ctx.restore();
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
        ctx.scale(3.2, 3.2); // THE MEGA CHUNK
        
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

      const isPepperZone = scoreRef.current >= 50;
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
      const pipeImg = birdImagesRef.current['PIPE'];

      if (pipeImg) {
        // Draw top pipe - flip vertically so cap is at the bottom
        ctx.save();
        ctx.translate(pipeX + PIPE_WIDTH / 2, topPipeHeight / 2);
        ctx.scale(1, -1);
        ctx.drawImage(
          pipeImg, 
          -PIPE_WIDTH / 2, 
          -topPipeHeight / 2 - 20, // Add some overflow for safety
          PIPE_WIDTH, 
          topPipeHeight + 20
        );
        ctx.restore();
      } else {
        ctx.fillRect(pipeX, -20, PIPE_WIDTH, topPipeHeight + 20);
        ctx.strokeRect(pipeX, -20, PIPE_WIDTH, topPipeHeight + 20);
      }
      
      // Bottom Pipe
      const bottomPipeY = gapY.current + currentGapSize.current / 2 + pipeYOffset;
      const bottomPipeHeight = height - bottomPipeY - GROUND_HEIGHT;
      
      if (pipeImg) {
        ctx.drawImage(
          pipeImg,
          pipeX,
          bottomPipeY,
          PIPE_WIDTH,
          bottomPipeHeight + 20
        );
      } else {
        ctx.fillRect(pipeX, bottomPipeY, PIPE_WIDTH, bottomPipeHeight + 20);
        ctx.strokeRect(pipeX, bottomPipeY, PIPE_WIDTH, bottomPipeHeight + 20);
      }
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
        drawPipeLightning(bottomPipeY, height - GROUND_HEIGHT);
        ctx.restore();
      }

    }

    // Draw Ground
    const groundX = (frameCount.current * 3) % width;
    ctx.save();
    
    const groundY = height - GROUND_HEIGHT;

    const fgImg = planetForegroundImagesRef.current[currentPlanet.id];
    if (fgImg) {
        // Draw planet specific foreground asset
        const drawHeight = 120; 
        const drawY = height - drawHeight;
        
        // Loop the image across the width with horizontal scroll
        const imgAspect = fgImg.width / fgImg.height;
        const drawWidth = drawHeight * imgAspect;
        const scrollX = (frameCount.current * 180) % drawWidth; 

        for (let x = -drawWidth; x < width + drawWidth; x += drawWidth) {
          ctx.drawImage(fgImg, x - scrollX, drawY, drawWidth, drawHeight);
        }
    } else {
        // Bottom Ground Base
        ctx.fillStyle = '#0a0a0c'; // Matches planetary shadows
        ctx.fillRect(0, groundY, width, GROUND_HEIGHT);
        
        // Top Edge of Ground
        ctx.fillStyle = '#1a1a24';
        ctx.fillRect(0, groundY, width, 4);
        
        // Decorative scrolling patterns for speed feeling
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = -width; i < width * 2; i += 60) {
          const lineX = i - groundX;
          if (lineX > -20 && lineX < width + 20) {
            ctx.beginPath();
            ctx.moveTo(lineX, groundY);
            ctx.lineTo(lineX - 40, height);
            ctx.stroke();
          }
        }
    }

    // Heavy Brutalist Label for Ground (On top of texture)
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'black 120px italic font-display';
    ctx.textAlign = 'center';
    ctx.fillText('CRUSH ZONE', width/2, height - GROUND_HEIGHT/3);
    ctx.restore();

    ctx.restore();

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
  }, [gameState, isThunderReady, currentPlanetIndex]); // Add currentPlanetIndex to dependencies

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      animationFrameId.current = requestAnimationFrame(loop);
      return;
    }

    const dt = Math.min(0.1, Math.max(0, (time - lastTimeRef.current) / 1000));
    lastTimeRef.current = time;
    
    if (Number.isNaN(dt)) {
        animationFrameId.current = requestAnimationFrame(loop);
        return;
    }

    // Handle Audio Fading in Game Loop
    const menuGain = menuGainNodeRef.current;
    const playGain = playGainNodeRef.current;
    if (menuGain && playGain) {
      const isPlaying = gameStateRef.current === 'PLAYING';
      const menuTarget = isPlaying ? 0 : (gameStateRef.current === 'GAME_OVER' ? 0.7 : 0.3);
      const playTarget = isPlaying ? 0.01 : 0;

      // Fade Menu
      const mCurrent = menuGain.gain.value;
      const mDiff = menuTarget - mCurrent;
      if (Math.abs(mDiff) < 0.005) {
        menuGain.gain.value = menuTarget;
      } else {
        menuGain.gain.value = Math.max(0, Math.min(1, mCurrent + (mDiff * 3 * dt)));
      }

      // Fade Play
      const pCurrent = playGain.gain.value;
      const pDiff = playTarget - pCurrent;
      if (Math.abs(pDiff) < 0.005) {
        playGain.gain.value = playTarget;
      } else {
        playGain.gain.value = Math.max(0, Math.min(1, pCurrent + (pDiff * 3 * dt)));
      }
    }

    if (ctx) {
      update(dt);
      draw(ctx);
    }
    animationFrameId.current = requestAnimationFrame(loop);
  }, [update, draw]); 

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
    <div className="fixed inset-0 bg-[#070707] flex items-center justify-center p-0 md:p-4 selection:bg-[#FFF000] selection:text-black">
      <div 
        className={`relative w-full h-full md:aspect-[600/1300] md:h-auto md:max-h-[95vh] md:max-w-[440px] md:rounded-[2rem] md:border-8 md:border-[#1a1a1a] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden font-sans touch-none ${isShaking ? 'shake' : ''}`}
        onPointerDown={handleInteraction}
        onPointerMove={handleMove}
        style={{ background: '#000' }}
      >


      {/* Global Sector Selection (Top Right) */}
      <AnimatePresence>
        {(gameState === 'START' || gameState === 'GAME_OVER') && !isPlanetSelectorOpen && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="absolute top-4 right-4 z-[400] flex flex-col items-center gap-1 pointer-events-auto"
          >
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation(); // Avoid triggering game interactions
                setIsPlanetSelectorOpen(true);
                markAllUnlockedAsSeen();
              }}
              className="relative group"
            >
              <div className="w-14 h-14 md:w-20 md:h-20 drop-shadow-[4px_4px_0px_#000]">
                <img 
                  src="https://i.ibb.co/n8rnRQCd/map.png" 
                  alt="Map" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                {hasNewUnseenPlanets && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 md:w-6 md:h-6 bg-red-600 rounded-full border-2 border-black z-10"
                  />
                )}
              </div>
              <div className="mt-2 text-[#FFF000] text-[9px] md:text-xs font-black uppercase tracking-[0.2em] drop-shadow-[2px_2px_0px_#000]">
                WORLDS
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Birds Characters Button (Top Left) */}
      <AnimatePresence>
        {(gameState === 'START' || gameState === 'GAME_OVER') && !isPlanetSelectorOpen && !isBirdsCharactersOpen && (
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="absolute top-4 left-4 z-[400] flex flex-col items-center gap-1 pointer-events-auto"
          >
            <motion.button
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsBirdsCharactersOpen(true);
                setCurrentCharacterIndex(0);
              }}
              className="relative group"
            >
              <div className="w-16 h-16 md:w-24 md:h-24 drop-shadow-[4px_4px_0px_#000]">
                <img 
                  src="https://i.ibb.co/5gLtCnP6/birds-charactersicon.png" 
                  alt="Birds" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-0 text-[#FFF000] text-[10px] md:text-sm font-black uppercase tracking-[0.2em] drop-shadow-[2px_2px_0px_#000]">
                BIRDS
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
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
            transition={{ duration: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <div className="p-4 md:p-12 flex flex-col items-center max-w-[240px] md:max-w-sm w-full relative">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-20 h-20 md:w-32 md:h-32 mb-2"
              >
                <img 
                  src="https://i.ibb.co/9922hyC5/logo.png" 
                  alt="Bird Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" 
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              <motion.div 
                animate={{ rotate: [-2, 2, -2], scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="w-full mb-4 px-8"
              >
                <img 
                  src="https://i.ibb.co/N6dft7mM/cocky-birdtext.png" 
                  alt="COCKY BIRDS" 
                  className="w-full h-auto drop-shadow-[0_10px_20px_rgba(0,240,255,0.3)]" 
                  referrerPolicy="no-referrer" 
                />
              </motion.div>
              <p 
                style={{ boxShadow: 'none' }}
                className="bent-button bg-black text-white px-4 py-1 font-black mb-4 md:mb-6 uppercase tracking-[0.3em] text-[8px] md:text-xs"
              >
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
                className="bent-button w-full py-3 md:py-5 text-xl md:text-3xl font-black text-black flex items-center justify-center gap-3 md:gap-4 bg-[#00FF5E]"
              >
                <Play fill="black" size={24} />
                <span className="italic font-display tracking-tight uppercase">
                  CRUSH 'EM!
                </span>
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
                className="mb-4 bg-yellow-400 border-4 border-black p-3 shadow-[4px_4px_0px_#000] -rotate-2 max-w-[240px] md:max-w-[280px] w-full relative"
              >
                <button 
                  onClick={() => {
                    setShowShareBanner(false);
                    setHasSeenShareBanner(true);
                    localStorage.setItem('cocky-birds-share-banner-seen', 'true');
                  }}
                  className="absolute -top-3 -right-3 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center font-black border-2 border-white text-xs"
                >
                  X
                </button>
                <h3 className="text-sm md:text-lg font-black text-black uppercase leading-none mb-1">YOU'RE GETTING GOOD!</h3>
                <p className="text-black font-bold text-[10px] md:text-xs mb-3">Share your best score of {highScore} and see if your friends can beat it! 🐦🕶️</p>
                <button 
                  onClick={() => {
                    handleShare();
                    setShowShareBanner(false);
                    setHasSeenShareBanner(true);
                    localStorage.setItem('cocky-birds-share-banner-seen', 'true');
                  }}
                  className="w-full bg-black text-white py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors border-2 border-black"
                >
                  SHARE NOW
                </button>
              </motion.div>
            )}

            <div className="bent-button bg-[#FF3E00] p-4 md:p-8 w-full max-w-[220px] md:max-w-[320px] text-center relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-black opacity-30" />
              
              <h2 className="text-3xl md:text-5xl font-black text-white mb-2 md:mb-6 italic font-display leading-none drop-shadow-[4px_4px_0px_#000]">
                PIPES<br/>BUSTED!
              </h2>

              <div className="space-y-2 md:space-y-4 mb-4 md:mb-8">
                <div className="bg-white border-2 md:border-4 border-black p-2 md:p-4 shadow-[4px_4px_0px_#000] md:shadow-[8px_8px_0px_#000]">
                  <p className="text-black/40 font-black uppercase text-[7px] md:text-xs tracking-widest mb-0.5">Total Squashed</p>
                  <span className="text-3xl md:text-5xl font-black text-black italic font-display">{score}</span>
                </div>
                <div className="bg-black text-white p-2 md:p-3 border-2 md:border-4 border-white">
                  <p className="font-black uppercase text-[7px] md:text-xs tracking-widest">Best Record: {highScore}</p>
                </div>
                <div className="bg-white/10 p-2 border border-white/20">
                  <p className="text-[6px] md:text-[8px] font-black uppercase text-white/60">Total Smashed (Lifetime)</p>
                  <p className="text-xs md:text-lg font-black text-white italic">{totalBirdsSmashed}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="bent-button w-full py-2 md:py-4 text-xs md:text-xl font-black text-black flex items-center justify-center gap-2 md:gap-3 bg-[#A855F7]"
                >
                  <Share2 size={18} md:size={28} strokeWidth={3} />
                  <span className="uppercase italic font-display">SHARE SCORE</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    startAudio();
                    initGame();
                    setGameState('PLAYING');
                  }}
                  className="bent-button w-full py-2 md:py-5 text-lg md:text-2xl font-black text-black flex items-center justify-center gap-3 md:gap-5 bg-[#FF3E00]"
                >
                  <RotateCcw size={18} md:size={28} strokeWidth={3} />
                  <span className="italic font-display tracking-tight uppercase">
                    RETRY!
                  </span>
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
      {/* Birds Characters Showcase Popup */}
      <AnimatePresence>
        {isBirdsCharactersOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <div className="relative w-full h-full flex flex-col items-center justify-center max-w-md mx-auto">
              <button 
                onClick={() => setIsBirdsCharactersOpen(false)}
                className="absolute top-4 right-4 z-50 w-12 h-12 bg-white text-black font-black text-2xl flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_#000] hover:bg-yellow-400 transition-colors"
                title="Close"
              >
                X
              </button>

              <div className="relative h-[60%] w-full flex items-center justify-center overflow-visible">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={CHARACTER_INFO[currentCharacterIndex].id}
                    initial={{ y: 500, rotate: 20, scale: 0.5 }}
                    animate={{ y: 0, rotate: 0, scale: 1.0 }}
                    exit={{ y: 500, rotate: -20, scale: 0.5 }}
                    transition={{ 
                      type: "spring", 
                      damping: 12, 
                      stiffness: 100,
                      duration: 0.8
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 w-full max-w-5xl px-6 min-h-[300px] md:min-h-[400px] relative">
                      <motion.div
                        layout
                        initial={false}
                        animate={{ 
                          scale: showBirdTooltip ? 0.6 : 1.0,
                          y: showBirdTooltip ? (window.innerWidth < 768 ? -10 : 0) : 0
                        }}
                        transition={{ 
                          duration: 0.8, 
                          type: "spring",
                          damping: 15
                        }}
                        className="w-36 h-36 md:w-64 md:h-64 relative z-10 shrink-0"
                      >
                        <motion.img 
                          animate={{ y: [0, -15, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          src={CHARACTER_INFO[currentCharacterIndex].img} 
                          alt="Bird"
                          className="w-full h-full object-contain filter drop-shadow-[0_20px_20px_rgba(255,240,0,0.4)]"
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>

                      <AnimatePresence mode="wait">
                        {showBirdTooltip && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: window.innerWidth < 768 ? 0 : 40, y: window.innerWidth < 768 ? 40 : 0 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: window.innerWidth < 768 ? 0 : 40, y: window.innerWidth < 768 ? 40 : 0 }}
                            transition={{ 
                              type: "spring", 
                              damping: 20,
                              stiffness: 100
                            }}
                            className="w-full md:w-auto md:max-w-md bg-white border-4 md:border-6 border-black shadow-[6px_6px_0px_#000] md:shadow-[10px_10px_0px_#000] p-4 md:p-8 z-[600] relative"
                          >
                            <p className="text-black font-black text-base md:text-xl lg:text-2xl leading-tight italic uppercase tracking-tighter">
                              {CHARACTER_INFO[currentCharacterIndex].description}
                            </p>
                            {/* Responsive Tail */}
                            <div className="absolute 
                              top-[-16px] left-1/2 -translate-x-1/2 rotate-[135deg] 
                              md:top-1/2 md:-left-6 md:-translate-y-1/2 md:rotate-45
                              w-8 h-8 md:w-16 md:h-16 bg-white 
                              border-l-4 md:border-l-8 border-b-4 md:border-b-8 border-black z-[-1]" 
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: 0.3 }}
                      className="w-full max-w-[200px] md:max-w-[260px]"
                    >
                      <img 
                        src={CHARACTER_INFO[currentCharacterIndex].text} 
                        alt="Bird Name"
                        className="w-full h-auto filter drop-shadow-[4px_4px_0px_#000]"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="absolute bottom-12 flex gap-4">
                {CHARACTER_INFO.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setCurrentCharacterIndex(idx);
                      setShowBirdTooltip(false);
                    }}
                    className={`w-3 h-3 rounded-full border-2 border-white transition-all duration-300 ${idx === currentCharacterIndex ? 'bg-yellow-400 w-8' : 'bg-transparent hover:bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Planet Selector Popup */}
      <AnimatePresence>
        {isPlanetSelectorOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="brutalist-card bg-white p-4 md:p-6 w-full max-w-[280px] md:max-w-sm relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl md:text-4xl font-black text-black italic leading-none">SELECT PLANET</h3>
                  <p className="text-[10px] md:text-xs font-black text-black/40 uppercase tracking-widest mt-1">SWIPE TO EXPLORE</p>
                </div>
                <button 
                  onClick={() => setIsPlanetSelectorOpen(false)}
                  className="w-8 h-8 md:w-10 md:h-10 bg-black text-white flex items-center justify-center font-black border-2 border-black hover:bg-zinc-800 transition-colors"
                >
                  X
                </button>
              </div>

              {/* Swipeable Carousel */}
              <div className="relative h-[380px] md:h-[480px] overflow-hidden mb-6 group">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div 
                    key={PLANETS[previewPlanetIndex].id}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragStart={stopAutoCycle}
                    onDragEnd={(_, info) => {
                      startAutoCycle();
                      if (info.offset.x > 50) {
                        const next = (previewPlanetIndex - 1 + PLANETS.length) % PLANETS.length;
                        setPreviewPlanetIndex(next);
                      } else if (info.offset.x < -50) {
                        const next = (previewPlanetIndex + 1) % PLANETS.length;
                        setPreviewPlanetIndex(next);
                      }
                    }}
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="absolute inset-0 flex flex-col cursor-grab active:cursor-grabbing"
                  >
                    <div className="relative flex-1 bg-black border-4 border-black overflow-hidden group select-none">
                      <img 
                        src={PLANETS[previewPlanetIndex].url}
                        alt={PLANETS[previewPlanetIndex].name}
                        className={`w-full h-full object-cover transition-all duration-500 pointer-events-none ${highScore < PLANETS[previewPlanetIndex].unlockScore ? 'grayscale blur-sm opacity-50' : 'grayscale-[0.5] group-hover:grayscale-0'}`}
                        referrerPolicy="no-referrer"
                      />
                      {highScore < PLANETS[previewPlanetIndex].unlockScore && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                          <div className="w-12 h-12 md:w-16 md:h-16 mb-4">
                            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white drop-shadow-lg" stroke="currentColor" strokeWidth="3">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                          <span className="text-white font-black text-xs md:text-sm uppercase tracking-tighter bg-black px-3 py-1 border-2 border-white">
                            UNLOCKS AT {PLANETS[previewPlanetIndex].unlockScore} POINTS
                          </span>
                        </div>
                      )}
                      <div 
                        className="absolute inset-0 opacity-40 mix-blend-overlay"
                        style={{ backgroundColor: PLANETS[previewPlanetIndex].primaryColor }}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black to-transparent">
                         <span className="text-white font-black text-xl md:text-3xl italic tracking-tighter">
                           {PLANETS[previewPlanetIndex].name}
                         </span>
                      </div>
                    </div>
                    <p className="mt-3 text-[10px] md:text-sm font-black text-black/60 uppercase text-center italic">
                      {PLANETS[previewPlanetIndex].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
                
                {/* Navigation Arrows */}
                <div className="absolute inset-y-0 left-0 flex items-center px-2">
                  <button 
                    onClick={() => {
                      stopAutoCycle();
                      const next = (previewPlanetIndex - 1 + PLANETS.length) % PLANETS.length;
                      setPreviewPlanetIndex(next);
                      startAutoCycle();
                    }}
                    className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-white text-white hover:text-black border-2 border-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    ←
                  </button>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center px-2">
                  <button 
                    onClick={() => {
                      stopAutoCycle();
                      const next = (previewPlanetIndex + 1) % PLANETS.length;
                      setPreviewPlanetIndex(next);
                      startAutoCycle();
                    }}
                    className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-white text-white hover:text-black border-2 border-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={highScore >= PLANETS[previewPlanetIndex].unlockScore ? { scale: 1.02 } : {}}
                whileTap={highScore >= PLANETS[previewPlanetIndex].unlockScore ? { scale: 0.98 } : {}}
                disabled={highScore < PLANETS[previewPlanetIndex].unlockScore}
                onClick={() => {
                  setCurrentPlanetIndex(previewPlanetIndex);
                  localStorage.setItem('cocky-birds-current-planet', previewPlanetIndex.toString());
                  setIsPlanetSelectorOpen(false);
                }}
                className={`w-full py-4 md:py-6 font-black text-xl md:text-3xl italic tracking-tighter border-4 border-black transition-all ${
                  highScore < PLANETS[previewPlanetIndex].unlockScore 
                    ? 'bg-zinc-400 text-zinc-600 cursor-not-allowed border-zinc-500 shadow-[4px_4px_0px_#000]' 
                    : 'bg-[#FF3E00] text-white hover:bg-black hover:text-white shadow-[8px_8px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1'
                }`}
              >
                {highScore < PLANETS[previewPlanetIndex].unlockScore ? 'LOCKED' : 'TOUCHDOWN!'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
