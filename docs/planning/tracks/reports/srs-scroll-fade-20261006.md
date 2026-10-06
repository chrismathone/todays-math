# Mobile SRS continuous scroll affordance

2026-10-06 · task `task_8d88f58c81ef` · dispatch `ctx_a3846ed44ce9`

The mobile app keeps continuous scrolling inside `appBody`, hides that area's
scrollbar, and shows a 36px bottom fade only when more content remains below.
The fade is decorative, has no pointer events, and has no animation. The scroll
region is keyboard focusable and labelled. Mobile navigation stays outside the
scroll region in its existing grid row; sessions use the full app height.
Desktop scrollbars and the teacher workspace's scrolling retain their styles.

The coordinator explicitly approved bounding only the mobile student app to
`100dvh` and making its bottom tabs static. Preview height and local source
initialization are unchanged. Responsive rules use the existing `fading-app`
container so mobile preview works inside a wide teacher window.

`FadingScrollFade` measures downward overflow with a 1px tolerance, batches
measurements in animation frames, and observes viewport size, content size,
content replacement, text and attribute changes. Its cleanup releases observers,
listeners and pending frames. All styling is in component CSS modules.

Validation:

- 52 tests passed across `fadingScrollFade.test.tsx` and `fadingScreens.test.tsx`.
- TypeScript check, focused ESLint, affordance lint and `git diff --check` passed.
- Headless Chromium used the shared server at `http://localhost:4310`, with a
  temporary bundle of this worktree's components replacing the app in the browser
  and retaining the dev page's real local-source props. No root files, server,
  environment, dependency, database or contract changes were made for QA.
- At 320px and 390px: top/middle/bottom catalogue states and sessions passed;
  internal scrolling worked by ArrowDown; concept-start and next-step buttons
  remained reachable and clickable; horizontal overflow was zero.
- In the real teacher preview host at 1440px: the phone app measured 388px wide,
  used hidden internal scrollbars, and showed the fade at the app-body edge.
  Bottom, no-overflow, content replacement, content resize, host resize,
  reduced-motion and PC/mobile switching checks passed. PC preview preserved its
  scrollbar and had no visible fade. Browser errors and student API writes: zero.
- Visually inspected student 320px catalogue, student 390px session and wide
  teacher phone-preview screenshots. The fade is above the navigation and inside
  the content viewport.

Temporary evidence is in this worktree's `.qa-artifacts/scroll-fade/`:
`results.json`, screenshots, bundle and focused harness. This browser run verifies
the changed components through a temporary bundle; the coordinator still owns
verification of the merged Next.js app, full QA, pushing and worktree cleanup.
