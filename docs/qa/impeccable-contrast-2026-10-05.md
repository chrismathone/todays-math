# Impeccable A1/A3/A4/A5/A6 repair evidence

The assigned contrast and learner-name repairs pass targeted verification. Source base: `b0901f34a8eb2facd895401f258cf84a9c61b0da`; branch: `BIGSHOL/impeccable-contrast`. The original audit was read from `C:/Creative/testautocreator/docs/qa/impeccable-audit-2026-10-05.md`.

Supplementary English text and the concept “none” state now use the existing muted text color, `#596c86`. Lab instructions use the same palette token. The SRS filter uses local `#52637b` to remain readable on its darker hover surface. Both learner selects have the permanent accessible name “학습자”; the existing desktop labels and mobile layout remain intact. Icons, borders, shape colors, native disabled behavior, font sizes, and layout rules were retained. The selected cube lesson's subtitle uses white, and its number badge uses the existing dark cobalt token.

## Contrast measurements

Ratios use WCAG relative luminance and the rendered background, with a 4.5:1 threshold for these small text samples. Old foreground colors were checked in the original source and audit; the six lab instruction pairs were also captured in the browser before edits. Workspace measurements use representative DOM with the actual module CSS and the **compiled application layout stylesheet**, including Tailwind's reset. The backgrounds in this table were retained by the repair.

| Area / text | Old foreground | Rendered background | Old ratio | New foreground | New ratio |
|---|---|---|---:|---|---:|
| A1 mobile navigation, unselected | `#73849e` | `#ffffff` | 3.802 | `#596c86` | 5.365 |
| A3 English supplementary heading | `#8194b1` | `#ffffff` | 3.086 | `#596c86` | 5.365 |
| A3 English description | `#8793a7` | `#ffffff` | 3.106 | `#596c86` | 5.365 |
| A3 English footnote / step caption | `#8c98ab` | `#ffffff` | 2.919 | `#596c86` | 5.365 |
| A3 English set metadata | `#91a0b5` | `#ffffff` | 2.658 | `#596c86` | 5.365 |
| A3 English count caption | `#71829c` | `#ffffff` | 3.907 | `#596c86` | 5.365 |
| A3 English beneath-button instruction | `#98a4b6` | `#ffffff` | 2.524 | `#596c86` | 5.365 |
| A3 English quiet action text | `#667d9e` | `#ffffff` | 4.207 | `#596c86` | 5.365 |
| A3 English step number | `#8fa0b8` | `#edf2f9` | 2.367 | `#596c86` | 4.770 |
| A3 English section number | `#6e87b0` | `#eef3fd` | 3.279 | `#596c86` | 4.822 |
| A3 English review status | `#6b7a90` | `#eef1f5` | 3.85 | `#596c86` | 4.736 |
| A3 English library metadata | `#99a5b6` | `#ffffff` | 2.49 | `#596c86` | 5.365 |
| A4 concept “none” status and legend | `#6b7a90` | `#eef1f5` | 3.85 | `#596c86` | 4.736 |
| A5 cube lesson supplementary heading | `#677c96` | `#f4f6fa` | 3.961 | `#596c86` | 4.959 |
| A5 cube lesson goal | `#69788e` | `#f4f6fa` | 4.149 | `#596c86` | 4.959 |
| A5 keyboard instruction | `#75849b` | `#f2f6fc` | 3.501 | `#596c86` | 4.947 |
| A5 enabled hint button | `#627593` | `#f5f7fc` | 4.368 | `#596c86` | 5.006 |
| A5 cube footer instruction | `#75839a` | `#f4f6fa` | 3.549 | `#596c86` | 4.959 |
| A5 cube mobile position instruction | `#7a879c` | `#f4f6fa` | 3.362 | `#596c86` | 4.959 |
| A5 unselected SRS filter, hovered | `#596c86` | `#e1e9ff` | 4.420 | `#52637b` | 5.045 |
| Selected cube lesson subtitle | `#d2e0ff` | cobalt gradient, brightest stop `#3a70e3` | 3.440 | `#ffffff` | 4.558 minimum |

