"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_PROFILE, type Profile } from "./game";

const KEY = "chord-player-v2";
let cached: Profile = EMPTY_PROFILE;
let rawCache: string | null | undefined;
let saved = true;
let memoryOnly = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const nonnegative = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
export function readProfile(): Profile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  if (memoryOnly) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === rawCache) return cached;
    rawCache = raw;
    const parsed = raw ? JSON.parse(raw) : {};
    const input = parsed && typeof parsed === "object" ? parsed : {};
    const mastery: Profile["mastery"] = {};
    for (const [id, item] of Object.entries(input.mastery ?? {})) {
      const entry = item as Record<string, unknown> | null;
      if (entry)
        mastery[id] = {
          attempts: nonnegative(entry.attempts),
          correct: nonnegative(entry.correct),
          chain: nonnegative(entry.chain),
        };
    }
    const scores = (value: unknown) =>
      Object.fromEntries(
        Object.entries(value && typeof value === "object" ? value : {}).map(
          ([key, score]) => [key, nonnegative(score)],
        ),
      );
    cached = {
      xp: nonnegative(input.xp),
      sessions: nonnegative(input.sessions),
      totalCorrect: nonnegative(input.totalCorrect),
      bestStreak: nonnegative(input.bestStreak),
      mastery,
      best: scores(input.best),
      daily: scores(input.daily),
      sound: input.sound !== false,
    };
  } catch {
    saved = false;
  }
  return cached;
}
export function updateProfile(update: (current: Profile) => Profile) {
  cached = update(readProfile());
  try {
    rawCache = JSON.stringify(cached);
    localStorage.setItem(KEY, rawCache);
    saved = true;
  } catch {
    saved = false;
    memoryOnly = true;
  }
  notify();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
export function useProfile() {
  const profile = useSyncExternalStore(
    subscribe,
    readProfile,
    () => EMPTY_PROFILE,
  );
  return { profile, saved };
}
