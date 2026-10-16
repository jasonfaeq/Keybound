import type { Shortcut } from "../types/shortcut";

export const MODIFIERS = ["Win", "Ctrl", "Alt", "Shift"];

const keyAliases: Record<string, string> = {
  Control: "Ctrl",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  Alt: "Alt",
  AltLeft: "Alt",
  AltRight: "Alt",
  AltGraph: "Alt",
  Shift: "Shift",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  Meta: "Win",
  MetaLeft: "Win",
  MetaRight: "Win",
  OS: "Win",
  OSLeft: "Win",
  OSRight: "Win",
  Windows: "Win",
  " ": "Space",
  Space: "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Escape: "Esc",
  Enter: "Enter",
  NumpadEnter: "Enter",
  Backquote: "`",
  Slash: "/",
  NumpadDivide: "/",
  Backslash: "\\",
  IntlBackslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  BracketLeft: "[",
  BracketRight: "]",
  Equal: "Plus",
  NumpadAdd: "Plus",
  "=": "Plus",
  "+": "Plus",
  Minus: "Minus",
  NumpadSubtract: "Minus",
  "-": "Minus",
  PrintScreen: "PrtScn",
  ContextMenu: "Menu",
  Del: "Delete",
};

/** How a key is written in prose, e.g. "Ctrl + Plus". */
export function prettyKey(key: string): string {
  if (keyAliases[key]) return keyAliases[key];
  if (/^Key[A-Z]$/.test(key)) return key.slice(3);
  if (/^(Digit|Numpad)\d$/.test(key)) return key.slice(-1);
  return key.length === 1 ? key.toUpperCase() : key;
}

/** How a key is printed on a keycap. */
export function keycapLabel(key: string): string {
  return (
    {
      Plus: "+",
      Minus: "−",
      PageUp: "PgUp",
      PageDown: "PgDn",
      Delete: "Del",
      Insert: "Ins",
      Backspace: "⌫",
      Up: "↑",
      Down: "↓",
      Left: "←",
      Right: "→",
      Win: "⊞ Win",
      Menu: "☰",
    }[key] ?? key
  );
}

export function normalizeKeys(keys: string[]): string[] {
  const cleaned = [...new Set(keys.map(prettyKey))];
  const modifiers = MODIFIERS.filter((modifier) => cleaned.includes(modifier));
  const rest = cleaned.filter((key) => !MODIFIERS.includes(key)).sort();
  return [...modifiers, ...rest];
}

/** The key a keyboard event refers to, by physical position where it matters. */
export function eventKey(event: Pick<KeyboardEvent, "key" | "code">): string {
  // Letters follow the active layout, so AZERTY players still press Ctrl+Z.
  if (/^[a-z]$/i.test(event.key)) return event.key.toUpperCase();
  // Everything else follows the physical key, so Shift+1 stays "1", not "!".
  if (event.code && event.code !== "Unidentified") {
    const fromCode = prettyKey(event.code);
    if (fromCode !== event.code || /^F\d{1,2}$/.test(fromCode)) return fromCode;
    if (
      [
        "Tab",
        "Backspace",
        "Delete",
        "Insert",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Pause",
        "CapsLock",
      ].includes(fromCode)
    )
      return fromCode;
  }
  return prettyKey(event.key);
}

export function keyEventToChord(
  event: Pick<
    KeyboardEvent,
    "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
  >,
): string[] {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.metaKey) modifiers.push("Win");
  const key = eventKey(event);
  return normalizeKeys(
    MODIFIERS.includes(key) ? modifiers : [...modifiers, key],
  );
}

export function chordsMatch(left: string[], right: string[]): boolean {
  const a = normalizeKeys(left);
  const b = normalizeKeys(right);
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

export function allChords(shortcut: Pick<Shortcut, "expected" | "alternates">) {
  return [shortcut.expected, ...(shortcut.alternates ?? [])];
}

export function matchesShortcut(
  keys: string[],
  shortcut: Pick<Shortcut, "expected" | "alternates">,
): boolean {
  return allChords(shortcut).some((chord) => chordsMatch(keys, chord));
}

export function chordLabel(keys: string[]): string {
  return normalizeKeys(keys).join(" + ");
}

/** Function keys a page can safely capture without the browser reacting. */
const safeFunctionKeys = new Set(["F2", "F4", "F8", "F9"]);

/** Ctrl combinations the browser handles before the page can stop them. */
const browserCtrlKeys = new Set([
  "N",
  "T",
  "W",
  "Q",
  "H",
  "J",
  "L",
  "P",
  "U",
  "Tab",
  "PageUp",
  "PageDown",
  "Plus",
  "Minus",
  "Esc",
  "F4",
  ..."0123456789",
]);
const browserCtrlShiftKeys = new Set([
  ...browserCtrlKeys,
  "A",
  "B",
  "C",
  "D",
  "I",
  "J",
  "M",
  "O",
  "Delete",
]);

/**
 * These combinations can affect the operating system or browser before a page
 * can reliably receive the key event, or are needed to drive the game itself.
 * Keep them in the safe on-screen keyboard.
 */
export function requiresBuilder(keys: string[]): boolean {
  const normalized = normalizeKeys(keys);
  const has = (key: string) => normalized.includes(key);
  if (has("Win") || has("Alt")) return true;
  if (["Esc", "PrtScn", "Menu", "Pause"].some(has)) return true;
  if (has("Tab") && !has("Ctrl")) return true;
  if (
    normalized.some(
      (key) => /^F\d{1,2}$/.test(key) && !safeFunctionKeys.has(key),
    )
  )
    return true;
  if (!has("Ctrl")) return false;
  const keySet = has("Shift") ? browserCtrlShiftKeys : browserCtrlKeys;
  return normalized.some((key) => keySet.has(key));
}

/** Protect the whole prompt if any accepted answer could escape the page. */
export function shortcutRequiresBuilder(
  shortcut: Pick<Shortcut, "expected" | "alternates">,
): boolean {
  return allChords(shortcut).some(requiresBuilder);
}
