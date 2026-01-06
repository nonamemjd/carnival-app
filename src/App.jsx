import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

// ============================================================================
// FIREBASE CONFIG
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCCwieDiV3LXvFHZpET8cngPNHAKx-PXak",
  authDomain: "carnival-app-4fd58.firebaseapp.com",
  projectId: "carnival-app-4fd58",
  storageBucket: "carnival-app-4fd58.firebasestorage.app",
  messagingSenderId: "980978622844",
  appId: "1:980978622844:web:8e600ebdcabaf1599e04f9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================================
// AUTH CONTEXT
// ============================================================================

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

// ============================================================================
// DESIGN SYSTEM
// ============================================================================

const COLORS = {
  bg: '#0a0a0f',
  bgCard: '#12121a',
  bgLight: '#1a1a25',
  border: '#252530',
  text: '#ffffff',
  textMuted: '#888899',
  textDim: '#555566',
  primary: '#00ffff',
  primaryDark: '#00aaaa',
  success: '#00ff88',
  warning: '#ffaa00',
  danger: '#ff4455',
  gold: '#ffd700',
};

const GAMES = {
  WHACK_A_MOLE: 'whack',
  TARGET_SHOOTER: 'target',
  BALLOON_POP: 'balloon',
  MEMORY_PATH: 'memory',
  TURBO_RACE: 'race',
};

const ENTRY_FEE = 1;
const PRIZE_POOL = 20;

const GAME_INFO = {
  [GAMES.WHACK_A_MOLE]: { name: 'Whack-a-Mole', icon: '🔨', color: '#ff6b6b' },
  [GAMES.TARGET_SHOOTER]: { name: 'Target Shooter', icon: '🎯', color: '#4ecdc4' },
  [GAMES.BALLOON_POP]: { name: 'Orb Burst', icon: '🔮', color: '#a855f7' },
  [GAMES.MEMORY_PATH]: { name: 'Memory Path', icon: '🧠', color: '#3b82f6' },
  [GAMES.TURBO_RACE]: { name: 'Turbo Race', icon: '🏎️', color: '#f59e0b' },
};

const TUTORIALS = {
  [GAMES.WHACK_A_MOLE]: {
    title: 'Whack-a-Mole',
    icon: '🔨',
    instruction: 'Tap moles when they appear',
    tips: ['⭐ Golden moles = 5x points', '🔥 Build streaks for multipliers', '⚡ Be fast but accurate'],
  },
  [GAMES.TARGET_SHOOTER]: {
    title: 'Target Shooter',
    icon: '🎯',
    instruction: 'Predict where the target will stop',
    tips: ['👀 Watch the movement pattern', '⚡ Lock in early for bonus points', '⭐ Golden rounds = 2.5x points'],
  },
  [GAMES.BALLOON_POP]: {
    title: 'Orb Burst',
    icon: '🔮',
    instruction: 'Pop orbs in sequence: 1 → 2 → 3 → 4 → 5',
    tips: ['💀 Avoid skulls (-100 pts)', '⭐ Stars give streak shield', '🔥 Streaks boost your multiplier'],
  },
  [GAMES.MEMORY_PATH]: {
    title: 'Memory Path',
    icon: '🧠',
    instruction: 'Watch the path, then repeat it',
    tips: ['⭐ Golden tiles = 5x points', '⚡ Complete fast for speed bonus', '🧠 Paths get longer over time'],
  },
  [GAMES.TURBO_RACE]: {
    title: 'Turbo Race',
    icon: '🏎️',
    instruction: 'Tap BOOST when it appears',
    tips: ['⚡ First 300ms = PERFECT boost', '🔥 Build streaks for 3x speed', '⚠️ Too early = penalty'],
  },
};

const QUALIFYING_GAMES = [GAMES.WHACK_A_MOLE, GAMES.TARGET_SHOOTER, GAMES.BALLOON_POP, GAMES.MEMORY_PATH];

// ============================================================================
// SEEDED RANDOM
// ============================================================================

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }
  
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }
  
  shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function Button({ children, onClick, variant = 'primary', size = 'md', disabled, style }) {
  const baseStyle = {
    fontWeight: 600,
    border: 'none',
    borderRadius: size === 'lg' ? 12 : 8,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
  };
  
  const sizes = {
    sm: { padding: '8px 16px', fontSize: 13 },
    md: { padding: '12px 24px', fontSize: 15 },
    lg: { padding: '16px 36px', fontSize: 17 },
  };
  
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
      color: '#000',
      boxShadow: `0 4px 20px ${COLORS.primary}33`,
    },
    secondary: {
      background: 'transparent',
      color: COLORS.textMuted,
      border: `1px solid ${COLORS.border}`,
    },
    danger: {
      background: COLORS.danger,
      color: '#fff',
    },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyle, ...sizes[size], ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: COLORS.bgCard,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Header({ title, onBack, right }) {
  return (
    <header style={{
      padding: '14px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.textMuted,
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ←
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: COLORS.text }}>
          {title}
        </h1>
      </div>
      {right}
    </header>
  );
}

function StatBox({ label, value, color = COLORS.text }) {
  return (
    <div style={{
      background: COLORS.bgLight,
      borderRadius: 8,
      padding: '8px 14px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, color: COLORS.textDim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ============================================================================
// GAME: WHACK-A-MOLE (enhanced with golden moles, combos, effects)
// ============================================================================

function WhackAMoleGame({ seed, onComplete }) {
  const GAME_DURATION = 45000;
  const GRID_SIZE = 9;
  
  const [gameState, setGameState] = useState('countdown');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [moles, setMoles] = useState(Array(GRID_SIZE).fill(null));
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [screenShake, setScreenShake] = useState(false);
  const [floatingText, setFloatingText] = useState([]);
  const [lastWhack, setLastWhack] = useState(-1);
  const [comboTimer, setComboTimer] = useState(0);
  
  const rng = useRef(new SeededRandom(seed));
  const startTime = useRef(null);
  const moleTimers = useRef([]);
  const floatId = useRef(0);
  
  const addFloatingText = (index, text, color) => {
    const id = floatId.current++;
    const row = Math.floor(index / 3);
    const col = index % 3;
    setFloatingText(prev => [...prev, { id, row, col, text, color }]);
    setTimeout(() => setFloatingText(prev => prev.filter(f => f.id !== id)), 800);
  };
  
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
  };
  
  useEffect(() => {
    if (streak >= 15) setMultiplier(4);
    else if (streak >= 10) setMultiplier(3);
    else if (streak >= 5) setMultiplier(2);
    else setMultiplier(1);
  }, [streak]);

  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(t);
    }
    startTime.current = Date.now();
    setGameState('playing');
  }, [gameState, countdown]);
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, Math.ceil((GAME_DURATION - elapsed) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setGameState('ended');
        moleTimers.current.forEach(clearTimeout);
      }
      
      setComboTimer(prev => Math.max(0, prev - 100));
    }, 100);
    
    return () => clearInterval(timer);
  }, [gameState]);
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const spawnMole = () => {
      const elapsed = Date.now() - startTime.current;
      if (elapsed >= GAME_DURATION) return;
      
      const emptySpots = moles.map((m, i) => m === null ? i : -1).filter(i => i >= 0);
      if (emptySpots.length > 0) {
        const spot = rng.current.pick(emptySpots);
        const rand = rng.current.next();
        
        let type = 'normal';
        if (rand < 0.05) type = 'golden';
        else if (rand < 0.12) type = 'speed';
        else if (rand < 0.25) type = 'bomb';
        
        const duration = type === 'speed' ? rng.current.nextInt(400, 600) :
                        type === 'golden' ? rng.current.nextInt(600, 900) :
                        rng.current.nextInt(800, 1400);
        
        setMoles(prev => {
          const next = [...prev];
          next[spot] = { type, spawnTime: Date.now() };
          return next;
        });
        
        const hideTimer = setTimeout(() => {
          setMoles(prev => {
            const next = [...prev];
            if (next[spot]) {
              if (next[spot].type !== 'bomb') {
                setStreak(0);
              }
              next[spot] = null;
            }
            return next;
          });
        }, duration);
        
        moleTimers.current.push(hideTimer);
      }
      
      const baseInterval = elapsed < 15000 ? 700 : elapsed < 30000 ? 550 : 400;
      const nextSpawn = rng.current.nextInt(baseInterval - 150, baseInterval + 150);
      const spawnTimer = setTimeout(spawnMole, nextSpawn);
      moleTimers.current.push(spawnTimer);
    };
    
    spawnMole();
    
    return () => moleTimers.current.forEach(clearTimeout);
  }, [gameState]);
  
  useEffect(() => {
    if (gameState === 'ended') {
      setTimeout(() => onComplete(score), 1500);
    }
  }, [gameState, score, onComplete]);
  
  const handleWhack = (index) => {
    if (gameState !== 'playing' || !moles[index]) return;
    
    const mole = moles[index];
    setLastWhack(index);
    setTimeout(() => setLastWhack(-1), 150);
    
    setMoles(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    
    if (mole.type === 'bomb') {
      const penalty = 150;
      setScore(s => Math.max(0, s - penalty));
      setStreak(0);
      triggerShake();
      addFloatingText(index, `-${penalty}`, '#ff4444');
    } else if (mole.type === 'golden') {
      const points = 300 * multiplier;
      setScore(s => s + points);
      setStreak(s => s + 1);
      addFloatingText(index, `+${points} ⭐`, '#ffd700');
      if (points >= 600) triggerShake();
    } else if (mole.type === 'speed') {
      const points = 150 * multiplier;
      setScore(s => s + points);
      setStreak(s => s + 1);
      addFloatingText(index, `+${points} ⚡`, '#00ffff');
    } else {
      const comboBonus = comboTimer > 0 ? 25 : 0;
      const points = (100 + comboBonus) * multiplier;
      setScore(s => s + points);
      setStreak(s => s + 1);
      setComboTimer(100);
      addFloatingText(index, `+${points}`, '#00ff88');
    }
  };
  
  const getMoleStyle = (mole) => {
    if (!mole) return {};
    switch (mole.type) {
      case 'golden':
        return {
          background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
          boxShadow: '0 0 20px #ffd700, 0 0 40px #ffd70050',
          animation: 'goldenPulse 0.4s infinite',
        };
      case 'speed':
        return {
          background: 'linear-gradient(135deg, #00ffff, #0088aa)',
          boxShadow: '0 0 15px #00ffff',
          animation: 'speedPulse 0.2s infinite',
        };
      case 'bomb':
        return {
          background: 'linear-gradient(135deg, #ff4444, #cc0000)',
          boxShadow: '0 0 15px #ff0000',
          animation: 'bombPulse 0.5s infinite',
        };
      default:
        return {
          background: 'linear-gradient(135deg, #8B5A2B, #654321)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        };
    }
  };
  
  const getMoleEmoji = (mole) => {
    if (!mole) return '';
    switch (mole.type) {
      case 'golden': return '👑';
      case 'speed': return '⚡';
      case 'bomb': return '💣';
      default: return '🐹';
    }
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: 16,
      animation: screenShake ? 'shake 0.3s' : 'none',
    }}>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
        @keyframes goldenPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes speedPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.95); } }
        @keyframes bombPulse { 0%, 100% { box-shadow: 0 0 15px #ff0000; } 50% { box-shadow: 0 0 25px #ff0000, 0 0 40px #ff000080; } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-50px) scale(1.4); } }
        @keyframes whackPop { 0% { transform: scale(1); } 50% { transform: scale(0.8); } 100% { transform: scale(1); } }
        @keyframes multiplierPop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
      `}</style>
      
      {gameState === 'countdown' && (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 80, fontWeight: 700, color: countdown === 0 ? COLORS.primary : COLORS.text }}>{countdown || 'GO!'}</div>
        </div>
      )}
      
      {(gameState === 'playing' || gameState === 'ended') && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <StatBox label="TIME" value={timeLeft} color={timeLeft <= 10 ? COLORS.danger : COLORS.text} />
            <StatBox label="SCORE" value={score} color={COLORS.primary} />
            <div style={{
              background: multiplier > 1 ? `linear-gradient(135deg, ${COLORS.gold}, #ff8c00)` : COLORS.bgLight,
              borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              animation: multiplier > 1 ? 'multiplierPop 0.3s' : 'none',
            }}>
              <div style={{ fontSize: 9, color: multiplier > 1 ? '#000' : COLORS.textDim }}>MULTI</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: multiplier > 1 ? '#000' : COLORS.textMuted }}>{multiplier}x</div>
            </div>
          </div>
          
          <div style={{ width: '100%', maxWidth: 280, marginBottom: 10, padding: '4px 12px', background: COLORS.bgCard, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, opacity: streak > 0 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>🔥</span>
            <div style={{ flex: 1, height: 6, background: COLORS.bgLight, borderRadius: 3 }}>
              <div style={{ width: `${Math.min(100, (streak / 15) * 100)}%`, height: '100%', background: streak >= 15 ? COLORS.gold : streak >= 10 ? COLORS.primary : COLORS.success, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: streak > 0 ? COLORS.gold : COLORS.textDim }}>{streak}</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gap: 10, padding: 18, background: COLORS.bgCard, borderRadius: 16, position: 'relative', border: `2px solid ${COLORS.border}` }}>
            {floatingText.map(f => (
              <div key={f.id} style={{ position: 'absolute', left: f.col * 90 + 58, top: f.row * 90 + 40, fontSize: 20, fontWeight: 700, color: f.color, textShadow: `0 0 10px ${f.color}`, animation: 'floatUp 0.8s ease-out forwards', pointerEvents: 'none', zIndex: 100 }}>{f.text}</div>
            ))}
            
            {moles.map((mole, i) => (
              <button key={i} onClick={() => handleWhack(i)} style={{
                width: 80, height: 80, borderRadius: 16, border: 'none',
                background: mole ? undefined : COLORS.bgLight,
                cursor: mole ? 'pointer' : 'default', fontSize: 38,
                transition: 'transform 0.1s',
                transform: lastWhack === i ? 'scale(0.85)' : 'scale(1)',
                animation: lastWhack === i ? 'whackPop 0.15s' : undefined,
                boxShadow: mole ? undefined : 'inset 0 4px 8px rgba(0,0,0,0.4)',
                ...getMoleStyle(mole),
              }}>{getMoleEmoji(mole)}</button>
            ))}
          </div>
          
          <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 11, color: COLORS.textDim }}>
            <span>🐹 100</span>
            <span style={{ color: '#00ffff' }}>⚡ 150</span>
            <span style={{ color: '#ffd700' }}>👑 300</span>
            <span style={{ color: '#ff4444' }}>💣 -150</span>
          </div>
          
          {gameState === 'ended' && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>FINAL SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary }}>{score}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// GAME: TARGET SHOOTER (Skill-based tracking - target moves with physics)
