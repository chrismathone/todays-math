# Grok teacher UI — 교육과정 연결도

Status: H1 teacher graph is in the existing course dashboard. Ready for the coordinator. This worker did not push.

Gate: three-way H1 on `docs/design/mockups/math-prerequisite-hifi.html` SHA-256 `fd9b495022a954025143062675e96b71249322fd162eaa307b9dd82ae1c39869`. Votes: Grok `msg_c1eed3e4b25a`, Claude `msg_8aeb6f0c6ef2`, Codex `msg_bae85bfa868a`. Implementation order: `msg_5a57634294df`. Parent merge: `7a286033ad46f2c685e7a57532a4dd13fb76db52` (hi-fi `564d540dd` and integration `5a178c108`).

## What landed

The graph opens from **교육과정 연결도** in the existing SRS 현황 header, before a student is chosen. `next/dynamic` with `ssr: false` is at module scope in `CourseDashboard.tsx`. The panel mounts only while that control is expanded, so the 100-unit module stays out of the first dashboard bundle.

`CurriculumGraphPanel` lists all 100 units. Search and the school, grade-band, course, and domain selects combine. Domain choices are the four authored domains. High-school domain text is prefixed 편집분류. Middle `suggestedGrade` is labeled as a screen placement. Excluded courses stay in the scope paragraph and are not choices. Supply text on a collapsed row is only `E56-N04` “문제를 낼 수 있음” and `E56-N03` “확인 범위”.

An open row shows topics as text, direct prerequisite and successor titles with reasons, support edges, and course relations as a separate editorial list. A related button opens its destination. If that unit is outside the active filter, the filter resets and the status line names the opened unit. Review candidates can be hidden with “이미 본 단원에서 빼기”. That exclusion stays in component state. The audit line stays visible: 성취기준 대조는 끝나지 않았습니다.

With a selected student, the panel calls existing `getCourseStudentDetail` when it opens. The prop is `{ id, revision }` from the latest roster row for that id, so a plan save that raises `data.students` revision refetches the evidence. A stored record renders only when its student id matches and its revision is at least the requested revision. A response is dropped when the request token changed, the student id differs, or the revision is older than requested. A newer revision is shown. No student selected leaves the evidence section out. The four partial rows render in array order with status, outcome, independent counts, Seoul time or “기록 없음”, and “소단원 일부입니다. 단원 숙달이 아닙니다.” The session sentence is “기준은 최근 완료한 5문항 세션 두 번입니다. 답 두 개로 세지 않습니다.” Hold, return, fallback (`canStart`), and shortage (`canStart` false) use the frozen DTO reason as written. Recovery text is “같은 탐험 단원 안에서 시작 소단원을 바꾸거나, 관리자가 자동 선수 확인을 끄면 이후 계산만 바뀝니다. 이미 열린 탐험은 그대로 둡니다.” A unit outside the pilot says it can be found and is not issued automatically, then “이 시범에서 자동 제시하는 문제 범위를 연결하지 않았습니다.” The records sit below the catalog. The panel has no start or practice control.

Palette is the existing Workroom `--learn-*` tokens. Name is 15px/700, meta is 12px on the next line, and there is no lead line and no left color bar. Focus is 3px `var(--learn-focus)` with offset 3. Controls are at least 44px with radius 8px. Pointer and hover stay on real controls. Short actions 교육과정 연결도, 필터 초기화, and 접기 use `white-space: nowrap`.

## Checks

Commands used the existing junction `node_modules` → `D:\todays-math\node_modules`. No install.

- `node node_modules/eslint/bin/eslint.js` on `CurriculumGraphPanel.tsx`, `CourseDashboard.tsx`, and `CurriculumGraphPanel.test.tsx` — exit 0 after the final format. The earlier `react-hooks/set-state-in-effect` error is gone. An empty student derives an empty record. Fetch updates happen in the response callback, and the request token still drops a stale response.
- `node node_modules/prettier/bin/prettier.cjs --write` on those three files plus `curriculum-graph.module.css` — exit 0.
- `node src/lint/check-affordance.mjs` on the two components and the CSS module — exit 0.
- `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/__tests__/components/CurriculumGraphPanel.test.tsx src/__tests__/components/CourseDashboard.test.tsx --reporter=verbose` — **2 files, 34 tests passed**, start 09:27:03, duration 27.79s. This run is after the review fixes. Ten cases are in the graph file, including the plan-save refetch, the first paint of the next student, and the H1 return, fallback, and unavailable sentences. Twenty-four cases are the existing dashboard file.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` — exit 0, duration 296.85s, no diagnostics, on the first UI commit before these review fixes. An earlier run failed once on the partial detail fixture (`TS2352`). The fixture casts through `unknown`. This review pass did not repeat the whole-project check. Root runs the final build.

## Limits

Root owns the student screens and the browser fixture. This worker did not open a browser, did not measure 320px, and did not edit the player back control. The 200-seed gate was not run again. The graph JSON was not regenerated. No migration, production database, or AI call was made. No other production file was edited. Test literals quote the reason strings from main `d94f6efad`. The panel prints the DTO reason it receives, so that commit was not merged into this branch.

## Owned paths

- `src/components/math-srs/CurriculumGraphPanel.tsx`
- `src/components/math-srs/curriculum-graph.module.css`
- `src/components/math-srs/CourseDashboard.tsx`
- `src/__tests__/components/CurriculumGraphPanel.test.tsx`
- `docs/planning/tracks/reports/math-prerequisite-20261003/implementation-grok-ui.md`
