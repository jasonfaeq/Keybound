"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_LABELS, CATEGORY_META, type ShortcutCategory } from "../types/shortcut";

const categories = Object.keys(CATEGORY_LABELS) as ShortcutCategory[];

export default function HomePage() {
  const router = useRouter();
  const [category, setCategory] = useState<ShortcutCategory | "all">("all");
  const categoryQuery = category === "all" ? "" : `&category=${category}`;
  const practiceHref = category === "all" ? "/practice" : `/practice?category=${category}`;
  const timedHref = `/practice?mode=timed${categoryQuery}`;
  const unlimitedHref = `/practice?mode=unlimited${categoryQuery}`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("button, a, select, input, textarea")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      router.push(`/practice${category === "all" ? "" : `?category=${category}`}`);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [category, router]);

  return (
    <main className="site-shell home-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Chord home">
          <span className="brand-mark">⌘</span>
          <span>CHORD<span className="brand-slash">{"//"}</span></span>
        </Link>
        <div className="topbar-status">
          <span className="status-dot" />
          <span>Practice mode</span>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Shortcut fluency, one chord at a time</p>
          <h1>Make the useful<br /><em>stuff automatic.</em></h1>
          <p className="hero-description">
            A fast practice loop for the Windows shortcuts you actually want in your fingers. No accounts. No clutter. Just recall, feedback, and another rep.
          </p>
          <div className="hero-actions">
            <Link href={practiceHref} className="button button-primary">
              Start practice <span className="button-arrow">→</span>
            </Link>
            <Link href={timedHref} className="button button-secondary timed-home-link">
              Timed challenge <span className="button-arrow">◷</span>
            </Link>
            <Link href={unlimitedHref} className="button button-secondary timed-home-link">
              Unlimited <span className="button-arrow">∞</span>
            </Link>
            <span className="shortcut-hint"><kbd>Enter</kbd> to begin</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Keyboard shortcut visualization">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="floating-label label-top">ACTIVE RECALL</div>
          <div className="chord-display">
            <span className="chord-key">Ctrl</span>
            <span className="chord-plus">+</span>
            <span className="chord-key accent-key">V</span>
          </div>
          <div className="floating-label label-bottom">OPEN CLIPBOARD HISTORY</div>
          <div className="visual-grid" />
        </div>
      </section>

      <section className="category-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Choose your lane</p>
            <h2>What do you want to sharpen?</h2>
          </div>
          <span className="section-count">36 shortcuts · 6 categories</span>
        </div>
        <div className="category-grid">
          <button className={`category-card category-all ${category === "all" ? "selected" : ""}`} onClick={() => setCategory("all")}>
            <span className="category-icon">✦</span>
            <span className="category-name">All shortcuts</span>
            <span className="category-detail">A balanced mix</span>
            <span className="card-check">{category === "all" ? "✓" : ""}</span>
          </button>
          {categories.map((item) => (
            <button key={item} className={`category-card ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>
              <span className="category-icon">{CATEGORY_META[item].icon}</span>
              <span className="category-name">{CATEGORY_LABELS[item]}</span>
              <span className="category-detail">{CATEGORY_META[item].detail}</span>
              <span className="card-check">{category === item ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <span>Designed for keyboard-first practice</span>
        <span className="footer-line" />
        <span>V1 · Local session only</span>
      </footer>
    </main>
  );
}
