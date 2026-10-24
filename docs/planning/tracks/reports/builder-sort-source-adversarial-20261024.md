# Builder sorting and textbook source reads — independent adversarial review

2026-10-24 KST. Base: `7ee1236037cabb0a8df8410219c18e05c6ba4f79`.
Initial combined snapshot: `dea09a9b1` (`d27e25884` sorting and `eba3896d9` source reads).
Final reviewed product snapshot: `d4ee12fed`, including `060a562fd` feedback fixes and the checkbox selector cleanup.

**Final result: zero remaining actionable findings in the reviewed diff.** Two introduced defects were independently reproduced, reported to the coordinator, fixed by the coordinator, and independently retested. This worker changed only this report.

## Findings and disposition

1. **P2 — A rejected sort announced successful completion. Resolved in `060a562fd`.**
   Original location: `src/components/exam-builder/ExamBuilder.tsx:787` (`applyReviewSort`; success notice at line 793 in `dea09a9b1`). Restore two representations with the same canonical `questionId`, in descending difficulty order, then apply ascending difficulty sorting. `change(next)` rejects the duplicate identities, leaves the actual array and undo history unchanged, and sets an error; the caller nevertheless announced “난이도 낮은 순으로 2문항을 정렬했습니다.” The teacher received contradictory failure/success feedback about the actual sheet. This did not bypass the duplicate output gate or corrupt questions. The fix returns an acceptance boolean and exits before success/page updates on rejection (`ExamBuilder.tsx:790` in the final snapshot).

2. **P3 — A current-order notice became false after manual movement. Resolved in `060a562fd`.**
   Original location: `src/components/exam-builder/ExamBuilder.tsx:792` (new “현재 문항은 이미 …입니다” notice; `change` did not invalidate it). Start with ascending difficulties, apply the already-satisfied ascending sort, then move question 1 down using Alt+ArrowDown. The actual array becomes descending while the status still says “현재 문항은 이미 난이도 낮은 순입니다.” The fix clears the previous notice on an accepted actual change (`ExamBuilder.tsx:767`); undo supplies its own current result message. The new stale current-state claim was introduced by the sorting feature, although the general notice lifecycle predates it.

Both failures were reproduced again using an untouched copy of `dea09a9b1`'s component under `/private/tmp`, including a valid `q:v1:` identity for finding 1: **2 failed / 2 passed**. The same independent expectations against `d4ee12fed` pass. No source-read defect was found; optional improvements and untested performance assumptions are not reported as bugs.

## Independent challenges and evidence

- All six difficulty tiers sort correctly in both directions. Multiple legacy/empty/unknown tiers remain last and stable; ties preserve incoming order. Actual math MC/short/descriptive labels group correctly in both directions, with missing/unsupported types last. Input arrays and question objects are retained.
- Curriculum sorting uses the actual source adapter's catalogue `orderIndex`, including initially unloaded unit IDs and a legacy label-only row restored through its grade/chapter. Unknown and non-finite metadata handling, all-unknown refusal, all eight questions rather than the visible six, and first-page reset are covered by the existing focused regressions and source inspection.
- Twelve repeated no-op sorts preserve the one real undo entry. A manual move after sorting can be undone separately, followed by undoing the sort. Output receives the actual ordered array; the real `createPrivateDraftStore`/`PrivateCloudClient` path sends the sorted IDs and matching answers in its autosave PUT to a hermetic transport. No live save was performed.
- The controls remain math-only and use the existing disabled/busy and minimum-two-question gates. Sorting retains membership/identity and does not weaken duplicate, eligibility, revision or output-permission validation. The independently reproduced duplicate rejection now produces no false success and no undo entry.
- Each of the five changed source readers supplies `RepeatableRead`, bounded connection acquisition `maxWait: 10000`, and separate unchanged execution `timeout: 30000`. The queue regression exercises acquisition delayed beyond the old 2-second default. A genuine execution failure or exhausted 10-second acquisition budget remains a failure; this review does not claim those conditions were eliminated.
- Related tests exercise authorization before reads, scope preservation, fingerprint/cache invalidation and account-specific cache bypass. The source-picker recovery regression preserves selected books across two grades and material kinds after the first read fails; material paging/search selection regressions pass. These UI/query/cache paths were not changed by the timeout fix.
- An independent source-read failure test verifies safe 503/no-store output, server-only exception/view/code notes, and removal of synthetic DB-password and Bearer secrets by the existing persistence sanitizer. No raw exception is added to the client response.
- `d4ee12fed` changes only `.workspace .checkbox` to `.workspace label.checkbox` in `CommercialWorkbooks.module.css:293`. All five current class usages are actual labels in WorkbookWrongNotes, WorkbookAssignmentForm and WorkbookImport; the control styles and pointer behavior remain applicable. The global affordance check passes.

## Final checks

All commands used existing dependencies, disabled Vite env loading, and used the repository's in-memory database double or hermetic transports.

| Check on `d4ee12fed` | Result |
| --- | --- |
| Combined builder/English/output/source/authorization/cache/log focused suite, 28 files | **420 passed** |
| Independent `/private/tmp` component/source/autosave/transaction/log tests, 2 files | **10 passed** |
| `node src/lint/check-affordance.mjs` | Passed |
| `git diff --check` | Passed |

Reproduction source, copied pre-fix component, no-env configurations and logs remain in `/private/tmp/builder-sort-source-adversarial-20261024/` (also reachable through `/tmp/`). `original.config.mts` reproduces the two old failures; `repro.config.mts` runs the 10 independent checks against the current checkout; `vitest.config.mts` with the `src` filter runs the 420 related tests. Logs: `original-repros.log`, `final-independent.log`, `final-related.log`.

## Scope limits

Read AGENTS.md, DESIGN.md, the menu implementation map, and installed Next.js route-handler/server-client-boundary guidance. Local Codex configuration confirms `gpt-6.1-sol`, `xhigh`, `service_tier = "default"` (Fast OFF); configuration was not edited.

This was code/test review, with inspection of the existing synthetic 1280px/320px screenshots, not a fresh authenticated browser, physical print, PDF/HWPX, production-load or deployment run. The existing report's live acquisition experiment was inspected but not independently repeated. Full-repository type checking was not repeated: the coordinator separately reported 270 pre-existing shared-dependency/generated-client diagnostics and owns the complete release gate. Those environment diagnostics are not classified as introduced defects here.

No live DB writes/queries, migrations, env edits, content generation, dependency installation, push, deployment or subagents were used. The absent local `node_modules` was linked to the explicitly permitted existing shared directory; shared dependencies were not modified. Parent owns integration and any final release action.
