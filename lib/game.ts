import type { Shortcut, ShortcutCategory } from "../types/shortcut";

export type GameMode =
  | "practice"
  | "timed"
  | "survival"
  | "daily"
  | "decode"
  | "review"
  | "unlimited";
export const MODES: Record<
  GameMode,
  { name: string; icon: string; description: string; detail: string }
> = {
  practice: {
    name: "Quick play",
    icon: "↗",
    description: "Ten prompts. Find your flow.",
    detail: "10 prompts · no pressure",
  },
  timed: {
    name: "Blitz",
    icon: "ϟ",
    description: "One minute. Make every key count.",
    detail: "60 seconds · chase your best",
  },
  survival: {
    name: "Survival",
    icon: "♥",
    description: "Three lives. How far can you go?",
    detail: "3 lives · endless prompts",
  },
  daily: {
    name: "Daily mix",
    icon: "✦",
    description: "Everyone gets the same ten today.",
    detail: "10 fixed prompts · new every day",
  },
  decode: {
    name: "Decode",
    icon: "◇",
    description: "See the keys. Name what they do.",
    detail: "10 prompts · multiple choice",
  },
  review: {
    name: "Weak spots",
    icon: "◎",
    description: "Turn almost into automatic.",
    detail: "10 prompts · your misses first",
  },
  unlimited: {
    name: "Free play",
    icon: "∞",
    description: "Just you and the keyboard.",
    detail: "No timer · stay as long as you like",
  },
};
export const FINITE_MODES: readonly GameMode[] = [
  "practice",
  "daily",
  "decode",
  "review",
];
export const isFiniteMode = (mode: GameMode) => FINITE_MODES.includes(mode);
export const ROUND_LENGTH = 10;
export const BLITZ_MS = 60000;

export type Tier = "essentials" | "everyday" | "all";
export const TIERS: Record<Tier, { name: string; detail: string }> = {
  essentials: { name: "Essentials", detail: "The ones everyone should know" },
  everyday: { name: "Everyday", detail: "Essentials plus daily drivers" },
  all: { name: "Everything", detail: "Including power-user chords" },
};
export function filterPool(
  pool: Shortcut[],
  category: ShortcutCategory | "all",
  tier: Tier,
): Shortcut[] {
  const inCategory =
    category === "all" ? pool : pool.filter((s) => s.category === category);
  const allowed =
    tier === "essentials"
      ? ["starter"]
      : tier === "everyday"
        ? ["starter", "steady"]
        : ["starter", "steady", "stretch"];
  const filtered = inCategory.filter((s) => allowed.includes(s.difficulty));
  // A tiny pool makes for a repetitive round, so widen it when needed.
  return filtered.length >= 4 ? filtered : inCategory;
}

