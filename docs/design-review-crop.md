# Studio crop and review design audit

Reviewed 2026-09-13. Scope: the selected workroom at `http://127.0.0.1:3000/dev/unified`, specifically upload, sample/image/PDF cropping, review, and output actions. Only `StudioView.tsx`, `StudioView.module.css`, and this report are changed.

## Evidence boundary

- Browser: fresh, isolated Playwright Chromium contexts, with no existing profile or authentication. All non-GET/HEAD `/api/` requests were blocked. Local draft storage was exercised only inside those disposable contexts.
- The existing root dev server serves main, not this worktree. Initial screenshots predate the coordinator's shared-shell update; later runs include `934d8c35` and subsequent main changes.
- **Baseline** means the actual served component. **Local CSS preview** means its StudioView CSS rules were removed through CSSOM and replaced in that isolated page with this worktree's complete stylesheet, mapped to the existing CSS-module class prefix. No server/source files were changed for this preview.
- TypeScript behavior changes in this commit are linted and type-checked, but require the coordinator's browser verification after merge. Browser tests of raw text, output, pointer selection, and storage exercise the served component with the local stylesheet preview; these behaviors were not edited.
- Read the repository AGENTS instructions and installed Next 16.3 CSS Modules, Server/Client Components, and accessibility guides. Used the existing `.qa-artifacts/workroom-hifi/editor.cjs` and `fractions.cjs` as behavioral references.

## Findings and fixes

| Severity | Reproduction and observed defect                                                                                                                                                                                                           | Change and verification                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | At 1050×768, open sample, select an area, then open **세부 좌표**. The old absolute coordinate panel extends behind the two-row sticky action bar; its number fields are covered. Tablet and mobile share the same competing height rules. | Coordinates occupy a dedicated row on wider canvases. Stacked canvas height reserves room for the footer; on narrow canvases the explicitly opened coordinate panel is bounded within that reserved canvas. The four field bottoms are above the action bar at all seven tested widths.                                                                                                               |
| P1       | At 360×740 the old page-tools row has `scrollWidth 321` inside a `clientWidth 306` box. The final control protrudes and the page count wraps. A long filename with a 12-page PDF makes the constrained toolbar harder to use.              | Canvas container queries replace repeated viewport overrides. Narrow canvases place filename and **영역 지정** on the first row, and previous/page/next/zoom on the second row. Counts do not wrap, controls retain 44px height, and the final long-filename PDF preview has no Studio or toolbar horizontal overflow.                                                                                |
| P2       | At 1100×768 the baseline keeps a 528px canvas toolbar on one line, squeezing the filename to about 148px; at 1051px it shrinks to approximately 100px. The 1050px viewport rule then abruptly changes to a tall stacked editor.            | Toolbar wrapping follows the canvas's actual width, including inspector/sidebar collapse. The inspector stacks when the Studio container is ≤800px. The 1100px preview has a full-width filename row with page tools below; 1050px fields remain clear of actions. No sample-toolbar clipping was observed at exactly 1100px; that case is recorded as a constrained layout, not an invented failure. |
| P2       | Enter focus mode, focus a coordinate field, then press Escape. The baseline exits but leaves focus on that field. Its `aria-modal` declaration also leaves background controls available to non-Tab navigation.                            | Focus mode focuses/restores its trigger, temporarily makes background sibling branches inert, restores their previous state, and locks/restores body scrolling. The existing Tab wrap is retained; the hidden file input is removed from sequential tab order. Behavior changes require merged browser validation.                                                                                    |
| P2       | In review mode, click the enabled **영역 지정** page tool. The baseline sets a selection while the surface is absent, leaving review visible and keyboard focus without a crop surface.                                                    | The tool explicitly returns to crop mode and focuses the mounted surface on the next animation frame. Pending merged verification.                                                                                                                                                                                                                                                                    |
| P2       | At short upload heights, the sticky footer overlays explanatory text near the bottom of the upload/inspector area.                                                                                                                         | The upload footer remains in document flow; editing retains the responsive sticky action bar. This removes the unnecessary upload overlay.                                                                                                                                                                                                                                                            |
| P3       | Native filename select text and the source-return link are truncated without an explicit full-name hover hint.                                                                                                                             | Both receive a title containing the full original filename (and page for the source link). Selection values and source identity are unchanged.                                                                                                                                                                                                                                                        |
| P3       | The previous editor stylesheet appended repeated desktop, medium, mobile, and button overrides. Some controls also used stretched widths or duplicate font overrides.                                                                      | Consolidated the editing rules, retained navy/cobalt values and 12/14/18/24 roles, kept 44px action heights / 8px radii / 14px 600-weight buttons, and removed the arbitrary 210px upload-action minimum. Existing list/segmented selection structures remain.                                                                                                                                        |

