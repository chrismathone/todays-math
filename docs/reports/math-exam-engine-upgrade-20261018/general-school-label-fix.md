# General-mode school labels stay display-only

2026-10-18 · base `d35e937e0` · task `task_8a5e1616171b`

`resolveProfile` now leaves generation generic when `familyIds` are supplied
without `profileId`. A recognized school label, alias, or school reviewed only
for another course cannot add profile demands, filter selected families, or
reject this general request. The generic warning says
“학교 프로필을 적용하지 않고 일반 범위 연습으로 제공합니다.”; it does not
claim that a known school lacks reviewed evidence.

Explicit `profileId` still applies alongside selected families and retains the
unknown-profile, course, school-label and requirement-scope validations.
Without explicit families, recognized aliases still select the reviewed profile
and known schools without a matching course still reject. The frozen contract
and mathematical seed/digest/recipe-input logic are unchanged; `schoolName`
remains in the returned display recipe and is removed from mathematical inputs.

## Before/after evidence

The same request uses course `중1`, selected family
`study-middle-inverse-equal-legs`, seed `5`, count `1`, format `단답형`, and
`maxPerFamily: 1`. It uses the actual authored middle family and real reviewed
profiles, with the family registry narrowed to that selected family.

| School label | Before | After |
| --- | --- | --- |
| Missing | Generic, complete, 1 item, 0 requirements | Same |
| `대륜중학교` | `daeryun-m1`, partial, 1 item, 11 requirements | Generic, complete, 1 item, 0 requirements |
| `대륜중` | `daeryun-m1`, partial, 1 item, 11 requirements | Generic, complete, 1 item, 0 requirements |
| `미검토학교` | Generic with the old evidence-absence warning | Same mathematics with the accurate no-profile warning |
| `경신고등학교` | `school-course-unreviewed` error | Generic, complete, 1 item, 0 requirements |

After the fix, all five cases have `profileId`, `profileVersion` and
`schoolEvidence` equal to `null`, empty requirement rows, identical full question
objects (including IDs, seeds, logical/content keys), mathematical recipe inputs,
counts and status. Their digest is
`ea0aafa4920a49298fbed782579498658e5ef383f281f387ab8e7d97c873aed2`.
A counterfactual injected profile with disjoint demands previously removed the
only selected family (0 items, unavailable); it now preserves the same generic
item and complete status.

## Verification and handoff

The new `examStudyCoreLabel.test.ts` failed 5 of 12 checks before the source fix;
the seven compatibility checks passed. After the fix, all 85 tests across
`examStudyCore.test.ts`, `examStudyCoreLegacy.test.ts` and
`examStudyCoreLabel.test.ts` pass. Core-scoped TypeScript, ESLint for both changed
TypeScript files with zero warnings, formatting and `git diff --check` pass.
Checks run with `env -i PATH="$PATH"`; the dedicated Node Vitest configuration
sets `envDir: false` and loads no repository test setup. Existing dependencies
are reused through the authorized `node_modules` symlink.

Reproduction scripts/configs, pre-fix failures, before/after JSON matrices,
automatically checked matrix invariants, and verification logs are preserved in
the coordinator workspace:

`/Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-exam-engine-upgrade-20261018/general-label-fix-evidence`

Only `generate.ts`, the focused regression file and this report change.
Coordinator integration remains; API/UI and production end-to-end behavior were
outside this worker's scope.
