# Keybound

A browser game for learning Windows keyboard shortcuts. Built with Next.js and React.

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
- **Weak spots**: practice the shortcuts you've missed.
- **Free play**: an open-ended practice session.

Choose from 36 shortcuts across Windows, window management, browsers, File Explorer, text editing, and developer tools.

## Controls

Press a shortcut to answer. For combinations that could close a tab, lock the computer, or trigger another system action, use the on-screen keyboard instead. You can use it for any prompt.

In the on-screen keyboard, Tab moves between keys, Space toggles a key, and Enter submits. Esc pauses the round. Leaving the tab also pauses it.

Hints reveal the answer for fewer points. Wrong answers and skips break your combo. Three correct answers in a row increase the score multiplier, up to 4x. Faster answers earn a small bonus.

Progress, personal bests, and sound settings are saved in the current browser. Three consecutive answers without hints mark a shortcut as mastered.

## Development

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

The game rules live in `lib/game.ts`, saved progress in `lib/profile.ts`, and keyboard handling in `lib/shortcut.ts`. The practice screen is in `components/shortcut-trainer.tsx`.
