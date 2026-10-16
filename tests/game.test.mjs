import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function sourceModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}
const {
  freshRun,
  runReducer,
  award,
  makeDeck,
  EMPTY_PROFILE,
  recordAttempt,
  recordSession,
  levelFor,
} = await sourceModule("../lib/game.ts");
const { requiresBuilder, keyEventToChord, chordsMatch } =
  await sourceModule("../lib/shortcut.ts");
const pool = Array.from({ length: 36 }, (_, i) => ({
  id: `q${i}`,
  expected: ["Ctrl", "C"],
  action: `Action ${i}`,
  category: "textEditing",
  difficulty: "starter",
}));
const start = () =>
  runReducer(freshRun(pool), { type: "start", deck: pool, now: 1000 });
const answer = (run, correct = true, mode = "practice") =>
  runReducer(run, {
    type: "answer",
    correct,
    mode,
    keys: ["Ctrl", "C"],
    now: run.startedAt + 2000,
  });
const next = (run, mode = "practice") =>
  runReducer(run, {
    type: "next",
    mode,
    deck: pool,
    now: run.startedAt + 2500,
  });

test("a ten-prompt round finishes once and ignores double submissions", () => {
  let run = start();
  for (let i = 0; i < 10; i++) {
    run = answer(run);
    assert.equal(answer(run), run);
    run = next(run);
  }
  assert.equal(run.phase, "finished");
  assert.equal(run.attempts.length, 10);
  assert.equal(run.bestStreak, 10);
});
test("survival ends after exactly three mistakes", () => {
  let run = start();
  for (let i = 0; i < 3; i++)
    run = next(answer(run, false, "survival"), "survival");
  assert.equal(run.phase, "finished");
  assert.equal(run.lives, 0);
});
test("hints cannot farm combos, speed bonuses, or mastery", () => {
  let run = next(answer(start()));
  run = runReducer(run, { type: "hint" });
  run = answer(run);
  assert.equal(run.streak, 0);
  assert.equal(run.attempts.at(-1).points, 40);
  let profile = recordAttempt(EMPTY_PROFILE, "q0", true, false, 20, 1);
  profile = recordAttempt(profile, "q0", true, false, 20, 2);
  profile = recordAttempt(profile, "q0", true, true, 8, 0);
  assert.equal(profile.mastery.q0.chain, 0);
});
test("speed and combos reward clean recall with a capped multiplier", () => {
  assert.equal(award(true, false, 2, 3).points, 300);
  assert.equal(award(true, false, 8, 3).points, 200);
  assert.equal(award(true, false, 2, 100).multiplier, 4);
  assert.equal(award(false, false, 2, 0).points, 0);
});
test("daily decks are unique, reproducible, and independent of mastery", () => {
  const first = makeDeck(pool, "daily", EMPTY_PROFILE, "2026-10-16");
  assert.equal(first.length, 10);
  assert.equal(new Set(first.map((s) => s.id)).size, 10);
  assert.deepEqual(
    first,
    makeDeck(pool, "daily", { ...EMPTY_PROFILE, xp: 999 }, "2026-10-16"),
  );
  assert.notDeepEqual(
    first,
    makeDeck(pool, "daily", EMPTY_PROFILE, "2026-10-17"),
  );
  assert.equal(pool[0].id, "q0");
});
test("review serves previously missed shortcuts before mastered ones", () => {
  const profile = {
    ...EMPTY_PROFILE,
    mastery: {
      q0: { attempts: 4, correct: 0, chain: 0 },
      q1: { attempts: 4, correct: 4, chain: 4 },
    },
  };
  const deck = makeDeck(pool, "review", profile, "2026-10-16");
  assert.equal(deck[0].id, "q0");
  assert.equal(deck.at(-1).id, "q1");
});
test("the real deadline rejects late answers even before the timer ticks", () => {
  const run = runReducer(start(), {
    type: "answer",
    correct: true,
    keys: ["Ctrl", "C"],
    mode: "timed",
    now: 61000,
  });
  assert.equal(run.phase, "finished");
  assert.equal(run.attempts.length, 0);
});
test("pausing preserves time and excludes the break from response speed", () => {
  let run = runReducer(start(), { type: "pause", now: 3000 });
  assert.equal(answer(run), run);
  assert.equal(run.remaining, 58000);
  run = runReducer(run, { type: "resume", now: 103000 });
  run = runReducer(run, {
    type: "answer",
    correct: true,
    keys: ["Ctrl", "C"],
    mode: "timed",
    now: 104000,
  });
  assert.equal(run.attempts[0].seconds, 3);
  assert.equal(run.deadline, 161000);
});
test("personal and daily records never decrease; levels progress", () => {
  assert.equal(
    recordSession(EMPTY_PROFILE, "daily", 200, "2026-10-16", false).daily[
      "2026-10-16"
    ],
    undefined,
  );
  let profile = recordSession(EMPTY_PROFILE, "daily", 1500, "2026-10-16");
  profile = recordSession(profile, "daily", 500, "2026-10-16");
  assert.equal(profile.best.daily, 1500);
  assert.equal(profile.daily["2026-10-16"], 1500);
  assert.equal(profile.sessions, 2);
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(120).level, 2);
  assert.equal(levelFor(480).level, 3);
});
test("OS and browser navigation chords stay in the builder", () => {
  for (const keys of [
    ["Win", "L"],
    ["Alt", "F4"],
    ["Ctrl", "Tab"],
    ["Ctrl", "P"],
    ["Ctrl", "Shift", "I"],
    ["Ctrl", "W"],
  ])
    assert.equal(requiresBuilder(keys), true);
  assert.equal(requiresBuilder(["Ctrl", "C"]), false);
  assert.equal(
    chordsMatch(["Shift", "Ctrl", "t"], ["Ctrl", "Shift", "T"]),
    true,
  );
  assert.deepEqual(
    keyEventToChord({ key: "ArrowRight", code: "ArrowRight", ctrlKey: true }),
    ["Ctrl", "Right"],
  );
});
