export const CATEGORY_LABELS = {
  windows: "Windows & System",
  windowsManagement: "Window Management",
  browser: "Browser",
  explorer: "File Explorer",
  textEditing: "Text Editing",
  developer: "Developer Tools",
} as const;

export type ShortcutCategory = keyof typeof CATEGORY_LABELS;

export type Shortcut = {
  id: string;
  action: string;
  expected: string[];
  category: ShortcutCategory;
  difficulty: "starter" | "steady" | "stretch";
  tip?: string;
};

export const CATEGORY_META: Record<ShortcutCategory, { icon: string; detail: string; color: string }> = {
  windows: { icon: "⊞", detail: "System essentials", color: "violet" },
  windowsManagement: { icon: "▣", detail: "Move with intent", color: "orange" },
  browser: { icon: "◌", detail: "Browse faster", color: "blue" },
  explorer: { icon: "⌂", detail: "Files, less friction", color: "green" },
  textEditing: { icon: "T", detail: "Edit at speed", color: "pink" },
  developer: { icon: "</>", detail: "Build in flow", color: "yellow" },
};
