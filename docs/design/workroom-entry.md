# Workroom landing and account entry

## Direction

The user requested a distinctive, colorful landing and authentication experience
before promoting the unified workroom to the main page. The visual direction is
a mathematics teacher's preparation desk: warm paper, cobalt, navy, butter yellow
and mint, using the existing open-book-plus mark and local Pretendard typography.
The public pages introduce the actual import, review and worksheet workflow.
They do not introduce pricing, testimonials, usage statistics or social login.

Official references inspected on 2026-09-14, including desktop screenshots:

- [Mathflat](https://www.mathflat.com/): a teacher-centered opening message and
  a large scene of the teaching experience.
- [Brisk Teaching](https://www.briskteaching.com/): strong editorial hierarchy,
  an asymmetric colored visual area and motion showing an action.
- [Mathpix Snipping Tool](https://mathpix.com/snipping-tool): demonstrates the
  relationship between a source document and its digital result near the action.

These informed hierarchy and product explanation. Competitor artwork, logos,
claims and copy were not imported. Reference captures remain ignored local QA
artifacts under `.qa-artifacts/entry-references/`.

## Original hero artwork

`public/brand/workroom-hero.webp` was generated with the built-in image generation
tool for this project. The original prompt requested an editorial paper sculpture:
an open gridded workbook, a cobalt arch, a translucent mint right triangle, a
butter-yellow sphere and pencil, and a floating geometry sheet. The image
contains no text, logos, people or product-interface controls.

The selected 1536 × 1024 result was visually inspected and encoded as WebP at
quality 86 (72,850 bytes), with no compositing or content edits. The source PNG
remains in the tool's generated-images folder. The deployable asset is stored in
the repository and does not depend on that local source path.

## Blender motion

The lower workroom section includes an original, procedurally built Blender
scene: a gridded sheet, cobalt semicircle and butter-yellow disc. The silent
five-second loop is delivered at 720 × 720 as WebM (266,655 bytes) and MP4
(205,649 bytes), with a WebP poster (20,730 bytes). Source and reproduction
instructions are in `scripts/brand/`; encoding and loop verification are recorded
in `docs/qa/workroom-motion.md`.

The native video has controls, a poster and `preload="none"`. It never autoplays,
including for reduced-motion visitors. The landing remains a server component;
its artwork and FAQ do not add a client-side animation library.

## Main entry and accounts

- Anonymous `GET /` shows the landing without loading the question bank.
- A signed-in director opens the unified workroom at `/`; existing `/studio`
  links use the same shared entry and account-scoped browser storage.
- Review-only accounts keep their `/review` destination and existing API gates.
- Login and signup preserve safe internal destinations, including query and
  hash, and reject external URLs, auth-page loops and API destinations.
- Signup uses the existing account API and Credentials sign-in. Confirmed
  account creation survives automatic-login failure, so retry only signs in.
- The workroom shows the active name/email and uses the existing server logout
  action. The main workroom uses authenticated `/api/studio/*` resources even
  when served by `next dev`; `/dev/unified` remains the development preview.

## Integrated verification

On 2026-09-14, 110 focused tests passed across the root/auth entry, callback
validation, role gates, signup API, studio resources and AI transport. Scoped
ESLint and `git diff --check` passed. `npm run build` completed successfully,
including TypeScript and all 74 prerendered pages. The local development server
was restarted afterward. Worker-level visual and accessibility
evidence is described in `src/components/landing/QA.md` and
`src/components/auth/QA.md`.

The integrated Chromium probe against `http://localhost:3000` verified:

- Landing, login and signup at 1440, 390 and 320 pixels, and the account header
  at 1440, 1024, 390 and 320 pixels, with no document overflow or uncaught errors.
- A real rejected Credentials attempt displays a recoverable Korean error.
- Signup → sign-in → requested bank tab, with exactly one signup and sign-in
  call. Writes were intercepted and a short-lived synthetic local session was
  used; no real account was created.
- Signed-in auth-page redirects, actual server logout and cleared session,
  unauthenticated workspace API returning 401, and reviewer routing.
- Main workroom requests use `/api/studio/*`, without development API requests.
- The video initially stays paused, then plays at 720 pixels for five seconds
  without a media error.

Ignored local evidence is retained in `.qa-artifacts/workroom-entry-live/`,
`.qa-artifacts/workroom-auth/`, and `.qa-artifacts/workroom-landing/`. The editable
Blender scene is preserved at `.qa-artifacts/workroom-motion/math-motion.blend`.
