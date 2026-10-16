"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { shortcuts } from "../data/shortcuts";
import {
  allChords,
  chordsMatch,
  keyEventToChord,
  matchesShortcut,
  normalizeKeys,
  requiresBuilder,
  shortcutRequiresBuilder,
} from "../lib/shortcut";
import {
  dayKey,
  filterPool,
  isFiniteMode,
  freshRun,
  grade,
  levelFor,
  makeChoices,
  makeDeck,
  MODES,
  recordAttempt,
  recordSession,
  ROUND_LENGTH,
  runReducer,
  TIERS,
  BLITZ_MS,
  type GameMode,
  type Tier,
} from "../lib/game";
import { readProfile, updateProfile, useProfile } from "../lib/profile";
import {
  CATEGORY_LABELS,
  CATEGORY_META,
  DIFFICULTY_LABELS,
  type Shortcut,
  type ShortcutCategory,
} from "../types/shortcut";
import { Brand } from "./brand";
import { Chord, Keyboard, useHeldKeys, type KeyMark } from "./keyboard";

export default function ShortcutTrainer() {
  const searchParams = useSearchParams();
  return <Game key={searchParams.toString()} searchParams={searchParams} />;
}

const multiplierFor = (streak: number) =>
  Math.min(4, 1 + Math.floor(streak / 3));

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
  const requestedTier = searchParams.get("tier") ?? "all";
  const tier: Tier =
    mode !== "daily" && Object.hasOwn(TIERS, requestedTier)
      ? (requestedTier as Tier)
      : "all";
  const pool = useMemo(
    () => filterPool(shortcuts, category, tier),
    [category, tier],
  );
  const [run, dispatch] = useReducer(runReducer, pool, freshRun);
  const [built, setBuilt] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
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
  const isDecode = mode === "decode";
  const protectedPrompt = !isDecode && shortcutRequiresBuilder(question);
  const playing = run.phase === "playing" && !run.paused;
  const held = useHeldKeys(run.phase === "playing" && !isDecode);
  const finite = isFiniteMode(mode);
  const correctCount = run.attempts.filter((a) => a.correct).length;
  const accuracy = correctCount / Math.max(1, run.attempts.length);
  const flawless =
    correctCount > 0 && run.attempts.every((a) => a.correct && !a.assisted);
  const level = levelFor(profile.xp);
  const timeLeft = Math.ceil(run.remaining / 1000);
  const nextFinishes =
    (finite && run.attempts.length >= ROUND_LENGTH) ||
    (mode === "survival" && run.lives <= 0);
  const multiplier = multiplierFor(run.streak);
  const meta = CATEGORY_META[question.category];
  const choices = useMemo(
    () =>
      isDecode
        ? makeChoices(
            question,
            pool,
            `${question.id}:${run.index}:${run.deck.length}`,
          )
        : [],
    [isDecode, question, pool, run.index, run.deck.length],
  );
  // The 50/50 hint in Decode hides two wrong answers.
  const hiddenChoices = useMemo(
    () =>
      new Set(
        run.hint > 0
          ? choices
              .filter((c) => c.id !== question.id)
              .slice(0, 2)
              .map((c) => c.id)
          : [],
      ),
    [choices, question.id, run.hint],
  );
  const missed = [
    ...new Map(
      run.attempts
        .filter((a) => !a.correct || a.assisted)
        .map((a) => [a.shortcut.id, a.shortcut]),
    ).values(),
  ];

  function playSound(kind: "good" | "bad" | "combo") {
    if (!readProfile().sound || !window.AudioContext) return;
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      if (context.state === "suspended") void context.resume().catch(() => {});
      const notes = {
        good: [659.25, 987.77],
        bad: [220, 174.61],
        combo: [523.25, 659.25, 783.99, 1046.5],
      }[kind];
      notes.forEach((frequency, i) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start =
          context.currentTime + i * (kind === "combo" ? 0.06 : 0.07);
        oscillator.type = kind === "bad" ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          kind === "bad" ? 0.09 : 0.06,
          start + 0.012,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.32);
      });
    } catch {
      /* Audio is optional; the round continues if the browser blocks it. */
    }
  }

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
          run.attempts.length >= ROUND_LENGTH,
        ),
      );
    }
  }, [run.attempts, run.bestStreak, run.phase, run.score, mode]);

  const refocus = () => mainRef.current?.focus({ preventScroll: true });
  function start() {
    savedAttempts.current = 0;
    savedSession.current = false;
    sessionDay.current = dayKey();
    setPreviousBest(readProfile().best[mode] ?? 0);
    setBuilt([]);
    setPicked(null);
    dispatch({
      type: "start",
      deck: makeDeck(pool, mode, readProfile(), sessionDay.current),
      now: Date.now(),
    });
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function next() {
    setBuilt([]);
    setPicked(null);
    const deck = makeDeck(pool, mode, readProfile(), sessionDay.current);
    // Avoid a repeated question at the boundary between shuffled decks.
    if (deck.length > 1 && deck[0].id === question.id)
      [deck[0], deck[1]] = [deck[1], deck[0]];
    dispatch({
      type: "next",
      deck,
      mode,
      now: Date.now(),
      requeue: mode !== "daily",
    });
    mainRef.current?.focus({ preventScroll: true });
  }
  function answer(good: boolean, keys: string[]) {
    if (!playing) return;
    if (mode !== "timed" || Date.now() < run.deadline) {
      const streak = good && !run.hint ? run.streak + 1 : 0;
      playSound(
        good ? (streak > 0 && streak % 3 === 0 ? "combo" : "good") : "bad",
      );
    }
    dispatch({
      type: "answer",
      correct: good,
      keys: normalizeKeys(keys),
      mode,
      now: Date.now(),
    });
  }
  const submit = (keys: string[]) =>
    answer(matchesShortcut(keys, question), keys);
  function pick(choice: Shortcut) {
    if (!playing || hiddenChoices.has(choice.id)) return;
    setPicked(choice.id);
    answer(choice.id === question.id, question.expected);
  }
  function toggleKey(key: string) {
    setBuilt((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : normalizeKeys([...current, key]),
    );
  }

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
  const advance = useEffectEvent(() => next());
  useEffect(() => {
    if (!autoNext || run.phase !== "result" || run.paused) return;
    const timer = window.setTimeout(advance, result?.correct ? 900 : 2400);
    return () => window.clearTimeout(timer);
  }, [autoNext, result?.correct, run.paused, run.phase]);
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
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.isComposing) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const interactive = target?.closest(
      "button, a, select, input, textarea, label",
    );
    if (
      event.key === "Escape" &&
      !event.repeat &&
      run.phase !== "ready" &&
      run.phase !== "finished"
    ) {
      event.preventDefault();
      dispatch({ type: run.paused ? "resume" : "pause", now: Date.now() });
      if (run.paused) mainRef.current?.focus({ preventScroll: true });
      return;
    }
    if (interactive || run.paused || event.repeat) return;
    const plain =
      !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
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
    if (isDecode) {
      const index = Number(event.key) - 1;
      if (plain && index >= 0 && index < choices.length) {
        event.preventDefault();
        pick(choices[index]);
      }
      return;
    }
    if (built.length && plain && event.key === "Enter") {
      event.preventDefault();
      submit(built);
      return;
    }
    if (built.length && plain && event.key === "Backspace") {
      event.preventDefault();
      setBuilt((current) => current.slice(0, -1));
      return;
    }
    // Tab always remains available for navigating the interface.
    if (event.key === "Tab" && !event.ctrlKey) return;
    if (
      protectedPrompt ||
      ["Control", "Alt", "Shift", "Meta", "OS"].includes(event.key)
    )
      return;
    const keys = keyEventToChord(event);
    if (requiresBuilder(keys)) return;
    event.preventDefault();
    submit(keys);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const marks: Record<string, KeyMark> = {};
  if (isDecode) {
    for (const key of question.expected)
      marks[key] = result ? (result.correct ? "correct" : "answer") : "hint";
  } else if (result) {
    for (const key of question.expected) marks[key] = "answer";
    for (const key of run.captured)
      marks[key] = result.correct
        ? "correct"
        : question.expected.includes(key)
          ? "answer"
          : "wrong";
  } else if (run.hint) {
    for (const key of run.hint >= 2
      ? question.expected
      : question.expected.slice(0, 1))
      marks[key] = "hint";
  }

  const setLabel = `${category === "all" ? "All categories" : CATEGORY_LABELS[category]} · ${TIERS[tier].name}`;

  return (
    <main
      className={`game-shell ${result ? (result.correct ? "flash-good" : "flash-bad") : ""}`}
      ref={mainRef}
      tabIndex={-1}
    >
      <header className="hud">
        <Brand />
        <div className="hud-mode">
          <span className="hud-mode-icon" aria-hidden="true">
            {MODES[mode].icon}
          </span>
          <span>
            <strong>{MODES[mode].name}</strong>
            <small>{setLabel}</small>
          </span>
        </div>
        <div className="hud-stats">
          {mode === "survival" && (
            <span
              className="hud-lives"
              aria-label={`${Math.max(0, run.lives)} lives left`}
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < run.lives ? "" : "lost"}>
                  ♥
                </span>
              ))}
            </span>
          )}
          {mode === "timed" && (
            <span
              className={`hud-timer ${timeLeft <= 10 && run.phase !== "ready" ? "urgent" : ""}`}
            >
              {timeLeft}
              <small>s</small>
            </span>
          )}
          <span className="hud-score" aria-label={`${run.score} points`}>
            <span key={run.score} className="hud-score-value">
              {run.score.toLocaleString()}
            </span>
            <small>pts</small>
          </span>
          <button
            className="icon-button"
            onClick={() => updateProfile((p) => ({ ...p, sound: !p.sound }))}
            aria-label={profile.sound ? "Mute sounds" : "Turn sounds on"}
            title={profile.sound ? "Mute sounds" : "Turn sounds on"}
          >
            {profile.sound ? "🔊" : "🔇"}
          </button>
          {(run.phase === "playing" || run.phase === "result") && (
            <button
              className="icon-button"
              onClick={() => dispatch({ type: "pause", now: Date.now() })}
              aria-label="Pause"
              title="Pause (Esc)"
            >
              ❚❚
            </button>
          )}
        </div>
      </header>
      {mode === "timed" ? (
        <div className="round-bar" aria-hidden="true">
          <span
            className={timeLeft <= 10 ? "urgent" : ""}
            style={{ width: `${(run.remaining / BLITZ_MS) * 100}%` }}
          />
        </div>
      ) : finite ? (
        <div className="round-steps" aria-hidden="true">
          {Array.from({ length: ROUND_LENGTH }, (_, i) => {
            const attempt = run.attempts[i];
            return (
              <span
                key={i}
                className={
                  attempt
                    ? attempt.correct
                      ? attempt.assisted
                        ? "step-assisted"
                        : "step-good"
                      : "step-bad"
                    : i === run.attempts.length && run.phase === "playing"
                      ? "step-current"
                      : ""
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="round-bar round-bar-idle" aria-hidden="true" />
      )}

      <div className="arena">
        {run.phase === "ready" ? (
          <section className="stage ready-stage">
            <div className="ready-emblem" aria-hidden="true">
              <span className="cap cap-hero">{MODES[mode].icon}</span>
            </div>
            <p className="eyebrow">
              {mode === "daily" ? `Daily mix · ${dayKey()}` : setLabel}
            </p>
            <h1 className="display">
              {mode === "survival"
                ? "Three lives. Make them count."
                : mode === "timed"
                  ? "Sixty seconds. Go fast."
                  : mode === "decode"
                    ? "Read the keys. Name the move."
                    : mode === "review"
                      ? "Turn misses into muscle memory."
                      : "Let’s make it automatic."}
            </h1>
            <p className="lede">
              {MODES[mode].description} {MODES[mode].detail}. {pool.length}{" "}
              shortcuts in this set.
            </p>
            <div className="ready-rules">
              <div>
                <span className="cap cap-sm">↵</span>
                {mode === "decode"
                  ? "Pick an answer with 1–4 or a click"
                  : "Press the real shortcut to answer"}
              </div>
              <div>
                <span className="cap cap-sm">⊞</span>
                Protected chords (Win, Alt, F-keys) are clicked on the on-screen
                keyboard
              </div>
              <div>
                <span className="cap cap-sm">×3</span>
                Three clean answers in a row raise your multiplier, up to ×4
              </div>
            </div>
            <button
              ref={actionRef}
              className="button button-primary button-lg"
              onClick={start}
            >
              Start round <span aria-hidden="true">→</span>
            </button>
            <span className="key-hint">
              <kbd>Enter</kbd> start · <kbd>Esc</kbd> pause
            </span>
          </section>
        ) : run.phase === "finished" ? (
          <Summary
            run={run}
            mode={mode}
            category={category}
            tier={tier}
            accuracy={accuracy}
            flawless={flawless}
            correctCount={correctCount}
            previousBest={previousBest}
            missed={missed}
            onRestart={start}
          />
        ) : (
          <section
            className={`stage play-stage ${result ? (result.correct ? "is-good" : "is-bad") : ""}`}
          >
            {run.paused && (
              <div
                className="pause-overlay"
                role="dialog"
                aria-modal="true"
                aria-label="Round paused"
              >
                <span className="cap cap-hero" aria-hidden="true">
                  ❚❚
                </span>
                <h2 className="display">Paused</h2>
                <p>Your timer is frozen. Take a breath.</p>
                <button
                  ref={actionRef}
                  className="button button-primary"
                  onClick={() => {
                    dispatch({ type: "resume", now: Date.now() });
                    refocus();
                  }}
                >
                  Resume <span aria-hidden="true">→</span>
                </button>
                <div className="pause-links">
                  <button
                    className="text-button"
                    onClick={() => dispatch({ type: "finish" })}
                  >
                    End round
                  </button>
                  <Link href="/" className="text-button">
                    Back to menu
                  </Link>
                </div>
              </div>
            )}
            <div className="play-card" inert={run.paused}>
              <div className="prompt-meta">
                <span className={`pill tone-${meta.color}`}>
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.app}
                </span>
                <span className={`pill pill-quiet diff-${question.difficulty}`}>
                  {DIFFICULTY_LABELS[question.difficulty]}
                </span>
                <span className="prompt-count">
                  {String(run.attempts.length + (result ? 0 : 1)).padStart(
                    2,
                    "0",
                  )}
                  {finite ? ` / ${ROUND_LENGTH}` : ""}
                </span>
              </div>

              {result && (
                <span
                  key={run.attempts.length}
                  className={`score-pop ${result.correct ? "" : "score-pop-miss"}`}
                  aria-hidden="true"
                >
                  {result.correct ? `+${result.points}` : "miss"}
                </span>
              )}

              {isDecode ? (
                <div className="prompt" key={`${question.id}-${run.index}`}>
                  <p className="kicker">What does this do?</p>
                  <div className="decode-chord">
                    <Chord
                      keys={question.expected}
                      size="xl"
                      state={
                        result
                          ? result.correct
                            ? "correct"
                            : "wrong"
                          : undefined
                      }
                    />
                  </div>
                  <span className="decode-app">in {meta.app}</span>
                  <div className="choices" role="group" aria-label="Answers">
                    {choices.map((choice, i) => {
                      const state = result
                        ? choice.id === question.id
                          ? "choice-right"
                          : choice.id === picked
                            ? "choice-wrong"
                            : "choice-dim"
                        : hiddenChoices.has(choice.id)
                          ? "choice-hidden"
                          : "";
                      return (
                        <button
                          key={choice.id}
                          className={`choice ${state}`}
                          disabled={!playing || hiddenChoices.has(choice.id)}
                          onClick={() => pick(choice)}
                        >
                          <span className="choice-num">{i + 1}</span>
                          {choice.action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="prompt" key={`${question.id}-${run.index}`}>
                  <p className="kicker">
                    {protectedPrompt ? (
                      <>
                        <span className="lock" aria-hidden="true">
                          ◈
                        </span>{" "}
                        Protected · click the keys below
                      </>
                    ) : (
                      "Press the shortcut to"
                    )}
                  </p>
                  <h1 className="prompt-action">{question.action}</h1>
                  <div className="answer-slot" aria-live="polite">
                    {result ? (
                      run.captured.length ? (
                        <Chord
                          keys={run.captured}
                          size="lg"
                          state={result.correct ? "correct" : "wrong"}
                        />
                      ) : (
                        <span className="slot-note">Skipped</span>
                      )
                    ) : built.length ? (
                      <Chord keys={built} size="lg" />
                    ) : held.length && !protectedPrompt ? (
                      <Chord keys={held} size="lg" state="ghost" />
                    ) : run.hint ? (
                      <Chord
                        keys={
                          run.hint >= 2
                            ? question.expected
                            : question.expected.slice(0, 1)
                        }
                        placeholders={
                          run.hint >= 2 ? 0 : question.expected.length - 1
                        }
                        size="lg"
                        state="hint"
                      />
                    ) : (
                      <span className="slot-note">
                        <span className="caret" />
                        {protectedPrompt
                          ? "Build the chord on the keyboard"
                          : "Waiting for your keys"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {result && (
                <div
                  className={`feedback ${result.correct ? "feedback-good" : "feedback-bad"}`}
                  role="status"
                >
                  <span className="feedback-icon" aria-hidden="true">
                    {result.correct ? "✓" : "×"}
                  </span>
                  <div className="feedback-body">
                    <strong>
                      {result.correct
                        ? result.assisted
                          ? "Got there with a hint."
                          : run.streak >= 9
                            ? "Unstoppable."
                            : run.streak >= 3
                              ? "You’re in the zone."
                              : "Locked in."
                        : isDecode
                          ? `That was “${question.action}”.`
                          : "Not quite. Here’s the move:"}
                    </strong>
                    {!result.correct && !isDecode && (
                      <Chord
                        keys={question.expected}
                        size="sm"
                        state="correct"
                      />
                    )}
                    {!isDecode &&
                      allChords(question)
                        .filter(
                          (chord) =>
                            !chordsMatch(
                              chord,
                              result.correct ? run.captured : question.expected,
                            ),
                        )
                        .slice(0, 2)
                        .map((chord) => (
                          <span className="also" key={chord.join("+")}>
                            also <Chord keys={chord} size="sm" />
                          </span>
                        ))}
                  </div>
                  <div className="feedback-tags">
                    {result.correct && !result.assisted && result.speed > 0 && (
                      <span className="tag tag-speed">
                        ⚡ {result.speed === 50 ? "Lightning" : "Quick"}
                      </span>
                    )}
                    {result.correct && !result.assisted && multiplier > 1 && (
                      <span className="tag tag-combo">×{multiplier}</span>
                    )}
                    <span className="tag">{result.seconds.toFixed(1)}s</span>
                  </div>
                </div>
              )}
              {result && question.tip && (
                <p className="tip">
                  <span>Pro tip</span>
                  {question.tip}
                </p>
              )}

              <div className="play-controls">
                {result ? (
                  <>
                    <button
                      ref={actionRef}
                      className="button button-primary"
                      onClick={next}
                    >
                      {nextFinishes ? "See results" : "Next"}{" "}
                      <span aria-hidden="true">→</span>
                    </button>
                    <span className="key-hint">
                      {autoNext ? "Auto-advancing · " : ""}
                      <kbd>Enter</kbd> continue
                    </span>
                  </>
                ) : (
                  <>
                    {!isDecode && built.length > 0 && (
                      <button
                        className="button button-primary"
                        onClick={() => {
                          submit(built);
                          refocus();
                        }}
                      >
                        Check <kbd>Enter</kbd>
                      </button>
                    )}
                    {!isDecode && built.length > 0 && (
                      <button
                        className="button button-ghost"
                        onClick={() => {
                          setBuilt([]);
                          refocus();
                        }}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      className="button button-ghost"
                      disabled={run.hint >= (isDecode ? 1 : 2)}
                      onClick={() => {
                        dispatch({ type: "hint", max: isDecode ? 1 : 2 });
                        refocus();
                      }}
                    >
                      {isDecode
                        ? run.hint
                          ? "50/50 used"
                          : "50/50 hint"
                        : run.hint === 0
                          ? "Hint"
                          : run.hint === 1
                            ? "Reveal all"
                            : "Revealed"}
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => {
                        if (isDecode) {
                          setPicked(null);
                          answer(false, []);
                        } else submit([]);
                        refocus();
                      }}
                    >
                      Skip
                    </button>
                    <span className="key-hint key-hint-end">
                      {run.hint > 0 && "Hints earn fewer points · "}
                      <kbd>Esc</kbd> pause
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="board" inert={run.paused}>
              <Keyboard
                selected={result ? [] : built}
                held={result ? [] : held}
                marks={marks}
                onToggle={playing && !isDecode ? toggleKey : undefined}
                label={
                  isDecode
                    ? "Keyboard showing the shortcut"
                    : "On-screen keyboard. Select keys to build a shortcut, then press Enter."
                }
              />
            </div>
          </section>
        )}

        <aside className="rail" aria-label="Round stats">
          <div
            className={`rail-card combo ${run.streak >= 3 ? "combo-hot" : ""}`}
          >
            <span className="rail-label">Combo</span>
            <div className="combo-value">
              <strong>×{multiplier}</strong>
              <span>{run.streak} in a row</span>
            </div>
            <div className="combo-pips" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={i < run.streak % 3 || run.streak >= 9 ? "lit" : ""}
                />
              ))}
            </div>
            <small>
              {run.streak >= 9
                ? "Max multiplier. Don’t drop it."
                : `${3 - (run.streak % 3)} more for ×${Math.min(4, multiplier + 1)}`}
            </small>
          </div>
          <div className="rail-card rail-stats">
            <div>
              <strong>{correctCount}</strong>
              <span>correct</span>
            </div>
            <div>
              <strong>{Math.round(accuracy * 100)}%</strong>
              <span>accuracy</span>
            </div>
            <div>
              <strong>{run.bestStreak}</strong>
              <span>best combo</span>
            </div>
          </div>
          {run.attempts.length > 0 && (
            <div className="rail-card recent">
              <span className="rail-label">Recent</span>
              <ol>
                {run.attempts
                  .slice(-6)
                  .reverse()
                  .map((attempt, i) => (
                    <li
                      key={run.attempts.length - i}
                      className={attempt.correct ? "good" : "bad"}
                    >
                      <span className="recent-mark" aria-hidden="true">
                        {attempt.correct ? "✓" : "×"}
                      </span>
                      <span className="recent-action">
                        {attempt.shortcut.action}
                      </span>
                      <Chord keys={attempt.shortcut.expected} size="sm" />
                    </li>
                  ))}
              </ol>
            </div>
          )}
          <label className="switch">
            <input
              type="checkbox"
              checked={autoNext}
              onChange={(e) => {
                setAutoNext(e.target.checked);
                refocus();
              }}
            />
            <span className="switch-track" aria-hidden="true" />
            Auto-advance
          </label>
          <p className="rail-note">
            {saved
              ? `Level ${level.level} · ${level.title} · ${profile.xp.toLocaleString()} XP`
              : "Storage unavailable · progress lasts this visit"}
          </p>
        </aside>
      </div>
    </main>
  );
}

function Summary({
  run,
  mode,
  category,
  tier,
  accuracy,
  flawless,
  correctCount,
  previousBest,
  missed,
  onRestart,
}: {
  run: ReturnType<typeof freshRun>;
  mode: GameMode;
  category: ShortcutCategory | "all";
  tier: Tier;
  accuracy: number;
  flawless: boolean;
  correctCount: number;
  previousBest: number;
  missed: Shortcut[];
  onRestart: () => void;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => actionRef.current?.focus({ preventScroll: true }), []);
  const letter = run.attempts.length ? grade(accuracy, flawless) : "–";
  const newBest = run.score > previousBest && run.score > 0;
  const average =
    run.attempts.reduce((sum, a) => sum + a.seconds, 0) /
    Math.max(1, run.attempts.length);
  const params = new URLSearchParams({ mode: "review" });
  if (category !== "all") params.set("category", category);
  if (tier !== "all") params.set("tier", tier);
  return (
    <section className="stage summary-stage">
      <div className="summary-head">
        <div className={`grade grade-${letter}`} aria-label={`Grade ${letter}`}>
          <span>{letter}</span>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" className="grade-track" />
            <circle
              cx="50"
              cy="50"
              r="45"
              className="grade-fill"
              style={{ strokeDashoffset: 283 - 283 * accuracy }}
            />
          </svg>
        </div>
        <div>
          {newBest && <span className="badge-best">★ New personal best</span>}
          <h1 className="display">
            {!run.attempts.length
              ? "Round over."
              : flawless
                ? "Flawless."
                : accuracy >= 0.75
                  ? "Nicely played."
                  : "You’re building it."}
          </h1>
          <p className="lede">
            {run.attempts.length
              ? `${correctCount} of ${run.attempts.length} landed in ${MODES[mode].name}. ${missed.length ? "The tricky ones are below." : "That’s real muscle memory."}`
              : "Nothing answered this time. One more go?"}
          </p>
        </div>
      </div>
      <div className="summary-stats">
        <div>
          <strong>{run.score.toLocaleString()}</strong>
          <span>points</span>
        </div>
        <div>
          <strong>{Math.round(accuracy * 100)}%</strong>
          <span>accuracy</span>
        </div>
        <div>
          <strong>{run.bestStreak}</strong>
          <span>best combo</span>
        </div>
        <div>
          <strong>{average.toFixed(1)}s</strong>
          <span>avg time</span>
        </div>
        <div>
          <strong>+{run.xp}</strong>
          <span>XP earned</span>
        </div>
      </div>
      {run.attempts.length > 0 && (
        <div className="summary-list">
          <span className="rail-label">Your round</span>
          <ol>
            {run.attempts.map((attempt, i) => (
              <li
                key={i}
                className={
                  attempt.correct
                    ? attempt.assisted
                      ? "assisted"
                      : "good"
                    : "bad"
                }
              >
                <span className="recent-mark" aria-hidden="true">
                  {attempt.correct ? (attempt.assisted ? "~" : "✓") : "×"}
                </span>
                <span className="recent-action">{attempt.shortcut.action}</span>
                <span className="summary-points">
                  {attempt.correct ? `+${attempt.points}` : "—"}
                </span>
                <Chord keys={attempt.shortcut.expected} size="sm" />
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="summary-actions">
        <button
          ref={actionRef}
          className="button button-primary button-lg"
          onClick={onRestart}
        >
          Play again <span aria-hidden="true">↻</span>
        </button>
        {missed.length > 0 && mode !== "review" && (
          <Link
            className="button button-secondary"
            href={`/practice?${params}`}
          >
            Drill weak spots
          </Link>
        )}
        <Link className="button button-ghost" href="/">
          Menu
        </Link>
      </div>
      <span className="key-hint">
        <kbd>Enter</kbd> play again
      </span>
    </section>
  );
}
