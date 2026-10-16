"use client";

import Link from "next/link";
import { useState } from "react";
import { shortcuts } from "../data/shortcuts";
import { dayKey, levelFor, MODES, type GameMode } from "../lib/game";
import { useProfile } from "../lib/profile";
import { CATEGORY_LABELS, CATEGORY_META, type ShortcutCategory } from "../types/shortcut";

const categories = Object.keys(CATEGORY_LABELS) as ShortcutCategory[];
export default function HomePage() {
  const [category, setCategory] = useState<ShortcutCategory | "all">("all");
  const [mode, setMode] = useState<GameMode>("practice");
  const { profile, saved } = useProfile();
  const level = levelFor(profile.xp);
  const mastered = shortcuts.filter((s) => (profile.mastery[s.id]?.chain ?? 0) >= 3).length;
  const today = dayKey();
  const href = `/practice?mode=${mode}${mode === "daily" || category === "all" ? "" : `&category=${category}`}`;
  return <main className="site-shell home-shell">
    <header className="topbar"><Link href="/" className="brand" aria-label="Keybound home"><span className="brand-mark">⌘</span><span>KEYBOUND<span className="brand-slash">{"//"}</span></span></Link><span className="edition">THE KEYBOARD ARCADE</span><div className="player-chip"><span className="status-dot" /> LEVEL {level.level} <span className="chip-divider">/</span> {profile.xp.toLocaleString()} XP</div></header>
    <section className="arcade-hero">
      <div className="hero-copy"><p className="eyebrow"><span className="live-dot" /> A LITTLE PRACTICE. A LOT MORE POWER.</p><h1>Less clicking.<br /><em>More winning.</em></h1><p className="hero-description">Your keyboard has superpowers. Unlock them in quick, satisfying rounds that turn useful shortcuts into second nature.</p><div className="hero-actions"><Link href={href} className="button button-primary hero-play">Let’s play <span>↗</span></Link><span className="hero-aside">Small rounds. Real skills.<br /><span>Windows shortcuts · play in your browser</span></span></div></div>
      <div className="arcade-art" aria-label="Windows clipboard history shortcut: Win plus V"><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" /><span className="art-coordinate">INPUT_ / 001</span><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">+</span><div className="art-key key-win">⊞<span>Win</span></div><span className="art-plus">+</span><div className="art-key key-v">V</div><div className="art-caption"><span className="status-dot" /> CLIPBOARD HISTORY UNLOCKED <span>↗</span></div><div className="art-sticker">GOODBYE,<br />RIGHT CLICK.</div><span className="art-bottom">BUILD MUSCLE MEMORY. KEEP THE HIGH SCORE.</span></div>
    </section>
    <section className="player-strip" aria-label="Your progress"><div className="level-medal">{String(level.level).padStart(2, "0")}</div><div className="level-info"><span className="micro-label">YOUR NEXT CHAPTER</span><strong>{level.title}</strong><div className="xp-track"><span style={{ width: `${level.progress * 100}%` }} /></div><small>{level.remaining} XP to level {level.level + 1}</small></div><div className="player-number"><strong>{mastered}<span>/{shortcuts.length}</span></strong><span>shortcuts mastered</span></div><div className="player-number"><strong>{profile.bestStreak}<span> ↗</span></strong><span>best combo</span></div><div className="player-number"><strong>{profile.sessions}</strong><span>rounds completed</span></div><div className="progress-footnote">{saved ? "Your progress stays with you." : "Storage unavailable. Progress lasts this visit."}<br /><span>{saved ? "Saved on this browser. No account needed." : "Allow browser storage to save between visits."}</span></div></section>
    <section className="mode-section"><div className="section-heading-row"><div><p className="eyebrow">01 / PICK YOUR ENERGY</p><h2>How do you want to play?</h2></div><span className="section-count">SIX WAYS TO FIND YOUR FLOW</span></div><div className="mode-grid">{(Object.keys(MODES) as GameMode[]).map((item, index) => <button key={item} className={`mode-card mode-${item} ${mode === item ? "selected" : ""}`} onClick={() => setMode(item)} aria-pressed={mode === item}><div className="mode-card-top"><span className="mode-icon">{MODES[item].icon}</span><span className="mode-index">0{index + 1} {mode === item ? "●" : "↗"}</span></div><h3>{MODES[item].name}{item === "daily" && <span className="new-tag">{profile.daily[today] !== undefined ? "PLAYED" : "TODAY"}</span>}</h3><p>{MODES[item].description}</p><span className="mode-detail">{MODES[item].detail}</span>{profile.best[item] !== undefined && <span className="mode-best">PERSONAL BEST {profile.best[item]?.toLocaleString()}</span>}</button>)}</div></section>
    <section className="category-section"><div className="section-heading-row"><div><p className="eyebrow">02 / CHOOSE YOUR PLAYGROUND</p><h2>{mode === "daily" ? "Today’s mix covers every lane." : "One focus. Or a little of everything."}</h2></div><span className="section-count">{shortcuts.length} SHORTCUTS TO MAKE YOURS</span></div><div className="category-grid">{(["all", ...categories] as const).map((item) => {
      const pool = item === "all" ? shortcuts : shortcuts.filter((s) => s.category === item);
      const count = pool.filter((s) => (profile.mastery[s.id]?.chain ?? 0) >= 3).length;
      return <button key={item} disabled={mode === "daily"} className={`category-card ${(mode === "daily" ? item === "all" : category === item) ? "selected" : ""}`} onClick={() => setCategory(item)} aria-pressed={mode === "daily" ? item === "all" : category === item}><span className="category-icon">{item === "all" ? "✦" : CATEGORY_META[item].icon}</span><span className="category-name">{item === "all" ? "Everything" : CATEGORY_LABELS[item]}</span><span className="category-detail">{count} / {pool.length} mastered</span><div className="category-meter"><span style={{ width: `${count / pool.length * 100}%` }} /></div></button>;
    })}</div><div className="launch-strip"><p><strong>{MODES[mode].name}</strong><span>{mode === "daily" || category === "all" ? "All shortcuts" : CATEGORY_LABELS[category]} · {MODES[mode].detail.split(" · ")[0]}</span></p><Link className="button button-primary" href={href}>Play {MODES[mode].name.toLowerCase()} <span>→</span></Link></div></section>
    <section className="trophy-section" aria-label="Achievements"><div><p className="eyebrow">LITTLE WINS, BIG ENERGY</p><h2>Your trophy shelf</h2></div><div className="trophy-grid">{[
      { icon: "↗", name: "First connection", goal: "Land your first chord", unlocked: profile.totalCorrect >= 1 },
      { icon: "ϟ", name: "In the zone", goal: "Build a 9-answer combo", unlocked: profile.bestStreak >= 9 },
      { icon: "✦", name: "Muscle memory", goal: "Master 6 shortcuts", unlocked: mastered >= 6 },
      { icon: "◎", name: "Century club", goal: "Land 100 correct chords", unlocked: profile.totalCorrect >= 100 },
    ].map((badge) => <div key={badge.name} className={`trophy ${badge.unlocked ? "earned" : ""}`}><span className="trophy-icon">{badge.icon}</span><div><strong>{badge.name}</strong><span>{badge.goal}</span><small>{badge.unlocked ? "UNLOCKED ✓" : "LOCKED"}</small></div></div>)}</div></section>
    <footer className="home-footer"><span>KEYBOUND // BUILT FOR YOUR EVERYDAY SUPERPOWERS</span><span>Play a little. Remember a lot.</span></footer>
  </main>;
}
