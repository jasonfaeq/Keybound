import type { Shortcut } from "../types/shortcut";

export type GameMode = "practice" | "timed" | "survival" | "daily" | "review" | "unlimited";
export const MODES: Record<GameMode, { name: string; icon: string; description: string; detail: string }> = {
  practice: { name: "Quick play", icon: "↗", description: "Ten chords. Find your flow.", detail: "10 prompts · no pressure" },
  timed: { name: "Blitz", icon: "ϟ", description: "One minute. Make it count.", detail: "60 seconds · chase your best" },
  survival: { name: "Survival", icon: "♡", description: "Keep your cool. Keep your lives.", detail: "3 lives · endless rounds" },
  daily: { name: "Daily mix", icon: "✦", description: "A fresh ritual for fast fingers.", detail: "10 fixed prompts · new every day" },
  review: { name: "Weak spots", icon: "◎", description: "Turn almost into automatic.", detail: "10 prompts · tailored to you" },
  unlimited: { name: "Free play", icon: "∞", description: "Just you and the keyboard.", detail: "No timer · stay as long as you like" },
};
export type Mastery = { attempts: number; correct: number; chain: number };
export type Profile = {
  xp: number; sessions: number; totalCorrect: number; bestStreak: number;
  best: Partial<Record<GameMode, number>>; mastery: Record<string, Mastery>;
  daily: Record<string, number>; sound: boolean;
};
export const EMPTY_PROFILE: Profile = { xp: 0, sessions: 0, totalCorrect: 0, bestStreak: 0, best: {}, mastery: {}, daily: {}, sound: true };
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 120)) + 1;
  const floor = 120 * (level - 1) ** 2;
  const ceiling = 120 * level ** 2;
  return { level, title: ["New recruit", "Key explorer", "Flow finder", "Shortcut specialist", "Keyboard virtuoso"][Math.min(Math.floor((level - 1) / 2), 4)], progress: (xp - floor) / (ceiling - floor), remaining: ceiling - xp };
}
export function shuffled<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function makeDeck(pool: Shortcut[], mode: GameMode, profile: Profile, day: string): Shortcut[] {
  if (mode === "daily") {
    let seed = [...day].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0, 7);
    return shuffled(pool, () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }).slice(0, 10);
  }
  const deck = shuffled(pool);
  if (mode === "review") deck.sort((a, b) => {
    const rank = (id: string) => { const m = profile.mastery[id]; return m ? m.chain + m.correct / m.attempts - (m.attempts - m.correct > 0 ? 2 : 0) : 1; };
    return rank(a.id) - rank(b.id);
  });
  return deck;
}
export function award(correct: boolean, assisted: boolean, seconds: number, streak: number) {
  const multiplier = Math.min(4, 1 + Math.floor(streak / 3));
  const speed = seconds < 3 ? 50 : seconds < 6 ? 25 : 0;
  const points = correct ? assisted ? 40 : (100 + speed) * multiplier : 0;
  return { points, xp: correct ? assisted ? 8 : 20 + Math.floor(points / 20) : 3, multiplier, speed };
}
export function recordAttempt(profile: Profile, id: string, correct: boolean, assisted: boolean, xp: number, streak: number): Profile {
  const old = profile.mastery[id] ?? { attempts: 0, correct: 0, chain: 0 };
  return { ...profile, xp: profile.xp + xp, totalCorrect: profile.totalCorrect + Number(correct), bestStreak: Math.max(profile.bestStreak, streak), mastery: { ...profile.mastery, [id]: { attempts: old.attempts + 1, correct: old.correct + Number(correct), chain: correct && !assisted ? old.chain + 1 : 0 } } };
}
export function recordSession(profile: Profile, mode: GameMode, score: number, day: string, dailyComplete = true): Profile {
  return { ...profile, sessions: profile.sessions + 1, best: { ...profile.best, [mode]: Math.max(profile.best[mode] ?? 0, score) }, daily: mode === "daily" && dailyComplete ? { ...profile.daily, [day]: Math.max(profile.daily[day] ?? 0, score) } : profile.daily };
}
export type Attempt = { shortcut: Shortcut; correct: boolean; assisted: boolean; seconds: number; points: number; xp: number };
export type Run = {
  phase: "ready" | "playing" | "result" | "finished";
  deck: Shortcut[]; index: number; attempts: Attempt[]; score: number; xp: number;
  streak: number; bestStreak: number; lives: number; hint: boolean; captured: string[];
  startedAt: number; deadline: number; remaining: number; paused: boolean; pauseAt: number;
};
export function freshRun(deck: Shortcut[]): Run {
  return { phase: "ready", deck, index: 0, attempts: [], score: 0, xp: 0, streak: 0, bestStreak: 0, lives: 3, hint: false, captured: [], startedAt: 0, deadline: 0, remaining: 60000, paused: false, pauseAt: 0 };
}
export type RunAction =
  | { type: "start"; deck: Shortcut[]; now: number }
  | { type: "answer"; correct: boolean; keys: string[]; now: number; mode: GameMode }
  | { type: "next"; deck: Shortcut[]; now: number; mode: GameMode }
  | { type: "hint" }
  | { type: "tick"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "finish" };
export function runReducer(state: Run, action: RunAction): Run {
  switch (action.type) {
    case "start": return { ...freshRun(action.deck), phase: "playing", startedAt: action.now, deadline: action.now + 60000 };
    case "hint": return state.phase === "playing" && !state.paused ? { ...state, hint: true } : state;
    case "answer": {
      if (state.phase !== "playing" || state.paused) return state;
      if (action.mode === "timed" && action.now >= state.deadline) return { ...state, phase: "finished", remaining: 0 };
      const seconds = Math.max(0, (action.now - state.startedAt) / 1000);
      const streak = action.correct && !state.hint ? state.streak + 1 : 0;
      const reward = award(action.correct, state.hint, seconds, streak);
      const attempt: Attempt = { shortcut: state.deck[state.index], correct: action.correct, assisted: state.hint, seconds, points: reward.points, xp: reward.xp };
      return { ...state, phase: "result", attempts: [...state.attempts, attempt], score: state.score + reward.points, xp: state.xp + reward.xp, streak, bestStreak: Math.max(state.bestStreak, streak), lives: state.lives - Number(!action.correct), captured: action.keys };
    }
    case "next": {
      if (state.phase !== "result" || state.paused) return state;
      const finite = ["practice", "daily", "review"].includes(action.mode);
      if ((finite && state.attempts.length >= 10) || (action.mode === "survival" && state.lives <= 0) || (action.mode === "timed" && action.now >= state.deadline)) return { ...state, phase: "finished" };
      const wrap = state.index + 1 >= state.deck.length;
      return { ...state, phase: "playing", deck: wrap ? action.deck : state.deck, index: wrap ? 0 : state.index + 1, captured: [], hint: false, startedAt: action.now };
    }
    case "tick": return state.paused || state.phase === "ready" || state.phase === "finished" ? state : { ...state, remaining: Math.max(0, state.deadline - action.now), phase: action.now >= state.deadline ? "finished" : state.phase };
    case "pause": return state.phase === "ready" || state.phase === "finished" || state.paused ? state : { ...state, paused: true, pauseAt: action.now, remaining: Math.max(0, state.deadline - action.now) };
    case "resume": return state.paused ? { ...state, paused: false, startedAt: state.startedAt + action.now - state.pauseAt, deadline: action.now + state.remaining } : state;
    case "finish": return { ...state, phase: "finished", paused: false };
  }
}
