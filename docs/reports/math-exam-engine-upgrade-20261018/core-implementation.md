# Exam study core implementation

2026-10-18 · source/base `9cfbb8683` · Task `task_78b12334131b`

The production core now assembles original practice through a separate registry, aggregate reviewed profiles and a deterministic demand planner. The frozen contract, both author-owned family indexes and all legacy registries remain unchanged. This worker did not implement or claim API/UI/authentication/print integration.

## Public integration

`src/lib/examStudy/index.ts` exports the required functions:

```ts
getExamStudyCatalog(course?: ExamStudyCourse): ExamStudyCatalog
generateExamStudy(request: unknown, options?: ExamStudyGenerateOptions): Promise<ExamStudyGeneration>
```

It also exports `ExamStudyRequestError`, strict request parsing, requirement/profile metadata, evidence-level helpers and canonical identity helpers. `options.families` and `options.profiles` replace their respective registries for pure isolated tests. Normal operation combines `MIDDLE_STUDY_FAMILIES`, `ADVANCED_STUDY_FAMILIES` and readonly legacy adapters; this branch intentionally retains the empty author-owned indexes from the dispatch base.

Invalid input, unknown IDs, cross-course family/profile injection, conflicting school attribution and requirements outside a selected profile throw `ExamStudyRequestError` (`name`, `code`, `message`, `issues: readonly string[]`). Internal malformed factory/domain definitions throw an ordinary error. Mathematical/format/difficulty/renderer shortages return `partial` or `unavailable`, with per-demand reasons.

`prepare` is the sole external-operation boundary. The caller must supply the strict Python renderer described in the frozen contract. Every actual `figureSpec`, including optional/general legacy figures, requires a successful nonempty SVG. Without it the item is removed; a figure-free component cannot replace a figure-required demand. Preparation is sequential (at most one concurrent render), bounded by `count * (maxRenderRetries + 1)` calls. A failed deterministic geometry moves to a different candidate rather than rendering the same failed specification repeatedly; total generation remains bounded by 360 attempts.

## Demand and source metadata

All 50 closed IDs have concepts, condition dependencies, representation, case selection, response and structural difficulty metadata. Profiles use only the public abstract audit and bibliography/visibility metadata:

| Profile             | Source scope               | Visible / listed |       Unconfirmed | Selected abstract demands |
| ------------------- | -------------------------- | ---------------: | ----------------: | ------------------------: |
| `daeryun-m1`        | 2025 first-semester final  |          19 / 22 |          3 hidden |                        11 |
| `daeryun-m2`        | 2025 first-semester final  |          18 / 18 |                 0 |                        10 |
| `kyungmyung-m1`     | 2025 first-semester final  |          22 / 22 | 2 uncertain tasks |                         7 |
| `kyungmyung-m3`     | 2025 first-semester final  |          22 / 22 |  1 uncertain task |                         4 |
| `kyungshin-common2` | 2025 second-semester final |          20 / 20 |                 0 |                         8 |

Daeryun M2's last source card contains two separate modeling demands; the two demands are not marketed as a new integrated mathematical family. Kyungmyung's uncertain tasks are excluded from the selected reviewed mathematical scope. These are selected abstract demands, not frequencies, a source census or coverage of every visible task. Equal weights allocate practice; they are not observed school frequency estimates. Every profile explicitly retains `difficultyCalibration: "unmeasured"`. No question numbers, original wording, coefficients, source figures or answer keys enter production profile data or generation inputs.

School aliases are matched together with the course. Unknown schools produce explicitly warned general practice. A known school/course mismatch or a conflicting label/profile is rejected. Profile display names, aliases, region and scope labels are excluded from mathematical seed/digest input.

## Existing generation and evidence

The readonly adapters expose all registered forms at the pinned source:

| Source registry              | Registered / exposed |
| ---------------------------- | -------------------: |
| Elementary forms, grades 3–6 |        2,499 / 2,499 |
| Middle types                 |        1,517 / 1,517 |
| High common mathematics 1    |            168 / 168 |
| Existing native reasoning    |                6 / 6 |

These are selectable registrations, not a count of distinct questions or school-ready tasks. No high common mathematics 2 catalog-only entry is invented. Format advertising is conservatively probed on actual legacy output, author short-only policy is preserved, fixed MC is retained, and every generated item must satisfy an explicit requested format and difficulty. Optional difficulty does not force school calibration. MC derivation uses the established `asMultipleChoice` only; written derivation is absent.

