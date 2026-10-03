# Codex graph implementation handoff

Status: implementation and required graph verification complete; ready for coordinator merge.

Approved plan: v03 SHA-256 `09cd2ab152621e563945dcaf0eb7270095c2e31411051a547d94953bb6948bd1`. Frozen contract/baseline: main `39535841cb067825b0331d6e0ae79bdb709f3b4e`, merged into this branch after prior-review commit `5aac3da72`.

## Exact UI-facing exports

Import from `@/lib/math-prerequisite/graph`. The module imports canonical root JSON and the frozen contract. It uses no Node runtime imports, student state, policy, DB, or AI.

| Export | Return / behavior |
|---|---|
| `GRAPH_CONTENT_HASH` | Lowercase 64-character SHA-256 from the generated graph |
| `curriculumGraph()` | `MathCurriculumGraph`; validated once and recursively frozen. Raw `courseRelations`, `scope`, `dataStatus`, and counts remain available |
| `validateCurriculumGraph(input: unknown)` | Frozen-schema parse plus real structure/count validation; throws on invalid input; used by regression tests |
| `searchUnits(filter?: MathGraphFilter)` | `MathGraphUnit[]` in authored order; optional `query`, `schoolLevel`, `gradeBand`, `course`, `domain` combine with AND; query words combine with AND across ID/title/topics/metadata |
| `graphFilterOptions()` | `{ schoolLevels, gradeBands, courses, domains }`, unique values in first-appearance order |
| `graphUnitDetail(id: string)` | `MathGraphUnitDetail` or `null` for unknown ID |
| `reviewCandidates(targetId: string, masteredIds?: readonly string[])` | `MathGraphUnit[]` in prerequisite topological order; unknown IDs throw; mastered target returns empty; a mastered ancestor stops only its own traversal branch. **Teacher lookup only** |

`MathGraphUnitDetail` contains `unit`, ordered `topics` (graph topic-node records), `directPrerequisites`, `successors`, `incomingSupport`, `outgoingSupport`, and `courseRelations`. Each unit-relation entry is `{ unit: MathGraphUnit, edge: MathGraphUnitEdge }`, retaining its original direction and reason. `courseRelations` includes explicit course-name/composite membership and the authored “선택 수학 과목” endpoint for general/career elective course groups; it is never converted to a unit edge.

High-school `domain` must be displayed as **편집 분류** (`unit.schoolLevel === "high"`). Middle `suggestedGrade` is a display placement proposal while `gradeBand` remains `중학교 1-3학년군`. Existing unit IDs are preserved; only the M1-D01 title spelling is corrected to `자료 정리와 대푯값`.

## Standalone CJS exports and hash contract

`require('./math-graph.cjs')` exports only functions and performs no build/write/logging. `buildGraph({ unitData?, edgeData? } = {})` builds a fresh graph; string overrides allow small adversarial test graphs without altering canonical data. `reviewCandidates(targetId, masteredIds = [], graph = buildGraph())` preserves CLI candidate fields `{ id, title, course, topics }`. `graphContentHash(graph)` and `graphMarkdown(graph)` are pure helpers.

Hash input is the entire graph object except its `graphContentHash` property. Recursively sort object keys lexicographically, preserve array order, serialize as compact JSON, then SHA-256 with `node:crypto` and UTF-8. Units, topics, relations, counts/topological order, scope, sources, and other metadata participate. No timestamp, extra raw field, or `graphVersion` is added. The browser-safe reader validates the frozen schema and structure; generated-artifact hash integrity is checked by CLI/unit tests rather than introducing Node crypto into the client graph.

Direct CLI use still writes both root-named JSON/Markdown to cwd by default, or `--out`; `--target M3-R02` and `--mastered M1-N02` print teacher candidates. All options and IDs validate before writes. Invalid options/IDs exit nonzero. The CJS copy can run in an empty folder with Node core alone.

## Generated data and verification

Actual CLI output: 100 units, 356 topics, 186 prerequisite unit edges, 2 support unit edges, 356 containment edges, no duplicates/dangling edges/prerequisite cycles. Required 11 excluded courses plus the draft's two additional exclusions remain; topics receive only containment edges. All curriculum-audit flags and unofficial-enrollment semantics are preserved.

Generated `graphContentHash`: `80f599e064e428f56f63ef06d89ede24d71319521b2c93ff97a3126212f17554`.

Passed commands (run with cwd at this worktree and only existing dependencies):

- `node math-graph.cjs` — generated committed root JSON/Markdown and printed the actual counts above.
- `node --check math-graph.cjs` — valid standalone CommonJS syntax.
- `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/__tests__/unit/mathPrerequisiteGraph.test.ts src/__tests__/unit/mathPrerequisiteGraphCli.test.ts` — **50 tests, 2 files passed**, including the final rerun after the lint fix. Tests copy only the CJS into an otherwise empty temporary directory and exercise default writes, `--out` with spaces, `--target M3-R02`, `--mastered M1-N02`, silent/non-writing require, invalid option/ID rejection before writes, deterministic artifacts, corruption detection and teacher-only mastered traversal.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — **full project type check passed**, without writing build-info or changing shared configuration.
- `node node_modules/eslint/bin/eslint.js math-graph.cjs src/lib/math-prerequisite/graph.ts src/__tests__/unit/mathPrerequisiteGraph.test.ts src/__tests__/unit/mathPrerequisiteGraphCli.test.ts` — **passed with no errors/warnings**. The three Node-core imports have a narrowly scoped CommonJS exception; no global lint configuration changes.
- Compared the authored `UNIT_DATA` and `EDGE_DATA` blocks against main `39535841c`: unchanged byte content after line-ending normalization except the one authorized M1-D01 title correction. No ID or edge was renumbered/rewritten.

Tests cover actual counts/IDs/ordered elements/containment, duplicate and dangling nodes/edges, self-links/cycles, topic prerequisite rejection, exclusions, incomplete audit, hash participation of content/metadata/course relations, search/filters/details/support direction, and source/build/generated JSON parity. No generator dependency or original curriculum document is needed by the CLI.

Only the authorized `node_modules` junction to `D:/todays-math/node_modules` was created after verifying it did not exist. No installation, global mutation, DB access/migration, deployment, server or AI call was performed. No shared contract, SRS, policy/mapping/supply/versions, UI or main-checkout file was edited. Full app build/browser and student supply gates are owned by the coordinator/other workers and are not claimed complete by this graph handoff.

Additional coordinator-authorized checkpoint: [wire-codex-vote.md](./wire-codex-vote.md) records actual inspection of 18 images and a W2 structure approval at exact HTML hash `8109a7ee826b9a6ed7d5b8f5bbfeb6e46b4d005a24ea8dfe0eb85537e7e04423`, with required Hi-fi refinements. It does not constitute final product visual approval.

The coordinator will record the final commit SHA from `worker_done`; cleanup remains with the coordinator after merge and the clean/inactive checks. Prior reviews were committed first as instructed; unrelated main changes came only through the authorized baseline merge and were not edited by this worker.
