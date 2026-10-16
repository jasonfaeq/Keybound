"use client";

import { useEffect, useState } from "react";
import { eventKey, keycapLabel, normalizeKeys } from "../lib/shortcut";

export type KeyMark = "correct" | "wrong" | "answer" | "hint";

/** One key on the board. Widths are in quarter units; no key means a gap. */
type Cap = { k?: string; w?: number; label?: string; sub?: string };

const u = (k: string, sub?: string): Cap => ({ k, sub });
const gap = (w: number): Cap => ({ w });

const FUNCTION_ROW: Cap[] = [
  u("Esc"),
  gap(4),
  ...["F1", "F2", "F3", "F4"].map((k) => u(k)),
  gap(2),
  ...["F5", "F6", "F7", "F8"].map((k) => u(k)),
  gap(2),
  ...["F9", "F10", "F11", "F12"].map((k) => u(k)),
];
const MAIN_ROWS: Cap[][] = [
  [
    u("`", "~"),
    u("1", "!"),
    u("2", "@"),
    u("3", "#"),
    u("4", "$"),
    u("5", "%"),
    u("6", "^"),
    u("7", "&"),
    u("8", "*"),
    u("9", "("),
    u("0", ")"),
    { k: "Minus", label: "-", sub: "_" },
    { k: "Plus", label: "=", sub: "+" },
    { k: "Backspace", w: 8, label: "Backspace" },
  ],
  [
    { k: "Tab", w: 6 },
    ..."QWERTYUIOP".split("").map((k) => u(k)),
    u("[", "{"),
    u("]", "}"),
    { k: "\\", w: 6, sub: "|" },
  ],
  [
    { w: 7, label: "Caps" },
    ..."ASDFGHJKL".split("").map((k) => u(k)),
    u(";", ":"),
    u("'", '"'),
    { k: "Enter", w: 9 },
  ],
  [
    { k: "Shift", w: 9 },
    ..."ZXCVBNM".split("").map((k) => u(k)),
    u(",", "<"),
    u(".", ">"),
    u("/", "?"),
    { k: "Shift", w: 11 },
  ],
  [
    { k: "Ctrl", w: 5 },
    { k: "Win", w: 5, label: "⊞" },
    { k: "Alt", w: 5 },
    { k: "Space", w: 25, label: "" },
    { k: "Alt", w: 5 },
    { k: "Win", w: 5, label: "⊞" },
    { k: "Menu", w: 5, label: "☰" },
    { k: "Ctrl", w: 5 },
  ],
];
const NAV_TOP: Cap[] = [
  { k: "PrtScn", label: "PrtSc" },
  { w: 4, label: "ScrLk" },
  u("Pause"),
];
const NAV_ROWS: Cap[][] = [
  [{ k: "Insert", label: "Ins" }, u("Home"), { k: "PageUp", label: "PgUp" }],
  [{ k: "Delete", label: "Del" }, u("End"), { k: "PageDown", label: "PgDn" }],
  [],
  [gap(4), { k: "Up", label: "↑" }, gap(4)],
  [
    { k: "Left", label: "←" },
    { k: "Down", label: "↓" },
    { k: "Right", label: "→" },
  ],
];

const ACCENT_KEYS = new Set(["Esc", "Enter"]);
const MOD_KEYS = new Set([
  "Ctrl",
  "Alt",
  "Shift",
  "Win",
  "Menu",
  "Tab",
  "Backspace",
  "Enter",
]);

/** Keys the player is physically holding right now, in shortcut names. */
export function useHeldKeys(active = true) {
  const [held, setHeld] = useState<string[]>([]);
  useEffect(() => {
    if (!active) return;
    const down = (event: KeyboardEvent) => {
      const key = eventKey(event);
      setHeld((current) =>
        current.includes(key) ? current : normalizeKeys([...current, key]),
      );
    };
    const up = (event: KeyboardEvent) => {
      const key = eventKey(event);
      // Windows swallows key-ups after OS chords, so trust the modifier flags.
      setHeld((current) =>
        current.filter(
          (item) =>
            item !== key &&
            !(item === "Ctrl" && !event.ctrlKey) &&
            !(item === "Alt" && !event.altKey) &&
            !(item === "Shift" && !event.shiftKey) &&
            !(item === "Win" && !event.metaKey),
        ),
      );
    };
    const clear = () => setHeld([]);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      setHeld([]);
    };
  }, [active]);
  return held;
}