// ============================================================================

function TargetShooterGame({ seed, onComplete }) {
  const GAME_DURATION = 45000;
  const SLOTS = 5;
  const SLOT_WIDTH = 60;
  const TRACK_WIDTH = SLOTS * SLOT_WIDTH;
  
  const [gameState, setGameState] = useState('countdown');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [round, setRound] = useState(0);
  
  const [roundPhase, setRoundPhase] = useState('tracking'); // tracking, locked, reveal
  const [targetX, setTargetX] = useState(150); // Pixel position
  const [targetVelocity, setTargetVelocity] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(-1);
  const [finalSlot, setFinalSlot] = useState(-1);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [floatingText, setFloatingText] = useState([]);
  const [lockBonus, setLockBonus] = useState(0); // Bonus for early lock
  const [isGoldenRound, setIsGoldenRound] = useState(false);
  
  const rng = useRef(new SeededRandom(seed));
  const startTime = useRef(null);
  const roundStartTime = useRef(null);
  const floatId = useRef(0);
  const targetRef = useRef({ x: 150, v: 200, friction: 0.985 });
  
  const addFloatingText = (text, color) => {
    const id = floatId.current++;
    setFloatingText(prev => [...prev, { id, text, color }]);
    setTimeout(() => setFloatingText(prev => prev.filter(f => f.id !== id)), 1000);
  };
  
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
  };
  
  useEffect(() => {
    if (streak >= 7) setMultiplier(4);
    else if (streak >= 5) setMultiplier(3);
    else if (streak >= 3) setMultiplier(2);
    else setMultiplier(1);
  }, [streak]);
  
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(t);
    }
    startTime.current = Date.now();
    startRound();
    setGameState('playing');
  }, [gameState, countdown]);
  
  const startRound = useCallback(() => {
    const newRound = round + 1;
    setRound(newRound);
    setSelectedSlot(-1);
    setFinalSlot(-1);
    setLastResult(null);
    setLockBonus(0);
    setRoundPhase('tracking');
    roundStartTime.current = Date.now();
    
    // 15% chance for golden round
    setIsGoldenRound(rng.current.next() < 0.15);
    
    // Initialize target with deterministic physics based on seed
    const startSlot = rng.current.nextInt(0, SLOTS - 1);
    const startX = startSlot * SLOT_WIDTH + SLOT_WIDTH / 2;
    const direction = rng.current.next() > 0.5 ? 1 : -1;
    const speed = rng.current.nextInt(180, 280);
    
    targetRef.current = {
      x: startX,
      v: speed * direction,
      friction: 0.982 + rng.current.next() * 0.012, // 0.982 - 0.994
    };
    setTargetX(startX);
    setTargetVelocity(speed * direction);
  }, [round]);
  
  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, Math.ceil((GAME_DURATION - elapsed) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) setGameState('ended');
    }, 100);
    return () => clearInterval(timer);
  }, [gameState]);
  
  // Physics simulation
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const simulate = () => {
      const t = targetRef.current;
      
      // Apply friction
      t.v *= t.friction;
      
      // Move target
      t.x += t.v * 0.016;
      
      // Bounce off walls
      if (t.x <= SLOT_WIDTH / 2) {
        t.x = SLOT_WIDTH / 2;
        t.v = Math.abs(t.v) * 0.9;
      } else if (t.x >= TRACK_WIDTH - SLOT_WIDTH / 2) {
        t.x = TRACK_WIDTH - SLOT_WIDTH / 2;
        t.v = -Math.abs(t.v) * 0.9;
      }
      
      setTargetX(t.x);
      setTargetVelocity(t.v);
      
      // Check if target has stopped (velocity very low)
      if (Math.abs(t.v) < 8 && roundPhase === 'tracking') {
        // Auto-timeout - player didn't lock in
        const stoppedSlot = Math.floor(t.x / SLOT_WIDTH);
        setFinalSlot(stoppedSlot);
        setRoundPhase('reveal');
        
        setTimeout(() => {
          setLastResult('timeout');
          setStreak(0);
          setMisses(m => m + 1);
          addFloatingText('TOO SLOW!', COLORS.warning);
          
          setTimeout(() => {
            if (Date.now() - startTime.current < GAME_DURATION) startRound();
          }, 800);
        }, 300);
      } else if (Math.abs(t.v) < 8 && roundPhase === 'locked') {
        // Target stopped after player locked in
        const stoppedSlot = Math.floor(t.x / SLOT_WIDTH);
        setFinalSlot(stoppedSlot);
        setRoundPhase('reveal');
        
        setTimeout(() => {
          if (selectedSlot === stoppedSlot) {
            setLastResult('hit');
            setStreak(s => s + 1);
            setHits(h => h + 1);
            
            let basePoints = 100;
            if (isGoldenRound) basePoints = 250;
            const totalPoints = (basePoints + lockBonus) * multiplier;
            
            setScore(s => s + totalPoints);
            const emoji = isGoldenRound ? ' ⭐' : lockBonus > 30 ? ' ⚡' : '';
            addFloatingText(`+${totalPoints}${emoji}`, isGoldenRound ? COLORS.gold : COLORS.success);
            if (totalPoints >= 300) triggerShake();
          } else {
            setLastResult('miss');
            setStreak(0);
            setMisses(m => m + 1);
            addFloatingText('MISS!', COLORS.danger);
          }
          
          setTimeout(() => {
            if (Date.now() - startTime.current < GAME_DURATION) startRound();
          }, 800);
        }, 300);
      }
    };
    
    const interval = setInterval(simulate, 16);
    return () => clearInterval(interval);
  }, [gameState, roundPhase, selectedSlot, lockBonus, multiplier, isGoldenRound, startRound]);
  
  const handleSlotClick = (slot) => {
    if (gameState !== 'playing' || roundPhase !== 'tracking') return;
    
    setSelectedSlot(slot);
    setRoundPhase('locked');
    
    // Calculate early lock bonus based on remaining velocity
    const speed = Math.abs(targetRef.current.v);
    const bonus = Math.min(50, Math.floor(speed / 4));
    setLockBonus(bonus);
  };
  
  useEffect(() => {
    if (gameState === 'ended') setTimeout(() => onComplete(score), 1500);
  }, [gameState, score, onComplete]);
  
  const getSlotStyle = (index) => {
    const isSelected = selectedSlot === index;
    const isFinal = finalSlot === index;
    
    let bg = COLORS.bgLight;
    let border = `3px solid ${COLORS.border}`;
    let shadow = 'inset 0 4px 8px rgba(0,0,0,0.3)';
    
    if (roundPhase === 'tracking' || roundPhase === 'locked') {
      if (isSelected) {
        bg = `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`;
        border = `3px solid ${COLORS.primary}`;
        shadow = `0 0 20px ${COLORS.primary}`;
      }
    } else if (roundPhase === 'reveal') {
      if (isFinal && isSelected) {
        const color = isGoldenRound ? COLORS.gold : COLORS.success;
        bg = isGoldenRound 
          ? 'linear-gradient(135deg, #ffd700, #ffaa00)' 
          : `linear-gradient(135deg, ${COLORS.success}, #00cc66)`;
        border = `3px solid ${color}`;
        shadow = `0 0 30px ${color}`;
      } else if (isFinal) {
        bg = `linear-gradient(135deg, ${COLORS.warning}, #cc8800)`;
        border = `3px solid ${COLORS.warning}`;
        shadow = `0 0 20px ${COLORS.warning}`;
      } else if (isSelected) {
        bg = `linear-gradient(135deg, ${COLORS.danger}, #cc2233)`;
        border = `3px solid ${COLORS.danger}`;
        shadow = `0 0 20px ${COLORS.danger}`;
      }
    }
    
    return { background: bg, border, boxShadow: shadow };
  };
  
  const currentSlot = Math.floor(targetX / SLOT_WIDTH);
  const speed = Math.abs(targetVelocity);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, animation: screenShake ? 'shake 0.3s' : 'none' }}>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-60px) scale(1.5); } }
        @keyframes multiplierPop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes targetGlow { 0%, 100% { box-shadow: 0 0 15px #ff6600, 0 0 30px #ff660050; } 50% { box-shadow: 0 0 25px #ff6600, 0 0 50px #ff6600; } }
        @keyframes goldenGlow { 0%, 100% { box-shadow: 0 0 20px ${COLORS.gold}, 0 0 40px ${COLORS.gold}50; } 50% { box-shadow: 0 0 35px ${COLORS.gold}, 0 0 60px ${COLORS.gold}; } }
        @keyframes lockPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
      
      {gameState === 'countdown' && (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 80, fontWeight: 700, color: countdown === 0 ? COLORS.primary : COLORS.text }}>{countdown || 'GO!'}</div>
        </div>
      )}
      
      {(gameState === 'playing' || gameState === 'ended') && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <StatBox label="TIME" value={timeLeft} color={timeLeft <= 10 ? COLORS.danger : COLORS.text} />
            <StatBox label="SCORE" value={score} color={COLORS.primary} />
            <div style={{
              background: multiplier > 1 ? `linear-gradient(135deg, ${COLORS.gold}, #ff8c00)` : COLORS.bgLight,
              borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              animation: multiplier > 1 ? 'multiplierPop 0.3s' : 'none',
            }}>
              <div style={{ fontSize: 9, color: multiplier > 1 ? '#000' : COLORS.textDim }}>MULTI</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: multiplier > 1 ? '#000' : COLORS.textMuted }}>{multiplier}x</div>
            </div>
          </div>
          
          <div style={{ width: '100%', maxWidth: 340, marginBottom: 10, padding: '4px 12px', background: COLORS.bgCard, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, opacity: streak > 0 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>🎯</span>
            <div style={{ flex: 1, height: 6, background: COLORS.bgLight, borderRadius: 3 }}>
              <div style={{ width: `${Math.min(100, (streak / 7) * 100)}%`, height: '100%', background: streak >= 7 ? COLORS.gold : streak >= 5 ? COLORS.primary : COLORS.success, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: streak > 0 ? COLORS.gold : COLORS.textDim }}>{streak}</span>
          </div>
          
          {/* Golden round indicator */}
          {isGoldenRound && roundPhase === 'tracking' && (
            <div style={{ marginBottom: 10, padding: '6px 16px', background: `${COLORS.gold}22`, border: `2px solid ${COLORS.gold}`, borderRadius: 20, animation: 'goldenGlow 1s infinite' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>⭐ GOLDEN ROUND ⭐</span>
            </div>
          )}
          
          {/* Status */}
          <div style={{
            marginBottom: 12, padding: '8px 20px', borderRadius: 20, transition: 'all 0.2s',
            background: roundPhase === 'locked' ? `${COLORS.primary}22` : lastResult === 'hit' ? `${COLORS.success}22` : lastResult === 'miss' ? `${COLORS.danger}22` : COLORS.bgCard,
            border: roundPhase === 'locked' ? `2px solid ${COLORS.primary}` : lastResult === 'hit' ? `2px solid ${COLORS.success}` : lastResult === 'miss' ? `2px solid ${COLORS.danger}` : `2px solid transparent`,
            animation: roundPhase === 'locked' ? 'lockPulse 0.5s infinite' : 'none',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: roundPhase === 'locked' ? COLORS.primary : lastResult === 'hit' ? COLORS.success : lastResult === 'miss' ? COLORS.danger : COLORS.text }}>
              {roundPhase === 'tracking' ? '👁️ Track & Predict!' : 
               roundPhase === 'locked' ? `🔒 LOCKED - Slot ${selectedSlot + 1}` :
               lastResult === 'hit' ? '💥 HIT!' : lastResult === 'miss' ? '❌ MISS!' : lastResult === 'timeout' ? '⏰ TOO SLOW!' : ''}
            </span>
          </div>
          
          {/* Floating text */}
          <div style={{ position: 'relative', width: TRACK_WIDTH, height: 40 }}>
            {floatingText.map(f => (
              <div key={f.id} style={{
                position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
                fontSize: 22, fontWeight: 700, color: f.color, textShadow: `0 0 15px ${f.color}`,
                animation: 'floatUp 1s ease-out forwards', pointerEvents: 'none', zIndex: 100,
              }}>{f.text}</div>
            ))}
          </div>
          
          {/* Tracking gallery */}
          <div style={{
            background: 'linear-gradient(180deg, #1a1a25 0%, #0f0f18 100%)',
            borderRadius: 16, padding: '20px 16px', position: 'relative',
            border: isGoldenRound ? `3px solid ${COLORS.gold}50` : `3px solid ${COLORS.border}`,
          }}>
            {/* Speed indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: COLORS.textDim }}>SPEED</span>
              <div style={{ width: 120, height: 6, background: COLORS.bgLight, borderRadius: 3 }}>
                <div style={{
                  width: `${Math.min(100, speed / 2.5)}%`,
                  height: '100%',
                  background: speed > 150 ? COLORS.danger : speed > 80 ? COLORS.warning : COLORS.success,
                  borderRadius: 3,
                  transition: 'width 0.1s',
                }} />
              </div>
              <span style={{ fontSize: 11, color: speed > 80 ? COLORS.warning : COLORS.success, fontWeight: 600 }}>
                {speed > 80 ? 'FAST' : 'SLOW'}
              </span>
            </div>
            
            {/* Track with moving target */}
            <div style={{ position: 'relative', width: TRACK_WIDTH, height: 70, marginBottom: 12 }}>
              {/* Track background */}
              <div style={{
                position: 'absolute', inset: 0,
                background: COLORS.bgCard,
                borderRadius: 8,
                border: `2px solid ${COLORS.border}`,
              }} />
              
              {/* Slot dividers */}
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  left: i * SLOT_WIDTH,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: COLORS.border,
                }} />
              ))}
              
              {/* Moving target */}
              <div style={{
                position: 'absolute',
                left: targetX,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: isGoldenRound 
                  ? 'linear-gradient(135deg, #ffd700, #ff8c00)'
                  : 'linear-gradient(135deg, #ff6600, #cc4400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                animation: isGoldenRound ? 'goldenGlow 0.5s infinite' : 'targetGlow 0.5s infinite',
                transition: 'left 0.016s linear',
              }}>
                {isGoldenRound ? '⭐' : '🎯'}
              </div>
            </div>
            
            {/* Prediction slots */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {Array.from({ length: SLOTS }).map((_, i) => (
                <button key={i} onClick={() => handleSlotClick(i)} disabled={roundPhase !== 'tracking'}
                  style={{
                    width: 54, height: 54, borderRadius: 12,
                    cursor: roundPhase === 'tracking' ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: selectedSlot === i ? '#000' : COLORS.textMuted,
                    ...getSlotStyle(i),
                  }}>
                  {selectedSlot === i ? '🔒' : i + 1}
                </button>
              ))}
            </div>
            
            {/* Early lock bonus hint */}
            {roundPhase === 'tracking' && speed > 100 && (
              <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: COLORS.success }}>
                ⚡ Lock now for +{Math.min(50, Math.floor(speed / 4))} bonus!
              </div>
            )}
          </div>
          
          <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textDim, textAlign: 'center' }}>
            {roundPhase === 'tracking' ? 'Track the target • Lock in your prediction • Earlier = more points!' : ''}
          </div>
          
          {gameState === 'ended' && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>FINAL SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary }}>{score}</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>{hits} hits / {hits + misses} attempts ({Math.round(hits / (hits + misses) * 100) || 0}%)</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// GAME: ORB BURST (with bombs, golden orbs, combos)
