export const CATEGORY_LABELS = {
  windows: "Windows Essentials",
  windowsManagement: "Windows & Desktops",
  capture: "Screenshots & Game Bar",
  accessibility: "Accessibility",
  explorer: "File Explorer",
  browser: "Web Browser",
  textEditing: "Text Editing",
  office: "Word & PowerPoint",
  excel: "Excel",
  outlook: "Outlook",
  vscode: "VS Code",
  devtools: "Browser DevTools",
  terminal: "Terminal & Shell",
} as const;

export type ShortcutCategory = keyof typeof CATEGORY_LABELS;

export type Difficulty = "starter" | "steady" | "stretch";

export type Shortcut = {
  id: string;
  action: string;
  /** The main chord, shown as the answer. */
  expected: string[];
  /** Other chords that do the same thing and also count as correct. */
  alternates?: string[][];
  category: ShortcutCategory;
  difficulty: Difficulty;
  tip?: string;
};

export const CATEGORY_META: Record<
  ShortcutCategory,
  { icon: string; detail: string; color: string; app: string }
> = {
  windows: {
    icon: "⊞",
    detail: "Start, search, settings",
    color: "orange",
    app: "Windows",
  },
  windowsManagement: {
    icon: "▣",
    detail: "Snap, switch, desktops",
    color: "amber",
    app: "Windows",
  },
  capture: {
    icon: "◉",
    detail: "Snips, recordings, Game Bar",
    color: "red",
    app: "Windows",
  },
  accessibility: {
    icon: "◐",
    detail: "Magnifier, Narrator, captions",
    color: "teal",
    app: "Windows",
  },
  explorer: {
    icon: "▤",
    detail: "Files, folders, panes",
    color: "yellow",
    app: "File Explorer",
  },
  browser: {
    icon: "◎",
    detail: "Tabs, history, zoom",
    color: "blue",
    app: "Chrome · Edge",
  },
  textEditing: {
    icon: "¶",
    detail: "Select, move, edit",
    color: "cream",
    app: "Anywhere you type",
  },
  office: {
    icon: "W",
    detail: "Format, style, present",
    color: "indigo",
    app: "Word · PowerPoint",
  },
  excel: {
    icon: "⊟",
    detail: "Cells, fills, formats",
    color: "green",
    app: "Excel",
  },
  outlook: {
    icon: "✉",
    detail: "Reply, send, triage",
    color: "sky",
    app: "Outlook",
  },
  vscode: {
    icon: "{}",
    detail: "Edit, navigate, debug",
    color: "violet",
    app: "VS Code",
  },
  devtools: {
    icon: "</>",
    detail: "Inspect, console, debug",
    color: "pink",
    app: "Chrome DevTools",
  },
  terminal: {
    icon: ">_",
    detail: "Panes, tabs, history",
    color: "lime",
    app: "Windows Terminal",
  },
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  starter: "Essential",
  steady: "Everyday",
  stretch: "Power user",
};
