"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { SiteHeader } from "../../components/brand";
import { Chord } from "../../components/keyboard";
import { shortcuts } from "../../data/shortcuts";
import { masteryState } from "../../lib/game";
import { useProfile } from "../../lib/profile";
import { allChords, chordLabel } from "../../lib/shortcut";
import {
  CATEGORY_LABELS,
  CATEGORY_META,
  DIFFICULTY_LABELS,
  type Difficulty,
  type ShortcutCategory,
} from "../../types/shortcut";

const categories = Object.keys(CATEGORY_LABELS) as ShortcutCategory[];
type Status = "all" | "new" | "learning" | "mastered";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ShortcutCategory | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [status, setStatus] = useState<Status>("all");
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const terms = deferredQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = shortcuts.filter((s) => {
    if (category !== "all" && s.category !== category) return false;
    if (difficulty !== "all" && s.difficulty !== difficulty) return false;
    if (status !== "all" && masteryState(profile.mastery[s.id]) !== status)
      return false;
    const haystack = [
      s.action,
      CATEGORY_LABELS[s.category],
      CATEGORY_META[s.category].app,
      ...allChords(s).map(chordLabel),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  const groups = categories
    .map((item) => ({
      category: item,
      items: visible.filter((s) => s.category === item),
    }))
    .filter((group) => group.items.length);
  const masteredCount = shortcuts.filter(
    (s) => masteryState(profile.mastery[s.id]) === "mastered",
  ).length;

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="library-hero">
        <p className="eyebrow">The library</p>
        <h1 className="display">
          Every shortcut, <em>one place.</em>
        </h1>
        <p className="lede">
          {shortcuts.length} shortcuts for Windows and the apps you live in.
          You’ve mastered {masteredCount}. Search by name, app or keys, then
          jump into a round.
        </p>
      </section>

      <div className="library-tools">
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search “screenshot”, “ctrl shift”, “excel”…"
            aria-label="Search shortcuts"
          />
          <kbd>/</kbd>
        </label>
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as ShortcutCategory | "all")
          }
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {CATEGORY_LABELS[item]}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}
          aria-label="Difficulty"
        >
          <option value="all">All levels</option>
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((item) => (
            <option key={item} value={item}>
              {DIFFICULTY_LABELS[item]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          aria-label="Progress"
        >
          <option value="all">Any progress</option>
          <option value="new">Not tried yet</option>
          <option value="learning">Still learning</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>
      <p className="library-count" aria-live="polite">
        Showing {visible.length} of {shortcuts.length}
      </p>

      {groups.length === 0 && (
        <div className="empty">
          <span className="cap cap-hero" aria-hidden="true">
            ?
          </span>
          <p>No shortcuts match that. Try fewer words or another filter.</p>
        </div>
      )}

      {groups.map(({ category: item, items }) => {
        const meta = CATEGORY_META[item];
        return (
          <section
            key={item}
            className={`library-group tone-${meta.color}`}
            aria-labelledby={`group-${item}`}
          >
            <header className="library-group-head">
              <span className="category-icon" aria-hidden="true">
                {meta.icon}
              </span>
              <div>
                <h2 id={`group-${item}`}>{CATEGORY_LABELS[item]}</h2>
                <span>
                  {meta.app} · {items.length} shortcuts
                </span>
              </div>
              <Link
                className="button button-secondary button-sm"
                href={`/practice?mode=practice&category=${item}`}
              >
                Practice <span aria-hidden="true">→</span>
              </Link>
            </header>
            <ul className="library-list">
              {items.map((s) => {
                const state = masteryState(profile.mastery[s.id]);
                return (
                  <li key={s.id}>
                    <span
                      className={`mastery-dot mastery-${state}`}
                      title={
                        state === "mastered"
                          ? "Mastered"
                          : state === "learning"
                            ? "Learning"
                            : "Not tried yet"
                      }
                    />
                    <span className="library-action">
                      {s.action}
                      {s.tip && <small>{s.tip}</small>}
                    </span>
                    <span className={`pill pill-quiet diff-${s.difficulty}`}>
                      {DIFFICULTY_LABELS[s.difficulty]}
                    </span>
                    <span className="library-chords">
                      {allChords(s).map((chord, i) => (
                        <span key={chord.join("+")} className="library-chord">
                          {i > 0 && <span className="or">or</span>}
                          <Chord keys={chord} size="sm" />
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