Six existing positive handlers have independent production validators and executable evidence in `examStudyCoreLegacy.test.ts`:

- Sign/quadrant: all four sign conditions and allowed coordinate transforms; removing each condition destroys determination.
- Function uniqueness: read the printed relations; divisor/count, absolute-value, price and perimeter witnesses distinguish unique and multiple outputs. All 56 five-relation subsets are checked.
- Line properties: separately re-evaluate direction, intercept, increment, incidence and quadrant feasibility; all slope/intercept sign combinations are exercised.
- Natural-solution count parameter: directly substitute the required and next natural number into the printed inequality, with negative/zero coefficient infinite-solution cases and exact integer boundaries.
- Natural-parameter equation: solve printed equations over positive parameters and positive/negative integer roots, excluding zero/endpoints.
- Complete rational-root parameter: rational-root-theorem enumeration independently checks the generator's square filtering, including repeated roots, irrational cases and the real-root boundary.

Each handler additionally has 64 actual generated-output checks and wrong-answer negative controls. Other legacy mappings remain `unverified`/component practice. Existing native rubrics are retained and checked for model-answer availability, distinct criteria, positive integer points, totals, alternatives and errors; this does not automatically promote them to school `full`.

`fulfills` remains an upper bound. `full` requires a checked demand, executable test reference, positive sample count, branch evidence, independent-solution and essential-condition checks, plus visual or native-rubric checks where required. The actual draft must pass its verifier and applicable response/figure requirements. Prepared rendering is then mandatory for delivery. MC derivation composes the validated original task with a separate five-choice/correct-value correspondence check.

## Assembly and reproducibility

Weighted quotas reserve at least one opportunity for each selected demand. An integral maximum-flow planner allocates family capacity and candidates across all quotas together; augmenting paths reassign flexible families so specialized demands are not greedily starved. Only actual `full` items satisfy full quotas. Components may be supplied as explicitly unfulfilled practice; filling the requested count alone cannot produce `complete`.

The default family cap is one. Explicit `maxPerFamily` or reviewed weight can permit different-parameter repetition; logical/content duplicates remain forbidden. Finite factories must enumerate their exact unique canonical domain; sampled attempts are finite and at most 360. Individual generation/verifier exceptions discard only that attempt. Candidate identity is conservatively deduplicated before allocation, including aliases.

`logicalKey` is `family@version` plus stable canonical mathematical parameters, excluding seed/format. Legacy parameters use the normalized native task/answer/spec digest. Content identity decodes numeric MC response packaging, normalizes harmless mathematical whitespace and canonical ordering, and handles reordered single/multiple-choice alternatives. Renderer identifiers are excluded while mathematical figure labels/data remain. Generation digest is exactly 64 lowercase SHA256 hex characters and excludes rendered SVG. The returned normalized recipe, profile revision and manifest reproduce the result for the root resolve endpoint. Factory/manifest revisions are part of the mathematical seed; display labels, user identity and time are absent.

## Validation and remaining scope

Verification uses the existing dependencies through an authorized `node_modules` symlink, a dedicated `envDir: false` Node Vitest config, and clean child environments containing only `PATH`. The repository default test config is never loaded. All 73 core tests pass; they cover strict input, profile counterfactuals, rename invariance, evidence downgrades, actual mathematical validation, matching, finite exhaustion, formats/grades/difficulty, rubrics, render failures, logical/content duplicates and legacy-registry preservation. Core-scoped TypeScript and ESLint with zero warnings pass. Seven existing regression files additionally pass 78 tests (high registry, native reasoning, numeric format expansion, distractors/choice spread, middle tier and elementary author format policy).

Reproduction code/configs, test/type/lint/regression logs and an exact catalog/profile snapshot are preserved in the coordinator workspace at:

`/Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-exam-engine-upgrade-20261018/task_78b12334131b-evidence`

The worker snapshot honestly shows the authored indexes as empty and the corresponding profile gaps. Root must merge the two authors' real modules and run actual strict Python rendering and end-to-end API/UI/auth/output checks; this worker's injected fixtures do not claim their content coverage. No full-repository type/lint run, actual figure visual QA, physical print check, live DB/provider request, installation, Prisma generation, build, push or deploy was performed here. School prediction hit rates, student learning effects, measured difficulty and complete official curriculum alignment remain unmeasured.
