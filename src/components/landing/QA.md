# Public landing — design and QA record

Reviewed 2026-09-14 against workroom base `37f07c57`.

## Delivered surface

`LandingPage.tsx` exports a default server component with scoped styling in `LandingPage.module.css`. It includes the existing TodayMathMark, a Korean editorial hero, a three-step illustrated preparation story, a navy workroom section, native FAQ disclosures, signup/login links, and section anchors. `LandingIllustrations.tsx` contains original JSX/SVG worksheet and geometry illustrations; these are examples rather than claimed screenshots of the application.

The composition uses the agreed navy, cobalt, paper, butter, and mint palette, the existing Pretendard font, and occasional Noto Serif KR in the math artwork. Illustrative decorations do not have hover/click affordances. No testimonials, adoption statistics, free-plan claims, OAuth choices, or invented legal links were added.

Supported capability copy is limited to PDF/image import, selecting problem areas, recognition and review, editing supported figures, choosing question-bank material, composing worksheets, and exporting them. FAQ copy explicitly asks teachers to review recognition results and qualifies figure editing as available for editable figures.

## Reference research

Official pages were opened and their desktop screenshots inspected. The following are design interpretations, not claims about feature parity:

- [Mathflat](https://www.mathflat.com/): a prominent teacher outcome, confident Korean typography, and a substantial teaching scene make the purpose legible immediately. Applied the benefit-first hierarchy and substantial hero artwork. Did not reproduce its copy, imagery, testimonials, rankings, or pricing claims.
- [Mathpix Snipping Tool](https://mathpix.com/snipping-tool): putting conversion output next to the introductory action and explaining a short ordered workflow makes a technical operation concrete. Applied the input → review → worksheet visual narrative using original example equations and page fragments.
- [Brisk Teaching](https://www.briskteaching.com/): oversized editorial typography, an asymmetric colored visual region, and an action demonstration keep the teacher's workflow central. Applied the asymmetric composition and room for an optional controlled math video, with the page's own warm-paper art direction.

Reference screenshots inspected: `C:/Creative/testautocreator/.qa-artifacts/entry-references/{mathflat,mathpix,brisk}.png`.

## Integration contract

```tsx
import LandingPage from "@/components/landing/LandingPage";

// Default generated hero; root owns anonymous/authenticated routing.
return <LandingPage />;

// Optional coordinator-owned motion component, with playback controls.
return <LandingPage mathMotion={<MathMotion />} />;

// Original code-native fallback, useful without the generated asset.
return <LandingPage heroImageSrc={null} />;
```

- The default image is `/brand/workroom-hero.webp`, produced and committed separately by the coordinator in `9037f31b`. It is rendered by Next Image with a stable aspect-ratio frame, responsive sizes, eager loading, and high fetch priority. No deprecated `priority` property is used.
- `mathMotion?: ReactNode` replaces the geometry-note illustration inside the navy workroom section. The media owner should provide responsive width, a poster, user-initiated playback, and controls. The landing does not start motion or add any animation library.
- Login and signup destinations are `/login?callbackUrl=%2F` and `/signup?callbackUrl=%2F`. The root route chooses the signed-in workspace destination. No app routes, auth files, workspace files, proxy files, or shared global styles are part of this change.
- No custom client component, event handler, browser storage, API request, paid AI request, or auth submission is needed by the landing. Links use Next Link; disclosures work natively with JavaScript disabled.

Read before implementation: the installed Next 16.3 guides for Server/Client Components, CSS Modules, images, linking/navigation, and Image API deprecations; React best-practices guidance for server boundaries and avoiding barrel imports.

## Validation performed

An ignored `.tmp-landing-qa` Next 16.3 app imported the real landing sources, existing global stylesheet, and existing local fonts. Its public directory read the coordinator's public assets. It ran on an isolated port 3217 with webpack; Playwright launched a separate headless Chrome context without touching a user browser or drafts. This tests the actual Next render and CSS handling while leaving production routes under the coordinator's ownership.

| Viewport   | Horizontal document/content overflow | Hero image | Runtime errors | Keyboard/anchors | Reduced motion |
| ---------- | ------------------------------------ | ---------- | -------------- | ---------------- | -------------- |
| 1440 × 960 | None                                 | Loaded     | None           | Pass             | Pass           |
| 1024 × 960 | None                                 | Loaded     | None           | Pass             | Pass           |
| 390 × 960  | None                                 | Loaded     | None           | Pass             | Pass           |
| 320 × 960  | None                                 | Loaded     | None           | Pass             | Pass           |

Checks at every viewport:

- Exactly one `h1`; every section anchor resolves to an existing target; all non-anchor links have the expected home/login/signup destinations.
- First Tab reveals the skip link with a visible outline, and Enter focuses the main content.
- FAQ summaries toggle with Enter and Space, preserving native disclosure behavior.
- The hero's “어떻게 만드나요?” link navigates to the workflow section with its heading in view.
- `prefers-reduced-motion: reduce` yields `transition-duration: 0s` and `animation-name: none` on the primary action. There is no automatic landing motion.
- All hero image requests complete successfully and the local fonts finish loading before screenshots/measurements.

Additional checks: native FAQ works with JavaScript disabled; original image-free fallback renders without horizontal overflow at 1440 and 320; full-page captures and mobile hero/workroom crops were visually reviewed. A 2px overflow from the decorative star at 1024 was reproduced after font loading and fixed by moving the star inside its note's edge.

Commands passed:

```text
npx prettier --check src/components/landing/LandingPage.tsx src/components/landing/LandingIllustrations.tsx src/components/landing/LandingPage.module.css
npx eslint src/components/landing/LandingPage.tsx src/components/landing/LandingIllustrations.tsx
npx tsc --project .tmp-landing-qa/tsconfig.json --strict --noEmit
node .tmp-landing-qa/verify.mjs
git diff --check
```

The first browser invocation hit the cold harness compilation timeout; the rerun used a 180-second initial navigation allowance and completed successfully. The TypeScript check covers this isolated component integration, not the entire application. Real account creation, signed-in routing, and optional Blender playback are coordinator integration checks.

## Local evidence

In this worktree's ignored `.qa-artifacts/landing/` directory:

- `results.json`: viewport measurements, exact link targets, and interaction results.
- `landing-{1440,1024,390,320}.png`: full-page captures with the generated hero.
- `hero-{1440,390,320}.png`, `workflow-390.png`, `workroom-390.png`: readable viewport captures.
- `landing-fallback-{1440,320}.png`: code-native hero fallback captures.

Screenshots are review artifacts, not shipped application assets. The coordinator received their absolute paths before completion.