The selected cube number was white over a translucent white badge on the cobalt gradient (3.633 minimum, calculated after compositing the original `#ffffff22`). It is now white on the existing `#2448bd` token, measured at 7.673:1. The gradient's channels increase between its two stops, so the brightest stop gives the minimum text contrast.

Unchanged selected mobile Workroom text measures 5.214:1 on `#eef3ff`. English library metadata on hover measures 5.097:1 on `#f7f9ff`. SRS selected filters measure 12.588:1 normally and 11.618:1 while hovered. CSS transitions are allowed to finish before state measurements.

## Verification

- Real local Next.js 16.3.0 lab pages: `/lab/math-srs`, `/lab/math-srs/algebra`, `/lab/cube-3-1`, each at 1440, 390, and 320px. Nine page states had zero document overflow before and after the repair.
- Final Playwright run: **92 contrast samples, zero contrast failures; six enabled learner select checks, zero axe `select-name` violations; zero interaction failures**. Desktop labels remain `display:block`; mobile labels remain `display:none` while both controls retain their accessible name and can receive focus.
- Filter selection updates `aria-pressed`; cube hints expand and switching to the second activity updates `aria-current`. Existing component tests also verify learner switching and course/review interactions.
- The two new semantic naming tests failed against the original components when their visual label was hidden. They passed after the repair and assert that selecting a learner still updates persisted browser state.
- Six focused suites passed **39 tests**: `MathSrsLearnerName`, `MathSrsApp`, `ElementaryCourseApp`, `CubeUnitLab`, `CubeUnitLabKeyboard`, and `LearningActivity`. The final naming-test rerun passed both tests.
- Focused ESLint passed for both edited TSX components, the naming tests, and the browser QA script. `git diff --check` passed.
- Browser screenshots of the real 390px course page and 1440px cube page were visually inspected; both had meaningful content and no Next error overlay.

Reproduce with an isolated local server (no dependency installation or Prisma generation):

```powershell
$env:AUTH_SECRET='local-contrast-qa-only'
node node_modules/next/dist/bin/next dev --webpack --port 3112 --hostname 127.0.0.1
# In another terminal:
node scripts/qa/impeccable-contrast.mjs --output contrast-evidence.json
node node_modules/vitest/vitest.mjs run src/__tests__/components/MathSrsLearnerName.test.tsx src/__tests__/components/MathSrsApp.test.tsx src/__tests__/components/ElementaryCourseApp.test.tsx src/__tests__/components/CubeUnitLab.test.tsx src/__tests__/components/CubeUnitLabKeyboard.test.tsx src/__tests__/components/LearningActivity.test.tsx --maxWorkers 1
node node_modules/eslint/bin/eslint.js src/components/math-srs/ElementaryCourseApp.tsx src/components/math-srs/MathSrsApp.tsx src/__tests__/components/MathSrsLearnerName.test.tsx scripts/qa/impeccable-contrast.mjs
```

The final sanitized browser measurements are preserved in [the evidence JSON](./impeccable-contrast-2026-10-05.evidence.json). The QA script rejects non-local server URLs and blocks browser requests except GET/HEAD/OPTIONS; it makes no application API writes. Profile/hint interactions and test fixtures are confined to isolated browser/test storage.

## Limits

Workroom/English/Concept browser evidence uses the real CSS on representative DOM, not authenticated production page flows. Their overflow or data-dependent interaction behavior is not independently certified by this fixture. The real lab pages and targeted active states were verified, including desktop/mobile learner naming; physical touch, screen-reader speech, and 200% zoom were not tested. This is a focused repair check, not a service-wide accessibility certification.

An earlier development-server request returned a transient 500 with `Unexpected end of JSON input`; its cause was not established. Subsequent requests and the complete final browser run succeeded, and the final inspected pages had no error overlay.

No database writes, source-data files, production actions, dependency installation, Prisma generation, push, or merge were performed. Full TypeScript validation is left to the coordinator's integration branch as requested. The only source changes are the eight assigned files; additional files are focused naming tests, a read-only browser QA script, and this evidence report.
