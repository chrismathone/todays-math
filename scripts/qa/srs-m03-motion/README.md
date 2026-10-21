# M-03 timing fixture

Real explorer/course screens and student shell, memory-only replies. No account,
database, grading engine or production HTTP is used. `data.ts` also supplies the
component regression tests. The existing LearningMotion key/subscription is used.

Wait for the lead's explicit Chromium turn, then run one engine:

```sh
QA_OUTPUT=/Users/pss/Desktop/creative/display-survey/srs-m03-20261021 node scripts/qa/srs-m03-motion/verify.mjs --browser-granted
```

The script fails without the grant flag, rejects external/API network requests,
records feedback-to-next DOM timing and captures manual buttons at 390/1280 px.
It closes its own server/browser in `finally`. Optional `QA_CHROMIUM_EXECUTABLE`
selects an already installed executable; do not install shared dependencies.

`node scripts/qa/srs-m03-motion/server.mjs --serve-only` serves the local fixture
without opening a browser. Query `?mode=course`, `?mode=course&manual=1`,
`?mode=explorer`, `?mode=explorer&first=1`.

The small top-right controls are fixture controls, not product UI. Tests for
timer consumption/cancellation use fake time in `SrsMotionAdvance.test.tsx`;
browser timing is measured with real time. Existing follow-up tests cover
persisted retry/solution states; this fixture is not a storage/FSRS test.

For the before comparison, export the three changed product components from the
starting SHA into an external directory, preserving `src/components/**` paths.
Set `QA_BASELINE_DIR` to that directory and add `--before` (still requires
`--browser-granted`). Vite reads those copies without replacing the worktree's
files. The before cases reproduce 1.2s explorer timing and app-reduce ignored by
both screens. Optional `QA_MODE=course|explorer` runs one after batch; the manual
course-input case runs at the end of either batch. No browser is started by the
Vitest suite.