export type Mastery = { attempts: number; correct: number; chain: number };
export type Profile = {
  xp: number;
  sessions: number;
  totalCorrect: number;
  bestStreak: number;
  best: Partial<Record<GameMode, number>>;
  mastery: Record<string, Mastery>;
  daily: Record<string, number>;
  sound: boolean;
  lastDay: string;
  dayStreak: number;
  bestDayStreak: number;
};
export const EMPTY_PROFILE: Profile = {
  xp: 0,
  sessions: 0,
  totalCorrect: 0,
  bestStreak: 0,
  best: {},
  mastery: {},
  daily: {},
  sound: true,
  lastDay: "",
  dayStreak: 0,
  bestDayStreak: 0,
};
export const MASTERY_CHAIN = 3;
export function masteryState(entry: Mastery | undefined) {
  if (!entry || entry.attempts === 0) return "new" as const;
  return entry.chain >= MASTERY_CHAIN
    ? ("mastered" as const)
    : ("learning" as const);
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function previousDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return dayKey(new Date(year, month - 1, date - 1));
}
export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 120)) + 1;
  const floor = 120 * (level - 1) ** 2;
  const ceiling = 120 * level ** 2;
  return {
    level,
    title: [
      "New recruit",
      "Key explorer",
      "Flow finder",
      "Shortcut specialist",
      "Keyboard virtuoso",
      "Chord legend",
    ][Math.min(Math.floor((level - 1) / 2), 5)],
    progress: (xp - floor) / (ceiling - floor),
    remaining: ceiling - xp,
  };
}
export function seededRandom(seedText: string) {
  let seed = [...seedText].reduce(
    (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0,
    7,
  );
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
export function shuffled<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeDeck(
  pool: Shortcut[],
  mode: GameMode,
  profile: Profile,
  day: string,
): Shortcut[] {
  if (mode === "daily")
    return shuffled(pool, seededRandom(day)).slice(0, ROUND_LENGTH);
  const deck = shuffled(pool);
  if (mode === "review")
    deck.sort((a, b) => {
      const rank = (id: string) => {
        const m = profile.mastery[id];
        return m
          ? m.chain +
              m.correct / m.attempts -
              (m.attempts - m.correct > 0 ? 2 : 0)
          : 1;
      };
      return rank(a.id) - rank(b.id);
    });
  return deck;
}
/** Four answers for Decode: the right one plus three that look plausible. */
export function makeChoices(
  question: Shortcut,
  pool: Shortcut[],
  seed: string,
): Shortcut[] {
  const random = seededRandom(seed);
  const differs = (s: Shortcut) =>
    s.id !== question.id && s.action !== question.action;
  const near = shuffled(
    pool.filter((s) => differs(s) && s.category === question.category),
    random,
  );
  const far = shuffled(pool.filter(differs), random);
  const picks = [...new Map([...near, ...far].map((s) => [s.id, s])).values()];
  return shuffled([question, ...picks.slice(0, 3)], random);
}
export function award(
  correct: boolean,
  hints: number,
  seconds: number,
  streak: number,
) {
  const multiplier = Math.min(4, 1 + Math.floor(streak / 3));
  const speed = seconds < 3 ? 50 : seconds < 6 ? 25 : 0;
  const points = !correct
    ? 0
    : hints >= 2
      ? 30
      : hints === 1
        ? 60
        : (100 + speed) * multiplier;
  return {
    points,
    xp: !correct
      ? 3
      : hints >= 2
        ? 6
        : hints === 1
          ? 10
          : 20 + Math.floor(points / 20),
    multiplier,
    speed: correct && !hints ? speed : 0,
  };
}
export function recordAttempt(
  profile: Profile,
  id: string,
  correct: boolean,
  assisted: boolean,
  xp: number,
  streak: number,
): Profile {
  const old = profile.mastery[id] ?? { attempts: 0, correct: 0, chain: 0 };
  return {
    ...profile,
    xp: profile.xp + xp,
    totalCorrect: profile.totalCorrect + Number(correct),
    bestStreak: Math.max(profile.bestStreak, streak),
    mastery: {
      ...profile.mastery,
      [id]: {
        attempts: old.attempts + 1,
        correct: old.correct + Number(correct),
        chain: correct && !assisted ? old.chain + 1 : 0,
      },
    },
  };
}
export function recordSession(
  profile: Profile,
  mode: GameMode,
  score: number,
  day: string,
  dailyComplete = true,
): Profile {
  const dayStreak =
    profile.lastDay === day
      ? profile.dayStreak
      : profile.lastDay === previousDay(day)
        ? profile.dayStreak + 1
        : 1;
  return {
    ...profile,
    sessions: profile.sessions + 1,
    best: { ...profile.best, [mode]: Math.max(profile.best[mode] ?? 0, score) },
    daily:
      mode === "daily" && dailyComplete
        ? { ...profile.daily, [day]: Math.max(profile.daily[day] ?? 0, score) }
        : profile.daily,
    lastDay: day,
    dayStreak,
    bestDayStreak: Math.max(profile.bestDayStreak, dayStreak),
  };
}
/** The streak still counts until a full day is missed. */
export function currentDayStreak(profile: Profile, today = dayKey()) {
  return profile.lastDay === today || profile.lastDay === previousDay(today)
    ? profile.dayStreak
    : 0;
}
export function grade(accuracy: number, flawless: boolean) {
  if (flawless) return "S";
  if (accuracy >= 0.9) return "A";
  if (accuracy >= 0.75) return "B";
  if (accuracy >= 0.5) return "C";
  return "D";
}

export type Achievement = {
  icon: string;
  name: string;
  goal: string;
  unlocked: boolean;
};
export function achievements(
  profile: Profile,
  pool: Shortcut[],
): Achievement[] {
  const mastered = pool.filter(
    (s) => masteryState(profile.mastery[s.id]) === "mastered",
  );
  const categories = new Set(pool.map((s) => s.category));
  const completedCategory = [...categories].some((category) =>
    pool
      .filter((s) => s.category === category)
      .every((s) => mastered.includes(s)),
  );
  return [
    {
      icon: "↗",
      name: "First connection",
      goal: "Land your first shortcut",
      unlocked: profile.totalCorrect >= 1,
    },
    {
      icon: "ϟ",
      name: "In the zone",
      goal: "Build a 9-answer combo",
      unlocked: profile.bestStreak >= 9,
    },
    {
      icon: "✸",
      name: "Unstoppable",
      goal: "Build a 25-answer combo",
      unlocked: profile.bestStreak >= 25,
    },
    {
      icon: "✦",
      name: "Muscle memory",
      goal: "Master 10 shortcuts",
      unlocked: mastered.length >= 10,
    },
    {
      icon: "❖",
      name: "Shortcut scholar",
      goal: "Master 50 shortcuts",
      unlocked: mastered.length >= 50,
    },
    {
      icon: "▣",
      name: "Completionist",
      goal: "Master a whole category",
      unlocked: completedCategory,
    },
    {
      icon: "◎",
      name: "Century club",
      goal: "Land 100 correct answers",
      unlocked: profile.totalCorrect >= 100,
    },
    {
      icon: "∞",
      name: "Thousand hands",
      goal: "Land 1,000 correct answers",
      unlocked: profile.totalCorrect >= 1000,
    },
    {
      icon: "☀",
      name: "Habit forming",
      goal: "Play 3 days in a row",
      unlocked: profile.bestDayStreak >= 3,
    },
    {
      icon: "♛",
      name: "Week warrior",
      goal: "Play 7 days in a row",
      unlocked: profile.bestDayStreak >= 7,
    },
    {
      icon: "⏱",
      name: "Blitz master",
      goal: "Score 3,000 in Blitz",
      unlocked: (profile.best.timed ?? 0) >= 3000,
    },
    {
      icon: "♥",
      name: "Survivor",
      goal: "Score 5,000 in Survival",
      unlocked: (profile.best.survival ?? 0) >= 5000,
    },
  ];
}

export type Attempt = {
  shortcut: Shortcut;
  correct: boolean;
  assisted: boolean;
  hints: number;
  seconds: number;
  points: number;
  xp: number;
  speed: number;
};
export type Run = {
  phase: "ready" | "playing" | "result" | "finished";
  deck: Shortcut[];
  index: number;
  attempts: Attempt[];
  score: number;
  xp: number;
  streak: number;
  bestStreak: number;
  lives: number;
  hint: number;
  captured: string[];
  startedAt: number;
  deadline: number;
  remaining: number;
  paused: boolean;
  pauseAt: number;
};
export function freshRun(deck: Shortcut[]): Run {
  return {
    phase: "ready",
    deck,
    index: 0,
    attempts: [],
    score: 0,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lives: 3,
    hint: 0,
    captured: [],
    startedAt: 0,
    deadline: 0,
    remaining: BLITZ_MS,
    paused: false,
    pauseAt: 0,
  };
}
export type RunAction =
  | { type: "start"; deck: Shortcut[]; now: number }
  | {
      type: "answer";
      correct: boolean;
      keys: string[];
      now: number;
      mode: GameMode;
    }
  | {
      type: "next";
      deck: Shortcut[];
      now: number;
      mode: GameMode;
      /** Bring a missed shortcut back a few prompts later. */
      requeue?: boolean;
    }
  | { type: "hint"; max?: number }
  | { type: "tick"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "finish" };
export const REQUEUE_GAP = 4;
export function runReducer(state: Run, action: RunAction): Run {
  switch (action.type) {
    case "start":
      return {
        ...freshRun(action.deck),
        phase: "playing",
        startedAt: action.now,
        deadline: action.now + BLITZ_MS,
      };
    case "hint":
      return state.phase === "playing" &&
        !state.paused &&
        state.hint < (action.max ?? 2)
        ? { ...state, hint: state.hint + 1 }
        : state;
    case "answer": {
      if (state.phase !== "playing" || state.paused) return state;
      if (action.mode === "timed" && action.now >= state.deadline)
        return { ...state, phase: "finished", remaining: 0 };
      const seconds = Math.max(0, (action.now - state.startedAt) / 1000);
      const streak = action.correct && !state.hint ? state.streak + 1 : 0;
      const reward = award(action.correct, state.hint, seconds, streak);
      const attempt: Attempt = {
        shortcut: state.deck[state.index],
        correct: action.correct,
        assisted: state.hint > 0,
        hints: state.hint,
        seconds,
        points: reward.points,
        xp: reward.xp,
        speed: reward.speed,
      };
      return {
        ...state,
        phase: "result",
        attempts: [...state.attempts, attempt],
        score: state.score + reward.points,
        xp: state.xp + reward.xp,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        lives: state.lives - Number(!action.correct),
        captured: action.keys,
      };
    }
    case "next": {
      if (state.phase !== "result" || state.paused) return state;
      if (
        (isFiniteMode(action.mode) && state.attempts.length >= ROUND_LENGTH) ||
        (action.mode === "survival" && state.lives <= 0) ||
        (action.mode === "timed" && action.now >= state.deadline)
      )
        return { ...state, phase: "finished" };
      const last = state.attempts.at(-1);
      let deck = state.deck;
      const at = state.index + REQUEUE_GAP;
      if (action.requeue && last && !last.correct && at <= deck.length)
        deck = [...deck.slice(0, at), last.shortcut, ...deck.slice(at)];
      const wrap = state.index + 1 >= deck.length;
      return {
        ...state,
        phase: "playing",
        deck: wrap ? action.deck : deck,
        index: wrap ? 0 : state.index + 1,
        captured: [],
        hint: 0,
        startedAt: action.now,
      };
    }
    case "tick":
      return state.paused ||
        state.phase === "ready" ||
        state.phase === "finished"
        ? state
        : {
            ...state,
            remaining: Math.max(0, state.deadline - action.now),
            phase: action.now >= state.deadline ? "finished" : state.phase,
          };
    case "pause":
      return state.phase === "ready" ||
        state.phase === "finished" ||
        state.paused
        ? state
        : {
            ...state,
            paused: true,
            pauseAt: action.now,
            remaining: Math.max(0, state.deadline - action.now),
          };
    case "resume":
      return state.paused
        ? {
            ...state,
            paused: false,
            startedAt: state.startedAt + action.now - state.pauseAt,
            deadline: action.now + state.remaining,
          }
        : state;
    case "finish":
      return { ...state, phase: "finished", paused: false };
  }
}
