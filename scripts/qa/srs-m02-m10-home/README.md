# M-02 · M-10 local home regression

Run only after the lead explicitly grants Chromium **and** local-server use. One
engine is opened; every run awaits browser/server shutdown in `finally` before
another run. No Next server, build, account or database is used.

```sh
QA_OUTPUT=/Users/pss/Desktop/creative/display-survey/srs-m02-m10-20261021 \
QA_CHROMIUM_EXECUTABLE=/Users/pss/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell \
node scripts/qa/srs-m02-m10-home/verify.mjs --browser-granted
```

The fixture renders the real `StudentAppShell`, `StudentMathExplorers`,
`ExplorerConceptMemory`, study book, guide provider/picker and journey board.
It imports root globals and KaTeX CSS, and defines the root Pretendard variable
using the same local font file. Vite adapts Next client navigation/dynamic
imports. Only `guideApi` is replaced at the module boundary by in-memory replies.
The daily plan comes from `buildFadingDailyPlan` with local records; the surrounding
explorer/journey snapshot is synthetic and is not an engine/award integration
claim. The visible “검증: 홈 나가기/복귀” button is fixture-only.

The browser rejects every external and `/api/` request. `pageerror` and
`console.error` fail the run. Captures check loaded fonts, KaTeX CSS, broken images
and document overflow. Open the resulting PNGs to review them; generation alone
is not visual verification. Full-page captures can place the sticky app header
or bottom navigation across the stitched image after a click scrolls the page.

390 and 1440 widths cover completed mission, mixed completed activities,
recall-only completion, short completion and next day. The guide flow covers
Enter, click, five available options, save success/failure, return to the ending,
same-choice confirmation and a fresh provider visit. Component regressions cover
teacher-target-only changes, duplicate section labels, excluded unfinished work,
missing completion provenance, failed read, and study after a failed save.

`plans.ts` is shared with `SrsCompletedHome.test.tsx`; it calls the actual daily
planner rather than reimplementing its counts/status rules. No fixture is
reachable from a product route.