export function Keyboard({
  selected = [],
  held = [],
  marks = {},
  onToggle,
  label = "Keyboard",
}: {
  selected?: string[];
  held?: string[];
  marks?: Record<string, KeyMark>;
  onToggle?: (key: string) => void;
  label?: string;
}) {
  const interactive = Boolean(onToggle);
  // Only the first copy of a key (left Ctrl, left Shift) joins the tab order.
  const seen = new Set<string>();
  function renderCap(cap: Cap, index: number) {
    const width = cap.w ?? 4;
    if (!cap.k)
      return cap.label ? (
        <span
          key={index}
          className="kb-key kb-dead"
          style={{ gridColumn: `span ${width}` }}
          aria-hidden="true"
        >
          <span className="kb-legend">{cap.label}</span>
        </span>
      ) : (
        <span
          key={index}
          className="kb-gap"
          style={{ gridColumn: `span ${width}` }}
        />
      );
    const key = cap.k;
    const legend = cap.label ?? key;
    const isSelected = selected.includes(key);
    const classes = [
      "kb-key",
      ACCENT_KEYS.has(key) && "kb-accent",
      MOD_KEYS.has(key) && "kb-mod",
      width > 4 && "kb-wide",
      isSelected && "is-selected",
      held.includes(key) && "is-held",
      marks[key] && `is-${marks[key]}`,
    ]
      .filter(Boolean)
      .join(" ");
    const content = (
      <>
        {cap.sub && <span className="kb-sub">{cap.sub}</span>}
        <span className="kb-legend">{legend}</span>
      </>
    );
    if (!interactive)
      return (
        <span
          key={index}
          className={classes}
          style={{ gridColumn: `span ${width}` }}
          aria-hidden="true"
        >
          {content}
        </span>
      );
    const focusable = !seen.has(key);
    seen.add(key);
    return (
      <button
        type="button"
        key={index}
        className={classes}
        style={{ gridColumn: `span ${width}` }}
        aria-pressed={isSelected}
        aria-label={keycapLabel(key).replace("⊞ ", "")}
        tabIndex={focusable ? 0 : -1}
        // Keep focus on the page so the physical keyboard still works after a click.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onToggle?.(key)}
      >
        {content}
      </button>
    );
  }
  const row = (caps: Cap[], key: number | string, className = "") => (
    <div key={key} className={`kb-row ${className}`}>
      {caps.map(renderCap)}
    </div>
  );
  return (
    <div className="kb-scroll">
      <div
        className={`kb ${interactive ? "kb-interactive" : ""}`}
        role={interactive ? "group" : "img"}
        aria-label={label}
      >
        <div className="kb-main">
          {row(FUNCTION_ROW, "f", "kb-frow")}
          {MAIN_ROWS.map((caps, i) => row(caps, i))}
        </div>
        <div className="kb-nav">
          {row(NAV_TOP, "f", "kb-frow")}
          {NAV_ROWS.map((caps, i) => row(caps, i))}
        </div>
      </div>
    </div>
  );
}

/** A chord drawn as keycaps, e.g. [Ctrl] + [Shift] + [T]. */
export function Chord({
  keys,
  size = "md",
  state,
  placeholders = 0,
}: {
  keys: string[];
  size?: "sm" | "md" | "lg" | "xl";
  state?: "correct" | "wrong" | "hint" | "ghost";
  placeholders?: number;
}) {
  const items = [
    ...normalizeKeys(keys),
    ...Array.from({ length: placeholders }, () => "?"),
  ];
  return (
    <span
      className={`chord chord-${size} ${state ? `chord-${state}` : ""}`}
      aria-label={items.join(" + ").replace(/\?/g, "unknown key")}
    >
      {items.map((key, i) => (
        <span key={`${key}-${i}`} className="chord-part" aria-hidden="true">
          {i > 0 && <span className="chord-plus">+</span>}
          <kbd className={`cap ${key === "?" ? "cap-unknown" : ""}`}>
            {keycapLabel(key)}
          </kbd>
        </span>
      ))}
    </span>
  );
}