No fraction conversion, raw content persistence, API, shared header, draft schema, or source rendering implementation was changed.

## Browser checks

Upload screenshots and crop/review screenshots were captured at desktop 1440×900, short desktop 1366×768, tablet 820×900, mobile 390×844, and narrow mobile 360×740. Additional crop/coordinate checks cover 1100×768 and 1050×768. Initial exploratory checks also covered 1051px and 1440×600.

Final local CSS coordinate measurements, with the sidebar expanded:

| Viewport | Crop viewport height with coordinates open | Studio / toolbar horizontal overflow | Coordinate fields above actions |
| -------- | -----------------------------------------: | ------------------------------------ | ------------------------------- |
| 1440×900 |                                      548px | None                                 | All four                        |
| 1366×768 |                                      416px | None                                 | All four                        |
| 1100×768 |                                      364px | None                                 | All four                        |
| 1050×768 |                                      356px | None                                 | All four                        |
| 820×900  |                                      376px | None                                 | All four                        |
| 390×844  |                                      287px | None                                 | All four                        |
| 360×740  |                                      183px | None                                 | All four                        |

The narrow coordinate editor temporarily overlays the document when explicitly expanded. Closing it restores the full available crop viewport; its fields remain usable without crossing the footer. Both the document and stacked review panel remain independently scrollable.

Passed actual browser flows:

- Upload state at all five requested viewports: no document horizontal overflow.
- Sample opening; keyboard area creation; Shift+Arrow and Arrow movement; Enter saves a crop.
- Sidebar collapse increases document width; inspector collapse increases it again; “전체 보기” fits the document within the viewport.
- Focus-mode entry, existing forward/backward Tab wrapping, and Escape exit.
- Text review and image/text output choice; keyboard focus scrolls the review fields into view.
- Elementary `$\\frac{9}{4} + 1$` displays the mixed fraction while the saved problem retains the original raw string.
- Editing the existing crop to `$\\frac{17}{4}$` updates the same saved problem instead of duplicating it; switching to secondary retains the improper-fraction display. Save/reload restores the output.
- Real CDP touch-start/move/end events create a crop; the cropped image reaches the export preview.
- Actual repository PDF `docs/planning/tracks/reports/adv-print/05-continuation-ok.pdf` imports and renders.
- A disposable, locally generated 12-page PDF imports under a long Korean filename. Select page 12, verify Next disabled, move Previous to page 11, then crop and export the PDF image.
- PNG image import and unsupported `.txt` error recovery preserve the active source.
- Zero page errors in the completed verification runs; no real DB writes or authentication actions.

## Checks and artifacts

- `node node_modules/eslint/bin/eslint.js src/components/unified/StudioView.tsx` — passed.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — passed.
- Prettier formatting and `git diff --check` — passed.
- No install, second dev server, Prisma command, or build was run. `node_modules` is a junction to the authorized root installation.
- Untracked QA evidence is in this worktree's `.qa-artifacts/crop-review/`: `verification.json`, `pdf-image-qa.json`, `verify.cjs`, `pdf-image.cjs`, baseline upload/crop/PDF PNGs, and `final-css-*` screenshots. Copy any desired screenshots before removing the worktree; this committed report carries the durable findings and measured results.
- Two exploratory persistent-REPL sequences timed out without a durable result; completed standalone scripts replaced them. The PDF script's first invalid-file assertion matched both the Studio alert and Next route announcer; scoping it to Studio corrected the test, which then passed.

## Cross-shell dependencies and remaining validation

- Shared header geometry, sidebar placement/selection styling, and mobile shell are coordinator-owned. Their current desktop Studio origin remains x=260/y=68 at 1440px and 1366px; no shared header file was edited.
- The responsive mobile action offset still uses the shell's existing 77px bottom-navigation reservation. A future change to mobile navigation height should update this reservation together with the shell.
- The coordinator identified a native workspace-dialog interaction during review. Native `HTMLDialogElement` siblings are exempt from explicit inert state, and Studio Escape ignores an open native dialog. The optional `active?: boolean` StudioView prop defaults to `true` for legacy callers and clears focus mode when the workspace keeps Studio mounted but switches away. The coordinator must pass `active={view === "studio"}` from UnifiedWorkspace; this releases inert state/body scrolling for search actions, hash changes, and history navigation.
- **After merge:** verify focus trigger restoration, Ctrl+K search focus while Studio is expanded, Escape closing only search, a search action navigating away with all new-view controls usable, and **영역 지정** from review returning to a focused surface. These are the changed React behaviors that the root-only dev server cannot serve from this worker checkout.
- Mobile tests used Chromium with synthetic touch input, not physical iOS/Android keyboards or safe-area hardware. Native browser file-dialog chrome and protected/corrupt PDFs were not included; the real PDF, image, and invalid-type import paths were tested.
