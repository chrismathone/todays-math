# Remaining SRS policy acceptance

Synthetic local records only. No student payload, external service, database, paid model, reset, build, or deployment is used.

- `memory.ts`: product `createLocalFadingSource` / `createLocalFadingRelearnSource` over 14 injected days, 1-minute retry / 5-minute confirmation, duplicate receipts, daily source reconstruction, long-term invariance. Separately checks standalone course 5 vs integrated elementary problem block 10, default 15 allocation, mixed/memory-only/course-only plans, preserved teacher plan.
- `data.ts`: actual explorer actions and course attempts produce histories; official response schemas validate the fixture.
- `fixture.tsx`: actual `UnifiedWorkspace` (active Workroom CSS), `StudentMathExplorers`, `StudentAppShell`, relearn hook/status/modal, global CSS, product Pretendard and KaTeX. Only the network/auth/server-only framework adapters and fixture controls are substituted. Relearn's “next submission boundary” is a harness call to the exact product controller, not a complete course answer submission.
- `verify.mjs`: 390/1440, keyboard, date wording, teacher quota/history/error states, close/boundary/manual resume, overflow/fonts/errors and finally-awaited browser/server closure. External and `/api/` traffic are blocked at the browser; approved reads are answered in memory by `window.fetch`.

Run without a server:

```sh
node node_modules/vitest/vitest.mjs run src/__tests__/unit/srsRemainingPolicy.test.ts --maxWorkers=3
node --conditions=react-server --import tsx scripts/qa/srs-remaining-policy/memory-run.ts
```

Only after the coordinator explicitly grants the single Chromium/local-server turn:

```sh
node scripts/qa/srs-remaining-policy/verify.mjs --browser-granted
```

The separately granted follow-up runs **only** the three remaining 1440 states
(explorer denied, student collection, relearn) and preserves the earlier
`browser.json` as `browser-remaining.json`'s independent predecessor:

```sh
node scripts/qa/srs-remaining-policy/verify.mjs --browser-granted --remaining-only
```

Navigation waits for DOM content, actions wait for their actual product targets,
and captures explicitly wait for local font readiness (relearn also waits for
KaTeX). A failure records its phase and pending requests. The remaining captures
use the viewport, since earlier full-page captures displaced fixed shell controls
within the long image. See the report for the earlier load-event timeout and
coverage limits; no timeout increase or hidden error filtering was used.

Artifacts: `/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/policy/`.
Time-injected verification does not establish actual student learning effects or replace the requested week of real fifth-grade observation. Production verification remains the coordinator's separate task.
