# Skeleton / loading audit

Date: 2026-09-14  
Base: `ab25e7ab` (`style(auth): remove colored left-edge notification accents`)  
Branch: `BIGSHOL/grok-skeleton-audit`

Completed pages were compared to every `loading.tsx`, dedicated skeleton component, and in-screen placeholder. `/` is no longer the class-card dashboard: unauthenticated visitors get the paper landing, authenticated teachers get the workroom (`WorkspacePage` → `UnifiedWorkspace`). Skeletons that still drew the old masthead + hot-row blue inset were rebuilt.

## Rules applied

- Paper / navy / cobalt / mint for workroom, landing, and account loading.
- No colored left-edge accents on notices or cards.
- Accessible `role="status"` copy; decorative bones `aria-hidden`.
- Reduced motion: global `.skeleton` wash is already disabled in `globals.css`.
- No fake buttons while loading. Real links only where the completed chrome already navigates (`AppChrome` menu, landing login/signup, auth switch line).
- `UnifiedWorkspace.tsx`, shared workroom styles, admin UI, `AuthForm`, and `auth.module.css` were not edited.

## Inventory

| Location | Completed surface | Decision | Evidence |
|---|---|---|---|
| `src/app/(main)/loading.tsx` | `/` → landing or workroom (awaits `auth()` + bank for signed-in users) | **Rebuild** | Was `DashboardSkeleton` (class cards + 5px blue inset). Now `WorkroomHomeSkeleton` (sidebar, topbar, bank / import / recent / draft). Unsigned flash is brief; the slow path is bank load. |
| `src/app/studio/loading.tsx` | `/studio` → `WorkspacePage` | **New** | Route had no `loading.tsx`. Same workroom shell as `/`. |
| `src/app/(auth)/loading.tsx` | Auth layout + form | **Rebuild** | Was bare `AuthFormSkeleton` (no editorial). Now `AuthLoading` → `AuthExperience` + form skeleton. |
| `src/app/(auth)/login/loading.tsx` | Login form, 2 fields | **Keep wiring / rebuild body** | Still `AuthLoading`. Form copy and field count match `AuthForm`. |
| `src/app/(auth)/signup/loading.tsx` | Signup form, 3 fields (name) | **Keep wiring / rebuild body** | `AuthLoading fields={3}`. |
| `src/app/(auth)/onboarding/loading.tsx` | 3-step setup inside auth shell | **Keep** | Hierarchy matches `OnboardingForm` (3 columns, later steps dimmed). |
| `src/app/(main)/classes/loading.tsx` | `AppChrome` + `ClassManage` | **Rebuild chrome** | Masthead now includes mark + 자료 제작. Table 2 columns kept. |
| `src/app/(main)/problems/loading.tsx` | `AppChrome` + `ProblemBank` | **Rebuild filters** | Filter bar matches search(span 2) + 5 selects + 자료(span 2), not a fake 8-col grid. |
| `src/app/(main)/exam/loading.tsx` | `ExamDashboard` / `RoundRow` | **Rebuild** | Removed 5px `#d8e3ef` left bar (user ban). Row grid still `44 / 1fr / 96`. |
| `src/app/(main)/exam/[id]/loading.tsx` | `RoundDetail` | **Keep / chrome** | Title + 4-stage dots + two blueprint panels + score table. |
| `src/app/(main)/tests/new/loading.tsx` | `GenerateSetup` | **Rebuild fields** | Difficulty slots 4 → **6** (`DIFFICULTY_LADDER`). |
| `src/app/(main)/tests/[id]/loading.tsx` | `TestReview` | **Rebuild header** | Title + meta line, not two anonymous bars. Footer placeholders are bones, not `<button>`. |
| `src/app/(main)/tests/[id]/print/loading.tsx` | `TestPrint` | **Rebuild chrome** | Shell `#c9c9c7`, toolbar `#ececea`, 2-col A4 body. |
| `src/app/review/loading.tsx` | `ReviewConsole` | **Rebuild** | 1fr + 320px, problem article, three verdict **bones** (not rounded fake buttons). |
| `src/components/auth/AuthLoading.tsx` | `AuthExperience` + `AuthForm` | **Rebuild** | Stops using `auth.module.css` skeleton classes (file not edited). Uses `AuthFormSkeleton`. |
| `src/components/ui/Skeleton.tsx` | Primitive | **Keep** | `aria-hidden` bones. |
| `src/app/globals.css` `.skeleton` | Wash + reduced motion | **Keep** | Not owned; already tokenized and motion-safe. |
| `DailyReviewSkeleton` | `DailyReviewSection` | **Keep** | In-screen wait. Gray progress bone only (`skeleton-accent` = divider token). |
| `DashboardSkeleton` | `MainScreen` standalone load | **Rebuild** | Dropped `inset 5px` blue. Still used by `MainScreen` (not `/`). |
| `ClassManageSkeleton` | `ClassManage` loading state | **Keep** | 2-col table + student list + unit grid. |
| `ProblemGridSkeleton` / card / panel / transform | Bank lazy chunks | **Keep** | In-screen; no fake controls. |
| `TestSetupFieldsSkeleton` | `GenerateSetup` before ready | **Rebuild** | Six difficulty fields. |
| `WorkroomHomeSkeleton` | Unified workroom home | **New** | Dedicated CSS, no workroom style import. |
| `LandingSkeleton` | Public landing | **New** | Gallery + accurate public hierarchy. `/` route loading uses workroom (slow path). |
| `UnifiedWorkspace` `dynamic()` fallbacks | Bank / studio / teaching / export | **Keep — integration** | Still `WorkProgress` text. Cannot edit `UnifiedWorkspace.tsx`. |
| `WorkroomHome` recent `WorkProgress` | Draft list hydration | **Keep — integration** | Inside unified home. |
| `TeachingView` lazy `Loading` | Teaching tabs | **Keep — integration** | Out of ownership. |
| `auth.module.css` `.skeleton*` | Unused after AuthLoading rebuild | **Keep CSS — integration** | File is banned from this worker. Dead rules can be removed by auth owner. |
| `src/app/dev/**` | Internal QA | **No route loading** | Gallery lives at `/dev/skeletons`. |
| Admin approval / menu | Not in tree at `ab25e7ab` | **None** | Another worker may add UI; they need their own `loading.tsx`. |
| `src/components/unified/WorkProgress.tsx` | Measured progress | **Keep** | Not a page skeleton. |

