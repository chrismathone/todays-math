# Worksheet controls and saved actions — 2026-09-14

The print panel was compared directly with
`F:/Mathgen/src/components/print/PrintOptionsPanel.tsx`. Vertical spacing uses its
existing five preset values (4, 16, 32, 56, 88), with nearest-preset selection for
legacy settings. There is no manual numeric pixel input. Color choices use an
equal three-column grid; layout and spacing options share consistent widths.
Legacy saved values are not rewritten merely by opening the panel.

Screen previews place pages horizontally and expose previous/next, page count,
keyboard navigation and native scrolling. Print media retains vertical A4 page
order and unscaled dimensions. Entering print media no longer replaces measured
pages with zero-sized results from a hidden measurement host. The explicit
previous-review action opens Studio's OCR/digital review without clearing crops.

Saved worksheet cards support inline name changes, editing and deletion. Mutations
persist atomically, protect unsaved active changes, and handle storage failures
and cross-tab conflicts. Empty export actions navigate to the bank, open the real
source picker, or restore a saved draft/open a draft JSON picker as appropriate.

The ported FigureEditor supports Shift during line/arrow creation and endpoint
editing: horizontal, vertical and 45-degree directions. Pressing/releasing Shift
without another pointer move updates the preview correctly, including rotated
lines, and a gesture remains one undo operation.

Validation after integration:

- Seven Vitest suites, **36 tests passed**: draft persistence/conflicts, clicked
  workspace actions, print controls, editor integration and SVG documents.
- Real Chromium in the isolated harness: **10 tests passed** for all eight snap
  directions, rotated endpoints, undo, desktop/mobile controls, page navigation,
  native scrolling, zoom, repagination and actual print-media A4 ordering.
- Actual Next dev with an isolated synthetic worksheet: rename, reload, edit and
  delete persisted; bank/import/restore empty buttons acted correctly. Returning
  from export opened the prior digital review with its crops. Color and spacing
  controls were visually inspected, widths match, and no manual px field remains.
  No user's saved workspace was changed during verification.

Related commands:

```text
npx playwright test --config e2e/worksheet-figure/playwright.config.ts
npx vitest run src/__tests__/components/PrintOptionsPanel.test.tsx src/__tests__/components/UnifiedWorkspace.actions.test.tsx src/__tests__/unit/draftStore.actions.test.ts src/__tests__/components/useWorkspaceDrafts.test.tsx src/__tests__/components/WorksheetEditor.progress.test.tsx src/__tests__/components/StudioFigureEditor.test.tsx src/__tests__/unit/studioFigureEditorDocument.test.ts
```
