# Independent adversarial review

2026-11-12 · Codex dispatched reviewer · base/HEAD `bd759237b84070b51fa444caf69e955bc574d026`.

**Result: zero actionable introduced findings remain in this working-tree follow-up.** This review covers the new Concept Blank preview-view synchronization only; it does not reopen the previously released Studio changes.

## State, rendering and print consistency

- `ConceptBlankView.tsx:131–135` defines the choices once. Both native button groups use that list and the same `printView`/`setPrintView` (`1092–1102`, `1487–1497`); each exposes its own group name and one pressed choice. The removed `paperView` has no remaining references.
- The existing top default `both` remains at `579–581`. Passing that same value to the real preview at `1501–1505` intentionally changes its initial display to student pages followed by key pages. `ConceptBlankPaper.tsx:48–76` already implements that ordering and is unchanged; the change does not alter question composition or pagination rules.
- The print link still derives its `view` from `printView` (`ConceptBlankView.tsx:1030–1033`). The unchanged authenticated print route parses that value and passes it to the same paper renderer. I inspected the URL and route wiring; I did not open the authenticated print route or invoke printing.
- View changes call only `setPrintView`, not a draft/document setter. `toSave` still derives only from `selection` (`948–951`), so no saved-document field or contract was added. H2 picker wiring, bank content, selection codec, persistence and server handlers are outside the diff and remain unchanged. Browser checks below confirmed that toggling did not rewrite the selected-question URL.

## Independent native-browser checks

Reused only page `723e7d45-7ef4-4457-8e49-bfff35b68e0e` on the supplied hermetic server. The existing auto-B one-question example initially rendered `student,key` with both groups pressed on 전체.

I exercised **12 transitions**: upper pointer clicks and lower native keyboard Space, each through 학생지 → 채점표 → 전체, at **1920×1080 and 320×740**. Every transition had:

- matching pressed choices in both groups;
- exactly the expected real `data-cb-part` sequence;
- the matching print-link `view` value and unchanged `blank` query;
- byte-identical rendered text for each retained student/key part compared with its initial 전체 version;
- no document horizontal overflow, with all three buttons contained by their groups.

Lower keyboard activation retained focus on the pressed button and showed a solid 3px accent outline. I separately used native Enter in the upper group and confirmed the same visible accent outline. The existing top controls remain 36px high and the embedded lower controls 44px; the upper sizing predates this diff. The new third lower button fits at 320px without hiding labels or displacing content beyond the document width.

[Independent states and native action trace](review-evidence/native-checks.json), [1920 capture](review-evidence/preview-1920-both-independent.png), [320 capture](review-evidence/preview-320-both-independent.png).

## Evidence audit

The owner's `browser-check.json` contains the claimed **24 transitions**: six at each of 1920, 1280, 390 and 320. I programmatically checked all recorded choice states, part order, print-view values, unchanged selection query and overflow flags; they are internally consistent. The lower keyboard cases record a solid accent outline, while pointer-operated upper cases correctly record no focus-visible outline. I visually inspected the supplied 1920/390 overall-preview captures and my 320 capture. My independent native run covers two widths rather than claiming to repeat all four.

The new `ConceptBlankView.paperView.test.tsx` imports the real view and renderer rather than mocking the preview, verifies both control origins, and checks actual part order, both groups, print URL and selection-query preservation. Its two RED results fail at the initial student-only assertion, consistent with the stated pre-change behavior; the RED log alone does not exercise later loop assertions. The saved related-test log reports **7 files / 152 tests passed**. Per the task instruction, that log was sufficient and I did not repeat tests without a concrete concern. Type/affordance/format checks remain the owner's recorded results; the ESLint artifact accurately reports zero errors and one unused-`docs` warning, not a warning-free run.

No evidence claim requiring a new actionable finding was established. The preview-default change is explicit in the request and report, rather than an accidental content regression.

## Limits and completion

- Reviewed the complete new tracked diff, new untracked test, README, browser JSON, representative captures, and current/base state/render/print code. Used the previously read AGENTS.md, DESIGN.md and menu-map rules; this follow-up adds only the documented view synchronization to that map.
- `git diff --check` passed. No new Vitest run, full suite, build, type check or dependency operation was performed by this reviewer.
- No authenticated save/load, DB/account operation, credentials inspection, physical print, production deployment, screen reader, second browser engine, real touch device, or broad multi-form pagination rerun. Existing paper and print tests plus unchanged renderer code support those boundaries; this is not an end-to-end production print certification.
- H2/persistence conclusions are based on unchanged wiring/contracts and stable selection state, not a new authenticated save-and-reopen test. The selected fixture was preserved and the browser returned to 1920×1080 with both groups on 전체.
- Wrote only this report and evidence in the authorized temporary review directory. Implementation, commits and remote branches were not changed by the reviewer.
