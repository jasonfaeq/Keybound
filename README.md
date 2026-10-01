# Chord // Shortcut Trainer

The first playable version of a keyboard-first shortcut practice game.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Included in v1

- Six shortcut categories: Windows & System, Window Management, Browser, File Explorer, Text Editing, and Developer Tools.
- 36 curated shortcut prompts.
- Direct keyboard chord capture with normalized key ordering.
- Visual keycaps, correct/incorrect feedback, response timing, streaks, and session score.
- Practice sessions, 60-second timed challenges, and unlimited practice.
- Randomized prompt selection per category, with no immediate repeats.
- Local synthesized feedback sounds with a mute control.
- Safe in-app key builder for shortcuts that could trigger Windows or browser actions (for example `Win + L` or `Alt + F4`).
- No account, backend, database, or external service.

## Product note

The core game logic is intentionally kept in small, readable files so the project can be used as a React/Next.js learning exercise. The next natural iteration is to improve the game feel through playtesting before expanding the dataset or adding persistence and stats.
