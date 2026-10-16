# Keybound

A browser game for learning keyboard shortcuts on Windows, in the browser, Office, VS Code and Windows Terminal. Built with Next.js and React.

## Getting started

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Game modes

- **Quick play**: ten prompts with no time limit.
- **Blitz**: score as much as you can in 60 seconds.
- **Survival**: keep playing until you lose all three lives.
- **Daily mix**: ten shortcuts in a fixed order that changes each day.
- **Decode**: see a shortcut and pick what it does from four answers.
- **Weak spots**: practice the shortcuts you've missed.
- **Free play**: an open-ended practice session.

There are 423 shortcuts across 13 categories: Windows essentials, windows and virtual desktops, screenshots and Game Bar, accessibility, File Explorer, web browsers, text editing, Word and PowerPoint, Excel, Outlook, VS Code, browser DevTools, and Windows Terminal. Each is tagged Essential, Everyday or Power user, and you can limit a round to one level. Shortcuts with more than one chord (Redo is Ctrl+Y or Ctrl+Shift+Z) accept any of them. The library page lists and searches all of them.

## Controls

Press a shortcut to answer. The on-screen keyboard shows the keys you're holding. For combinations that could close a tab, lock the computer, or trigger another system action (anything with Win, Alt, most F-keys, or browser-reserved Ctrl keys), click the keys on the on-screen keyboard instead and press Enter. You can build any answer this way.

In Decode, press 1–4 or click an answer. Esc pauses the round. Leaving the tab also pauses it.

The first hint shows the first key; the second shows the whole chord. Hints earn fewer points and break your combo. Three correct answers in a row raise the score multiplier, up to 4x, and fast answers earn a bonus. A missed shortcut comes back a few prompts later (except in the daily mix).

Progress, personal bests, day streaks and sound settings are saved in the current browser. Three consecutive answers without hints mark a shortcut as mastered.

## Development

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

The shortcut list lives in `data/shortcuts.ts`, the game rules in `lib/game.ts`, saved progress in `lib/profile.ts`, and keyboard handling in `lib/shortcut.ts`. The practice screen is in `components/shortcut-trainer.tsx` and the on-screen keyboard in `components/keyboard.tsx`.
