# Auth workroom QA — 2026-09-14

Login and signup now use a warm paper layout, a cobalt editorial panel with original inline worksheet geometry, and a quiet form. The artwork is server rendered, decorative, and requires no image download or animation; all styles live in `auth.module.css`. The shared auth layout still accepts onboarding content without the auth illustration or form wrapper.

Design references: the [official Mathflat teacher login](https://teacher.mathflat.com/login?fr=hp_login) informed the clear separation of account entry from the product story. The coordinator's official Mathflat and Mathpix homepage captures were reviewed for Korean heading hierarchy and mathematical product imagery; the composition here is original. No peer trial, OAuth, password-reset, or legal claims were adopted.

## Behavior

- Existing Credentials sign-in and `/api/auth/signup` contracts are preserved. Validation remains a dynamic import inside the error boundary.
- Both modes normalize their callback, default to `/`, preserve query/hash through the login/signup links, and pass the safe destination to Auth.js. Signup no longer forces onboarding.
- A synchronous ref blocks duplicate submissions before the first asynchronous import. Pending fields are read-only, the submit button announces progress, and the lock stays held during successful navigation.
- A confirmed signup response records account creation before automatic sign-in. Any subsequent error leaves a visible confirmation and a **다시 로그인** button; retries only call sign-in. Email stays read-only and the password uses current-password autofill in this phase.
- Validation errors are associated with inputs and focus the first invalid field. Credentials, network, malformed server responses, and module-load failures produce form alerts.
- Password visibility has a labeled, keyboard-operable non-submit button. Inputs have explicit labels and autofill attributes. Forms use POST and render their submit button disabled until hydration. The server layout provides a visible no-JavaScript notice outside the streaming page boundary.
- Existing sessions leave either auth page: reviewers go to `/review`, directors to the normalized callback. This depends on the coordinator's strengthened `normalizeCallbackUrl` rejecting auth/API loop destinations during integration; that shared helper is intentionally outside this branch's ownership.

## Checks

| Check                                                                                                            | Result                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npx vitest run src/__tests__/components/LoginForm.test.tsx`                                                     | 31 passed                                                                                                 |
| `npx vitest run src/__tests__/components/AuthPages.test.tsx src/__tests__/components/AuthImportFailure.test.tsx` | 9 passed                                                                                                  |
| `npm run type-check`                                                                                             | Passed after generating the fresh worktree's local Prisma client                                          |
| Scoped ESLint on auth components, routes, and three auth test files                                              | Passed                                                                                                    |
| Desktop 1440 × 1000, mobile 390 × 844 and 320 × 640, short 844 × 390                                             | Login and signup visually inspected; no horizontal overflow                                               |
| Chromium intercepted signup/retry                                                                                | Exactly 1 signup POST and 2 Credentials POSTs; confirmed signup survives network and credentials failures |
| Chromium keyboard                                                                                                | Email → password → visibility button order; Space toggles password; focus outline is solid 3px            |
| Chromium with JavaScript disabled                                                                                | Enable-JavaScript notice visibly rendered; form method POST and submit disabled                           |
| Browser error capture                                                                                            | No uncaught page errors                                                                                   |

The local preview used a task-only Auth.js secret and a deliberately unreachable loopback database URL. Browser API requests were intercepted; Vitest uses repository MSW handlers and the Prisma test double. No real account, production database, AI service, or paid endpoint was accessed. Successful destination navigation is covered by component/router mocks and server-page redirect tests; the coordinator owns the final integrated workroom navigation and production build.

Local visual evidence is in `.qa-artifacts/auth/`: `login-desktop.png`, `signup-desktop.png`, both `*-390.png` and `*-320.png`, both `*-short.png`, `signup-pending-390.png`, `signup-retry-390.png`, `login-focus-390.png`, `nojs.png`, and `browser-flow.json`. The accompanying local `capture.mjs` and `flow.mjs` reproduce the viewport and intercepted browser checks against port 3104. Copy these ignored artifacts before removing the worktree.
