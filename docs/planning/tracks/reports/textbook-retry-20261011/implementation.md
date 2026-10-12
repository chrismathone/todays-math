# Textbook retry planning — 2026-10-11

Implemented a read-only retry API and textbook-specific selection in `planRetry`. Every wrong `school_textbook` original gets its own two designated variant slots, including when multiple originals share a family. Ordinary retry retains one seat per family and original fallback; ordinary exam selection retains one item per family.

The coordinator superseded the initial `tb-retry:<originalId>` family proposal: generated variants inherit the original's existing `familyKey`. Retry ownership uses the direct `originProblemId` plus `externalId = tb-retry-v1:<originalId>:1|2`; family equality alone never authorizes a textbook retry variant.

## API and payload

`POST /api/tests/{id}/retry` takes an explicit `studentId`, optional `testResultId`, optional `seed`, optional `count`, and optional `excludeIds`. Without a result ID it reads only that test/student's latest grading record, with ID as a stable tie breaker. An explicit result ID must belong to that exact test and student.

```json
{
  "studentId": "30000000-0000-4000-8000-000000000001",
  "testResultId": "ebd66d1a-1741-4cff-bc7b-d541dc6bcfc4"
}
```

The response includes `testId`, `studentId`, `testResultId`, ordered `wrongProblemIds`, `requestedCount`, `picked`, `shortfall`, `foldedWrong`, and `textbookShortfalls`. Each picked seat contains the full problem read payload, `wrongProblemId`, and `origin`. The problem preserves `source`, `originProblemId`, `familyKey`, `externalId`, content, answer, solution, and figure geometry.

Default requested count is two per unique textbook wrong ID plus one per unique ordinary wrong ID. Ordinary family folding remains visible in `foldedWrong` and the overall shortage. An explicit API count below that default is rejected with 422 when textbook originals are present, so a caller cannot silently reduce their pair allocation. The lower-level pure planner retains its explicit overall count cap for existing callers; callers that want the textbook default can omit count or use `retryRequestedCount`.

Selection accepts only shared, approved, direct-use candidates with an answer according to the existing eligibility rule. Textbook slots additionally require `source=transformed`, the exact original as direct parent, the exact designated slot, matching unit, and distinct candidate IDs. Excluded IDs, every wrong original ID, unrelated same-unit problems, older recovery children, and missing/invalid slots cannot fill the pair. Zero/one usable slots remain zero/one selected with their actual shortage; there is no original substitute for a textbook slot.

The API checks existing test and student/class/branch authorization, individual-test student identity, confirmed/printed status, attendance, and test membership of every wrong ID. It refuses an inaccessible original instead of silently dropping it. It rereads selected candidates with eligibility before serialization, so a deleted or newly locked candidate becomes a shortage. This operation creates no test, grading record, candidate, approval, or schema change.

The existing proxy already puts `/api/tests/**` behind the export workspace menu and staff route gates. The new handler uses `withErrorLog`; no UI files or student/print exceptions changed.

## Evidence and checks

- `api-payload-evidence.json`: actual handler response from an explicitly labeled synthetic in-memory test fixture. Two originals sharing a family produce four distinct directly linked variants, requested count 4, folded count 0, and shortage 0. It does not claim production content or approvals.
- `before-snapshot-evidence.json`: supplied snapshot at `2026-10-11T04:10:37.231Z`, SHA-256 `0328ed69db13e4a5c0d3fb258ebf520e82e0a5c18983b287654fd83660cbd0f4`. It has 12,281 distinct originals/families, all solo; 79 old recovery children; and zero designated slots. A full dry plan requests 24,562, selects zero, reports 24,562 shortfall, and folds zero originals.
- `snapshot-evidence.json`: coordinator's first-stage snapshot at `2026-10-11T04:25:37.069Z`, SHA-256 `d979dc5e560ed06e0d82796e05b29915ba2f02096ca0cd30c976e9620ef3c036`. It preserves the original and old-child counts while adding 1,358 designated variants for 679 originals; all designated variants remain pending and locked. The planner excludes them and still reports the full 24,562 shortfall. This is snapshot evidence, not a live database or deployed-route check.
- `capture-snapshot-evidence.mjs`: reproducible snapshot audit, reading the supplied JSON and writing only the local evidence file. Run `node --import tsx docs/planning/tracks/reports/textbook-retry-20261011/capture-snapshot-evidence.mjs <snapshot-path>`.
- Seven files and 136 tests pass: 31 retry planner tests, 23 retry API tests, 14 family tests, and 68 existing test/grading/generator/eligibility regressions. `mutation-evidence.txt` records 11 negative controls; every mutation fails one or more of the same 31 unit tests and restores the original bytes afterward.
- Full project TypeScript check passed using the repository's 8 GB heap setting. The initial default-heap attempt exhausted 4 GB; it did not reveal a source defect. `tsconfig.retry.json` permits a focused final type check of the owned files and their dependencies.
- Scoped ESLint and `git diff --check` pass.

The existing global error-log coverage suite fails two checks on five unrelated pre-existing English routes (`/api/english/questions`, `candidates`, `compose`, `resolve`, `scopes`); the new retry route has the wrapper and marker. These files were left for their owner.

## Integration remaining with the coordinator

The coordinator owns variant generation/import and validation/approval. Pending or held variants remain unavailable; staged existence does not imply usable review coverage. The endpoint is a planning API, and the checkout previously had no caller for `planRetry`; UI invocation, turning a plan into an exported test, and rollout are separate coordinator work. No shared DB write, migration, push, deployment, or nested worker was performed in this worker.
