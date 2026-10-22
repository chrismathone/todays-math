# Teacher learning insight synthetic QA

This fixture uses the production CourseDashboard entry, Workroom stylesheet on
representative shell markup, global tokens, Pretendard and KaTeX. All people, records and API responses are
synthetic and held in memory. It reads no environment files or real database and
must reject every request outside the fixture's explicit local routes.

The coordinator must grant the single browser/server lease before running the
verification script. The script owns one local Vite server and one Chromium
engine and closes both in `finally`.

Acceptance includes 390px and 1440px layouts; real font readiness; no document
overflow; labeled controls and visible keyboard focus; loading, empty, error,
unavailable and inconsistent responses; explicit AI requests only; retained
deterministic evidence after AI failure; and stale GET/POST protection when
student, class, branch or reload changes. These checks do not establish real
account authorization, production readiness or educational effectiveness.

`generated.json` freezes actual DTOs and teacher prose from backend commit
`6f78cfaa7`. `generate.ts` checks the snapshot/inference/policy/contract source
blobs against that commit, then uses the backend's pure course transitions,
candidate policy and snapshot/result composers. It creates two separated failed
first-pass sessions, an old excluded record, both synthetic enrollment scopes,
and an outside-pilot snapshot. It stores only public projections, with no
problem answers. No database, credentials, model calls or environment-file
loading are involved. When the backend source is in a checkout, regenerate with:

```sh
node node_modules/tsx/dist/cli.mjs --tsconfig /path/to/backend/tsconfig.json \
  scripts/qa/math-insight-ui/generate.ts /path/to/backend \
  scripts/qa/math-insight-ui/generated.json
```

The final material followup uses `--material-only` with `verify.mjs` after a new
lease grant. It checks ready/current/trigger citations, the explicit question,
and outside-pilot static candidates at both widths; earlier broad-state results
remain separate. A clipped, noninteractive, fixture-only MathText probe loads
KaTeX fonts without adding artificial mathematics to actual server prose.

## Phase 2 opt-in v2 QA (2026-10-23)

The current panel and `verify.mjs` consume `data-v2.ts` / `generated-v2.json`.
The retained v1 JSON and `data.ts` continue to exercise the unchanged legacy
client exports. V2 uses the same endpoint with `x-math-insight-version: 2`.
The fixture freezes core projection/composer commit
`6c9e431563f68f1e344a28b9232eb849cc303fbd`; the generator verifies actual source
bytes against that exact commit, uses production pure transitions for grade 3–6
(including explicit self-assessment where required), and freezes canonical
teacher text without calling a model. The missing-source scenario deliberately
removes retained source from a synthetic transitioned record. No real student
record is read or changed.

```sh
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json \
  scripts/qa/math-insight-ui/generate-v2.ts . \
  scripts/qa/math-insight-ui/generated-v2.json \
  6c9e431563f68f1e344a28b9232eb849cc303fbd
node node_modules/vitest/vitest.mjs run \
  --config scripts/qa/math-insight-ui/vitest.config.mts
node node_modules/typescript/bin/tsc --noEmit \
  -p scripts/qa/math-insight-ui/tsconfig.json
```

Only after an explicit coordinator browser/server lease, run `verify.mjs
--browser-granted` with `QA_OUTPUT` set to a durable external evidence directory
and `QA_CHROMIUM_EXECUTABLE` set to the installed Chromium executable. No browser
is downloaded. The script uses one engine, blocks external/API network requests,
records product source hashes, and awaits browser/server closure in `finally`.
The fixture's fetch interceptor serves API DTOs in memory.

V2 checks cover stored plan versus computed course goal, retained-source absence
and bounded history, generic observations versus the four-section fraction
pilot, source focus/reveal, Enter and duplicate admission, cancellation, scope
switch and reload races, model failures, authorization denial, and POST 409 →
one fresh GET → no automatic POST with the question preserved. Unknown failures
remain manual retry. Synthetic UI QA is distinct from real authorization,
production services, model relevance, and educational validation.
