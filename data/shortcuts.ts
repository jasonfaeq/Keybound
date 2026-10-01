import type { Shortcut } from "../types/shortcut";

export const shortcuts: Shortcut[] = [
  { id: "win-explorer", action: "Open File Explorer", expected: ["Win", "E"], category: "windows", difficulty: "starter", tip: "The fastest route to your files." },
  { id: "clipboard", action: "Open clipboard history", expected: ["Win", "V"], category: "windows", difficulty: "starter", tip: "Your last 25 copied items live here." },
  { id: "snip", action: "Take a screen snip", expected: ["Win", "Shift", "S"], category: "windows", difficulty: "steady", tip: "Drag over exactly what you need." },
  { id: "settings", action: "Open Windows Settings", expected: ["Win", "I"], category: "windows", difficulty: "starter" },
  { id: "lock", action: "Lock your PC", expected: ["Win", "L"], category: "windows", difficulty: "starter" },
  { id: "run", action: "Open the Run dialog", expected: ["Win", "R"], category: "windows", difficulty: "starter" },

  { id: "switch-app", action: "Switch to another application", expected: ["Alt", "Tab"], category: "windowsManagement", difficulty: "starter", tip: "Keep Alt held, tap Tab to move through the switcher." },
  { id: "close-window", action: "Close the active window", expected: ["Alt", "F4"], category: "windowsManagement", difficulty: "starter" },
  { id: "maximize", action: "Maximize the active window", expected: ["Win", "Up"], category: "windowsManagement", difficulty: "starter" },
  { id: "snap-left", action: "Snap the window to the left", expected: ["Win", "Left"], category: "windowsManagement", difficulty: "starter" },
  { id: "snap-right", action: "Snap the window to the right", expected: ["Win", "Right"], category: "windowsManagement", difficulty: "starter" },
  { id: "move-monitor", action: "Move the window to the next monitor", expected: ["Win", "Shift", "Right"], category: "windowsManagement", difficulty: "stretch", tip: "A lifesaver when you work across displays." },

  { id: "address-bar", action: "Focus the browser address bar", expected: ["Ctrl", "L"], category: "browser", difficulty: "starter" },
  { id: "new-tab", action: "Open a new browser tab", expected: ["Ctrl", "T"], category: "browser", difficulty: "starter" },
  { id: "close-tab", action: "Close the current browser tab", expected: ["Ctrl", "W"], category: "browser", difficulty: "starter" },
  { id: "reopen-tab", action: "Reopen the last closed tab", expected: ["Ctrl", "Shift", "T"], category: "browser", difficulty: "steady" },
  { id: "next-tab", action: "Switch to the next browser tab", expected: ["Ctrl", "Tab"], category: "browser", difficulty: "starter" },
  { id: "find-page", action: "Find text on the current page", expected: ["Ctrl", "F"], category: "browser", difficulty: "starter" },

  { id: "new-folder", action: "Create a new folder", expected: ["Ctrl", "Shift", "N"], category: "explorer", difficulty: "steady" },
  { id: "rename", action: "Rename the selected file", expected: ["F2"], category: "explorer", difficulty: "starter" },
  { id: "parent-folder", action: "Go up to the parent folder", expected: ["Alt", "Up"], category: "explorer", difficulty: "steady" },
  { id: "explorer-back", action: "Go back in File Explorer", expected: ["Alt", "Left"], category: "explorer", difficulty: "starter" },
  { id: "new-explorer", action: "Open a new File Explorer window", expected: ["Ctrl", "N"], category: "explorer", difficulty: "starter" },
  { id: "recycle", action: "Move the selected item to the Recycle Bin", expected: ["Delete"], category: "explorer", difficulty: "starter" },

  { id: "select-all", action: "Select everything in the current context", expected: ["Ctrl", "A"], category: "textEditing", difficulty: "starter" },
  { id: "copy", action: "Copy the selection", expected: ["Ctrl", "C"], category: "textEditing", difficulty: "starter" },
  { id: "paste", action: "Paste from the clipboard", expected: ["Ctrl", "V"], category: "textEditing", difficulty: "starter" },
  { id: "undo", action: "Undo the last action", expected: ["Ctrl", "Z"], category: "textEditing", difficulty: "starter" },
  { id: "redo", action: "Redo the last undone action", expected: ["Ctrl", "Y"], category: "textEditing", difficulty: "starter" },
  { id: "word-right", action: "Move the cursor one word right", expected: ["Ctrl", "Right"], category: "textEditing", difficulty: "steady" },

  { id: "command-palette", action: "Open the command palette in VS Code", expected: ["Ctrl", "Shift", "P"], category: "developer", difficulty: "steady", tip: "Almost every VS Code command is one search away." },
  { id: "quick-open", action: "Quickly open a file in VS Code", expected: ["Ctrl", "P"], category: "developer", difficulty: "starter" },
  { id: "terminal", action: "Toggle the integrated terminal in VS Code", expected: ["Ctrl", "`"], category: "developer", difficulty: "steady" },
  { id: "comment", action: "Toggle a line comment in an editor", expected: ["Ctrl", "/"], category: "developer", difficulty: "starter" },
  { id: "devtools", action: "Open browser developer tools", expected: ["Ctrl", "Shift", "I"], category: "developer", difficulty: "steady" },
  { id: "browser-source", action: "View the current page source", expected: ["Ctrl", "U"], category: "developer", difficulty: "stretch" },
];
