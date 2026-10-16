# Keybound // The Keyboard Arcade

A local-first Windows shortcut game built with Next.js 16 and React 19.

## Run

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. No account or backend is needed.

## Play

Choose one of six modes and a shortcut category:

- **Quick play:** ten prompts, with time to think.
- **Blitz:** a 60-second sprint. The timer starts when you start the round.
- **Survival:** three lives; each wrong answer or skip costs one.
- **Daily mix:** ten unique prompts in a reproducible order for your local calendar day. Daily mixes always cover all categories. Complete all ten to mark the day played.
- **Weak spots:** prioritize previously missed shortcuts, then unfamiliar ones, before confident recalls.
- **Free play:** keep going until you choose Finish round.

Safe chords accept physical keyboard input. Shortcuts involving Windows, Alt, browser navigation, printing, or developer tools use the on-screen QWERTY builder. Click keys, or use Tab to navigate, Space to toggle, and Enter to check the assembled chord. Every shortcut can be built on screen, including backtick and slash.

Use **Esc** to pause or resume. Switching away from the tab pauses the round automatically; response timing excludes breaks. Auto advance is optional and starts enabled for Blitz. Wrong answers stay visible longer before advancing.

## Scoring and progress

- Clean correct answers earn 100 base points plus a 50-point speed bonus under three seconds or 25 under six.
- Every three consecutive clean answers increases the multiplier, up to 4x. A mistake or hinted answer resets the combo.
- Hinted answers earn 40 points and reduced XP. Skips reveal the answer and count as misses.
- XP unlocks levels and titles. Three consecutive unassisted recalls master a shortcut; hints and mistakes reset that shortcut's mastery streak.
- Personal bests, mastery, XP, sound preferences, daily results, and four achievements persist in this browser's local storage. Storage failures fall back to progress for the current visit and display a notice.
- Results show accuracy, score, best combo, XP, and a recap of missed or assisted shortcuts, with a direct route to review.

The dataset includes 36 prompts across Windows & System, Window Management, Browser, File Explorer, Text Editing, and Developer Tools. VS Code prompts describe shortcuts to use in VS Code; the game checks recall without executing those actions.

## Validate

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The test suite covers round limits, survival lives, duplicate submissions, hints, mastery, combo scoring, deterministic daily decks, targeted review, timer deadlines, pause accounting, saved records, and protected shortcuts. Tests transpile the TypeScript modules with the project's existing TypeScript dependency; no extra test runtime is required.

Core rules are in `lib/game.ts`, browser persistence in `lib/profile.ts`, chord normalization and safety in `lib/shortcut.ts`, and the interactive round in `components/shortcut-trainer.tsx`.
