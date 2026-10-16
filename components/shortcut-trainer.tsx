"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { shortcuts } from "../data/shortcuts";
import {
  chordLabel,
  chordsMatch,
  keyEventToChord,
  normalizeKeys,
  prettyKey,
  requiresBuilder,
} from "../lib/shortcut";
import {
  dayKey,
  freshRun,
  levelFor,
  makeDeck,
  MODES,
  recordAttempt,
  recordSession,
  runReducer,
  type GameMode,
} from "../lib/game";
import { readProfile, updateProfile, useProfile } from "../lib/profile";
import { CATEGORY_LABELS, type ShortcutCategory } from "../types/shortcut";

export default function ShortcutTrainer() {
  const searchParams = useSearchParams();
  return <Game key={searchParams.toString()} searchParams={searchParams} />;
}

function Game({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const requestedMode = searchParams.get("mode") ?? "practice";
  const mode: GameMode = Object.hasOwn(MODES, requestedMode)
    ? (requestedMode as GameMode)
    : "practice";
  const requestedCategory = searchParams.get("category") ?? "all";
  const category =
    mode !== "daily" && Object.hasOwn(CATEGORY_LABELS, requestedCategory)
      ? (requestedCategory as ShortcutCategory)
      : "all";
  const pool = useMemo(
    () =>
      category === "all"
        ? shortcuts
        : shortcuts.filter((s) => s.category === category),
    [category],
  );
  const [run, dispatch] = useReducer(runReducer, pool, freshRun);
  const [showBuilder, setShowBuilder] = useState(false);
  const [autoNext, setAutoNext] = useState(mode === "timed");
  const { profile, saved } = useProfile();
  const mainRef = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const savedAttempts = useRef(0);
  const savedSession = useRef(false);
  const sessionDay = useRef("");
  const [previousBest, setPreviousBest] = useState(0);
  const question = run.deck[run.index];
  const result = run.phase === "result" ? run.attempts.at(-1) : undefined;
  const builderRequired = requiresBuilder(question.expected);
  const builderVisible = showBuilder || builderRequired;
  const correct = run.attempts.filter((a) => a.correct).length;
  const flawless =
    correct > 0 && run.attempts.every((a) => a.correct && !a.assisted);
  const finite = ["practice", "daily", "review"].includes(mode);
  const level = levelFor(profile.xp);
  const timeLeft = Math.ceil(run.remaining / 1000);
  const nextFinishes =
    (finite && run.attempts.length >= 10) ||
    (mode === "survival" && run.lives <= 0);
  const missed = [
    ...new Map(
      run.attempts
        .filter((a) => !a.correct || a.assisted)
        .map((a) => [a.shortcut.id, a.shortcut]),
    ).values(),
  ];

  const playSound = useCallback((good: boolean) => {
    if (!readProfile().sound || !window.AudioContext) return;
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      if (context.state === "suspended") void context.resume().catch(() => {});
      (good ? [523.25, 659.25, 783.99] : [196, 164.81]).forEach(
        (frequency, i) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = context.currentTime + i * 0.055;
          oscillator.type = "triangle";
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.07, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.26);
        },
      );
    } catch {
      /* Audio is optional; the round continues if the browser blocks it. */
    }
  }, []);

  useEffect(
    () => () => {
      void audioRef.current?.close();
    },
    [],
  );
  // Save each answered prompt exactly once, including when a timer ends the round.
  useEffect(() => {
    for (const attempt of run.attempts.slice(savedAttempts.current)) {
      updateProfile((p) =>
        recordAttempt(
          p,
          attempt.shortcut.id,
          attempt.correct,
          attempt.assisted,
          attempt.xp,
          run.bestStreak,
        ),
      );
    }
    savedAttempts.current = run.attempts.length;
    if (
      run.phase === "finished" &&
      !savedSession.current &&
      run.attempts.length
    ) {
      savedSession.current = true;
      updateProfile((p) =>
        recordSession(
          p,
          mode,
          run.score,
          sessionDay.current,
          run.attempts.length >= 10,
        ),
      );
    }
  }, [run.attempts, run.bestStreak, run.phase, run.score, mode]);

  const start = useCallback(() => {
    savedAttempts.current = 0;
    savedSession.current = false;
    sessionDay.current = dayKey();
    setPreviousBest(readProfile().best[mode] ?? 0);
    setShowBuilder(false);
    dispatch({
      type: "start",
      deck: makeDeck(pool, mode, readProfile(), sessionDay.current),
      now: Date.now(),
    });
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [mode, pool]);
  const next = useCallback(() => {
    setShowBuilder(false);
    const deck = makeDeck(pool, mode, readProfile(), sessionDay.current);
    // Avoid a repeated question at the boundary between shuffled decks.
    if (deck.length > 1 && deck[0].id === question.id)
      [deck[0], deck[1]] = [deck[1], deck[0]];
    dispatch({ type: "next", deck, mode, now: Date.now() });
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [mode, pool, question.id]);
  const submit = useCallback(
    (keys: string[]) => {
      if (run.phase !== "playing" || run.paused) return;
      const good = chordsMatch(keys, question.expected);
      if (mode !== "timed" || Date.now() < run.deadline) playSound(good);
      dispatch({
        type: "answer",
        correct: good,
        keys: normalizeKeys(keys),
        mode,
        now: Date.now(),
      });
    },
    [mode, playSound, question.expected, run.deadline, run.paused, run.phase],
  );

  useEffect(() => {
    if (
      mode !== "timed" ||
      run.paused ||
      run.phase === "ready" ||
      run.phase === "finished"
    )
      return;
    const timer = window.setInterval(
      () => dispatch({ type: "tick", now: Date.now() }),
      100,
    );
    return () => window.clearInterval(timer);
  }, [mode, run.paused, run.phase]);
  useEffect(() => {
    if (!autoNext || run.phase !== "result" || run.paused) return;
    const timer = window.setTimeout(next, result?.correct ? 1100 : 2200);
    return () => window.clearTimeout(timer);
  }, [autoNext, next, result?.correct, run.paused, run.phase]);
  useEffect(() => {
    if (run.phase === "result" || run.phase === "finished" || run.paused)
      actionRef.current?.focus({ preventScroll: true });
    if (run.phase === "finished")
      window.scrollTo({ top: 0, behavior: "instant" });
  }, [run.phase, run.paused]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "pause", now: Date.now() });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const interactive = target?.closest("button, a, select, input, textarea");
      if (
        event.key === "Escape" &&
        run.phase !== "ready" &&
        run.phase !== "finished"
      ) {
        event.preventDefault();
        dispatch({ type: run.paused ? "resume" : "pause", now: Date.now() });
        return;
      }
      if (interactive) return;
      if (run.paused) return;
      if (run.phase === "ready" || run.phase === "finished") {
        if (event.key === "Enter") {
          event.preventDefault();
          start();
        }
        return;
      }
      if (run.phase === "result") {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          next();
        }
        return;
      }
      // Tab always remains available for navigating the interface.
      if (
        event.key === "Tab" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      )
        return;
      if (
        builderRequired ||
        builderVisible ||
        ["Control", "Alt", "Shift", "Meta"].includes(event.key)
      )
        return;
      const keys = keyEventToChord(event);
      if (requiresBuilder(keys)) return;
      event.preventDefault();
      submit(keys);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    builderRequired,
    builderVisible,
    next,
    run.paused,
    run.phase,
    start,
    submit,
  ]);

  return (
    <main className="practice-shell" ref={mainRef} tabIndex={-1}>
      <header className="practice-topbar">
        <Link href="/" className="brand" aria-label="Keybound home">
          <span className="brand-mark">⌘</span>
          <span>
            KEYBOUND<span className="brand-slash">{"//"}</span>
          </span>
        </Link>
        <div className="practice-nav">
          <span className="session-label">
            {MODES[mode].name.toUpperCase()}
          </span>
          <span className="session-stat">
            {run.score.toLocaleString()} <small>PTS</small>
          </span>
          {mode === "survival" && (
            <span
              className="lives"
              aria-label={`${Math.max(0, run.lives)} lives left`}
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < run.lives ? "" : "lost-life"}>
                  ♥
                </span>
              ))}
            </span>
          )}
          {mode === "timed" && (
            <span
              className={`timer-stat ${timeLeft <= 10 ? "timer-warning" : ""}`}
            >
              ◷ {timeLeft}s
            </span>
          )}
          <button
            className="sound-toggle"
            onClick={() => updateProfile((p) => ({ ...p, sound: !p.sound }))}
            aria-label={profile.sound ? "Mute sounds" : "Enable sounds"}
          >
            {profile.sound ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>
      </header>
      <div className="practice-layout">
        <aside className="practice-sidebar">
          <Link href="/" className="back-link">
            ← THE ARCADE
          </Link>
          <div className="run-mode-icon">{MODES[mode].icon}</div>
          <h2>{MODES[mode].name}</h2>
          <p className="sidebar-description">{MODES[mode].description}</p>
          <span className="sidebar-set">
            {category === "all" ? "All shortcuts" : CATEGORY_LABELS[category]}
          </span>
          <div className="sidebar-progress">
            <div className="progress-heading">
              <span>
                {finite
                  ? "ROUND PROGRESS"
                  : mode === "timed"
                    ? "TIME LEFT"
                    : "CHORDS PLAYED"}
              </span>
              <strong>
                {finite
                  ? `${run.attempts.length} / 10`
                  : mode === "timed"
                    ? `${timeLeft}s`
                    : run.attempts.length}
              </strong>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${finite ? run.attempts.length * 10 : mode === "timed" ? (timeLeft / 60) * 100 : 100}%`,
                }}
              />
            </div>
          </div>
          <div
            className={`combo-meter ${run.streak >= 3 ? "combo-active" : ""}`}
          >
            <span className="micro-label">
              {run.streak >= 3 ? "YOU’RE ON FIRE" : "FIND YOUR FLOW"}
            </span>
            <div>
              <strong>×{Math.min(4, 1 + Math.floor(run.streak / 3))}</strong>
              <span>{run.streak} combo</span>
            </div>
            <div className="combo-pips">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={i < run.streak % 3 || run.streak >= 9 ? "lit" : ""}
                />
              ))}
            </div>
            <small>
              {run.streak >= 9
                ? "Maximum multiplier. Keep it going!"
                : `${3 - (run.streak % 3)} clean answers to the next multiplier`}
            </small>
          </div>
          <label className="auto-next">
            <input
              type="checkbox"
              checked={autoNext}
              onChange={(e) => setAutoNext(e.target.checked)}
            />{" "}
            Auto advance
          </label>
          <div className="sidebar-note">
            <span className="note-icon">i</span>
            <p>
              <strong>Make it stick</strong>Three correct recalls without hints
              master a shortcut. Hints earn less XP and reset its mastery
              streak.
            </p>
          </div>
          <span className="sidebar-save">
            {saved
              ? `LEVEL ${level.level} · ${profile.xp} XP · SAVED LOCALLY`
              : "STORAGE UNAVAILABLE · THIS VISIT ONLY"}
          </span>
        </aside>

        {run.phase === "ready" ? (
          <section className="practice-card ready-card">
            <span className="question-number">
              YOUR NEXT GOOD HABIT STARTS HERE
            </span>
            <div className="ready-emblem">{MODES[mode].icon}</div>
            <p className="eyebrow">
              {mode === "daily"
                ? "TODAY’S SHARED CHALLENGE"
                : "READY WHEN YOU ARE"}
            </p>
            <h1>
              {mode === "survival"
                ? "Three lives.\nMake them count."
                : mode === "timed"
                  ? "60 seconds.\nFind your flow."
                  : "Let’s make\nit automatic."}
            </h1>
            <p>
              {MODES[mode].detail}. Correct answers build combos and XP. Use the
              on-screen keyboard for protected shortcuts.
            </p>
            <button
              ref={actionRef}
              className="button button-primary"
              onClick={start}
            >
              Start round <span>→</span>
            </button>
            <span className="ready-hint">
              <kbd>Enter</kbd> start · <kbd>Esc</kbd> pause during play
            </span>
          </section>
        ) : run.phase === "finished" ? (
          <section className="practice-card session-summary">
            <div className="practice-card-header">
              <span className="question-number">
                {finite && run.attempts.length < 10
                  ? "ROUND ENDED"
                  : "ROUND COMPLETE"}
              </span>
              <span className="category-badge">+{run.xp} XP</span>
            </div>
            <div className="summary-copy">
              <div className="summary-medal">
                {flawless
                  ? "✦"
                  : correct / Math.max(1, run.attempts.length) >= 0.7
                    ? "↗"
                    : "◎"}
              </div>
              <p className="eyebrow">
                {run.score > previousBest
                  ? "NEW PERSONAL BEST"
                  : "EVERY REP IS PROGRESS"}
              </p>
              <h1>
                {flawless
                  ? "Flawless flow."
                  : correct / Math.max(1, run.attempts.length) >= 0.7
                    ? "Nicely played."
                    : "You’re building it."}
              </h1>
              <p className="question-subtitle">
                {run.attempts.length
                  ? `${correct} of ${run.attempts.length} chords landed. ${missed.length ? "Let’s give the tricky ones another go." : "That’s useful muscle memory."}`
                  : "A fresh round is one click away."}
              </p>
            </div>
            <div className="summary-stats">
              <div>
                <strong>{run.score.toLocaleString()}</strong>
                <span>points</span>
              </div>
              <div>
                <strong>
                  {Math.round(
                    (correct / Math.max(1, run.attempts.length)) * 100,
                  )}
                  %
                </strong>
                <span>accuracy</span>
              </div>
              <div>
                <strong>{run.bestStreak}</strong>
                <span>best combo</span>
              </div>
            </div>
            {missed.length > 0 && (
              <div className="review-list">
                <span className="micro-label">TAKE THESE WITH YOU</span>
                {missed.map((s) => (
                  <div key={s.id}>
                    <span>{s.action}</span>
                    <kbd>{chordLabel(s.expected)}</kbd>
                  </div>
                ))}
              </div>
            )}
            <div className="practice-card-footer summary-footer">
              <button
                ref={actionRef}
                className="button button-primary"
                onClick={start}
              >
                Play again <span>↻</span>
              </button>
              <Link
                className="button button-secondary"
                href={
                  missed.length
                    ? `/practice?mode=review${category === "all" ? "" : `&category=${category}`}`
                    : "/"
                }
              >
                {missed.length ? "Practice weak spots" : "Back to arcade"}{" "}
                <span>→</span>
              </Link>
            </div>
          </section>
        ) : (
          <section
            className={`practice-card play-card ${result ? (result.correct ? "has-correct" : "has-incorrect") : ""}`}
          >
            {run.paused && (
              <div
                className="pause-overlay"
                role="dialog"
                aria-modal="true"
                aria-label="Round paused"
              >
                <span className="eyebrow">TAKE A BREATH</span>
                <h2>Flow on hold.</h2>
                <p>Your round is paused. Come back when you’re ready.</p>
                <button
                  ref={actionRef}
                  className="button button-primary"
                  onClick={() => {
                    dispatch({ type: "resume", now: Date.now() });
                    mainRef.current?.focus();
                  }}
                >
                  Resume round <span>→</span>
                </button>
                <Link href="/" className="back-link">
                  Back to arcade
                </Link>
              </div>
            )}
            <div inert={run.paused}>
              <div className="practice-card-header">
                <span className="question-number">
                  CHORD{" "}
                  {String(run.attempts.length + (result ? 0 : 1)).padStart(
                    2,
                    "0",
                  )}
                  {finite ? " / 10" : ""}
                </span>
                <span className="category-badge">
                  {CATEGORY_LABELS[question.category]}
                </span>
              </div>
              <div
                className="round-dots"
                aria-label={`${run.attempts.length} answered`}
              >
                {(finite
                  ? Array.from({ length: 10 })
                  : run.attempts.slice(-15)
                ).map((_, i) => (
                  <span
                    key={i}
                    className={
                      run.attempts[
                        finite ? i : Math.max(0, run.attempts.length - 15) + i
                      ]
                        ? run.attempts[
                            finite
                              ? i
                              : Math.max(0, run.attempts.length - 15) + i
                          ].correct
                          ? "dot-correct"
                          : "dot-incorrect"
                        : i === run.attempts.length
                          ? "dot-current"
                          : ""
                    }
                  />
                ))}
              </div>
              {result?.correct && run.streak > 0 && run.streak % 3 === 0 && (
                <div className="combo-toast" role="status">
                  ϟ {run.streak} COMBO · ×
                  {Math.min(4, 1 + Math.floor(run.streak / 3))}{" "}
                  {run.streak <= 9 ? "UNLOCKED" : "FLOW"}
                </div>
              )}
              <div className="question-content" key={question.id}>
                <p className="question-kicker">
                  {question.difficulty === "stretch"
                    ? "A LITTLE CHALLENGE FOR YOU"
                    : "YOUR MOVE"}
                </p>
                <h1>{question.action}</h1>
                <p className="question-subtitle">
                  {result
                    ? result.correct
                      ? "Locked in. Keep the flow going."
                      : "Take a look, then give another chord a go."
                    : builderRequired
                      ? "Build this chord safely on the keyboard below."
                      : builderVisible
                        ? "Select the keys on the keyboard below."
                        : "Press the shortcut, or build it on screen."}
                </p>
              </div>
              <div className="answer-zone" aria-live="polite">
                <div className="captured-keys">
                  {run.captured.length ? (
                    run.captured.map((key) => (
                      <span
                        key={key}
                        className={`answer-key ${result?.correct ? "key-correct" : "key-incorrect"}`}
                      >
                        {key}
                      </span>
                    ))
                  ) : result ? (
                    <span className="waiting-text">
                      SKIPPED · ANSWER REVEALED BELOW
                    </span>
                  ) : (
                    <span className="waiting-text">
                      <span className="pulse-dot" />
                      {builderVisible
                        ? "YOUR CHORD GOES HERE"
                        : "LISTENING FOR YOUR SHORTCUT"}
                    </span>
                  )}
                </div>
                {result && (
                  <div
                    className={`feedback ${result.correct ? "correct-feedback" : "incorrect-feedback"}`}
                  >
                    <span className="feedback-icon">
                      {result.correct ? "✓" : "×"}
                    </span>
                    <span>
                      <strong>
                        {result.correct
                          ? result.assisted
                            ? "Good practice."
                            : run.streak >= 3
                              ? "You’re in the zone!"
                              : "That’s the one."
                          : "Next time, you’ll know."}
                      </strong>
                      {!result.correct && (
                        <span className="correct-answer">
                          {" "}
                          {chordLabel(question.expected)}
                        </span>
                      )}
                    </span>
                    <span className="feedback-time">
                      {result.correct ? `+${result.points} PTS · ` : ""}
                      {result.seconds.toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>
              {run.hint && !result && (
                <div className="hint-reveal">
                  <span>TRY THIS CHORD</span>
                  <strong>{chordLabel(question.expected)}</strong>
                  <small>Learning rep · reduced XP · no combo</small>
                </div>
              )}
              {!result && builderVisible && (
                <KeyBuilder
                  key={`${question.id}-${run.attempts.length}`}
                  onSubmit={submit}
                  protectedShortcut={builderRequired}
                />
              )}
              {result && question.tip && (
                <p className="question-tip">
                  <span>REMEMBER</span>
                  {question.tip}
                </p>
              )}
              <div className="practice-card-footer">
                {result ? (
                  <>
                    <button
                      ref={actionRef}
                      className="button button-primary next-button"
                      onClick={next}
                    >
                      {nextFinishes ? "See results" : "Next chord"}{" "}
                      <span>→</span>
                    </button>
                    <span className="enter-hint">
                      {autoNext ? "Moving on automatically · " : ""}
                      <kbd>Enter</kbd> continue
                    </span>
                  </>
                ) : (
                  <div className="play-tools">
                    {!builderRequired && (
                      <button
                        className="builder-toggle"
                        onClick={() => {
                          setShowBuilder(!showBuilder);
                          mainRef.current?.focus();
                        }}
                      >
                        {showBuilder
                          ? "Use physical keyboard"
                          : "Use on-screen keyboard"}{" "}
                        <span>⌨</span>
                      </button>
                    )}
                    <button
                      className="text-button"
                      disabled={run.hint}
                      onClick={() => dispatch({ type: "hint" })}
                    >
                      {run.hint ? "Hint revealed" : "Need a hint?"}
                    </button>
                    <button className="text-button" onClick={() => submit([])}>
                      Skip
                    </button>
                  </div>
                )}
              </div>
              <div className="card-bottomline">
                <span>
                  {builderRequired
                    ? "◈ PROTECTED CHORD · SAFE BUILDER"
                    : "ACTIVE RECALL → MUSCLE MEMORY"}
                </span>
                <button
                  className="text-button"
                  onClick={() => dispatch({ type: "pause", now: Date.now() })}
                >
                  Pause <kbd>Esc</kbd>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
      <footer className="practice-footer">
        <span>KEYBOUND // ONE GOOD REP AT A TIME</span>
        {run.phase !== "ready" && run.phase !== "finished" && (
          <button
            className="text-button"
            onClick={() => dispatch({ type: "finish" })}
          >
            Finish round
          </button>
        )}
        <span>
          LEVEL {level.level} · {level.title.toUpperCase()}
        </span>
      </footer>
    </main>
  );
}
function KeyBuilder({
  onSubmit,
  protectedShortcut,
}: {
  onSubmit: (keys: string[]) => void;
  protectedShortcut: boolean;
}) {
  const [keys, setKeys] = useState<string[]>([]);
  const alphaRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];
  const utilityKeys = ["`", "/", "Tab", "Delete", "Backspace", "F2", "F4"];
  const arrows = ["Left", "Down", "Right", "Up"];
  function toggle(key: string) {
    setKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : normalizeKeys([...current, key]),
    );
  }
  function renderKey(key: string, className = "") {
    const isActive = keys.includes(key);
    return (
      <button
        type="button"
        key={key}
        autoFocus={key === "Ctrl"}
        aria-pressed={isActive}
        className={`builder-key ${className} ${isActive ? "active" : ""}`}
        onClick={() => toggle(key)}
      >
        {prettyKey(key)}
      </button>
    );
  }
  return (
    <div
      className="key-builder"
      role="group"
      aria-label="Keyboard shortcut builder"
      onKeyDown={(event) => {
        if (event.key === "Enter" && keys.length) {
          event.preventDefault();
          event.stopPropagation();
          onSubmit(keys);
        }
      }}
    >
      <div className="builder-title">
        <span>
          {protectedShortcut ? "Safe practice builder" : "Build your chord"}
        </span>
        <span>{keys.length ? chordLabel(keys) : "Select keys below"}</span>
      </div>
      {protectedShortcut && (
        <p className="builder-safety">
          <span>i</span> This chord is kept inside the app so it cannot trigger
          Windows or browser actions.
        </p>
      )}
      <p className="builder-controls">
        <kbd>Tab</kbd> move · <kbd>Space</kbd> toggle · <kbd>Enter</kbd> check
      </p>
      <div className="keyboard-board">
        <div className="keyboard-row utility-row">
          {utilityKeys.map((key) => renderKey(key, "utility-key"))}
        </div>
        {alphaRows.map((row, index) => (
          <div
            className={`keyboard-row alpha-row alpha-row-${index + 1}`}
            key={row[0]}
          >
            {row.map((key) => renderKey(key))}
          </div>
        ))}
        <div className="keyboard-row bottom-row">
          {renderKey("Ctrl", "modifier-key modifier-ctrl")}
          {renderKey("Win", "modifier-key modifier-win")}
          {renderKey("Alt", "modifier-key modifier-alt")}
          {renderKey("Space", "space-key")}
          {renderKey("Shift", "modifier-key modifier-shift")}
          <div className="arrow-cluster" aria-label="Arrow keys">
            {arrows.map((key) =>
              renderKey(key, `arrow-key arrow-${key.toLowerCase()}`),
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="builder-submit"
        disabled={!keys.length}
        onClick={() => onSubmit(keys)}
      >
        Check chord
      </button>
    </div>
  );
}
