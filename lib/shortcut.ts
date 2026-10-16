const modifierOrder = ["Ctrl", "Alt", "Shift", "Win"];

const keyAliases: Record<string, string> = {
  Control: "Ctrl",
  Ctrl: "Ctrl",
  AltGraph: "Alt",
  Meta: "Win",
  OS: "Win",
  Windows: "Win",
  " ": "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Escape: "Esc",
  Backspace: "Backspace",
  Delete: "Delete",
  Backquote: "`",
  Slash: "/",
  Semicolon: ";",
  Equal: "=",
  Minus: "-",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Period: ".",
  Quote: "'",
  Backslash: "\\",
};

export function prettyKey(key: string): string {
  if (keyAliases[key]) return keyAliases[key];
  if (/^Key[A-Z]$/.test(key)) return key.slice(3);
  if (/^Digit\d$/.test(key)) return key.slice(5);
  return key.length === 1 ? key.toUpperCase() : key;
}

export function normalizeKeys(keys: string[]): string[] {
  const cleaned = [...new Set(keys.map(prettyKey))];
  const modifiers = modifierOrder.filter((modifier) => cleaned.includes(modifier));
  const rest = cleaned.filter((key) => !modifierOrder.includes(key)).sort();
  return [...modifiers, ...rest];
}

export function keyEventToChord(event: KeyboardEvent): string[] {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.metaKey) modifiers.push("Win");

  const rawKey = event.key.length === 1 ? event.key : event.code || event.key;
  const key = prettyKey(event.key === "Control" || event.key === "Alt" || event.key === "Shift" || event.key === "Meta" ? event.key : rawKey);
  const isModifier = ["Ctrl", "Alt", "Shift", "Win"].includes(key);
  return normalizeKeys(isModifier ? modifiers : [...modifiers, key]);
}

export function chordsMatch(left: string[], right: string[]): boolean {
  const a = normalizeKeys(left);
  const b = normalizeKeys(right);
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

export function chordLabel(keys: string[]): string {
  return normalizeKeys(keys).join(" + ");
}

const browserSensitiveKeys = new Set(["H", "J", "L", "N", "T", "U", "W", "P", "Tab", "I"]);

/**
 * These combinations can affect the operating system or browser before a page
 * can reliably receive the key event. Keep them in the safe in-app builder.
 */
export function requiresBuilder(keys: string[]): boolean {
  const normalized = normalizeKeys(keys);
  if (normalized.includes("Win") || normalized.includes("Alt") || normalized.includes("F4")) return true;
  return normalized.includes("Ctrl") && normalized.some((key) => browserSensitiveKeys.has(key));
}
