"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand, SiteHeader } from "../components/brand";
import { Chord, Keyboard, useHeldKeys } from "../components/keyboard";
import { shortcuts } from "../data/shortcuts";
import {
  achievements,
  currentDayStreak,
  dayKey,
  filterPool,
  levelFor,
  masteryState,
  MODES,
  TIERS,
  type GameMode,
  type Tier,
} from "../lib/game";
import { useProfile } from "../lib/profile";
import { chordLabel, matchesShortcut } from "../lib/shortcut";
import {
  CATEGORY_LABELS,
  CATEGORY_META,
  type ShortcutCategory,
} from "../types/shortcut";

const categories = Object.keys(CATEGORY_LABELS) as ShortcutCategory[];
const showcase = [
  "reopen-tab",
  "snip",
  "clipboard",
  "command-palette",
  "task-manager",
  "emoji",
  "new-desktop",
  "autosum",
]
  .map((id) => shortcuts.find((s) => s.id === id))
  .filter((s) => s !== undefined);

export default function HomePage() {
  const [category, setCategory] = useState<ShortcutCategory | "all">("all");
  const [tier, setTier] = useState<Tier>("everyday");
  const [mode, setMode] = useState<GameMode>("practice");
  const { profile, saved } = useProfile();
  const level = levelFor(profile.xp);
  const streak = currentDayStreak(profile);
  const mastered = shortcuts.filter(
    (s) => masteryState(profile.mastery[s.id]) === "mastered",
  ).length;
  const today = dayKey();
  const fixedSet = mode === "daily";
  const params = new URLSearchParams({ mode });
  if (!fixedSet && category !== "all") params.set("category", category);
  if (!fixedSet && tier !== "all") params.set("tier", tier);
  const href = `/practice?${params}`;
  const poolSize = fixedSet ? 10 : filterPool(shortcuts, category, tier).length;
  const trophies = achievements(profile, shortcuts);
  const earned = trophies.filter((t) => t.unlocked).length;

  return (
    <main className="site-shell">
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" /> {shortcuts.length} Windows shortcuts ·
            free · in your browser
          </p>
          <h1 className="display hero-title">
            Stop reaching
            <br />
            for the <em>mouse.</em>
          </h1>
          <p className="lede">
            Keybound turns keyboard shortcuts into a fast, satisfying game.
            Press the real keys, build combos, and watch Windows, your browser,
            Office and VS Code bend to your fingers.
          </p>
          <div className="hero-actions">
            <Link
              href="/practice?mode=practice&tier=essentials"
              className="button button-primary button-lg"
            >
              Play now <span aria-hidden="true">→</span>
            </Link>
            <Link href="/library" className="button button-secondary button-lg">
              Browse shortcuts
            </Link>
          </div>
          <dl className="hero-facts">
            <div>
              <dt>{shortcuts.length}</dt>
              <dd>shortcuts</dd>
            </div>
            <div>
              <dt>{categories.length}</dt>
              <dd>categories</dd>
            </div>
            <div>
              <dt>{Object.keys(MODES).length}</dt>
              <dd>game modes</dd>
            </div>
          </dl>
        </div>
        <HeroShowcase />
      </section>

      <section className="progress-strip" aria-label="Your progress">
        <div className="level-block">
          <div
            className="level-ring"
            style={{ "--p": level.progress } as React.CSSProperties}
          >
            <span>{level.level}</span>
          </div>
          <div>
            <span className="label">Level {level.level}</span>
            <strong>{level.title}</strong>
            <small>
              {level.remaining.toLocaleString()} XP to level {level.level + 1}
            </small>
          </div>
        </div>
        <div className="stat">
          <strong>
            {mastered}
            <small>/{shortcuts.length}</small>
          </strong>
          <span>mastered</span>
        </div>
        <div className="stat">
          <strong>{profile.bestStreak}</strong>
          <span>best combo</span>
        </div>
        <div className="stat">
          <strong>
            {streak}
            {streak > 0 && <small> 🔥</small>}
          </strong>
          <span>day streak</span>
        </div>
        <div className="stat">
          <strong>{profile.sessions}</strong>
          <span>rounds played</span>
        </div>
        <p className="save-note">
          {saved
            ? "Progress saves in this browser. No account needed."
            : "Storage is blocked, so progress lasts this visit only."}
        </p>
      </section>

      <div className="setup">
        <section className="section" aria-labelledby="modes-title">
          <div className="section-head">
            <span className="step">01</span>
            <div>
              <h2 id="modes-title">Pick a mode</h2>
              <p>Seven ways to play. Your best score for each is saved.</p>
            </div>
          </div>
          <div className="mode-grid">
            {(Object.keys(MODES) as GameMode[]).map((item) => (
              <button
                key={item}
                className={`mode-card mode-${item} ${mode === item ? "is-selected" : ""}`}
                onClick={() => setMode(item)}
                aria-pressed={mode === item}
              >
                <span className="cap mode-cap" aria-hidden="true">
                  {MODES[item].icon}
                </span>
                <span className="mode-name">
                  {MODES[item].name}
                  {item === "daily" && (
                    <span className="mode-tag">
                      {profile.daily[today] !== undefined ? "Done" : "Today"}
                    </span>
                  )}
                  {item === "decode" && <span className="mode-tag">New</span>}
                </span>
                <span className="mode-desc">{MODES[item].description}</span>
                <span className="mode-detail">{MODES[item].detail}</span>
                <span className="mode-best">
                  {profile.best[item] !== undefined
                    ? `Best ${profile.best[item]?.toLocaleString()}`
                    : "No score yet"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="set-title">
          <div className="section-head">
            <span className="step">02</span>
            <div>
              <h2 id="set-title">Choose your shortcuts</h2>
              <p>
                {fixedSet
                  ? "The daily mix draws from every category, so these are locked today."
                  : "Focus on one app, or mix everything together."}
              </p>
            </div>
            <div
              className="segmented"
              role="radiogroup"
              aria-label="Difficulty"
            >
              {(Object.keys(TIERS) as Tier[]).map((item) => (
                <button
                  key={item}
                  role="radio"
                  aria-checked={!fixedSet && tier === item}
                  disabled={fixedSet}
                  className={!fixedSet && tier === item ? "is-selected" : ""}
                  onClick={() => setTier(item)}
                  title={TIERS[item].detail}
                >
                  {TIERS[item].name}
                </button>
              ))}
            </div>
          </div>
          <div className="category-grid">
            {(["all", ...categories] as const).map((item) => {
              const pool =
                item === "all"
                  ? shortcuts
                  : shortcuts.filter((s) => s.category === item);
              const count = pool.filter(
                (s) => masteryState(profile.mastery[s.id]) === "mastered",
              ).length;
              const selected = fixedSet ? item === "all" : category === item;
              return (
                <button
                  key={item}
                  disabled={fixedSet}
                  className={`category-card tone-${item === "all" ? "orange" : CATEGORY_META[item].color} ${selected ? "is-selected" : ""}`}
                  onClick={() => setCategory(item)}
                  aria-pressed={selected}
                >
                  <span className="category-icon" aria-hidden="true">
                    {item === "all" ? "✦" : CATEGORY_META[item].icon}
                  </span>
                  <span className="category-text">
                    <span className="category-name">
                      {item === "all" ? "Everything" : CATEGORY_LABELS[item]}
                    </span>
                    <span className="category-detail">
                      {item === "all"
                        ? "Every category, shuffled"
                        : CATEGORY_META[item].detail}
                    </span>
                  </span>
                  <span className="category-count">
                    {count}/{pool.length}
                  </span>
                  <span className="meter" aria-hidden="true">
                    <span
                      style={{ width: `${(count / pool.length) * 100}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="launch-bar">
          <div className="launch-info">
            <span className="cap cap-sm" aria-hidden="true">
              {MODES[mode].icon}
            </span>
            <span>
              <strong>{MODES[mode].name}</strong>
              <small>
                {fixedSet
                  ? `Today’s ten · ${today}`
                  : `${category === "all" ? "Everything" : CATEGORY_LABELS[category]} · ${TIERS[tier].name} · ${poolSize} shortcuts`}
              </small>
            </span>
          </div>
          <Link className="button button-primary button-lg" href={href}>
            Play <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <section className="section" aria-labelledby="trophy-title">
        <div className="section-head">
          <span className="step">03</span>
          <div>
            <h2 id="trophy-title">Trophy shelf</h2>
            <p>
              {earned} of {trophies.length} unlocked.
            </p>
          </div>
        </div>
        <div className="trophy-grid">
          {trophies.map((badge) => (
            <div
              key={badge.name}
              className={`trophy ${badge.unlocked ? "is-earned" : ""}`}
            >
              <span className="trophy-icon" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <strong>{badge.name}</strong>
                <span>{badge.goal}</span>
              </div>
              <span className="trophy-state">
                {badge.unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <Brand />
        <span>Play a little. Remember a lot.</span>
        <Link href="/library">All {shortcuts.length} shortcuts →</Link>
      </footer>
    </main>
  );
}

function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const held = useHeldKeys();
  const current = showcase[index % showcase.length];
  const match = held.length
    ? shortcuts.find((s) => matchesShortcut(held, s))
    : undefined;
  useEffect(() => {
    if (held.length) return;
    const timer = window.setInterval(() => setIndex((i) => i + 1), 2600);
    return () => window.clearInterval(timer);
  }, [held.length]);
  const marks = Object.fromEntries(
    (held.length ? [] : current.expected).map((key) => [key, "hint" as const]),
  );
  return (
    <div className="showcase" aria-label="Interactive keyboard preview">
      <div className="showcase-top">
        <span className="showcase-label">
          {held.length
            ? "You’re pressing"
            : CATEGORY_META[current.category].app}
        </span>
        <span className="showcase-try">Try pressing some keys</span>
      </div>
      <div
        className="showcase-chord"
        key={held.length ? chordLabel(held) : current.id}
      >
        <Chord keys={held.length ? held : current.expected} size="xl" />
        <p>
          {held.length
            ? match
              ? match.action
              : "Keep going…"
            : current.action}
        </p>
      </div>
      <Keyboard held={held} marks={marks} label="Keyboard preview" />
    </div>
  );
}
