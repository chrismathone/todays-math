# Studio AI workflow verification

The Studio now uses the shared `useDevAi` controller for explicit page recognition, single-crop OCR/rereading, and solution generation. Page recognition crops the rendered source canvas at the returned normalized coordinates; each crop retains its original PNG and defaults to image output. Existing overlapping crops are preserved when recognizing a page again.

The original workflow references were read without modifying `F:/Mathgen`: `Step1Upload.tsx`, `Step2OCRReview.tsx`, `Step3SolutionReview.tsx`, `usePageOcr.ts`, `useItemReocr.ts`, and `useSolutionGen.ts`. Import and manual crop remain browser operations; neither importing nor changing review steps starts an AI request. The explicit OCR → edit/review → solution sequence replaces the original wizard's automatic dispatch so paid actions remain deliberate.

## Behavior and ownership

- Page recognition is in the source toolbar. Multi-page sources enqueue all pages with two concurrent slots; page navigation keeps this work running. **AI 연결** also offers a current-page rerun. See [current queue verification](../studio-page-queue.md).
- Pending OCR and pending solutions run in separate sequential queues. Batch controls appear only when that action has more than one pending crop. Progress, cancellation, error detail and retry are visible; retry resumes the failed remainder and never repeats completed items automatically.
- Crop responses apply only to the same crop, source, page, image, grade, content, answer, solution, output mode, added state and edit revision. An edit followed by restoring the old text still changes the revision and protects the user's work.
- Reset acceptance, explicit global cancel and unmount abort page recognition and queued jobs. Import/source/page changes, crop deletion/selection changes, worksheet adding and view deactivation cancel only the crop-edit request owner; background pages keep their captured source. Late crop responses cannot overwrite new edits. Cancelling the **새로 시작** dialog leaves requests intact; accepting preserves the worksheet already managed by the parent.
- OCR leaves image output selected and clears an obsolete solution when rereading succeeds. The reread action explains this in its title. Text output is explicit and reminds users to verify diagrams and choices; original pixels remain available in the crop preview.
- Fraction conversion uses the existing presentation helper. Editable text, stored crops and API inputs retain source fractions; elementary previews show mixed fractions and middle/high previews retain improper fractions.

## Repeatable checks

Run from the repository root:

```sh
npx vitest run src/__tests__/components/useStudioAi.test.tsx src/__tests__/components/StudioView.ai.test.tsx
npx playwright test --config e2e/studio-ai/playwright.config.ts
npx eslint src/components/unified/StudioView.tsx src/components/unified/studioHelpers.ts src/components/unified/studioAiHelpers.ts src/components/unified/useStudioAi.ts src/__tests__/components/useStudioAi.test.tsx src/__tests__/components/StudioView.ai.test.tsx e2e/studio-ai
npx tsc --noEmit --incremental false
```

Verified on 2026-09-14:

- **21 hook/component tests passed:** Strict Mode/no automatic calls, raw fractions, image retention, corrected solution inputs, edit/revert races, sequential dispatch, cancellation, source/page/view fencing, removal, failed-remainder retry, provider gating, page crop geometry/duplicate suppression, visible controls, keyboard crops, restart cancel/accept and worksheet preservation.
- **3 Chromium browser tests passed:** real PNG file import at 512 × 768 pixels and source-change fencing; page recognition producing a 1008 × 232 crop from a 1200 × 1600 canvas, editable content, solution error/retry, worksheet images and restart; 390 × 844 mobile keyboard/OCR/fraction preview, panel/focus controls, 44px height / 8px radius / 14px font, label fit and no horizontal document overflow. Desktop viewport was 1440 × 1000. No browser page errors were observed.
- Targeted ESLint and TypeScript checks passed.

`e2e/studio-ai/` is a reusable isolated fixture, not a product route. Playwright starts and stops a Vite server on `127.0.0.1:4187`, loads the real Studio and shared controller, and intercepts GET/POST `/api/dev/unified/ai`. It never starts or stops the root Next server, loads database data, or calls a real model. Screenshots and failure traces go to ignored `test-results/studio-ai-browser/`.

## Integration limits

The coordinator owns the shared context wrapper, status sidebar, request contract, backend route, real subscription-model smoke and full Next build. Those files were not edited here. This isolated browser fixture does not cover root navigation/Ctrl-K/sidebar geometry or PDF worker delivery; the existing PDF render/import implementation is unchanged. Model-provided boxes/content still require visual review, and images intentionally remain the default worksheet output so OCR cannot silently discard figures.
