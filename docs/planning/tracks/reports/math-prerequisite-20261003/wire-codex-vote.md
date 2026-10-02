# Codex actual wireframe structure vote

**Preferred structure: W2. Verdict: approve W2 for the four Hi-fi alternatives.**

Reviewed 2026-10-03 in actual Codex task `task_4cbe86049a4d`, dispatch `ctx_ffd2ccf80f8e`, following coordinator message `msg_eea9c72fca89`. This is my independent visual vote, not three-model consensus or final product UI approval.

Frozen HTML: `C:/Users/user/orca/workspaces/todays-math/math-prereq-plan-grok-20261003/docs/design/mockups/math-prerequisite-wire.html`.

**Verified SHA-256: `8109a7ee826b9a6ed7d5b8f5bbfeb6e46b4d005a24ea8dfe0eb85537e7e04423`.** It matches `wire-grok-vote.md` and the actual LF worktree file. Plan remains v03 SHA-256 `09cd2ab152621e563945dcaf0eb7270095c2e31411051a547d94953bb6948bd1`.

## Actual captures inspected

I opened with `view_image` at original resolution all 12 PC captures (`w1` through `w4`, each `teacher`, `reason`, `unavail`) and all six W2 mobile captures (the same three states at `m320` and `m390`) under the Grok worktree's `docs/design/mockups/wire-shots/`. I also read the revised wire report and relevant HTML/CSS, including the W2 optional student section. I did not infer the layout solely from another model's preference, start a server, or claim interactive accessibility tests from screenshots.

## Visual reasoning

W2 keeps the 100-unit lookup accessible from the dashboard before selecting a student. The expanded panel shows filters, search and reset, then unit rows with details adjacent to the selected row. In the PC capture it fits the actual 520px panel; at 320/390 the same single-column hierarchy keeps titles, reasons, scope and controls readable. The selected-student evidence appears separately below; it does not turn curriculum browsing into a student-only route. The two open units are illustrative; production must populate all 100 filtered units from data, not hard-code the eight example rows.

W1's nested two-column list/detail arrangement restricts the useful reading width inside the already narrow panel. W3 presents a clear selected unit but makes browsing across the curriculum less visible. W4 adds a second set of tabs and hides learning elements/supply context on desktop while presenting a different content hierarchy on mobile. W2 best supports scanning unit alternatives, opening the desired detail and following relationships while retaining one consistent mobile structure.

The existing student player has a visible check/return reason immediately below its header, ahead of progress. The W2 320px capture wraps that sentence normally and keeps the problem count visible. The unavailable capture has an explicit reason and disabled Start; it does not invite repeated empty starts. This placement is approved as a structure. All four wires currently use the same student strip, so the structure preference chiefly selects the teacher panel.

## Required Hi-fi content and behavior refinements

There is no blocker to selecting W2 and generating four Hi-fi alternatives. The following must be represented accurately and checked in the next actual visual round before product UI coding:

1. Preserve the **actual current session** breadcrumb. Every check strip currently says `초5 · 2학기 · 분수의 곱셈`, although P is a first-semester subtraction section. Existing `src/components/math-srs/StudentCoursePractice.tsx:90` derives the breadcrumb from the current section. The check mock must show the current P chapter/semester (or explicitly label a separate target context); the return mock shows T. Do not replace the existing breadcrumb with the target and disguise the issued section.
2. Distinguish exhausted-P with fresh-T fallback from exhausted-T/no issuance. The former continues enabled target practice with the approved explanation; only the latter disables Start/autostart and asks for teacher help. For the disabled state use wording such as `새 문제를 준비하지 못했어요. 선생님에게 알려 주세요.` rather than implying P shortage alone locks learning. Include the deferred-return daily-budget message too.
3. State the evidence counting unit: the optional teacher line's `직접 틀린 것이 둘` can mean two questions. Use completed first-pass session language, such as `최근 완료한 두 학습 묶음에서 직접 오답이 확인됐어요`, with the actual section evidence/counts and partial scope available. Never infer a whole-unit failure or combine students.
4. Make related-unit navigation visibly actionable, with keyboard focus and appropriate disclosure semantics. Unit expansion should expose `aria-expanded`; relationship entries must navigate to the indicated unit even when the current filter would hide it. Verify a safe filter-reset/navigation behavior. Keep M3 automatic supply unavailable, middle placement proposed, and high-school domains explicitly editorial.

These refine the already approved v03 states; they do not authorize a new menu, independent player, broader supply scope, student-chosen assignment or new stored phase. After actual three-model agreement on W2, the four Hi-fi designs still require actual visual votes; this wire vote does not replace that gate.
