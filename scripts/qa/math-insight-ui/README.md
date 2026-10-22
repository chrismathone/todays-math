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

## Fixture flag correction (2026-10-23)

The earlier frozen v2 ready fixture was internally inconsistent: its generator
called the lower-level candidate policy with `true`, while canonical text read an
undeclared `MATH_PREREQ_CHECK`. Earlier PNGs and logs remain immutable evidence of
that fixture defect. The production route already used the correct wrapper;
this correction changes no product source or production feature setting.

`generate-v2.ts` now calls the existing production
`expeditionCourseCheckCandidates({ ...emptySrsState(), course }, now)` wrapper.
Every scenario explicitly declares its synthetic `MATH_PREREQ_CHECK` setting in
`scenarioFlags`. The offline CLI sets it synchronously around both wrapper and
snapshot, then restores the previous process value in `finally`; it never reads
an environment file or changes another process. Ready and the existing cases use
`on`; the separate `feature-off` case uses the identical transitioned course with
`off`. Assertions require ready eligibility, no off eligibility, coherent
canonical text, identical retained observations, and usable factual inquiries
while off. No learner payload is invented to force eligibility.

The exact pure source freeze remains
`6c9e431563f68f1e344a28b9232eb849cc303fbd`, with additional actual-byte checks
for the production wrapper, state constructor, gate and integration source.
Product source remains `83901c9ab6b3698548574dd914a0af324f7e70d6`. This is the
canonical display projection freeze, not the separately evaluated later model
prompt. Explicit on/off inherited child-process checks produce identical JSON.

The corrected full browser matrix includes both on and off question/render
cases at 390px and 1440px: 64 captures and 34 checks. `results.json` records
product hashes, projection hashes, the wrapper and all scenario flags. The
external `ui/fixture-correction/evidence-manifest.json` also records exact refs,
source and fixture bytes, old artifact hashes, unchanged original observations
and pilot DTOs, and the new browser result. See the appended correction in
`docs/planning/tracks/reports/ontology-evidence-ui-20261023.md` for evidence paths,
closure and limits. The coordinator owns merging and release.

## Stored-state validation correction (2026-10-23)

The previous missing-source fixture cleared its sessions but retained five
request receipts, violating `storedCourseSchema`. Earlier captures remain
immutable evidence with that limitation. The fixture now clears only those
orphan receipts while preserving its intended summaries and missing sources.
Every state is parsed by the existing schema before the production candidate
wrapper and snapshot, under the declared per-scenario flag. Generated
`stateSchema` and `scenarioValidation` metadata records all 14 scenarios as
valid, with two scope projections each; this validates synthetic records only.

Current QA code freeze: `aa346029f04faa0a5d92fcaff29a4399fd06c19b`.
Regenerate using the command above with exact approved backend freeze
`9a009c737e0c2e490a2d0c5b9fb27d9350447548` in place of the historical `6c9e431`.
The only backend source-hash change is the approved v2 prompt date projection;
canonical facts and observations remain unchanged, with missing-source state
digests updated for the valid record. UI product bytes still match `83901c9`.
Inherited `on` and `off` processes generate identical JSON.

The single final browser run passed 64 captures / 34 checks with zero errors or
rejected requests. Browser/server closure and runner exit 0 preceded lease
return `msg_dac196be594e`; neither was restarted for documentation. Evidence,
comparison, historical artifact hashes and source metadata are under external
`ui/schema-correction/`. All 356 prior UI evidence files remain byte-identical.
See `docs/planning/tracks/reports/ontology-evidence-core-20261023/FOLLOWUP-UI-SCHEMA.txt`.
