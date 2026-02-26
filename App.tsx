/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { 
  Timer, 
  Plus, 
  CheckCircle2, 
  Circle, 
  History, 
  Zap, 
  Target, 
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Download,
  Volume2,
  VolumeX,
  Settings,
  Share2,
  Bell,
  TrendingUp,
  FileJson,
  BarChart2,
  Activity,
  X,
  Trophy,
  Sparkles,
  Upload,
  Eye,
  EyeOff,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// --- Types ---

interface ActivityEntry {
  id: string;
  text: string;
  timestamp: number;
}

interface Habit {
  id: string;
  label: string;
  completed: boolean;
}

interface MiniGoal {
  id: string;
  text: string;
  deadline: string;
  completed: boolean;
}

interface IfThenPlan {
  id: string;
  trigger: string;
  action: string;
}

interface WOOPPlan {
  wish: string;
  outcome: string;
  obstacle: string;
  plan: string;
}

interface Theme {
  name: string;
  color: string;
  unlockPoints: number;
}

interface AnalyticsData {
  timerSessions: number;
  habitsCompleted: number;
  goalsCreated: number;
  ifThenCreated: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: any;
  requirement: (stats: { points: number, streak: number, analytics: AnalyticsData }) => boolean;
}

// --- Constants ---

const THEMES: Theme[] = [
  { name: 'Matrix Green', color: '#00FF41', unlockPoints: 0 },
  { name: 'Amber Alert', color: '#FFB000', unlockPoints: 50 },
  { name: 'Plasma Blue', color: '#00D1FF', unlockPoints: 100 },
  { name: 'Crimson Surge', color: '#FF3131', unlockPoints: 250 },
  { name: 'Void Purple', color: '#BC13FE', unlockPoints: 500 },
];

const IF_THEN_PRESETS = [
  { trigger: 'I get distracted by my phone', action: 'I will set a timer of 20 minutes to do deep-work' },
  { trigger: 'I want to spend something online', action: 'I will wait 30 minutes and see if I still need it' },
  { trigger: 'I feel like procrastinating', action: 'I will do 10 pushups and start a 5-minute burst' },
  { trigger: 'I lose focus on my task', action: 'I will take 3 deep breaths and write down my next tiny step' },
];

const TIMER_DURATION = 300; // 5 minutes in seconds

const SPARK_TASKS = [
  "Clear 5 emails",
  "Do 10 pushups",
  "Drink a glass of water",
  "Write down 1 tiny win",
  "Tidy your desk for 2 mins",
  "Take 5 deep breaths",
  "Plan your next 1 hour",
  "Stretch for 60 seconds",
  "Close all unused tabs",
  "Message a friend"
];

const BADGES: Badge[] = [
  { 
    id: 'starter', 
    name: 'Engine Start', 
    description: 'Earn your first 10 points', 
    icon: Zap,
    requirement: ({ points }) => points >= 10 
  },
  { 
    id: 'consistent', 
    name: 'Steady State', 
    description: 'Maintain a 3-day streak', 
    icon: Activity,
    requirement: ({ streak }) => streak >= 3 
  },
  { 
    id: 'focused', 
    name: 'Deep Diver', 
    description: 'Complete 10 timer sessions', 
    icon: Timer,
    requirement: ({ analytics }) => analytics.timerSessions >= 10 
  },
  { 
    id: 'planner', 
    name: 'Strategist', 
    description: 'Create 5 If-Then plans', 
    icon: Lightbulb,
    requirement: ({ analytics }) => analytics.ifThenCreated >= 5 
  },
  { 
    id: 'master', 
    name: 'Momentum Master', 
    description: 'Earn 500 points', 
    icon: Trophy,
    requirement: ({ points }) => points >= 500 
  },
];

const STORAGE_KEYS = {
  ENTRIES: 'momentum_entries',
  HABITS: 'momentum_habits',
  FUTURE_COST: 'momentum_future_cost',
  POINTS: 'momentum_points',
  LAST_RESET: 'momentum_last_reset',
  VISION: 'momentum_vision',
  MINI_GOALS: 'momentum_mini_goals',
  IF_THEN: 'momentum_if_then',
  WOOP: 'momentum_woop',
  THEME: 'momentum_theme',
  AUDIO_SHIELD: 'momentum_audio_shield',
  REMINDERS: 'momentum_reminders',
  ANALYTICS: 'momentum_analytics',
  HABIT_HISTORY: 'momentum_habit_history',
  FUTURE_COST_NOTES: 'momentum_future_cost_notes'
};

// --- Helper Functions ---

const getTodayString = () => new Date().toDateString();

const getLast30Days = () => {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
};

const calculateStreak = (entries: ActivityEntry[]) => {
  if (entries.length === 0) return 0;
  
  const dates = Array.from(new Set(entries.map(e => new Date(e.timestamp).toDateString())));
  const today = getTodayString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (!dates.includes(today) && !dates.includes(yesterday)) return 0;
  
  let streak = 0;
  let currentDate = dates.includes(today) ? new Date() : new Date(Date.now() - 86400000);
  
  while (dates.includes(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
};

export default function App() {
  // --- State ---
  
  const [entries, setEntries] = useState<ActivityEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HABITS);
    return saved ? JSON.parse(saved) : [
      { id: '1', label: 'Wake up 30m earlier', completed: false },
      { id: '2', label: 'Read 10 pages', completed: false },
      { id: '3', label: 'Meditate 5 minutes', completed: false },
      { id: '4', label: 'Gratitude journal', completed: false }
    ];
  });
  
  const [vision, setVision] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.VISION) || '';
  });

  const [miniGoals, setMiniGoals] = useState<MiniGoal[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MINI_GOALS);
    return saved ? JSON.parse(saved) : [];
  });

  const [ifThenPlans, setIfThenPlans] = useState<IfThenPlan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IF_THEN);
    return saved ? JSON.parse(saved) : [];
  });

  const [woop, setWoop] = useState<WOOPPlan>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WOOP);
    return saved ? JSON.parse(saved) : { wish: '', outcome: '', obstacle: '', plan: '' };
  });
  
  const [points, setPoints] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POINTS);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [activeTheme, setActiveTheme] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || THEMES[0].color;
  });

  const [audioShieldEnabled, setAudioShieldEnabled] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUDIO_SHIELD) === 'true';
  });

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.REMINDERS) === 'true';
  });

  const [habitHistory, setHabitHistory] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HABIT_HISTORY);
    return saved ? JSON.parse(saved) : {};
  });

  const [futureCostNotes, setFutureCostNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FUTURE_COST_NOTES);
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [sparkTask, setSparkTask] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AnalyticsData>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
    return saved ? JSON.parse(saved) : {
      timerSessions: 0,
      habitsCompleted: 0,
      goalsCreated: 0,
      ifThenCreated: 0
    };
  });

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [newGoal, setNewGoal] = useState({ text: '', deadline: '' });
  const [newIfThen, setNewIfThen] = useState({ trigger: '', action: '' });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // --- Effects ---

  // Theme Application
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', activeTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, activeTheme);
  }, [activeTheme]);

  // Audio Shield Logic
  useEffect(() => {
    if (isActive && audioShieldEnabled) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Generate Brown Noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.15; // Low volume for background
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start();
      noiseSourceRef.current = source;
    } else {
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current = null;
      }
    }
    
    return () => {
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current = null;
      }
    };
  }, [isActive, audioShieldEnabled]);

  // PWA Install Logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VISION, vision);
  }, [vision]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MINI_GOALS, JSON.stringify(miniGoals));
  }, [miniGoals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IF_THEN, JSON.stringify(ifThenPlans));
  }, [ifThenPlans]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WOOP, JSON.stringify(woop));
  }, [woop]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POINTS, points.toString());
  }, [points]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIO_SHIELD, audioShieldEnabled.toString());
  }, [audioShieldEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, remindersEnabled.toString());
  }, [remindersEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
  }, [analytics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HABIT_HISTORY, JSON.stringify(habitHistory));
  }, [habitHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FUTURE_COST_NOTES, JSON.stringify(futureCostNotes));
  }, [futureCostNotes]);

  // Midnight Reset Logic
  useEffect(() => {
    const checkReset = () => {
      const lastReset = localStorage.getItem(STORAGE_KEYS.LAST_RESET);
      const today = getTodayString();
      
      if (lastReset !== today) {
        setHabits(prev => prev.map(h => ({ ...h, completed: false })));
        localStorage.setItem(STORAGE_KEYS.LAST_RESET, today);
      }
    };
    
    checkReset();
    const interval = setInterval(checkReset, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  // --- Handlers ---

  const handleTimerComplete = () => {
    setIsActive(false);
    setTimeLeft(TIMER_DURATION);
    setPoints(prev => prev + 1);
    setAnalytics(prev => ({ ...prev, timerSessions: prev.timerSessions + 1 }));
    
    // Auto-log the momentum point
    const entry: ActivityEntry = {
      id: Date.now().toString(),
      text: 'Completed 5-Minute Action Burst',
      timestamp: Date.now()
    };
    setEntries(prev => [entry, ...prev]);
    
    // Simple vibration if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(TIMER_DURATION);
  };

  const addEntry = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!newEntry.trim()) return;
    
    const entry: ActivityEntry = {
      id: Date.now().toString(),
      text: newEntry.trim(),
      timestamp: Date.now()
    };
    
    setEntries(prev => [entry, ...prev]);
    setNewEntry('');
  };

  const toggleHabit = (id: string) => {
    setHabits(prev => {
      const newHabits = prev.map(h => 
        h.id === id ? { ...h, completed: !h.completed } : h
      );
      const habit = newHabits.find(h => h.id === id);
      if (habit?.completed) {
        setAnalytics(prevA => ({ ...prevA, habitsCompleted: prevA.habitsCompleted + 1 }));
        
        // Log to history
        const today = getTodayString();
        setHabitHistory(prevH => {
          const dayHistory = prevH[today] || [];
          if (!dayHistory.includes(habit.label)) {
            return { ...prevH, [today]: [...dayHistory, habit.label] };
          }
          return prevH;
        });
      }
      return newHabits;
    });
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addMiniGoal = (e: FormEvent) => {
    e.preventDefault();
    if (!newGoal.text.trim()) return;
    const goal: MiniGoal = {
      id: Date.now().toString(),
      text: newGoal.text.trim(),
      deadline: newGoal.deadline,
      completed: false
    };
    setMiniGoals(prev => [...prev, goal]);
    setAnalytics(prev => ({ ...prev, goalsCreated: prev.goalsCreated + 1 }));
    setNewGoal({ text: '', deadline: '' });
  };

  const toggleMiniGoal = (id: string) => {
    setMiniGoals(prev => prev.map(g => 
      g.id === id ? { ...g, completed: !g.completed } : g
    ));
  };

  const deleteMiniGoal = (id: string) => {
    setMiniGoals(prev => prev.filter(g => g.id !== id));
  };

  const addIfThen = (e: FormEvent) => {
    e.preventDefault();
    if (!newIfThen.trigger.trim() || !newIfThen.action.trim()) return;
    const plan: IfThenPlan = {
      id: Date.now().toString(),
      trigger: newIfThen.trigger.trim(),
      action: newIfThen.action.trim()
    };
    setIfThenPlans(prev => [...prev, plan]);
    setAnalytics(prev => ({ ...prev, ifThenCreated: prev.ifThenCreated + 1 }));
    setNewIfThen({ trigger: '', action: '' });
  };

  const deleteIfThen = (id: string) => {
    setIfThenPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("To install: Open your browser menu (three dots) and select 'Install App' or 'Add to Home Screen'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const exportData = () => {
    const data = {
      entries,
      habits,
      vision,
      miniGoals,
      ifThenPlans,
      woop,
      points,
      activeTheme,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `momentum_engine_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.entries) setEntries(data.entries);
        if (data.habits) setHabits(data.habits);
        if (data.vision) setVision(data.vision);
        if (data.miniGoals) setMiniGoals(data.miniGoals);
        if (data.ifThenPlans) setIfThenPlans(data.ifThenPlans);
        if (data.woop) setWoop(data.woop);
        if (data.points) setPoints(data.points);
        if (data.activeTheme) setActiveTheme(data.activeTheme);
        if (data.habitHistory) setHabitHistory(data.habitHistory);
        if (data.futureCostNotes) setFutureCostNotes(data.futureCostNotes);
        if (data.analytics) setAnalytics(data.analytics);
        
        alert("System data restored successfully.");
      } catch (err) {
        alert("Error: Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const generateSpark = () => {
    const random = SPARK_TASKS[Math.floor(Math.random() * SPARK_TASKS.length)];
    setSparkTask(random);
  };

  const applyPreset = (preset: { trigger: string, action: string }) => {
    const plan: IfThenPlan = {
      id: Date.now().toString(),
      trigger: preset.trigger,
      action: preset.action
    };
    setIfThenPlans(prev => [...prev, plan]);
    setAnalytics(prev => ({ ...prev, ifThenCreated: prev.ifThenCreated + 1 }));
  };

  const toggleReminders = async () => {
    if (!remindersEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setRemindersEnabled(true);
        alert("Daily check-in reminders enabled.");
      } else {
        alert("Notification permission denied.");
      }
    } else {
      setRemindersEnabled(false);
    }
  };

  // --- Derived State ---

  const streak = useMemo(() => calculateStreak(entries), [entries]);
  
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(entry => {
      const dateStr = new Date(entry.timestamp).toDateString();
      map[dateStr] = (map[dateStr] || 0) + 1;
    });
    return map;
  }, [entries]);

  const velocityData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      data.push({
        name: d.toLocaleDateString([], { weekday: 'short' }),
        actions: activityMap[dateStr] || 0
      });
    }
    return data;
  }, [activityMap]);

  const avgActionsPerDay = useMemo(() => {
    const dates = Object.keys(activityMap);
    if (dates.length === 0) return 0;
    return (entries.length / dates.length).toFixed(1);
  }, [entries, activityMap]);

  const mostActiveDay = useMemo(() => {
    let max = 0;
    let day = 'N/A';
    Object.entries(activityMap).forEach(([date, count]) => {
      const c = count as number;
      if (c > max) {
        max = c;
        day = new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    });
    return { day, count: max };
  }, [activityMap]);

  const last30Days = useMemo(() => getLast30Days(), []);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-engine-bg text-white p-3 sm:p-4 md:p-8 font-sans selection:bg-engine-accent selection:text-black">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        
        {/* Header Section */}
        <header className="lg:col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 md:mb-4 border-b border-engine-border pb-4 md:pb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter uppercase italic flex items-center gap-2 sm:gap-3">
              <Zap className="text-engine-accent fill-engine-accent sm:w-8 sm:h-8" size={24} />
              The Momentum Engine
            </h1>
            <p className="text-engine-text-dim font-mono text-[10px] sm:text-xs mt-1 uppercase tracking-widest">
              Status: Operational // Harvard Study Optimized
            </p>
          </div>
          
          <div className="flex gap-6 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end border-t border-engine-border pt-4 sm:border-t-0 sm:pt-0">
            <div className="text-center">
              <p className="text-[10px] uppercase text-engine-text-dim font-mono mb-1">Streak</p>
              <p className="text-2xl sm:text-3xl font-bold font-mono text-engine-accent glow-accent">{streak}D</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-engine-text-dim font-mono mb-1">Points</p>
              <p className="text-2xl sm:text-3xl font-bold font-mono text-white">{points}</p>
            </div>
            <button 
              onClick={handleInstall}
              className="flex flex-col items-center justify-center p-2 border border-engine-border hover:border-engine-accent hover:text-engine-accent transition-all rounded-sm group"
              title="Install App / Download"
            >
              <Download size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-mono mt-1 uppercase">Install</span>
            </button>
          </div>
        </header>

        {/* Momentum History & Velocity */}
        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Heatmap */}
          <section className="lg:col-span-2 engine-panel p-4 sm:p-6 rounded-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 text-engine-text-dim uppercase text-[10px] sm:text-xs font-mono tracking-widest">
                <Calendar size={14} />
                Momentum History // 30-Day Heatmap
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                 <div className="flex items-center gap-1">
                   <div className="w-3 h-3 bg-engine-border rounded-sm" />
                   <span className="text-[8px] sm:text-[9px] text-engine-text-dim font-mono uppercase">0</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <div className="w-3 h-3 bg-engine-accent/30 rounded-sm" />
                   <span className="text-[8px] sm:text-[9px] text-engine-text-dim font-mono uppercase">1-2</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <div className="w-3 h-3 bg-engine-accent/60 rounded-sm" />
                   <span className="text-[8px] sm:text-[9px] text-engine-text-dim font-mono uppercase">3-5</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <div className="w-3 h-3 bg-engine-accent rounded-sm shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
                   <span className="text-[8px] sm:text-[9px] text-engine-text-dim font-mono uppercase">6+</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5 sm:gap-2">
              {last30Days.map((date, i) => {
                const dateStr = date.toDateString();
                const count = activityMap[dateStr] || 0;
                const isToday = dateStr === getTodayString();
                
                let bgColor = 'bg-engine-border';
                let glowClass = '';
                
                if (count > 0 && count <= 2) bgColor = 'bg-engine-accent/30';
                else if (count > 2 && count <= 5) bgColor = 'bg-engine-accent/60';
                else if (count > 5) {
                  bgColor = 'bg-engine-accent';
                  glowClass = 'shadow-[0_0_8px_rgba(0,255,65,0.4)]';
                }

                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(dateStr)}
                    className="flex flex-col items-center gap-1 group relative w-full"
                  >
                    <div 
                      className={`w-full aspect-square rounded-sm transition-all duration-300 ${bgColor} ${glowClass} ${isToday ? 'ring-1 ring-white ring-offset-1 ring-offset-engine-bg' : ''} group-hover:scale-110 cursor-pointer`}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-[9px] font-bold font-mono rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                        {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}: {count} ACTIONS
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Velocity Chart */}
          <section className="engine-panel p-4 sm:p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-6 text-engine-text-dim uppercase text-[10px] sm:text-xs font-mono tracking-widest">
              <TrendingUp size={14} />
              Momentum Velocity // 7-Day Trend
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#737373" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis hide />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', fontSize: '10px' }}
                    itemStyle={{ color: '#00FF41' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actions" 
                    stroke="var(--accent-color)" 
                    strokeWidth={2} 
                    dot={{ fill: 'var(--accent-color)', r: 4 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Left Column: Action & Science */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Timer Widget */}
          <section className="engine-panel p-6 rounded-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-engine-accent opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
                <Timer size={14} />
                5-Minute Action Burst
              </div>
              <button 
                onClick={() => setAudioShieldEnabled(!audioShieldEnabled)}
                className={`flex items-center gap-1 text-[10px] font-mono uppercase transition-colors ${audioShieldEnabled ? 'text-engine-accent' : 'text-engine-text-dim hover:text-white'}`}
                title="Deep Work Audio Shield (Brown Noise)"
              >
                {audioShieldEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                {audioShieldEnabled ? 'Shield ON' : 'Shield OFF'}
              </button>
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`flex items-center gap-1 text-[10px] font-mono uppercase transition-colors ${isFocusMode ? 'text-engine-accent' : 'text-engine-text-dim hover:text-white'}`}
                title="Toggle Focus Mode UI"
              >
                {isFocusMode ? <EyeOff size={12} /> : <Eye size={12} />}
                {isFocusMode ? 'Focus ON' : 'Focus OFF'}
              </button>
            </div>
            
            <div className="text-center py-4">
              <div className={`text-7xl font-bold font-mono tracking-tighter mb-6 ${isActive ? 'text-engine-accent glow-accent' : 'text-white'}`}>
                {formatTime(timeLeft)}
              </div>
              
              <div className="flex justify-center gap-4">
                <button 
                  onClick={toggleTimer}
                  className={`flex items-center gap-2 px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-sm transition-all ${
                    isActive 
                    ? 'bg-transparent border border-white text-white hover:bg-white hover:text-black' 
                    : 'bg-engine-accent text-black hover:bg-opacity-80 glow-border-accent'
                  }`}
                >
                  {isActive ? <Pause size={18} /> : <Play size={18} />}
                  {isActive ? 'Pause' : 'Start'}
                </button>
                
                <button 
                  onClick={resetTimer}
                  className="p-3 border border-engine-border text-engine-text-dim hover:text-white hover:border-white transition-colors"
                  title="Reset Timer"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* Science Insights */}
          <section className="engine-panel p-6 rounded-sm border-l-2 border-engine-accent/30">
            <div className="flex items-center gap-2 mb-4 text-engine-accent uppercase text-[10px] font-mono tracking-widest font-bold">
              <Zap size={12} />
              Harvard Study Insights
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-engine-bg/50 border border-engine-border rounded-sm">
                <p className="text-xs font-mono text-engine-accent mb-1">10X RESULTS</p>
                <p className="text-[11px] text-engine-text-dim leading-relaxed">
                  Only 3% of people write their goals down. They achieve <span className="text-white font-bold">10x more results</span> than the other 97%.
                </p>
              </div>
              <div className="p-3 bg-engine-bg/50 border border-engine-border rounded-sm">
                <p className="text-xs font-mono text-engine-accent mb-1">+76% SUCCESS</p>
                <p className="text-[11px] text-engine-text-dim leading-relaxed">
                  Setting goals with <span className="text-white font-bold">deadlines</span> increases success rate by 76%.
                </p>
              </div>
              <div className="p-3 bg-engine-bg/50 border border-engine-border rounded-sm">
                <p className="text-xs font-mono text-engine-accent mb-1">+300% COMMITMENT</p>
                <p className="text-[11px] text-engine-text-dim leading-relaxed">
                  Using <span className="text-white font-bold">If-Then</span> planning makes you 300% more likely to achieve your goals.
                </p>
              </div>
            </div>
          </section>

          {/* Habit Tracker */}
          <section className="engine-panel p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-6 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
              <CheckCircle2 size={14} />
              Daily Habit Engine
            </div>
            
            <div className="space-y-3">
              {habits.map(habit => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`w-full flex items-center gap-3 p-3 border transition-all text-left ${
                    habit.completed 
                    ? 'bg-engine-accent/5 border-engine-accent/30 text-engine-accent' 
                    : 'bg-transparent border-engine-border text-engine-text-dim hover:border-engine-text-dim'
                  }`}
                >
                  {habit.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  <span className={`font-medium ${habit.completed ? 'line-through opacity-70' : ''}`}>
                    {habit.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Middle Column: Manifestation & Clarity */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Big Vision & Mini Goals */}
          <section className="engine-panel p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-4 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
              <Target size={14} />
              Manifestation Engine
            </div>
            
            <div className="mb-6">
              <label className="text-[10px] uppercase text-engine-text-dim font-mono mb-2 block">Big Vision</label>
              <input
                type="text"
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                placeholder="e.g. Start a business"
                className="w-full bg-engine-bg border border-engine-border px-3 py-2 text-sm focus:border-engine-accent outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase text-engine-text-dim font-mono block">Mini-Goals (Deadlines)</label>
              <form onSubmit={addMiniGoal} className="space-y-2">
                <input
                  type="text"
                  value={newGoal.text}
                  onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
                  placeholder="Mini-goal..."
                  className="w-full bg-engine-bg border border-engine-border px-3 py-2 text-xs focus:border-engine-accent outline-none transition-colors font-mono"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    placeholder="Deadline (e.g. Nov 1)"
                    className="flex-1 bg-engine-bg border border-engine-border px-3 py-2 text-xs focus:border-engine-accent outline-none transition-colors font-mono"
                  />
                  <button type="submit" className="bg-white text-black px-3 py-2 text-xs font-bold uppercase hover:bg-engine-accent transition-colors">
                    Add
                  </button>
                </div>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {miniGoals.map(goal => (
                  <div key={goal.id} className="flex items-center justify-between p-2 border border-engine-border bg-engine-bg/30 text-[11px] group">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleMiniGoal(goal.id)}>
                        {goal.completed ? <CheckCircle2 size={14} className="text-engine-accent" /> : <Circle size={14} className="text-engine-text-dim" />}
                      </button>
                      <span className={goal.completed ? 'line-through opacity-50' : ''}>{goal.text}</span>
                      <span className="text-engine-accent opacity-70">[{goal.deadline}]</span>
                    </div>
                    <button onClick={() => deleteMiniGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-engine-text-dim hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* If-Then Planning */}
          <section className="engine-panel p-6 rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
                <Zap size={14} />
                If-Then Strategy (+300%)
              </div>
              <div className="relative group/presets">
                <button className="text-[10px] font-mono text-engine-accent uppercase hover:underline">Presets</button>
                <div className="absolute right-0 top-full mt-2 w-64 bg-engine-panel border border-engine-border p-2 rounded-sm opacity-0 pointer-events-none group-hover/presets:opacity-100 group-hover/presets:pointer-events-auto z-50 transition-opacity shadow-xl">
                  <p className="text-[9px] text-engine-text-dim uppercase mb-2 border-b border-engine-border pb-1">Battle-Tested Strategies</p>
                  <div className="space-y-1">
                    {IF_THEN_PRESETS.map((p, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => applyPreset(p)}
                        className="w-full text-left p-1.5 hover:bg-engine-bg text-[9px] border border-transparent hover:border-engine-accent transition-colors"
                      >
                        <span className="text-engine-accent font-bold">IF</span> {p.trigger.substring(0, 30)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <form onSubmit={addIfThen} className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-engine-text-dim">IF</span>
                <input
                  type="text"
                  value={newIfThen.trigger}
                  onChange={(e) => setNewIfThen({ ...newIfThen, trigger: e.target.value })}
                  placeholder="I get distracted..."
                  className="flex-1 bg-engine-bg border border-engine-border px-3 py-2 text-xs focus:border-engine-accent outline-none transition-colors font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-engine-text-dim">THEN</span>
                <input
                  type="text"
                  value={newIfThen.action}
                  onChange={(e) => setNewIfThen({ ...newIfThen, action: e.target.value })}
                  placeholder="I will set a timer..."
                  className="flex-1 bg-engine-bg border border-engine-border px-3 py-2 text-xs focus:border-engine-accent outline-none transition-colors font-mono"
                />
              </div>
              <button type="submit" className="w-full bg-white text-black py-2 text-xs font-bold uppercase hover:bg-engine-accent transition-colors">
                Add Strategy
              </button>
            </form>

            <div className="space-y-2">
              {ifThenPlans.map(plan => (
                <div key={plan.id} className="p-2 border border-engine-border bg-engine-bg/30 text-[10px] group relative">
                  <p><span className="text-engine-accent font-bold">IF</span> {plan.trigger}</p>
                  <p><span className="text-engine-accent font-bold">THEN</span> {plan.action}</p>
                  <button onClick={() => deleteIfThen(plan.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-engine-text-dim hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Momentum Spark */}
          <section className="engine-panel p-6 rounded-sm border-t-2 border-engine-accent/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
                <Sparkles size={14} className="text-engine-accent" />
                Momentum Spark // Tiny Action
              </div>
              <button 
                onClick={generateSpark}
                className="text-[10px] font-mono text-engine-accent uppercase hover:underline"
              >
                Generate
              </button>
            </div>
            <div className="p-4 bg-engine-bg/50 border border-dashed border-engine-border rounded-sm text-center">
              {sparkTask ? (
                <motion.p 
                  key={sparkTask}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-bold text-white italic"
                >
                  "{sparkTask}"
                </motion.p>
              ) : (
                <p className="text-[10px] text-engine-text-dim font-mono uppercase">Need a tiny win? Click generate.</p>
              )}
            </div>
          </section>

          {/* WOOP Framework */}
          <section className="engine-panel p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-4 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
              <Target size={14} />
              WOOP Framework
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] uppercase text-engine-text-dim font-mono block mb-1">Wish (Define what you want)</label>
                <input type="text" value={woop.wish} onChange={(e) => setWoop({ ...woop, wish: e.target.value })} className="w-full bg-engine-bg border border-engine-border px-2 py-1 text-xs focus:border-engine-accent outline-none font-mono" />
              </div>
              <div>
                <label className="text-[9px] uppercase text-engine-text-dim font-mono block mb-1">Outcome (Visualize impact)</label>
                <input type="text" value={woop.outcome} onChange={(e) => setWoop({ ...woop, outcome: e.target.value })} className="w-full bg-engine-bg border border-engine-border px-2 py-1 text-xs focus:border-engine-accent outline-none font-mono" />
              </div>
              <div>
                <label className="text-[9px] uppercase text-engine-text-dim font-mono block mb-1">Obstacle (What stops you?)</label>
                <input type="text" value={woop.obstacle} onChange={(e) => setWoop({ ...woop, obstacle: e.target.value })} className="w-full bg-engine-bg border border-engine-border px-2 py-1 text-xs focus:border-engine-accent outline-none font-mono" />
              </div>
              <div>
                <label className="text-[9px] uppercase text-engine-text-dim font-mono block mb-1">Plan (Strategy to overcome)</label>
                <input type="text" value={woop.plan} onChange={(e) => setWoop({ ...woop, plan: e.target.value })} className="w-full bg-engine-bg border border-engine-border px-2 py-1 text-xs focus:border-engine-accent outline-none font-mono" />
              </div>
            </div>
          </section>

          {/* Future Cost Log */}
          <section className="engine-panel p-6 rounded-sm border-b-2 border-engine-accent/20">
            <div className="flex items-center gap-2 mb-4 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
              <TrendingUp size={14} />
              Future Cost Log
            </div>
            <p className="text-[10px] text-engine-text-dim font-mono mb-4 leading-relaxed">
              Why does today's action matter for your future self? Write it down to cement your commitment.
            </p>
            <textarea
              value={futureCostNotes[getTodayString()] || ''}
              onChange={(e) => setFutureCostNotes(prev => ({ ...prev, [getTodayString()]: e.target.value }))}
              placeholder="If I don't do this today, the future cost is..."
              className="w-full h-24 bg-engine-bg border border-engine-border p-3 text-xs focus:border-engine-accent outline-none font-mono resize-none transition-colors"
            />
          </section>
        </div>

        {/* Right Column: Activity Log */}
        <div className="lg:col-span-4 space-y-6">
          
          <section className="engine-panel p-4 sm:p-6 rounded-sm flex flex-col h-full lg:min-h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-engine-text-dim uppercase text-[10px] sm:text-xs font-mono tracking-widest">
                <History size={14} />
                Activity Feed
              </div>
              <div className="text-[10px] text-engine-text-dim font-mono uppercase">
                {entries.length} Events
              </div>
            </div>

            {/* Entry Input */}
            <form onSubmit={addEntry} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder="Action taken..."
                className="flex-1 bg-engine-bg border border-engine-border px-3 py-2 text-xs focus:border-engine-accent outline-none transition-colors font-mono min-w-0"
              />
              <button 
                type="submit"
                className="bg-white text-black px-4 py-2 font-bold uppercase text-[10px] tracking-widest hover:bg-engine-accent transition-colors shrink-0"
              >
                Log
              </button>
            </form>

            {/* Entries List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[400px] lg:max-h-none">
              <AnimatePresence initial={false}>
                {entries.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-engine-border rounded-sm">
                    <p className="text-engine-text-dim font-mono text-[10px] uppercase">No activity recorded.</p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="group flex items-start justify-between p-3 border border-engine-border bg-engine-bg/50 hover:border-engine-text-dim transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-white leading-tight">
                          {entry.text}
                        </p>
                        <p className="text-[9px] font-mono text-engine-text-dim uppercase">
                          {new Date(entry.timestamp).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <button 
                        onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-engine-text-dim hover:text-red-500 transition-all"
                      >
                        <Trash2 size={10} />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* System Configuration */}
          <section className="engine-panel p-6 rounded-sm border-t-2 border-engine-accent/20">
            <div className="flex items-center gap-2 mb-6 text-engine-text-dim uppercase text-xs font-mono tracking-widest">
              <Settings size={14} />
              System Config // Engine Upgrades
            </div>

            <div className="space-y-6">
              {/* Engine Analytics */}
              <div className="p-4 bg-engine-bg/50 border border-engine-border rounded-sm">
                <div className="flex items-center gap-2 mb-4 text-engine-accent uppercase text-[10px] font-mono tracking-widest font-bold">
                  <Activity size={12} />
                  Local Engine Analytics
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-engine-text-dim uppercase font-mono">Timer Sessions</p>
                    <p className="text-xl font-bold font-mono">{analytics.timerSessions}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-engine-text-dim uppercase font-mono">Habits Done</p>
                    <p className="text-xl font-bold font-mono">{analytics.habitsCompleted}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-engine-text-dim uppercase font-mono">Goals Created</p>
                    <p className="text-xl font-bold font-mono">{analytics.goalsCreated}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-engine-text-dim uppercase font-mono">Avg Actions/Day</p>
                    <p className="text-xl font-bold font-mono text-engine-accent">{avgActionsPerDay}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-engine-border flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-engine-text-dim uppercase font-mono">Peak Momentum</p>
                    <p className="text-xs font-bold font-mono">{mostActiveDay.day} ({mostActiveDay.count} pts)</p>
                  </div>
                  <BarChart2 size={20} className="text-engine-text-dim opacity-30" />
                </div>
              </div>

              {/* Achievement Medals */}
              <div>
                <label className="text-[10px] uppercase text-engine-text-dim font-mono block mb-3">System Achievements</label>
                <div className="grid grid-cols-5 gap-2">
                  {BADGES.map((badge) => {
                    const isEarned = badge.requirement({ points, streak, analytics });
                    const Icon = badge.icon;
                    return (
                      <div
                        key={badge.id}
                        className={`aspect-square rounded-sm border flex items-center justify-center relative group transition-all ${
                          isEarned ? 'border-engine-accent bg-engine-accent/10 text-engine-accent' : 'border-engine-border text-engine-text-dim opacity-30'
                        }`}
                      >
                        <Icon size={18} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-engine-border text-[8px] font-mono text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          <p className="font-bold">{badge.name}</p>
                          <p className="text-[7px] text-engine-text-dim">{badge.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="text-[10px] uppercase text-engine-text-dim font-mono block mb-3">Accent Upgrades (Unlock with Points)</label>
                <div className="grid grid-cols-5 gap-2">
                  {THEMES.map((theme) => {
                    const isUnlocked = points >= theme.unlockPoints;
                    const isActive = activeTheme === theme.color;
                    return (
                      <button
                        key={theme.name}
                        disabled={!isUnlocked}
                        onClick={() => setActiveTheme(theme.color)}
                        className={`aspect-square rounded-sm border-2 transition-all relative group ${
                          isActive ? 'border-white scale-110' : 'border-transparent'
                        } ${!isUnlocked ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}`}
                        style={{ backgroundColor: theme.color }}
                        title={`${theme.name} ${!isUnlocked ? `(Unlock at ${theme.unlockPoints} pts)` : ''}`}
                      >
                        {!isUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Zap size={12} className="text-black" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles & Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={toggleReminders}
                  className={`flex items-center justify-center gap-2 p-3 border text-[10px] font-mono uppercase transition-all ${
                    remindersEnabled ? 'border-engine-accent text-engine-accent bg-engine-accent/5' : 'border-engine-border text-engine-text-dim hover:border-white hover:text-white'
                  }`}
                >
                  <Bell size={14} />
                  {remindersEnabled ? 'Reminders ON' : 'Reminders OFF'}
                </button>
                <button 
                  onClick={exportData}
                  className="flex items-center justify-center gap-2 p-3 border border-engine-border text-engine-text-dim hover:border-white hover:text-white text-[10px] font-mono uppercase transition-all"
                >
                  <FileJson size={14} />
                  Export Log
                </button>
                <label className="flex items-center justify-center gap-2 p-3 border border-engine-border text-engine-text-dim hover:border-white hover:text-white text-[10px] font-mono uppercase transition-all cursor-pointer">
                  <Upload size={14} />
                  Import Log
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto py-12 text-center border-t border-engine-border mt-12 px-4">
        <p className="text-[10px] text-engine-text-dim font-mono uppercase tracking-[0.3em] leading-relaxed">
          The Momentum Engine // Harvard Study Optimized // 90-Day Window Active
        </p>
      </footer>

      {/* Daily Summary Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-engine-panel border border-engine-border rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-engine-border bg-engine-bg/50">
                <div className="flex items-center gap-2 text-engine-accent uppercase text-xs font-mono tracking-widest font-bold">
                  <Calendar size={14} />
                  Daily Summary // {new Date(selectedDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="p-1 text-engine-text-dim hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Logged Actions */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-engine-text-dim uppercase text-[10px] font-mono tracking-widest">
                    <History size={12} />
                    Logged Actions
                  </div>
                  <div className="space-y-2">
                    {entries.filter(e => new Date(e.timestamp).toDateString() === selectedDate).length === 0 ? (
                      <p className="text-[10px] text-engine-text-dim font-mono italic uppercase">No actions logged.</p>
                    ) : (
                      entries
                        .filter(e => new Date(e.timestamp).toDateString() === selectedDate)
                        .map(e => (
                          <div key={e.id} className="p-2 bg-engine-bg/30 border border-engine-border text-[11px] font-medium">
                            {e.text}
                            <span className="block text-[9px] text-engine-text-dim mt-1 uppercase font-mono">
                              {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Completed Habits */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-engine-text-dim uppercase text-[10px] font-mono tracking-widest">
                    <CheckCircle2 size={12} />
                    Completed Habits
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!habitHistory[selectedDate] || habitHistory[selectedDate].length === 0 ? (
                      <p className="text-[10px] text-engine-text-dim font-mono italic uppercase">No habits recorded.</p>
                    ) : (
                      habitHistory[selectedDate].map((h, i) => (
                        <span key={i} className="px-2 py-1 bg-engine-accent/10 border border-engine-accent/30 text-engine-accent text-[10px] font-mono uppercase">
                          {h}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Future Cost Note */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-engine-text-dim uppercase text-[10px] font-mono tracking-widest">
                    <TrendingUp size={12} />
                    Future Cost Note
                  </div>
                  <div className="p-4 bg-engine-accent/5 border border-engine-accent/20 rounded-sm">
                    {futureCostNotes[selectedDate] ? (
                      <p className="text-xs text-white leading-relaxed italic">
                        "{futureCostNotes[selectedDate]}"
                      </p>
                    ) : (
                      <p className="text-[10px] text-engine-text-dim font-mono italic uppercase">No future cost note for this day.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-engine-bg/50 border-t border-engine-border text-center">
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="w-full py-2 bg-white text-black text-xs font-bold uppercase hover:bg-engine-accent transition-colors"
                >
                  Close Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {(isFocusMode && isActive) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-engine-bg flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="max-w-md w-full space-y-12">
              <div className="space-y-4">
                <p className="text-engine-text-dim uppercase font-mono tracking-[0.5em] text-xs">Deep Work In Progress</p>
                <div className="text-9xl font-bold font-mono text-engine-accent glow-accent tabular-nums">
                  {formatTime(timeLeft)}
                </div>
              </div>
              
              <div className="p-6 border border-engine-border bg-engine-panel/50 rounded-sm">
                <p className="text-engine-text-dim uppercase font-mono text-[10px] mb-2 tracking-widest">Current Objective</p>
                <p className="text-xl font-medium text-white italic">
                  {entries[0]?.text || "Focus on the current task."}
                </p>
              </div>

              <div className="flex justify-center gap-6">
                <button 
                  onClick={toggleTimer}
                  className="px-8 py-4 border border-engine-accent text-engine-accent font-mono uppercase text-xs hover:bg-engine-accent hover:text-black transition-all"
                >
                  Pause Session
                </button>
                <button 
                  onClick={() => setIsFocusMode(false)}
                  className="px-8 py-4 border border-engine-border text-engine-text-dim font-mono uppercase text-xs hover:border-white hover:text-white transition-all"
                >
                  Exit Focus
                </button>
              </div>

              {audioShieldEnabled && (
                <div className="flex items-center justify-center gap-2 text-engine-accent/50 font-mono text-[10px] uppercase">
                  <Volume2 size={12} />
                  Audio Shield Active
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
