# 교재 과제 · 오답 — UI composition

2026-10-23. This is the UI worker's design/verification record, not a production catalog claim.

## Wire

The existing authenticated `TeachingView` owns the page heading, padding, and teaching permission. Its third tab opens the commercial-workbook workspace. The child starts at h2, keeps its mounted drafts when switching teaching tabs, and introduces no global grant or student route.

1. **교재 정답** — search and grade filter → exact-edition rows with registered, verified and missing answer counts → selected edition/address list → explicit assignment action. Inline import has identity/provenance fields, CSV/TSV text or file input, validation review, then explicit save.
2. **과제 · 채점** — saved assignment list → selected assignment and explicit student → per-item correct/wrong/unattempted marks; untouched marks stay unreviewed. A save summary distinguishes pending changes, in-flight requests, saved state and conflicts. Changing student retains the draft keyed to that student.
3. **저장한 오답** — saved note list/filter → explicit selection → correction memo and todo/done → authorized print plan. The print surface identifies student, title, exact edition and page/question. It says reference-only, leaves writing space, and excludes answers by default.

## Hi-fi decisions

- Reuse `--learn-*`, shared type sizes, 44px native controls, a visible accent focus ring and semantic state text. No decorative KPI cards, covers, fake catalog counts or copied competitor assets.
- Catalog and assignment list/detail use `minmax(240px,.75fr) minmax(0,1.5fr)`; at 860px available width they stack. Filters and forms collapse at 480px. The document itself never scrolls horizontally; only labeled data/print preview regions may.
- Local switches are named `aria-pressed` button groups. Existing teaching tabs retain arrow/Home/End navigation.
- Production defaults to HTTP. The authored local source is injected explicitly and its mode is visibly labeled; it never falls back from a failed production request.
- Import changes invalidate prior validation. Save errors retain fields. Grading and notes retain drafts on failures; conflicts require reading the latest revision before retrying.
- Reference print uses the existing A4 boundary/paper tokens and dedicated reference content, never fabricated `Problem` rows. Its output is independent of student SRS and existing test graders.

## Verification scope

Completed locally, with the actual in-memory source provided by the backend worker:

- `CommercialWorkbookWorkspace.test.tsx`: **8 passed**. Actual catalog coverage/search retention; duplicate import rejection and explicit review; exact recipients/items/due date; partial mark persistence with ungraded items; stale mark comparison and explicit retry; memo/done reload with original wrong event unchanged; default student print omits answers and private correction memo; answer-source page survives revision serialization.
- Existing `TeachingView.test.tsx` and `TeachingMainScreen.test.tsx`: **27 passed** alongside the first seven new tests (34 total at that checkpoint); the eighth source-page test then passed in the final focused run.
- ESLint on all owned components, the new test and TeachingView: no diagnostics. `git diff --check`: clean. React quality skill reviewed; direct imports, scoped client sources, retained hidden views, stale read guards, native labels and explicit pressed state are used.
- Full `npm run type-check` was run. No owned component/test diagnostics remain. It still reports pre-existing dependency identity conflicts in `scripts/qa/arithmetic-angle-presentation-verify.ts:36` (two Playwright installations) and `scripts/qa/paperProbe.tsx:174` (two PostCSS installations, TS2769/TS2321). Exact diagnostic log: `/Volumes/TodayWork/today_/commercial-workbook-ui-typecheck.log`. The coordinator owns the shared dependency context.

Coordinator owns integrated browser checks at 390/1280, actual A4 output, full verification, and production readiness. This worker did not claim browser/visual or live-account verification. No live data writes, schema generation, deployment or push were performed.

## Integration and output boundaries

- Entry: `TeachingView` third tab, `teachingTab=workbooks`, existing authenticated teaching panel. The HTTP source receives the current `ownerId`; account remount clears private component state.
- Parent development route imports default `CommercialWorkbookDemo`. The demo uses `createLocalCommercialWorkbookSource()`, includes its own authored roster, and distinguishes remount/re-read of the same memory store from browser reload/reset. No production fallback or environment bypass exists in these components.
- Backend contract/source files were copied read-only into this checkout for compilation and tests and are deliberately excluded from the UI commit. Parent merges the backend track before verification.
- Print uses `A4Page`, paper tokens and `PaperStrip`, one reference item per A4 with 125mm writing space and a reflection area. It re-resolves selected saved note IDs and authorization immediately before `window.print()`, then uses a dedicated body portal so the teacher shell does not print. Answers require explicit teacher opt-in and carry their reviewed/unreviewed label; correction memos never print implicitly. Labels that exceed physical A4 bounds block output with a clear message rather than clipping; automatic continuation of exceptionally long metadata/answers is not claimed.
- The strict CSV/TSV parser owns validation. UI preserves `key.sourcePage`, requires exact edition via the shared schema, and labels missing/unreviewed/reviewed keys separately. Catalog content is only what the source returns; no commercial publisher pack is bundled by this UI worker.