// ============================================================================

function BalloonPopGame({ seed, onComplete }) {
  const GAME_DURATION = 45000;
  const ORB_COLORS = [
    { bg: 'linear-gradient(135deg, #ff3366, #ff1144)', glow: '#ff3366', text: '#fff' },
    { bg: 'linear-gradient(135deg, #3366ff, #1144ff)', glow: '#3366ff', text: '#fff' },
    { bg: 'linear-gradient(135deg, #33ff88, #11dd66)', glow: '#33ff88', text: '#000' },
    { bg: 'linear-gradient(135deg, #ffaa00, #ff8800)', glow: '#ffaa00', text: '#000' },
    { bg: 'linear-gradient(135deg, #dd44ff, #bb22dd)', glow: '#dd44ff', text: '#fff' },
  ];
  const BOMB_COLOR = { bg: 'linear-gradient(135deg, #1a1a1a, #000)', glow: '#ff0000', text: '#ff0000' };
  const GOLDEN_COLOR = { bg: 'linear-gradient(135deg, #ffd700, #ffaa00)', glow: '#ffd700', text: '#000' };
  
  const [gameState, setGameState] = useState('countdown');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [orbs, setOrbs] = useState([]);
  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [lastPop, setLastPop] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [comboTimer, setComboTimer] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [floatingText, setFloatingText] = useState([]);
  const [goldenActive, setGoldenActive] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [shieldUsed, setShieldUsed] = useState(false);
  
  const rng = useRef(new SeededRandom(seed));
  const startTime = useRef(null);
  const orbId = useRef(0);
  const floatId = useRef(0);
  
  // Add floating text effect
  const addFloatingText = (x, y, text, color) => {
    const id = floatId.current++;
    setFloatingText(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloatingText(prev => prev.filter(f => f.id !== id)), 800);
  };
  
  // Trigger screen shake
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
  };

  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(t);
    }
    startTime.current = Date.now();
    spawnWave();
    setGameState('playing');
  }, [gameState, countdown]);
  
  const spawnWave = useCallback(() => {
    const nums = [1, 2, 3, 4, 5];
    const shuffled = rng.current.shuffle(nums);
    setSequence(shuffled);
    setCurrentIndex(0);
    
    const newOrbs = shuffled.map((num, i) => ({
      id: orbId.current++,
      number: num,
      type: 'normal',
      x: 15 + (i * 17.5) + rng.current.nextInt(-5, 5),
      y: 108 + i * 8,
      speed: rng.current.nextInt(18, 32),
      colorIndex: num - 1,
    }));
    
    // Add 1-2 bombs
    const bombCount = rng.current.nextInt(1, 2);
    for (let i = 0; i < bombCount; i++) {
      newOrbs.push({
        id: orbId.current++,
        number: '💀',
        type: 'bomb',
        x: rng.current.nextInt(15, 85),
        y: 115 + rng.current.nextInt(0, 20),
        speed: rng.current.nextInt(22, 35),
        colorIndex: -1,
      });
    }
    
    // 20% chance for golden orb
    if (rng.current.next() < 0.2) {
      newOrbs.push({
        id: orbId.current++,
        number: '⭐',
        type: 'golden',
        x: rng.current.nextInt(20, 80),
        y: 120,
        speed: rng.current.nextInt(35, 50), // Faster!
        colorIndex: -2,
      });
    }
    
    setOrbs(prev => [...prev, ...newOrbs]);
  }, []);
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, Math.ceil((GAME_DURATION - elapsed) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) setGameState('ended');
      
      setOrbs(prev => prev.map(o => ({
        ...o,
        y: o.y - o.speed * 0.016,
      })).filter(o => o.y > -10));
      
      // Combo timer decay
      setComboTimer(prev => Math.max(0, prev - 16));
    }, 16);
    
    return () => clearInterval(timer);
  }, [gameState]);
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    const waveTimer = setInterval(spawnWave, 6000);
    return () => clearInterval(waveTimer);
  }, [gameState, spawnWave]);
  
  useEffect(() => {
    if (gameState === 'ended') {
      setTimeout(() => onComplete(score), 1500);
    }
  }, [gameState, score, onComplete]);
  
  // Update multiplier based on streak
  useEffect(() => {
    if (streak >= 20) setMultiplier(4);
    else if (streak >= 10) setMultiplier(3);
    else if (streak >= 5) setMultiplier(2);
    else setMultiplier(1);
  }, [streak]);
  
  const handlePop = (orb) => {
    if (gameState !== 'playing') return;
    
    // BOMB - bad! (unless shielded)
    if (orb.type === 'bomb') {
      if (hasShield) {
        // Shield absorbs the hit!
        setHasShield(false);
        setShieldUsed(true);
        setTimeout(() => setShieldUsed(false), 1000);
        addFloatingText(orb.x, orb.y, '🛡️ BLOCKED!', COLORS.primary);
        setLastPop({ x: orb.x, y: orb.y, color: COLORS.primary });
      } else {
        setScore(s => Math.max(0, s - 100));
        setStreak(0);
        setComboCount(0);
        setComboTimer(0);
        triggerShake();
        addFloatingText(orb.x, orb.y, '-100', '#ff4444');
        setLastPop({ x: orb.x, y: orb.y, color: '#ff0000' });
      }
      setOrbs(prev => prev.filter(o => o.id !== orb.id));
      setTimeout(() => setLastPop(null), 300);
      return;
    }
    
    // GOLDEN - gives streak shield!
    if (orb.type === 'golden') {
      if (!hasShield) {
        setHasShield(true);
        addFloatingText(orb.x, orb.y, '🛡️ SHIELD!', '#ffd700');
      } else {
        // Already have shield, give bonus points instead
        const bonus = 25 * multiplier;
        setScore(s => s + bonus);
        addFloatingText(orb.x, orb.y, `+${bonus}`, '#ffd700');
      }
      setStreak(s => s + 1);
      setLastPop({ x: orb.x, y: orb.y, color: '#ffd700' });
      setGoldenActive(true);
      setTimeout(() => setGoldenActive(false), 500);
      setOrbs(prev => prev.filter(o => o.id !== orb.id));
      setTimeout(() => setLastPop(null), 300);
      return;
    }
    
    // NORMAL orb
    const expected = sequence[currentIndex];
    if (orb.number === expected) {
      // Combo system - fast successive taps
      let comboBonus = 0;
      if (comboTimer > 0) {
        setComboCount(c => c + 1);
        comboBonus = comboCount * 5;
      } else {
        setComboCount(1);
      }
      setComboTimer(100);
      
      const points = (10 + comboBonus) * multiplier;
      setScore(s => s + points);
      setStreak(s => s + 1);
      setCurrentIndex(i => (i + 1) % 5);
      
      addFloatingText(orb.x, orb.y, `+${points}`, ORB_COLORS[orb.colorIndex].glow);
      setLastPop({ x: orb.x, y: orb.y, color: ORB_COLORS[orb.colorIndex].glow });
      setOrbs(prev => prev.filter(o => o.id !== orb.id));
      setTimeout(() => setLastPop(null), 300);
    } else {
      // Wrong orb (unless shielded)
      if (hasShield) {
        setHasShield(false);
        setShieldUsed(true);
        setTimeout(() => setShieldUsed(false), 1000);
        addFloatingText(orb.x, orb.y, '🛡️ SAVED!', COLORS.primary);
      } else {
        setStreak(0);
        setComboCount(0);
        setComboTimer(0);
        addFloatingText(orb.x, orb.y, 'MISS', '#ff4444');
      }
    }
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: 16,
      animation: screenShake ? 'shake 0.3s' : 'none',
    }}>
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes orbPop {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes targetPulse {
          0%, 100% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
          50% { box-shadow: 0 0 30px currentColor, 0 0 60px currentColor; }
        }
        @keyframes bombPulse {
          0%, 100% { box-shadow: 0 0 15px #ff0000, 0 0 30px #ff000050; }
          50% { box-shadow: 0 0 25px #ff0000, 0 0 50px #ff000080; }
        }
        @keyframes goldenPulse {
          0%, 100% { box-shadow: 0 0 20px #ffd700, 0 0 40px #ffd70050; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          50% { box-shadow: 0 0 35px #ffd700, 0 0 60px #ffd700; transform: translate(-50%, -50%) scale(1.1) rotate(5deg); }
        }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(1.3); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        @keyframes multiplierPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes shieldGlow {
          0%, 100% { box-shadow: 0 0 5px ${COLORS.primary}; }
          50% { box-shadow: 0 0 15px ${COLORS.primary}, 0 0 25px ${COLORS.primary}50; }
        }
        @keyframes shieldBreak {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(0.8); opacity: 1; }
        }
      `}</style>
      
      {gameState === 'countdown' && (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 80, fontWeight: 700, color: countdown === 0 ? COLORS.primary : COLORS.text }}>
            {countdown || 'GO!'}
          </div>
        </div>
      )}
      
      {(gameState === 'playing' || gameState === 'ended') && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <StatBox label="TIME" value={timeLeft} color={timeLeft <= 10 ? COLORS.danger : COLORS.text} />
            <StatBox label="SCORE" value={score} color={COLORS.primary} />
            <div style={{
              background: multiplier > 1 ? `linear-gradient(135deg, ${COLORS.gold}, #ff8c00)` : COLORS.bgLight,
              borderRadius: 8,
              padding: '8px 14px',
              textAlign: 'center',
              animation: multiplier > 1 ? 'multiplierPop 0.3s' : 'none',
            }}>
              <div style={{ fontSize: 9, color: multiplier > 1 ? '#000' : COLORS.textDim }}>MULTI</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: multiplier > 1 ? '#000' : COLORS.textMuted }}>
                {multiplier}x
              </div>
            </div>
          </div>
          
          {/* Streak bar - always visible */}
          <div style={{ 
            width: '100%', 
            maxWidth: 340, 
            marginBottom: 8,
            padding: '4px 12px',
            background: COLORS.bgCard,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: streak > 0 ? 1 : 0.4,
            transition: 'opacity 0.3s',
          }}>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>🔥 STREAK</span>
            <div style={{ flex: 1, height: 6, background: COLORS.bgLight, borderRadius: 3 }}>
              <div style={{
                width: `${Math.min(100, (streak / 20) * 100)}%`,
                height: '100%',
                background: streak >= 20 ? COLORS.gold : streak >= 10 ? COLORS.primary : COLORS.success,
                borderRadius: 3,
                transition: 'width 0.3s, background 0.2s',
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: streak > 0 ? COLORS.gold : COLORS.textDim }}>{streak}</span>
            {/* Shield indicator */}
            <div style={{
              padding: '4px 10px',
              background: hasShield ? `${COLORS.primary}22` : 'transparent',
              border: hasShield ? `2px solid ${COLORS.primary}` : `2px solid ${COLORS.border}`,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.3s',
              animation: shieldUsed ? 'shieldBreak 0.5s ease-out' : hasShield ? 'shieldGlow 1.5s infinite' : 'none',
            }}>
              <span style={{ fontSize: 14 }}>{hasShield ? '🛡️' : '○'}</span>
            </div>
          </div>
          
          {/* Sequence indicator */}
          <div style={{ marginBottom: 10, textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {sequence.map((num, i) => {
                const orbColor = ORB_COLORS[num - 1];
                const isCompleted = i < currentIndex;
                const isTarget = i === currentIndex;
                
                return (
                  <div
                    key={i}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: isCompleted ? COLORS.bgLight : orbColor.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: 700,
                      color: isCompleted ? COLORS.textDim : orbColor.text,
                      border: isTarget ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                      boxShadow: isTarget ? `0 0 15px ${COLORS.primary}` : 
                                isCompleted ? 'none' : `0 0 10px ${orbColor.glow}50`,
                      transition: 'all 0.2s',
                      transform: isTarget ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {isCompleted ? '✓' : num}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Game area */}
          <div style={{
            position: 'relative',
            width: 340,
            height: 340,
            background: goldenActive 
              ? `linear-gradient(135deg, ${COLORS.bgCard}, #2a2a1a)` 
              : COLORS.bgCard,
            borderRadius: 16,
            border: `2px solid ${goldenActive ? COLORS.gold : COLORS.border}`,
            overflow: 'hidden',
            transition: 'all 0.2s',
          }}>
            {/* Grid lines */}
            <svg width="340" height="340" style={{ position: 'absolute', opacity: 0.08 }}>
              {[1,2,3,4].map(i => (
                <React.Fragment key={i}>
                  <line x1={i * 68} y1="0" x2={i * 68} y2="340" stroke={COLORS.primary} strokeWidth="1" />
                  <line x1="0" y1={i * 68} x2="340" y2={i * 68} stroke={COLORS.primary} strokeWidth="1" />
                </React.Fragment>
              ))}
            </svg>
            
            {/* Energy field */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 50,
              background: `linear-gradient(180deg, transparent 0%, ${COLORS.primary}10 50%, ${COLORS.primary}25 100%)`,
            }} />
            
            {/* Floating text */}
            {floatingText.map(f => (
              <div
                key={f.id}
                style={{
                  position: 'absolute',
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: f.color,
                  textShadow: `0 0 10px ${f.color}`,
                  animation: 'floatUp 0.8s ease-out forwards',
                  pointerEvents: 'none',
                  zIndex: 100,
                }}
              >
                {f.text}
              </div>
            ))}
            
            {/* Pop animation */}
            {lastPop && (
              <div style={{
                position: 'absolute',
                left: `${lastPop.x}%`,
                top: `${lastPop.y}%`,
                width: 50,
                height: 50,
                borderRadius: '50%',
                border: `3px solid ${lastPop.color}`,
                animation: 'orbPop 0.3s ease-out forwards',
                pointerEvents: 'none',
                zIndex: 50,
              }} />
            )}
            
            {/* Orbs */}
            {orbs.map(orb => {
              const isBomb = orb.type === 'bomb';
              const isGolden = orb.type === 'golden';
              const isNormal = orb.type === 'normal';
              const orbColor = isNormal ? ORB_COLORS[orb.colorIndex] : isBomb ? BOMB_COLOR : GOLDEN_COLOR;
              const isTarget = isNormal && orb.number === sequence[currentIndex];
              
              return (
                <button
                  key={orb.id}
                  onClick={() => handlePop(orb)}
                  style={{
                    position: 'absolute',
                    left: `${orb.x}%`,
                    top: `${orb.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isGolden ? 50 : 54,
                    height: isGolden ? 50 : 54,
                    borderRadius: '50%',
                    border: isTarget ? '3px solid #fff' : isBomb ? '2px solid #ff0000' : '2px solid transparent',
                    background: orbColor.bg,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isBomb || isGolden ? 24 : 20,
                    fontWeight: 700,
                    color: orbColor.text,
                    boxShadow: isTarget ? `0 0 25px ${orbColor.glow}, 0 0 50px ${orbColor.glow}50` :
                              `0 0 15px ${orbColor.glow}60`,
                    animation: isTarget ? 'targetPulse 0.6s infinite' : 
                              isBomb ? 'bombPulse 0.8s infinite' :
                              isGolden ? 'goldenPulse 0.5s infinite' :
                              'orbFloat 2s ease-in-out infinite',
                    zIndex: isTarget ? 10 : isBomb ? 5 : 1,
                  }}
                >
                  {orb.number}
                </button>
              );
            })}
            
            {/* Hint removed - UI is self-explanatory */}
          </div>
          
          {gameState === 'ended' && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>FINAL SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary }}>{score}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// GAME: MEMORY PATH (enhanced with golden tiles, speed bonus, effects)
// ============================================================================

function MemoryPathGame({ seed, onComplete }) {
  const GAME_DURATION = 60;
  const GRID = 5;
  
  const [screen, setScreen] = useState('countdown');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [path, setPath] = useState([]);
  const [goldenTile, setGoldenTile] = useState(-1);
  const [showIndex, setShowIndex] = useState(-1);
  const [playerClicks, setPlayerClicks] = useState([]);
  const [completed, setCompleted] = useState(0);
  const [pathLength, setPathLength] = useState(4);
  const [wrongTile, setWrongTile] = useState(-1);
  const [showCorrectPath, setShowCorrectPath] = useState(false);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [screenShake, setScreenShake] = useState(false);
  const [floatingText, setFloatingText] = useState([]);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [perfectRound, setPerfectRound] = useState(false);
  const [successPulse, setSuccessPulse] = useState(false);
  
  const rng = useRef(new SeededRandom(seed));
  const floatId = useRef(0);
  
  const addFloatingText = (tile, text, color) => {
    const id = floatId.current++;
    const row = Math.floor(tile / GRID);
    const col = tile % GRID;
    setFloatingText(prev => [...prev, { id, row, col, text, color }]);
    setTimeout(() => setFloatingText(prev => prev.filter(f => f.id !== id)), 1000);
  };
  
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
  };
  
  useEffect(() => {
    if (streak >= 5) setMultiplier(3);
    else if (streak >= 3) setMultiplier(2);
    else setMultiplier(1);
  }, [streak]);
  
  const getNeighbors = (tile) => {
    const row = Math.floor(tile / GRID);
    const col = tile % GRID;
    const neighbors = [];
    if (row > 0) neighbors.push(tile - GRID);
    if (row < GRID - 1) neighbors.push(tile + GRID);
    if (col > 0) neighbors.push(tile - 1);
    if (col < GRID - 1) neighbors.push(tile + 1);
    return neighbors;
  };
  
  const generatePath = useCallback((length) => {
    const pathArr = [];
    const used = new Set();
    let current = rng.current.nextInt(0, GRID * GRID - 1);
    pathArr.push(current);
    used.add(current);
    
    while (pathArr.length < length) {
      const neighbors = getNeighbors(current).filter(n => !used.has(n));
      if (neighbors.length === 0) return generatePath(length);
      current = rng.current.pick(neighbors);
      pathArr.push(current);
      used.add(current);
    }
    return pathArr;
  }, []);
  
  const startRound = useCallback(() => {
    const len = timeLeft > 45 ? 4 : timeLeft > 30 ? 5 : timeLeft > 15 ? 6 : 7;
    setPathLength(len);
    const newPath = generatePath(len);
    setPath(newPath);
    
    // 25% chance for golden tile in the path
    if (rng.current.next() < 0.25) {
      const goldenIdx = rng.current.nextInt(1, newPath.length - 1);
      setGoldenTile(newPath[goldenIdx]);
    } else {
      setGoldenTile(-1);
    }
    
    setPlayerClicks([]);
    setWrongTile(-1);
    setShowCorrectPath(false);
    setPerfectRound(false);
    setShowIndex(0);
    setRoundStartTime(Date.now());
    setScreen('showing');
  }, [timeLeft, generatePath]);
  
  useEffect(() => {
    if (screen !== 'countdown') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(t);
    }
    startRound();
  }, [screen, countdown, startRound]);
  
  useEffect(() => {
    if (screen !== 'showing' && screen !== 'input' && screen !== 'wrong') return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setScreen('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [screen]);
  
  useEffect(() => {
    if (screen !== 'showing') return;
    if (showIndex < path.length) {
      const speed = pathLength <= 4 ? 400 : pathLength <= 5 ? 350 : 300;
      const t = setTimeout(() => setShowIndex(i => i + 1), speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setShowIndex(-1);
      setScreen('input');
    }, 300);
    return () => clearTimeout(t);
  }, [screen, showIndex, path.length, pathLength]);
  
  useEffect(() => {
    if (screen === 'ended') setTimeout(() => onComplete(score), 1500);
  }, [screen, score, onComplete]);
  
  const handleClick = (tile) => {
    if (screen !== 'input') return;
    
    const expected = path[playerClicks.length];
    if (tile === expected) {
      const newClicks = [...playerClicks, tile];
      setPlayerClicks(newClicks);
      
      // Points for correct tile
      let tilePoints = 10 * multiplier;
      
      // Golden tile bonus
      if (tile === goldenTile) {
        tilePoints = 50 * multiplier;
        addFloatingText(tile, `+${tilePoints} ⭐`, COLORS.gold);
      } else {
        addFloatingText(tile, `+${tilePoints}`, COLORS.success);
      }
      
      setScore(s => s + tilePoints);
      
      // Path complete
      if (newClicks.length === path.length) {
        const timeTaken = (Date.now() - roundStartTime) / 1000;
        const baseBonus = pathLength * 20;
        
        // Speed bonus - under 2 seconds per tile = bonus
        let speedBonus = 0;
        const expectedTime = pathLength * 1.5;
        if (timeTaken < expectedTime) {
          speedBonus = Math.floor((expectedTime - timeTaken) * 20);
          setPerfectRound(true);
        }
        
        const totalBonus = (baseBonus + speedBonus) * multiplier;
        setScore(s => s + totalBonus);
        setStreak(s => s + 1);
        setCompleted(c => c + 1);
        
        // Trigger success animation (pulse instead of shake)
        setSuccessPulse(true);
        setTimeout(() => setSuccessPulse(false), 500);
        
        // Show bonus text
        if (speedBonus > 0) {
          setTimeout(() => addFloatingText(path[Math.floor(path.length/2)], `SPEED +${speedBonus * multiplier}!`, COLORS.primary), 200);
        }
        
        setTimeout(() => {
          if (timeLeft > 0) startRound();
        }, 600);
      }
    } else {
      setWrongTile(tile);
      setShowCorrectPath(true);
      setScreen('wrong');
      setStreak(0);
      addFloatingText(tile, 'MISS', COLORS.danger);
      triggerShake();
      
      setTimeout(() => {
        setWrongTile(-1);
        setShowCorrectPath(false);
        if (timeLeft > 0) startRound();
      }, 1200);
    }
  };
  
  const getTileStyle = (i) => {
    if (wrongTile === i) {
      return {
        background: `linear-gradient(135deg, ${COLORS.danger}, #cc2233)`,
        boxShadow: `0 0 30px ${COLORS.danger}`,
        transform: 'scale(1.05)',
      };
    }
    
    if (showCorrectPath && path.includes(i)) {
      const isGolden = i === goldenTile;
      return {
        background: isGolden ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : `linear-gradient(135deg, ${COLORS.warning}, #cc8800)`,
        boxShadow: `0 0 15px ${isGolden ? COLORS.gold : COLORS.warning}`,
      };
    }
    
    if (screen === 'showing' && path[showIndex] === i) {
      const isGolden = i === goldenTile;
      return {
        background: isGolden ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
        boxShadow: `0 0 30px ${isGolden ? COLORS.gold : COLORS.primary}`,
        transform: 'scale(1.08)',
      };
    }
    
    if (playerClicks.includes(i)) {
      const isGolden = i === goldenTile;
      return {
        background: isGolden ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : `linear-gradient(135deg, ${COLORS.success}, #00cc66)`,
        boxShadow: `0 0 15px ${isGolden ? COLORS.gold : COLORS.success}`,
      };
    }
    
    return {
      background: COLORS.bgLight,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
    };
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, animation: screenShake ? 'shake 0.3s' : 'none' }}>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-50px) scale(1.5); } }
        @keyframes multiplierPop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes goldenGlow { 0%, 100% { box-shadow: 0 0 20px #ffd700; } 50% { box-shadow: 0 0 35px #ffd700, 0 0 50px #ffd70050; } }
        @keyframes tileWrong { 0%, 100% { transform: translateX(0) scale(1.05); } 20%, 60% { transform: translateX(-4px) scale(1.05); } 40%, 80% { transform: translateX(4px) scale(1.05); } }
        @keyframes successPulse { 0% { transform: scale(1); box-shadow: 0 0 0 ${COLORS.success}; } 50% { transform: scale(1.03); box-shadow: 0 0 30px ${COLORS.success}, 0 0 60px ${COLORS.success}50; } 100% { transform: scale(1); box-shadow: 0 0 0 ${COLORS.success}; } }
        @keyframes perfectPulse { 0% { transform: scale(1); box-shadow: 0 0 0 ${COLORS.gold}; } 50% { transform: scale(1.04); box-shadow: 0 0 40px ${COLORS.gold}, 0 0 80px ${COLORS.gold}50; } 100% { transform: scale(1); box-shadow: 0 0 0 ${COLORS.gold}; } }
      `}</style>
      
      {screen === 'countdown' && (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 80, fontWeight: 700, color: countdown === 0 ? COLORS.primary : COLORS.text }}>{countdown || 'GO!'}</div>
        </div>
      )}
      
      {(screen === 'showing' || screen === 'input' || screen === 'wrong' || screen === 'ended') && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <StatBox label="TIME" value={timeLeft} color={timeLeft <= 10 ? COLORS.danger : COLORS.text} />
            <StatBox label="SCORE" value={score} color={COLORS.primary} />
            <div style={{
              background: multiplier > 1 ? `linear-gradient(135deg, ${COLORS.gold}, #ff8c00)` : COLORS.bgLight,
              borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              animation: multiplier > 1 ? 'multiplierPop 0.3s' : 'none',
            }}>
              <div style={{ fontSize: 9, color: multiplier > 1 ? '#000' : COLORS.textDim }}>MULTI</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: multiplier > 1 ? '#000' : COLORS.textMuted }}>{multiplier}x</div>
            </div>
          </div>
          
          <div style={{ width: '100%', maxWidth: 300, marginBottom: 10, padding: '4px 12px', background: COLORS.bgCard, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, opacity: streak > 0 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>🧠</span>
            <div style={{ flex: 1, height: 6, background: COLORS.bgLight, borderRadius: 3 }}>
              <div style={{ width: `${Math.min(100, (streak / 5) * 100)}%`, height: '100%', background: streak >= 5 ? COLORS.gold : streak >= 3 ? COLORS.primary : COLORS.success, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: streak > 0 ? COLORS.gold : COLORS.textDim }}>{streak}</span>
          </div>
          
          <div style={{
            display: 'flex', gap: 8, marginBottom: 10, padding: '6px 14px', borderRadius: 20, transition: 'all 0.2s',
            background: screen === 'wrong' ? `${COLORS.danger}22` : perfectRound ? `${COLORS.gold}22` : COLORS.bgCard,
            border: screen === 'wrong' ? `1px solid ${COLORS.danger}` : perfectRound ? `1px solid ${COLORS.gold}` : '1px solid transparent',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: screen === 'showing' ? COLORS.primary : screen === 'wrong' ? COLORS.danger : perfectRound ? COLORS.gold : COLORS.success }}>
              {screen === 'showing' ? '👀 WATCH' : screen === 'wrong' ? '❌ WRONG!' : perfectRound ? '⚡ PERFECT!' : '👆 YOUR TURN'}
            </span>
          </div>
          
          {/* Progress dots - always rendered to prevent layout shift */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, opacity: screen === 'input' ? 1 : 0, height: 5 }}>
            {path.map((tile, i) => (
              <div key={i} style={{
                width: 20, height: 5, borderRadius: 3,
                background: i < playerClicks.length ? (tile === goldenTile ? COLORS.gold : COLORS.success) : '#333',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
          
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${GRID}, 54px)`, gap: 6, padding: 14,
            background: COLORS.bgCard, borderRadius: 16, position: 'relative',
            border: screen === 'wrong' ? `2px solid ${COLORS.danger}` : goldenTile >= 0 ? `2px solid ${COLORS.gold}40` : `2px solid ${COLORS.border}`,
            transition: 'border-color 0.3s',
            animation: successPulse ? (perfectRound ? 'perfectPulse 0.5s ease-out' : 'successPulse 0.5s ease-out') : 'none',
          }}>
            {/* Floating text */}
            {floatingText.map(f => (
              <div key={f.id} style={{
                position: 'absolute', left: f.col * 60 + 42, top: f.row * 60 + 30,
                fontSize: 18, fontWeight: 700, color: f.color, textShadow: `0 0 10px ${f.color}`,
                animation: 'floatUp 1s ease-out forwards', pointerEvents: 'none', zIndex: 100,
              }}>{f.text}</div>
            ))}
            
            {Array.from({ length: GRID * GRID }).map((_, i) => {
              const isGoldenTile = i === goldenTile && (screen === 'showing' || playerClicks.includes(i) || showCorrectPath);
              return (
                <button key={i} onClick={() => handleClick(i)} style={{
                  width: 54, height: 54, borderRadius: 10, border: 'none',
                  cursor: screen === 'input' ? 'pointer' : 'default',
                  transition: 'all 0.12s',
                  animation: wrongTile === i ? 'tileWrong 0.3s' : isGoldenTile ? 'goldenGlow 1s infinite' : undefined,
                  ...getTileStyle(i),
                }}>
                  {isGoldenTile && <span style={{ fontSize: 20 }}>⭐</span>}
                </button>
              );
            })}
          </div>
          
          {goldenTile >= 0 && screen === 'input' && !playerClicks.includes(goldenTile) && (
            <div style={{ marginTop: 8, fontSize: 11, color: COLORS.gold }}>⭐ Golden tile = 5x points!</div>
          )}
          
          {screen === 'ended' && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>FINAL SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary }}>{score}</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>{completed} paths completed</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// GAME: TURBO RACE (Tron Light Cycle theme)
// ============================================================================

function TurboRaceGame({ seed, onComplete }) {
  const LAPS = 4;
  const TRACK_LENGTH = 1000;
  const BASE_SPEED = 85;
  const BOOST_SPEED = 160;
  const PERFECT_BOOST_SPEED = 200;
  const BOOST_DURATION = 800;
  const PENALTY_DURATION = 500;
  const PENALTY_SPEED = 50;
  
  const [gameState, setGameState] = useState('countdown');
  const [countdown, setCountdown] = useState(3);
  const [position, setPosition] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [finishTime, setFinishTime] = useState(null);
  const [raceTime, setRaceTime] = useState(0);
  
  const [boostState, setBoostState] = useState('ready');
  const [boostPromptTimer, setBoostPromptTimer] = useState(0);
  const [boostsHit, setBoostsHit] = useState(0);
  const [perfectBoosts, setPerfectBoosts] = useState(0);
  const [boostsMissed, setBoostsMissed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [screenShake, setScreenShake] = useState(false);
  const [floatingText, setFloatingText] = useState([]);
  const [lastBoostType, setLastBoostType] = useState(null);
  const [trail, setTrail] = useState([]);
  
  const rng = useRef(new SeededRandom(seed));
  const startTime = useRef(null);
  const lastFrame = useRef(null);
  const nextBoostTime = useRef(null);
  const currentSpeed = useRef(BASE_SPEED);
  const promptStartTime = useRef(null);
  const floatId = useRef(0);
  
  const addFloatingText = (text, color) => {
    const id = floatId.current++;
    setFloatingText(prev => [...prev, { id, text, color }]);
    setTimeout(() => setFloatingText(prev => prev.filter(f => f.id !== id)), 1000);
  };
  
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 200);
  };
  
  useEffect(() => {
    if (streak >= 5) setMultiplier(3);
    else if (streak >= 3) setMultiplier(2);
    else setMultiplier(1);
  }, [streak]);
  
  const scheduleNextBoost = useCallback(() => {
    const delay = rng.current.nextInt(1800, 3200);
    nextBoostTime.current = Date.now() + delay;
  }, []);
  
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(t);
    }
    startTime.current = Date.now();
    lastFrame.current = Date.now();
    scheduleNextBoost();
    setGameState('racing');
  }, [gameState, countdown, scheduleNextBoost]);
  
  // Get cycle position on track
  const getCyclePosition = useCallback(() => {
    const progress = (position % TRACK_LENGTH) / TRACK_LENGTH;
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    const cx = 170, cy = 130;
    const rx = 120, ry = 90;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    const rotation = angle + Math.PI / 2;
    return { x, y, rotation };
  }, [position]);
  
  useEffect(() => {
    if (gameState !== 'racing') return;
    
    const gameLoop = () => {
      const now = Date.now();
      const delta = (now - lastFrame.current) / 1000;
      lastFrame.current = now;
      
      setRaceTime(now - startTime.current);
      
      if (boostState === 'ready' && nextBoostTime.current && now >= nextBoostTime.current) {
        setBoostState('prompt');
        setBoostPromptTimer(100);
        promptStartTime.current = now;
        
        setTimeout(() => {
          setBoostState(prev => {
            if (prev === 'prompt') {
              setBoostsMissed(m => m + 1);
              setStreak(0);
              addFloatingText('MISSED!', COLORS.warning);
              scheduleNextBoost();
              return 'ready';
            }
            return prev;
          });
        }, 1200);
      }
      
      if (boostState === 'prompt') {
        setBoostPromptTimer(prev => Math.max(0, prev - delta * 83));
      }
      
      setPosition(prev => {
        const newPos = prev + currentSpeed.current * delta;
        const totalDistance = TRACK_LENGTH * LAPS;
        
        const newLap = Math.min(LAPS, Math.floor(newPos / TRACK_LENGTH) + 1);
        if (newLap > currentLap) {
          addFloatingText(`LAP ${newLap}`, COLORS.primary);
        }
        setCurrentLap(newLap);
        
        if (newPos >= totalDistance) {
          const time = ((now - startTime.current) / 1000).toFixed(2);
          setFinishTime(time);
          setGameState('finished');
          return totalDistance;
        }
        
        return newPos;
      });
      
      // Update trail
      const pos = getCyclePosition();
      setTrail(prev => {
        const newTrail = [...prev, { x: pos.x, y: pos.y, age: 0 }];
        return newTrail
          .map(t => ({ ...t, age: t.age + 1 }))
          .filter(t => t.age < 20)
          .slice(-20);
      });
    };
    
    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [gameState, boostState, scheduleNextBoost, currentLap, getCyclePosition]);
  
  const handleBoost = () => {
    if (gameState !== 'racing') return;
    
    if (boostState === 'prompt') {
      const timeSincePrompt = Date.now() - promptStartTime.current;
      const isPerfect = timeSincePrompt < 300;
      
      setBoostState('boosting');
      setBoostsHit(h => h + 1);
      setStreak(s => s + 1);
      setLastBoostType(isPerfect ? 'perfect' : 'good');
      
      if (isPerfect) {
        setPerfectBoosts(p => p + 1);
        currentSpeed.current = PERFECT_BOOST_SPEED;
        addFloatingText('PERFECT! ⚡', COLORS.gold);
        triggerShake();
      } else {
        currentSpeed.current = BOOST_SPEED;
        addFloatingText('BOOST!', COLORS.success);
      }
      
      setTimeout(() => {
        currentSpeed.current = BASE_SPEED;
        setBoostState('cooldown');
        setLastBoostType(null);
        setTimeout(() => {
          setBoostState('ready');
          scheduleNextBoost();
        }, 400);
      }, isPerfect ? 1000 : BOOST_DURATION);
    } else if (boostState === 'ready' || boostState === 'cooldown') {
      setBoostState('penalty');
      setStreak(0);
      currentSpeed.current = PENALTY_SPEED;
      addFloatingText('TOO EARLY!', COLORS.danger);
      triggerShake();
      
      setTimeout(() => {
        currentSpeed.current = BASE_SPEED;
        setBoostState('ready');
        scheduleNextBoost();
      }, PENALTY_DURATION);
    }
  };
  
  useEffect(() => {
    if (gameState === 'finished') {
      const baseScore = Math.max(0, Math.floor((60 - parseFloat(finishTime)) * 50));
      const boostBonus = boostsHit * 40;
      const perfectBonus = perfectBoosts * 60;
      const streakBonus = streak >= 5 ? 300 : streak >= 3 ? 150 : 0;
      const totalScore = (baseScore + boostBonus + perfectBonus + streakBonus) * multiplier;
      
      setTimeout(() => onComplete(totalScore), 2500);
    }
  }, [gameState, finishTime, boostsHit, perfectBoosts, streak, multiplier, onComplete]);
  
  const cyclePos = getCyclePosition();
  const lapProgress = ((position % TRACK_LENGTH) / TRACK_LENGTH) * 100;
  
  const getBoostColor = () => {
    if (boostState === 'boosting') return lastBoostType === 'perfect' ? COLORS.gold : COLORS.primary;
    if (boostState === 'penalty') return COLORS.danger;
    return COLORS.primary;
  };
  
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const decimals = Math.floor((ms % 1000) / 10);
    return `${seconds}.${decimals.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, animation: screenShake ? 'shake 0.2s' : 'none' }}>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-60px) scale(1.5); } }
        @keyframes multiplierPop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes cycleGlow { 0%, 100% { filter: drop-shadow(0 0 8px ${COLORS.primary}); } 50% { filter: drop-shadow(0 0 20px ${COLORS.primary}); } }
        @keyframes cyclePerfect { 0%, 100% { filter: drop-shadow(0 0 12px ${COLORS.gold}); } 50% { filter: drop-shadow(0 0 30px ${COLORS.gold}); } }
        @keyframes gridPulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.25; } }
        @keyframes boostPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 30px ${COLORS.success}; } 50% { transform: scale(1.08); box-shadow: 0 0 50px ${COLORS.success}, 0 0 80px ${COLORS.success}50; } }
        @keyframes perfectPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px ${COLORS.gold}; } 50% { transform: scale(1.1); box-shadow: 0 0 60px ${COLORS.gold}, 0 0 100px ${COLORS.gold}50; } }
      `}</style>
      
      {gameState === 'countdown' && (
        <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 100, fontWeight: 700, color: countdown === 0 ? COLORS.primary : COLORS.text, textShadow: countdown === 0 ? `0 0 40px ${COLORS.primary}` : 'none' }}>
            {countdown || 'GO!'}
          </div>
        </div>
      )}
      
      {(gameState === 'racing' || gameState === 'finished') && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <StatBox label="TIME" value={formatTime(raceTime)} color={COLORS.text} />
            <StatBox label="LAP" value={`${currentLap}/${LAPS}`} color={currentLap === LAPS ? COLORS.gold : COLORS.text} />
            <div style={{
              background: multiplier > 1 ? `linear-gradient(135deg, ${COLORS.gold}, #ff8c00)` : COLORS.bgLight,
              borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              animation: multiplier > 1 ? 'multiplierPop 0.3s' : 'none',
            }}>
              <div style={{ fontSize: 9, color: multiplier > 1 ? '#000' : COLORS.textDim }}>MULTI</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: multiplier > 1 ? '#000' : COLORS.textMuted }}>{multiplier}x</div>
            </div>
          </div>
          
          <div style={{ width: '100%', maxWidth: 300, marginBottom: 10, padding: '4px 12px', background: COLORS.bgCard, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, opacity: streak > 0 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>⚡</span>
            <div style={{ flex: 1, height: 6, background: COLORS.bgLight, borderRadius: 3 }}>
              <div style={{ width: `${Math.min(100, (streak / 5) * 100)}%`, height: '100%', background: streak >= 5 ? COLORS.gold : streak >= 3 ? COLORS.primary : COLORS.success, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: streak > 0 ? COLORS.gold : COLORS.textDim }}>{streak}</span>
          </div>
          
          {/* Tron Grid Track */}
          <div style={{ position: 'relative', width: 340, height: 260, background: '#050510', borderRadius: 16, overflow: 'hidden', border: `2px solid ${COLORS.border}` }}>
            {/* Grid background */}
            <svg width="340" height="260" style={{ position: 'absolute', animation: 'gridPulse 2s infinite' }}>
              {/* Horizontal grid lines */}
              {Array.from({ length: 14 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 20} x2="340" y2={i * 20} stroke={COLORS.primary} strokeWidth="1" opacity="0.3" />
              ))}
              {/* Vertical grid lines */}
              {Array.from({ length: 18 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="260" stroke={COLORS.primary} strokeWidth="1" opacity="0.3" />
              ))}
            </svg>
            
            {/* Track */}
            <svg width="340" height="260" style={{ position: 'absolute' }}>
              {/* Outer glow */}
              <ellipse cx="170" cy="130" rx="125" ry="95" fill="none" stroke={COLORS.primary} strokeWidth="2" opacity="0.3" />
              {/* Track surface */}
              <ellipse cx="170" cy="130" rx="120" ry="90" fill="none" stroke="#1a1a2e" strokeWidth="35" />
              {/* Track edges - neon */}
              <ellipse cx="170" cy="130" rx="137" ry="107" fill="none" stroke={COLORS.primary} strokeWidth="2" opacity="0.8" />
              <ellipse cx="170" cy="130" rx="103" ry="73" fill="none" stroke={COLORS.primary} strokeWidth="2" opacity="0.8" />
              {/* Center line */}
              <ellipse cx="170" cy="130" rx="120" ry="90" fill="none" stroke={COLORS.primary} strokeWidth="1" strokeDasharray="15 10" opacity="0.5" />
              {/* Start/finish */}
              <line x1="170" y1="25" x2="170" y2="57" stroke={COLORS.gold} strokeWidth="4" />
            </svg>
            
            {/* Light trail */}
            {trail.map((t, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: t.x,
                top: t.y,
                width: 8 - t.age * 0.3,
                height: 8 - t.age * 0.3,
                borderRadius: '50%',
                background: getBoostColor(),
                opacity: (1 - t.age / 20) * 0.7,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 ${10 - t.age * 0.4}px ${getBoostColor()}`,
              }} />
            ))}
            
            {/* Floating text */}
            {floatingText.map(f => (
              <div key={f.id} style={{
                position: 'absolute', left: '50%', top: '40%', transform: 'translateX(-50%)',
                fontSize: 24, fontWeight: 700, color: f.color, textShadow: `0 0 15px ${f.color}`,
                animation: 'floatUp 1s ease-out forwards', pointerEvents: 'none', zIndex: 100,
              }}>{f.text}</div>
            ))}
            
            {/* Light Cycle */}
            <div style={{
              position: 'absolute', left: cyclePos.x, top: cyclePos.y,
              transform: `translate(-50%, -50%) rotate(${cyclePos.rotation}rad)`,
              width: 24, height: 12,
              background: boostState === 'boosting' 
                ? (lastBoostType === 'perfect' ? `linear-gradient(90deg, ${COLORS.gold}, #fff)` : `linear-gradient(90deg, ${COLORS.primary}, #fff)`)
                : `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
              borderRadius: '4px 12px 12px 4px',
              boxShadow: boostState === 'boosting'
                ? `0 0 20px ${lastBoostType === 'perfect' ? COLORS.gold : COLORS.primary}, 0 0 40px ${lastBoostType === 'perfect' ? COLORS.gold : COLORS.primary}50`
                : `0 0 10px ${COLORS.primary}`,
              animation: boostState === 'boosting' ? (lastBoostType === 'perfect' ? 'cyclePerfect 0.15s infinite' : 'cycleGlow 0.2s infinite') : 'none',
            }}>
              {/* Cycle front light */}
              <div style={{
                position: 'absolute',
                right: -2,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 0 8px #fff',
              }} />
            </div>
            
            {/* Lap progress */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, border: `1px solid ${COLORS.primary}30` }}>
              <div style={{ width: `${lapProgress}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryDark})`, borderRadius: 3, boxShadow: `0 0 10px ${COLORS.primary}`, transition: 'width 0.1s' }} />
            </div>
          </div>
          
          {gameState === 'racing' && (
            <>
              <div style={{
                marginTop: 14, marginBottom: 8, padding: '8px 20px', borderRadius: 20, transition: 'all 0.15s',
                background: boostState === 'prompt' ? `${COLORS.success}15` : 'transparent',
                border: boostState === 'prompt' ? `2px solid ${promptStartTime.current && (Date.now() - promptStartTime.current < 300) ? COLORS.gold : COLORS.success}` : '2px solid transparent',
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: boostState === 'prompt' ? (promptStartTime.current && (Date.now() - promptStartTime.current < 300) ? COLORS.gold : COLORS.success) :
                         boostState === 'penalty' ? COLORS.danger : boostState === 'boosting' ? COLORS.primary : COLORS.textDim,
                }}>
                  {boostState === 'prompt' ? (promptStartTime.current && (Date.now() - promptStartTime.current < 300) ? '⭐ PERFECT!' : '⚡ BOOST!') :
                   boostState === 'boosting' ? '🚀 BOOSTING!' : boostState === 'penalty' ? '❌ TOO EARLY!' : 'Wait for signal...'}
                </span>
              </div>
              
              <button onClick={handleBoost} style={{
                width: 90, height: 90, borderRadius: '50%', border: 'none',
                fontSize: 28, cursor: 'pointer', transition: 'all 0.1s',
                background: boostState === 'prompt' 
                  ? (promptStartTime.current && (Date.now() - promptStartTime.current < 300) 
                    ? `linear-gradient(135deg, ${COLORS.gold}, #ffaa00)` 
                    : `linear-gradient(135deg, ${COLORS.success}, #00aa66)`)
                  : boostState === 'boosting' 
                    ? (lastBoostType === 'perfect' ? `linear-gradient(135deg, ${COLORS.gold}, #ffaa00)` : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`)
                    : boostState === 'penalty' ? COLORS.danger : COLORS.bgCard,
                boxShadow: boostState === 'prompt' 
                  ? `0 0 30px ${promptStartTime.current && (Date.now() - promptStartTime.current < 300) ? COLORS.gold : COLORS.success}`
                  : boostState === 'boosting' ? `0 0 25px ${lastBoostType === 'perfect' ? COLORS.gold : COLORS.primary}` : 'none',
                animation: boostState === 'prompt' 
                  ? (promptStartTime.current && (Date.now() - promptStartTime.current < 300) ? 'perfectPulse 0.25s infinite' : 'boostPulse 0.3s infinite') 
                  : 'none',
                color: boostState === 'prompt' || boostState === 'boosting' ? '#000' : COLORS.textMuted,
                border: boostState === 'ready' || boostState === 'cooldown' ? `2px solid ${COLORS.border}` : 'none',
              }}>
                {boostState === 'boosting' ? '⚡' : boostState === 'penalty' ? '🔒' : boostState === 'prompt' ? '⚡' : '○'}
              </button>
              
              <div style={{ marginTop: 10, fontSize: 11, color: COLORS.textDim }}>
                ⭐ {perfectBoosts} perfect • ⚡ {boostsHit} boosts
              </div>
            </>
          )}
          
          {gameState === 'finished' && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>FINISH TIME</div>
              <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.primary, textShadow: `0 0 20px ${COLORS.primary}50` }}>{finishTime}s</div>
              <div style={{ marginTop: 12, fontSize: 13, color: COLORS.textDim }}>
                ⭐ {perfectBoosts} perfect • ⚡ {boostsHit} boosts • ❌ {boostsMissed} missed
              </div>
              {streak >= 3 && <div style={{ marginTop: 6, fontSize: 12, color: COLORS.gold }}>🔥 {streak} streak bonus!</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// AUTH SCREENS
// ============================================================================

function LoginScreen({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎪</div>
        <h1 style={{ fontSize: 32, margin: 0, color: COLORS.text, fontWeight: 700 }}>Carnival</h1>
        <p style={{ color: COLORS.textMuted, margin: '8px 0 0' }}>Sign in to play</p>
      </div>
      
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              color: COLORS.text,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="you@example.com"
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              color: COLORS.text,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="••••••••"
          />
        </div>
        
        {error && (
          <div style={{
            padding: '12px 16px',
            background: `${COLORS.danger}22`,
            border: `1px solid ${COLORS.danger}`,
            borderRadius: 8,
            color: COLORS.danger,
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        
        <Button size="lg" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <p style={{ marginTop: 24, color: COLORS.textMuted, fontSize: 14 }}>
        Don't have an account?{' '}
        <span 
          onClick={onSwitch}
          style={{ color: COLORS.primary, cursor: 'pointer' }}
        >
          Sign up
        </span>
      </p>
    </div>
  );
}

function SignupScreen({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: displayName || email.split('@')[0],
        balance: 0,
        createdAt: serverTimestamp(),
      });
      
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎪</div>
        <h1 style={{ fontSize: 32, margin: 0, color: COLORS.text, fontWeight: 700 }}>Carnival</h1>
        <p style={{ color: COLORS.textMuted, margin: '8px 0 0' }}>Create your account</p>
      </div>
      
      <form onSubmit={handleSignup} style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>DISPLAY NAME</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              color: COLORS.text,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="Player123"
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              color: COLORS.text,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="you@example.com"
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              color: COLORS.text,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="••••••••"
          />
          <p style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6 }}>At least 6 characters</p>
        </div>
        
        {error && (
          <div style={{
            padding: '12px 16px',
            background: `${COLORS.danger}22`,
            border: `1px solid ${COLORS.danger}`,
            borderRadius: 8,
            color: COLORS.danger,
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        
        <Button size="lg" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
      
      <p style={{ marginTop: 24, color: COLORS.textMuted, fontSize: 14 }}>
        Already have an account?{' '}
        <span 
          onClick={onSwitch}
          style={{ color: COLORS.primary, cursor: 'pointer' }}
        >
          Sign in
        </span>
      </p>
    </div>
  );
}

function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState('login');
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  // Listen to user data changes
  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }
    
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserData({ id: doc.id, ...doc.data() });
      }
    });
    
    return () => unsubscribe();
  }, [user]);
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎪</div>
          <div style={{ color: COLORS.textMuted }}>Loading...</div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return authScreen === 'login' 
      ? <LoginScreen onSwitch={() => setAuthScreen('signup')} />
      : <SignupScreen onSwitch={() => setAuthScreen('login')} />;
  }
  
  return (
    <AuthContext.Provider value={{ user, userData }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

function CarnivalGame() {
  const { user, userData } = useAuth();
  const [screen, setScreen] = useState('home');
  const [tournamentState, setTournamentState] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [practiceGame, setPracticeGame] = useState(null);
  const [seenTutorials, setSeenTutorials] = useState({});
  const [pendingGame, setPendingGame] = useState(null); // Holds game info while showing tutorial
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Tournament with entry fee
  const startTournament = async () => {
    // Check balance
    if ((userData?.balance || 0) < ENTRY_FEE) return;
    
    const seed = Math.floor(Math.random() * 1000000);
    
    // Deduct entry fee from Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      balance: (userData?.balance || 0) - ENTRY_FEE
    }, { merge: true });
    
    // Log entry transaction
    await addDoc(collection(db, 'transactions'), {
      userId: user.uid,
      type: 'entry',
      amount: -ENTRY_FEE,
      tournamentId: seed,
      createdAt: serverTimestamp(),
    });
    
    const rng = new SeededRandom(seed);
    
    // Shuffle all 4 qualifying games - one for each round before finals
    const gameOrder = rng.shuffle([...QUALIFYING_GAMES]);
    
    setTournamentState({
      seed,
      round: 1,
      playersRemaining: 32,
      playerRank: null,
      gameOrder, // Pre-determined game for each round
      roundGame: gameOrder[0], // Round 1 game
      gameSeed: rng.nextInt(1, 999999),
      scores: [],
      status: 'waiting', // waiting, playing, results
    });
    setScreen('tournament');
  };
  
  const startRound = () => {
    const gameType = tournamentState.roundGame;
    const gameData = {
      type: gameType,
      seed: tournamentState.gameSeed,
      mode: 'tournament',
    };
    
    // Check if tutorial needed
    if (!seenTutorials[gameType]) {
      setPendingGame(gameData);
      setScreen('tutorial');
    } else {
      setCurrentGame(gameData);
      setTournamentState(prev => ({ ...prev, status: 'playing' }));
      setScreen('game');
    }
  };
  
  const dismissTutorial = () => {
    if (!pendingGame) return;
    
    // Mark tutorial as seen
    setSeenTutorials(prev => ({ ...prev, [pendingGame.type]: true }));
    
    if (pendingGame.mode === 'tournament') {
      setCurrentGame(pendingGame);
      setTournamentState(prev => ({ ...prev, status: 'playing' }));
      setScreen('game');
    } else {
      setPracticeGame(pendingGame);
      setScreen('practice-game');
    }
    setPendingGame(null);
  };
  
  const handleGameComplete = (score) => {
    // TEST MODE: Always advance
    const advances = true;
    const playerRank = 1; // Always rank 1 for testing
    
    setTournamentState(prev => ({
      ...prev,
      status: 'results',
      playerScore: score,
      playerRank,
      advances,
    }));
    setScreen('tournament');
  };
  
  const nextRound = async () => {
    if (!tournamentState.advances) {
      setScreen('home');
      setTournamentState(null);
      return;
    }
    
    const newPlayersRemaining = tournamentState.playersRemaining / 2;
    const newRound = tournamentState.round + 1;
    const rng = new SeededRandom(tournamentState.seed + newRound);
    
    if (newPlayersRemaining === 1) {
      // Winner! Add prize to balance
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        balance: (userData?.balance || 0) + PRIZE_POOL
      }, { merge: true });
      
      // Log prize transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'prize',
        amount: PRIZE_POOL,
        tournamentId: tournamentState.seed,
        createdAt: serverTimestamp(),
      });
      
      setScreen('winner');
      return;
    }
    
    const isFinals = newPlayersRemaining === 2;
    
    setTournamentState(prev => ({
      ...prev,
      round: newRound,
      playersRemaining: newPlayersRemaining,
      // Finals = Turbo Race, otherwise use pre-shuffled game order
      roundGame: isFinals ? GAMES.TURBO_RACE : prev.gameOrder[newRound - 1],
      gameSeed: rng.nextInt(1, 999999),
      status: 'waiting',
      playerScore: null,
      playerRank: null,
      advances: null,
    }));
  };
  
  // Practice mode functions
  const startPractice = (gameType) => {
    const seed = Math.floor(Math.random() * 1000000);
    const gameData = {
      type: gameType,
      seed,
      mode: 'practice',
    };
    
    // Check if tutorial needed
    if (!seenTutorials[gameType]) {
      setPendingGame(gameData);
      setScreen('tutorial');
    } else {
      setPracticeGame(gameData);
      setScreen('practice-game');
    }
  };
  
  const handlePracticeComplete = (score) => {
    setPracticeGame(prev => ({ ...prev, lastScore: score }));
    setScreen('practice-results');
  };
  
  const renderGame = () => {
    const props = {
      seed: currentGame.seed,
      onComplete: handleGameComplete,
    };
    
    switch (currentGame.type) {
      case GAMES.WHACK_A_MOLE: return <WhackAMoleGame {...props} />;
      case GAMES.TARGET_SHOOTER: return <TargetShooterGame {...props} />;
      case GAMES.BALLOON_POP: return <BalloonPopGame {...props} />;
      case GAMES.MEMORY_PATH: return <MemoryPathGame {...props} />;
      case GAMES.TURBO_RACE: return <TurboRaceGame {...props} />;
      default: return null;
    }
  };
  
  const renderPracticeGame = () => {
    if (!practiceGame) return null;
    const props = {
      seed: practiceGame.seed,
      onComplete: handlePracticeComplete,
    };
    
    switch (practiceGame.type) {
      case GAMES.WHACK_A_MOLE: return <WhackAMoleGame {...props} />;
      case GAMES.TARGET_SHOOTER: return <TargetShooterGame {...props} />;
      case GAMES.BALLOON_POP: return <BalloonPopGame {...props} />;
      case GAMES.MEMORY_PATH: return <MemoryPathGame {...props} />;
      case GAMES.TURBO_RACE: return <TurboRaceGame {...props} />;
      default: return null;
    }
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: COLORS.text,
    }}>
      {/* HOME */}
      {screen === 'home' && (
        <>
          <Header 
            title="🎪 Carnival" 
            right={
              <div 
                onClick={() => setScreen('profile')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  cursor: 'pointer',
                  padding: '6px 12px',
                  background: COLORS.bgLight,
                  borderRadius: 20,
                }}
              >
                <span style={{ fontSize: 13, color: COLORS.gold, fontWeight: 600 }}>
                  ${(userData?.balance || 0).toFixed(2)}
                </span>
                <span style={{ fontSize: 16 }}>👤</span>
              </div>
            }
          />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            gap: 24,
          }}>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎪</div>
              <h1 style={{ fontSize: 32, margin: '0 0 8px', fontWeight: 700 }}>Carnival</h1>
              <p style={{ color: COLORS.textMuted, margin: 0 }}>
                Welcome, {userData?.displayName || 'Player'}!
              </p>
            </div>
            
            {/* Wallet Card */}
            <Card style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>YOUR BALANCE</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.gold, marginBottom: 16 }}>
                ${(userData?.balance || 0).toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button 
                  onClick={() => setScreen('deposit')}
                  style={{ flex: 1 }}
                >
                  Deposit
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setScreen('withdraw')}
                  style={{ flex: 1 }}
                >
                  Withdraw
                </Button>
              </div>
            </Card>
            
            {/* Tournament Card */}
            <Card style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8 }}>PRIZE POOL</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.gold, marginBottom: 4 }}>${PRIZE_POOL}</div>
              <div style={{ fontSize: 24, color: COLORS.textDim, marginBottom: 12 }}>Entry: ${ENTRY_FEE}.00</div>
              <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 20 }}>
                32 players • 5 rounds • Winner takes all
              </div>
              <Button 
                size="lg" 
                onClick={() => setShowConfirmModal(true)}
                disabled={(userData?.balance || 0) < ENTRY_FEE}
              >
                {(userData?.balance || 0) < ENTRY_FEE ? 'Deposit to Play' : 'Enter Contest'}
              </Button>
              {(userData?.balance || 0) < ENTRY_FEE && (
                <p style={{ fontSize: 12, color: COLORS.warning, marginTop: 8, marginBottom: 0 }}>
                  Minimum ${ENTRY_FEE}.00 required to enter
                </p>
              )}
            </Card>
            
            <Button 
              variant="secondary" 
              onClick={() => setScreen('practice')}
              style={{ fontSize: 14 }}
            >
              Practice Games (Free)
            </Button>
          </div>
        </>
      )}
      
      {/* PROFILE */}
      {screen === 'profile' && (
        <>
          <Header title="Profile" onBack={() => setScreen('home')} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            gap: 20,
          }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: COLORS.bgLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              border: `3px solid ${COLORS.primary}`,
            }}>
              👤
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 24 }}>{userData?.displayName || 'Player'}</h2>
              <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 14 }}>{userData?.email}</p>
            </div>
            
            <Card style={{ width: '100%', maxWidth: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: COLORS.textMuted }}>Balance</span>
                <span style={{ color: COLORS.gold, fontWeight: 600 }}>${(userData?.balance || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: COLORS.textMuted }}>Member since</span>
                <span style={{ color: COLORS.text }}>
                  {userData?.createdAt?.toDate?.()?.toLocaleDateString() || 'Today'}
                </span>
              </div>
            </Card>
            
            <Button 
              variant="secondary" 
              onClick={() => signOut(auth)}
              style={{ marginTop: 20 }}
            >
              Sign Out
            </Button>
          </div>
        </>
      )}
      
      {/* DEPOSIT */}
      {screen === 'deposit' && (
        <>
          <Header title="Deposit" onBack={() => setScreen('home')} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            gap: 20,
          }}>
            <Card style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8 }}>ADD FUNDS</div>
              <p style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 20 }}>
                Stripe integration coming soon. For testing, use the button below.
              </p>
              
              {[5, 10, 25, 50].map(amount => (
                <Button
                  key={amount}
                  variant="secondary"
                  style={{ width: '100%', marginBottom: 12 }}
                  onClick={async () => {
                    // TEST MODE: Direct balance update (replace with Stripe)
                    const userRef = doc(db, 'users', user.uid);
                    await setDoc(userRef, {
                      balance: (userData?.balance || 0) + amount
                    }, { merge: true });
                    
                    // Log transaction
                    await addDoc(collection(db, 'transactions'), {
                      userId: user.uid,
                      type: 'deposit',
                      amount: amount,
                      createdAt: serverTimestamp(),
                    });
                    
                    setScreen('home');
                  }}
                >
                  Add ${amount}.00
                </Button>
              ))}
            </Card>
          </div>
        </>
      )}
      
      {/* WITHDRAW */}
      {screen === 'withdraw' && (
        <>
          <Header title="Withdraw" onBack={() => setScreen('home')} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            gap: 20,
          }}>
            <Card style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8 }}>WITHDRAW FUNDS</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.gold, marginBottom: 8 }}>
                ${(userData?.balance || 0).toFixed(2)}
              </div>
              <p style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 20 }}>
                Available balance
              </p>
              
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                Withdrawal to bank/PayPal coming soon with Stripe Connect integration.
              </p>
            </Card>
          </div>
        </>
      )}
      
      {/* TUTORIAL */}
      {screen === 'tutorial' && pendingGame && (
        <div 
          onClick={dismissTutorial}
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: 'pointer',
          }}
        >
          <div style={{
            background: COLORS.bgCard,
            borderRadius: 24,
            padding: 32,
            maxWidth: 340,
            width: '100%',
            textAlign: 'center',
            border: `2px solid ${COLORS.primary}40`,
            boxShadow: `0 0 40px ${COLORS.primary}20`,
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {TUTORIALS[pendingGame.type].icon}
            </div>
            
            <h2 style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              margin: '0 0 8px',
              color: COLORS.text,
            }}>
              {TUTORIALS[pendingGame.type].title}
            </h2>
            
            <p style={{ 
              fontSize: 16, 
              color: COLORS.primary, 
              margin: '0 0 24px',
              fontWeight: 600,
            }}>
              {TUTORIALS[pendingGame.type].instruction}
            </p>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8,
              marginBottom: 24,
            }}>
              {TUTORIALS[pendingGame.type].tips.map((tip, i) => (
                <div 
                  key={i}
                  style={{
                    fontSize: 14,
                    color: COLORS.textMuted,
                    padding: '8px 12px',
                    background: COLORS.bgLight,
                    borderRadius: 8,
                  }}
                >
                  {tip}
                </div>
              ))}
            </div>
            
            <div style={{ 
              fontSize: 13, 
              color: COLORS.textDim,
              animation: 'pulse 1.5s infinite',
            }}>
              Tap anywhere to start
            </div>
          </div>
          
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}
      
      {/* PRACTICE - Game Selection */}
      {screen === 'practice' && (
        <>
          <Header 
            title="Practice" 
            onBack={() => setScreen('home')}
          />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            gap: 16,
          }}>
            <p style={{ color: COLORS.textMuted, margin: '0 0 8px', textAlign: 'center' }}>
              Try any game • No entry fee • Learn the mechanics
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, width: '100%', maxWidth: 320 }}>
              {Object.entries(GAME_INFO).map(([key, game]) => (
                <Card 
                  key={key} 
                  style={{ padding: 20, textAlign: 'center', transition: 'transform 0.1s, box-shadow 0.1s' }}
                  onClick={() => startPractice(key)}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{game.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{game.name}</div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* PRACTICE - Playing Game */}
      {screen === 'practice-game' && practiceGame && (
        <>
          <Header 
            title={`${GAME_INFO[practiceGame.type].icon} ${GAME_INFO[practiceGame.type].name}`}
            onBack={() => { setScreen('practice'); setPracticeGame(null); }}
          />
          {renderPracticeGame()}
        </>
      )}
      
      {/* PRACTICE - Results */}
      {screen === 'practice-results' && practiceGame && (
        <>
          <Header 
            title="Practice Complete"
            onBack={() => setScreen('practice')}
          />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            gap: 20,
          }}>
            <Card style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{GAME_INFO[practiceGame.type].icon}</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{GAME_INFO[practiceGame.type].name}</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8 }}>PRACTICE SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary, marginBottom: 20 }}>
                {practiceGame.lastScore || '—'}
              </div>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button variant="secondary" onClick={() => startPractice(practiceGame.type)}>
                  Play Again
                </Button>
                <Button onClick={() => setScreen('practice')}>
                  Try Another
                </Button>
              </div>
            </Card>
            
            <Button 
              size="lg" 
              onClick={() => { setScreen('home'); setPracticeGame(null); }}
              style={{ background: `linear-gradient(135deg, ${COLORS.gold}, #ff8c00)` }}
            >
              Enter Real Tournament →
            </Button>
          </div>
        </>
      )}
      
      {/* TOURNAMENT */}
      {screen === 'tournament' && tournamentState && (
        <>
          <Header 
            title={`Round of ${tournamentState.playersRemaining}`}
            onBack={() => { setScreen('home'); setTournamentState(null); }}
            right={
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                Seed: #{tournamentState.seed}
              </div>
            }
          />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            gap: 20,
          }}>
            {/* Round info */}
            <div style={{ display: 'flex', gap: 12 }}>
              <StatBox label="ROUND" value={tournamentState.round} />
              <StatBox label="PLAYERS" value={tournamentState.playersRemaining} />
            </div>
            
            {/* Game card */}
            <Card style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
              {(() => {
                const game = GAME_INFO[tournamentState.roundGame];
                return (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>{game.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{game.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 20 }}>
                      {tournamentState.playersRemaining === 2 ? 'FINALS - Head to Head!' : `Top ${tournamentState.playersRemaining / 2} advance`}
                    </div>
                    
                    {tournamentState.status === 'waiting' && (
                      <Button onClick={startRound}>Play Now</Button>
                    )}
                    
                    {tournamentState.status === 'results' && (
                      <div>
                        <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 4 }}>YOUR SCORE</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>
                          {tournamentState.playerScore}
                        </div>
                        <div style={{ 
                          fontSize: 14, 
                          color: tournamentState.advances ? COLORS.success : COLORS.danger,
                          marginBottom: 16,
                        }}>
                          Rank: {tournamentState.playerRank}/{tournamentState.playersRemaining}
                          {tournamentState.advances ? ' ✓ ADVANCED' : ' ✗ ELIMINATED'}
                        </div>
                        <Button 
                          onClick={nextRound}
                          variant={tournamentState.advances ? 'primary' : 'secondary'}
                        >
                          {tournamentState.advances ? 'Next Round' : 'Back to Lobby'}
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </Card>
          </div>
        </>
      )}
      
      {/* GAME */}
      {screen === 'game' && currentGame && (
        <>
          <Header 
            title={`${GAME_INFO[currentGame.type].icon} ${GAME_INFO[currentGame.type].name}`}
          />
          {renderGame()}
        </>
      )}
      
      {/* WINNER */}
      {screen === 'winner' && (
        <>
          <Header title="🏆 Champion!" />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            minHeight: '70vh',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>🏆</div>
            <h1 style={{ fontSize: 32, margin: '0 0 12px', color: COLORS.gold }}>CHAMPION!</h1>
            <p style={{ color: COLORS.textMuted, marginBottom: 24 }}>
              You defeated 31 players to claim victory!
            </p>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>PRIZE WON</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.gold }}>${PRIZE_POOL}</div>
            </Card>
            <Card style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>NEW BALANCE</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.success }}>${(userData?.balance || 0).toFixed(2)}</div>
            </Card>
            <Button onClick={() => { setScreen('home'); setTournamentState(null); }}>
              Back to Lobby
            </Button>
          </div>
        </>
      )}
      
      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <div style={{
            background: COLORS.bgCard,
            borderRadius: 20,
            padding: 28,
            maxWidth: 320,
            width: '100%',
            textAlign: 'center',
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎪</div>
            <h3 style={{ fontSize: 22, margin: '0 0 8px', color: COLORS.text }}>Enter Tournament?</h3>
            <p style={{ fontSize: 14, color: COLORS.textMuted, margin: '0 0 20px' }}>
              <span style={{ color: COLORS.gold, fontWeight: 700, fontSize: 24 }}>${ENTRY_FEE}.00</span>
              <br />
              will be deducted from your balance
            </p>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              gap: 12,
              padding: '16px 0',
              borderTop: `1px solid ${COLORS.border}`,
              borderBottom: `1px solid ${COLORS.border}`,
              marginBottom: 20,
            }}>
              <div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>CURRENT</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>${(userData?.balance || 0).toFixed(2)}</div>
              </div>
              <div style={{ color: COLORS.textDim, alignSelf: 'center' }}>→</div>
              <div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>AFTER</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.warning }}>${((userData?.balance || 0) - ENTRY_FEE).toFixed(2)}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <Button 
                variant="secondary" 
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setShowConfirmModal(false);
                  startTournament();
                }}
                style={{ flex: 1 }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// APP EXPORT
// ============================================================================

export default function CarnivalApp() {
  return (
    <AuthWrapper>
      <CarnivalGame />
    </AuthWrapper>
  );
}