## Desktop / mobile checks

Isolated preview: `docs/qa/skeleton-preview.html` served at `http://localhost:4173` (no app server, no accounts, no DB).  
Product gallery: `/dev/skeletons` (dev-only; root can open after integrate).

Chrome-devtools **viewport** screenshots and a11y snapshots completed. A later full-page screenshot hung >11 minutes and was cancelled (coordinator: do not wait indefinitely). Root can re-check integrated `/dev/skeletons`.

| Surface | 1440 | 390 | Notes |
|---|---|---|---|
| Workroom home | Sidebar 240px + two-column dashboard | Top brand bar, stacked cards, 2-col grade chips | Status: 작업실을 불러오는 중. No buttons. No left-edge color. |
| Landing | Header nav + hero | Nav links drop; login/start remain | Real login/signup links only |
| Auth form | Title + 2 fields + switch link | Same column | Submit is a bone, not a button |
| Exam list | Masthead + rows | D-day column hides | No 5px confidence bar (source guard) |
| Dashboard (MainScreen) | Cards + side panel | Gauge column hides | No blue inset (source guard) |
| Reduced motion | Wash off | Wash off | `globals.css` `@media (prefers-reduced-motion: reduce)` |

## Tests

```
npx vitest run src/__tests__/components/LoadingSkeletons.test.tsx
src/__tests__/components/AuthPages.test.tsx
src/__tests__/components/TeachingMainScreen.test.tsx
```

23 passed (12 skeleton + 11 related). ESLint on owned files: 0 errors. Affordance scan on owned files: clean.

`Main.test.tsx` / `DailyReviewSection.test.tsx` import `@/app/(main)/page`, which now loads `WorkspacePage` → `server-only`. That predates this branch (workroom-as-home). Not fixed here.

## Integration the coordinator still owns

1. **`UnifiedWorkspace.tsx` fallbacks** — `WorkProgress` text is not hierarchical. Swap to `WorkroomHomeSkeleton` (or view-specific bones) only if that file’s owner agrees.
2. **`/` dual destination** — `loading.tsx` cannot see the session. Workroom shell is used because signed-in bank load is the long wait. If first-visit landing flash is unwanted, the page owner can split public/authenticated routes.
3. **`auth.module.css` leftover `.skeleton` rules** — unused after `AuthLoading` stopped reading them. Do not delete from this branch.
4. **Admin UI** — no route yet. When it lands, add a matching `loading.tsx`; do not reuse class-card or workroom home.
5. **`MainScreen` leftover dashboard** — still valid for embedded teaching. Its skeleton no longer paints a blue left edge.

## Out of scope (untouched)

Auth behavior, DB/API/security, `UnifiedWorkspace.tsx`, workroom CSS modules, admin components, `AuthForm.tsx` / `auth.module.css`, package versions, production deploy, paid AI, real accounts.
