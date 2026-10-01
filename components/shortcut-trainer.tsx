"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shortcuts } from "../data/shortcuts";
import { chordLabel, chordsMatch, keyEventToChord, normalizeKeys, prettyKey, requiresBuilder } from "../lib/shortcut";
import { CATEGORY_LABELS, type Shortcut, type ShortcutCategory } from "../types/shortcut";

type Result = "correct" | "incorrect" | null;
type GameMode = "practice" | "timed" | "unlimited";

const categories = Object.keys(CATEGORY_LABELS) as ShortcutCategory[];

function categoryFromQuery(value: string | null): ShortcutCategory | "all" {
  return value && categories.includes(value as ShortcutCategory) ? value as ShortcutCategory : "all";
}

function pickQuestion(pool: Shortcut[], previousId?: string): Shortcut {
  const choices = pool.length > 1 ? pool.filter((shortcut) => shortcut.id !== previousId) : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

export default function ShortcutTrainer() {
  const searchParams = useSearchParams();
  const initialCategory = categoryFromQuery(searchParams.get("category"));
  const initialMode: GameMode = searchParams.get("mode") === "timed" ? "timed" : searchParams.get("mode") === "unlimited" ? "unlimited" : "practice";
  const initialPool = useMemo(() => initialCategory === "all" ? shortcuts : shortcuts.filter((shortcut) => shortcut.category === initialCategory), [initialCategory]);
  const [category, setCategory] = useState<ShortcutCategory | "all">(initialCategory);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [question, setQuestion] = useState<Shortcut>(initialPool[0]);
  const [captured, setCaptured] = useState<string[]>([]);
  const [result, setResult] = useState<Result>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(initialMode === "timed" ? 60 : null);
  const resultActionRef = useRef<HTMLButtonElement>(null);
  const summaryButtonRef = useRef<HTMLButtonElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const progress = Math.min(answered, 10);
  const builderRequired = requiresBuilder(question.expected);
  const builderVisible = showBuilder || builderRequired;
  const timedOut = mode === "timed" && timeLeft === 0;
  const sessionOver = sessionFinished || timedOut;

  useEffect(() => {
    const randomizeInitialQuestion = window.setTimeout(() => setQuestion(pickQuestion(initialPool)), 0);
    return () => window.clearTimeout(randomizeInitialQuestion);
  }, [initialPool]);

  const playFeedbackSound = useCallback((isCorrect: boolean) => {
    if (!soundEnabled || typeof window === "undefined" || !window.AudioContext) return;
    const context = audioContextRef.current ?? new window.AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime;
    const notes = isCorrect ? [261.63, 329.63, 392] : [220, 164.81];
    notes.forEach((frequency, index) => {
      const start = now + index * (isCorrect ? 0.045 : 0.08);
      const end = start + (isCorrect ? 0.58 : 0.24);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = isCorrect ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(isCorrect ? 0.12 : 0.08, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end);
    });
  }, [soundEnabled]);

  const resetQuestion = useCallback((nextCategory = category) => {
    if ((mode === "practice" && answered >= 10) || (mode === "timed" && timeLeft === 0)) {
      setSessionFinished(true);
      return;
    }
    const nextPool = nextCategory === "all" ? shortcuts : shortcuts.filter((shortcut) => shortcut.category === nextCategory);
    setQuestion((current) => pickQuestion(nextPool, current.id));
    setCaptured([]);
    setResult(null);
    setStartedAt(Date.now());
    setLastTime(null);
    setShowBuilder(false);
  }, [answered, category, mode, timeLeft]);

  const submitChord = useCallback((keys: string[]) => {
    if (result || keys.length === 0) return;
    const isCorrect = chordsMatch(keys, question.expected);
    const elapsed = Math.max(1, (Date.now() - startedAt) / 1000);
    setCaptured(normalizeKeys(keys));
    setResult(isCorrect ? "correct" : "incorrect");
    playFeedbackSound(isCorrect);
    setAnswered((value) => value + 1);
    setLastTime(elapsed);
    if (isCorrect) {
      setScore((value) => value + Math.max(50, Math.round(100 - elapsed * 5)));
      setCorrectAnswers((value) => value + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((value) => Math.max(value, nextStreak));
    } else {
      setStreak(0);
    }
  }, [playFeedbackSound, question.expected, result, startedAt, streak]);

  useEffect(() => {
    if (result) resultActionRef.current?.focus();
  }, [result]);

  const retryQuestion = useCallback(() => {
    setCaptured([]);
    setResult(null);
    setStartedAt(Date.now());
    setLastTime(null);
    setShowBuilder(false);
  }, []);

  const startNewSession = useCallback(() => {
    const nextPool = category === "all" ? shortcuts : shortcuts.filter((shortcut) => shortcut.category === category);
    setQuestion((current) => pickQuestion(nextPool, current.id));
    setCaptured([]);
    setResult(null);
    setScore(0);
    setAnswered(0);
    setCorrectAnswers(0);
    setStreak(0);
    setBestStreak(0);
    setStartedAt(Date.now());
    setLastTime(null);
    setShowBuilder(false);
    setSessionFinished(false);
    setTimeLeft(mode === "timed" ? 60 : null);
  }, [category, mode]);

  const chooseMode = useCallback((nextMode: GameMode) => {
    const nextPool = category === "all" ? shortcuts : shortcuts.filter((shortcut) => shortcut.category === category);
    setMode(nextMode);
    setQuestion((current) => pickQuestion(nextPool, current.id));
    setCaptured([]);
    setResult(null);
    setScore(0);
    setAnswered(0);
    setCorrectAnswers(0);
    setStreak(0);
    setBestStreak(0);
    setStartedAt(Date.now());
    setLastTime(null);
    setShowBuilder(false);
    setSessionFinished(false);
    setTimeLeft(nextMode === "timed" ? 60 : null);
  }, [category]);

  useEffect(() => {
    if (mode !== "timed" || sessionFinished || timeLeft === 0) return;
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max((value ?? 0) - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [mode, sessionFinished, timeLeft]);

  useEffect(() => {
    if (sessionOver) summaryButtonRef.current?.focus();
  }, [sessionOver]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const isInteractiveTarget = Boolean(target?.closest("button, a, select, input, textarea, .key-builder"));
      const isTextEntryTarget = Boolean(target?.closest("select, input, textarea"));
      if (sessionOver) {
        if ((event.key === "Enter" || event.key === " ") && !isInteractiveTarget) {
          event.preventDefault();
          startNewSession();
        }
        return;
      }
      if (result === "incorrect" && event.key.toLowerCase() === "r" && !isTextEntryTarget) {
        event.preventDefault();
        retryQuestion();
        return;
      }
      if (result && !isInteractiveTarget) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          resetQuestion();
          return;
        }
      }
      if (result || event.repeat || builderRequired || isInteractiveTarget) return;
      const isModifierOnly = ["Control", "Alt", "Shift", "Meta"].includes(event.key);
      if (isModifierOnly) return;
      const chord = keyEventToChord(event);
      if (!chord.length) return;
      event.preventDefault();
      submitChord(chord);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [builderRequired, resetQuestion, result, retryQuestion, sessionOver, startNewSession, submitChord]);

  function chooseCategory(value: ShortcutCategory | "all") {
    setCategory(value);
    setSessionFinished(false);
    setScore(0);
    setAnswered(0);
    setCorrectAnswers(0);
    setStreak(0);
    setBestStreak(0);
    const nextPool = value === "all" ? shortcuts : shortcuts.filter((shortcut) => shortcut.category === value);
    const nextQuestion = pickQuestion(nextPool);
    setQuestion(nextQuestion);
    setCaptured([]);
    setResult(null);
    setStartedAt(Date.now());
    setLastTime(null);
    setTimeLeft(mode === "timed" ? 60 : null);
  }

  return (
    <main className="practice-shell">
      <header className="practice-topbar">
        <Link href="/" className="brand"><span className="brand-mark">⌘</span><span>CHORD<span className="brand-slash">{"//"}</span></span></Link>
          <div className="practice-nav">
            <span className="session-label">SESSION 01</span>
            <span className="nav-divider" />
            <span className="session-stat"><span className="mini-dot" />{score.toString().padStart(4, "0")} pts</span>
            <span className="session-stat streak-stat">↗ {streak} streak</span>
            {mode === "timed" && <span className={`session-stat timer-stat ${timeLeft !== null && timeLeft <= 10 ? "timer-warning" : ""}`} aria-live="polite">◷ {timeLeft}s</span>}
            <button className="sound-toggle" type="button" onClick={() => setSoundEnabled((value) => !value)} aria-label={soundEnabled ? "Mute feedback sounds" : "Enable feedback sounds"} title={soundEnabled ? "Mute feedback sounds" : "Enable feedback sounds"}>{soundEnabled ? "◖))" : "◖×"}</button>
          </div>
      </header>

      <div className="practice-layout">
        <aside className="practice-sidebar">
          <div className="sidebar-control">
            <p className="sidebar-label">Game mode</p>
            <div className="sidebar-select-wrap">
              <select value={mode} onChange={(event) => chooseMode(event.target.value as GameMode)} aria-label="Choose game mode">
                <option value="practice">Practice session</option>
                <option value="timed">Timed challenge · 60s</option>
                <option value="unlimited">Unlimited practice</option>
              </select>
              <span>⌄</span>
            </div>
          </div>
          <div className="sidebar-control">
            <p className="sidebar-label">Practice set</p>
            <div className="sidebar-select-wrap">
              <select value={category} onChange={(event) => chooseCategory(event.target.value as ShortcutCategory | "all")} aria-label="Choose shortcut category">
                <option value="all">All shortcuts</option>
                {categories.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}
              </select>
              <span>⌄</span>
            </div>
          </div>
          <div className="sidebar-progress">
            <div className="progress-heading"><span>{mode === "timed" ? "Time remaining" : mode === "unlimited" ? "Reps completed" : "Session progress"}</span><strong>{mode === "timed" ? `${timeLeft}s` : mode === "unlimited" ? answered : `${progress.toString().padStart(2, "0")} / 10`}</strong></div>
            <div className="progress-track"><span style={{ width: `${mode === "timed" ? Math.max(((timeLeft ?? 0) / 60) * 100, 3) : mode === "unlimited" ? "100" : Math.max(progress * 10, 3)}%` }} /></div>
          </div>
          <div className="sidebar-note">
            <span className="note-icon">i</span>
            <p><strong>How it works</strong>Press the shortcut for the action. Your chord is captured automatically.</p>
          </div>
          <Link href="/" className="back-link">← Back to home</Link>
        </aside>

        {sessionOver ? <SessionSummary restartButtonRef={summaryButtonRef} mode={mode} totalAnswered={answered} score={score} correctAnswers={correctAnswers} bestStreak={bestStreak} onRestart={startNewSession} /> : <section className={`practice-card ${result ? `has-${result}` : ""}`}>
          <div className="practice-card-header">
            <span className="question-number">PROMPT {String(Math.min(answered + 1, 10)).padStart(2, "0")}</span>
            <span className="category-badge">{CATEGORY_LABELS[question.category]}</span>
          </div>
          <div className="question-content">
            <p className="question-kicker">What&apos;s the chord for...</p>
            <h1>{question.action}?</h1>
            <p className="question-subtitle">{builderRequired ? "This shortcut can affect your computer. Practice it safely with the key builder." : "Press the keys together. We&apos;ll take it from there."}</p>
          </div>

          <div className="answer-zone">
            <div className="captured-keys" aria-live="polite">
              {captured.length > 0 ? captured.map((key) => <span key={key} className={`answer-key ${result === "correct" ? "key-correct" : result === "incorrect" ? "key-incorrect" : ""}`}>{key}</span>) : <span className="waiting-text"><span className="pulse-dot" />{builderRequired ? "Use the key builder below" : "Listening for your shortcut"}<span className="waiting-caret">_</span></span>}
            </div>
            {result === "correct" && <div className="feedback correct-feedback"><span className="feedback-icon">✓</span><span><strong>Nice one.</strong> That&apos;s the shortcut.</span><span className="feedback-time">{lastTime?.toFixed(1)}s</span></div>}
            {result === "incorrect" && <div className="feedback incorrect-feedback"><span className="feedback-icon">×</span><span><strong>Not quite.</strong> The answer is <b>{chordLabel(question.expected)}</b>.</span></div>}
          </div>

          <div className="practice-card-footer">
            {result ? (
              <div className="result-actions">
                {result === "incorrect" && <button className="button button-secondary" onClick={retryQuestion}>Try again <span className="button-arrow">↻</span></button>}
                <button ref={resultActionRef} className="button button-primary next-button" onClick={() => resetQuestion()}>Next prompt <span className="button-arrow">→</span></button>
              </div>
            ) : (
              builderRequired ? <span className="protected-hint"><span>◈</span>Protected shortcut · builder only</span> : <button className="builder-toggle" onClick={() => setShowBuilder((value) => !value)}>{showBuilder ? "Hide key builder" : "Shortcut not firing? Use the key builder"} <span>⌄</span></button>
            )}
            <span className="enter-hint">{result === "incorrect" ? <><kbd>R</kbd> retry · <kbd>Enter</kbd> next prompt</> : result ? <><kbd>Enter</kbd> next prompt</> : builderRequired ? "Select keys in the builder" : <><kbd>Space</kbd> or use your keyboard</>}</span>
          </div>

          {builderVisible && !result && <KeyBuilder key={question.id} onSubmit={submitChord} protectedShortcut={builderRequired} />}
          {result === "incorrect" && question.tip && <p className="question-tip"><span>TIP</span>{question.tip}</p>}
        </section>}
      </div>

      <footer className="practice-footer"><span>CHORD // SHORTCUT TRAINER</span><span>Local session · No account required</span></footer>
    </main>
  );
}

function SessionSummary({ restartButtonRef, mode, totalAnswered, score, correctAnswers, bestStreak, onRestart }: { restartButtonRef: { current: HTMLButtonElement | null }; mode: GameMode; totalAnswered: number; score: number; correctAnswers: number; bestStreak: number; onRestart: () => void }) {
  const accuracy = totalAnswered ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
  const isTimed = mode === "timed";
  return <section className="practice-card session-summary">
    <div className="practice-card-header"><span className="question-number">{isTimed ? "TIME UP" : "SESSION COMPLETE"}</span><span className="category-badge">{isTimed ? `${totalAnswered} reps` : "10 prompts"}</span></div>
    <div className="summary-copy"><p className="question-kicker">{isTimed ? "Fast fingers, clear recall" : "Good repetition compounds"}</p><h1>{isTimed ? "Time's up." : "That's a wrap."}</h1><p className="question-subtitle">{isTimed ? "Here's how your 60-second sprint landed." : "Your fingers got ten more reps of useful shortcuts."}</p></div>
    <div className="summary-stats">
      <div><strong>{accuracy}%</strong><span>accuracy</span></div>
      <div><strong>{score.toString().padStart(4, "0")}</strong><span>points</span></div>
      <div><strong>{bestStreak}</strong><span>best streak</span></div>
    </div>
    <div className="practice-card-footer summary-footer"><button ref={restartButtonRef} className="button button-primary" onClick={onRestart}>Play again <span className="button-arrow">↻</span></button><span className="enter-hint"><kbd>Enter</kbd> new session</span></div>
  </section>;
}

function KeyBuilder({ onSubmit, protectedShortcut }: { onSubmit: (keys: string[]) => void; protectedShortcut: boolean }) {
  const [keys, setKeys] = useState<string[]>([]);
  const alphaRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];
  const utilityKeys = ["Tab", "Delete", "Backspace", "F2", "F4"];
  const arrows = ["Left", "Down", "Right", "Up"];
  function toggle(key: string) {
    setKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : normalizeKeys([...current, key]));
  }
  function renderKey(key: string, className = "") {
    const isActive = keys.includes(key);
    return <button type="button" key={key} autoFocus={key === "Ctrl"} aria-pressed={isActive} className={`builder-key ${className} ${isActive ? "active" : ""}`} onClick={() => toggle(key)}>{prettyKey(key)}</button>;
  }
  return <div className="key-builder" role="group" aria-label="Keyboard shortcut builder">
    <div className="builder-title"><span>{protectedShortcut ? "Safe practice builder" : "Build your chord"}</span><span>{keys.length ? chordLabel(keys) : "Select keys below"}</span></div>
    {protectedShortcut && <p className="builder-safety"><span>i</span> This chord is kept inside the app so it cannot trigger Windows or browser actions.</p>}
    <p className="builder-controls"><kbd>Tab</kbd> move <kbd>Space</kbd> toggle <kbd>Enter</kbd> check</p>
    <div className="keyboard-board">
      <div className="keyboard-row utility-row">{utilityKeys.map((key) => renderKey(key, "utility-key"))}</div>
      {alphaRows.map((row, index) => <div className={`keyboard-row alpha-row alpha-row-${index + 1}`} key={row[0]}>{row.map((key) => renderKey(key))}</div>)}
      <div className="keyboard-row bottom-row">
        {renderKey("Ctrl", "modifier-key modifier-ctrl")}
        {renderKey("Win", "modifier-key modifier-win")}
        {renderKey("Alt", "modifier-key modifier-alt")}
        {renderKey("Space", "space-key")}
        {renderKey("Shift", "modifier-key modifier-shift")}
        <div className="arrow-cluster" aria-label="Arrow keys">{arrows.map((key) => renderKey(key, `arrow-key arrow-${key.toLowerCase()}`))}</div>
      </div>
    </div>
    <button type="button" className="builder-submit" disabled={!keys.length} onClick={() => onSubmit(keys)}>Check chord</button>
  </div>;
}
