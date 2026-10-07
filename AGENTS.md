<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Workspace design entrypoint

Before changing teacher/admin workspace UI, read the standalone specification
[DESIGN.md](DESIGN.md) and the [menu implementation map](docs/design/workspace-ui-rules-20261008.md).
DESIGN.md owns shared tokens, composition, states, responsive behavior and review
criteria; the menu map owns current files, feature boundaries and remaining differences.
Use the current Math workroom as the English alignment reference; distinguish
observed implementation from unification decisions. `Workroom.module.css` is
the active shell stylesheet; `Workspace.module.css` is legacy. Preserve the
documented student-app and print exceptions.

# Orca — default parallel workflow

If work can be split into independent sessions, do that with Orca by default
(worktrees), then merge completed sessions into `main`. Sequential solo work
is only for tasks that cannot be split.

# Codex workers

Launch Orca worktree workers with Codex. The user's standing preference is to
use Codex for future worktree execution and transfer unfinished Claude work to
Codex while preserving its files, branches, and evidence.
For the current textbook recovery, the user explicitly reauthorized active
Claude and Grok collaboration on 2026-10-05 after Claude's limit reset.
Keep the existing Codex work intact and use independently scoped Claude/Grok
sessions where they help finish this task.

# Student SRS redesign ("오늘의 기억") — who owns what

**Owner direction updated 2026-10-07:** the existing **StudentMathExplorers**
(journey, progress, problem practice and review) is the student SRS base.
Integrate the new recall/typed-cloze flow into that experience; do not replace
it with the separate v2 home or redirect `/learn` to `/learn/fading`.
Preserve both record domains and keep the standalone fading source usable.
The daily engine combines spaced review, prerequisite checks and progress;
a configured base quota (for example 20) may grow to **20+n** for necessary
same-session relearning after **1 minute / 5 minutes**. These short repeats
must not double-update long-term FSRS. Read
`docs/planning/srs-explorer-integration-20261007.md`. These newer decisions
override the replacement/navigation/drop plan below; the data ownership,
authentication and compatibility requirements still apply.

**Student menus (2026-10-07):** default to exploration and its collection.
Branch managers may grant lectures, textbook QR learning and English listening
per student in the student account panel. All additional menus default off.
Use `studentLearningMenuPolicy.ts` and the authenticated per-student setting;
enforce optional-module access in both proxy and route handlers.
The existing `app_setting` table is server-only (RLS enabled, browser roles
revoked); do not grant direct browser access to these authorization settings.

**Minute relearning compatibility:** `fading.relearn` is optional, persisted
separately from long-term FSRS and expedition credits. Main containing
`11fdbf48d` is the reader floor: after activation, never run older code against
the shared database or roll production back before that commit. The writer
gate `MATH_FADING_RELEARN` is open when unset or `on`, and closed otherwise.
The reader floor was verified in production at `7c9e9a4b8` (2026-10-07,
GitHub deployment 6900206486) before this default was enabled.

On 2026-10-06 the user split this work: **Codex owns the design** (screens,
components, CSS in the user's "v2" Stitch look) and **Claude owns the internals**
(concept data contract, schedule, session rules, numbers, storage, tests).
Read `docs/planning/srs-overhaul-20261006.md` before touching it. Screens read
`src/lib/fading/` and its contract; do not re-derive rules or numbers in a
component. The Stitch mockups are outside the repo and are look-and-flow
references only: never port their sentences, metrics, brand ("MathSRS") or
the items that document lists as not shipped. Wording follows its §2.
Its §12 lists the functions a screen may call (concepts, erased blanks, chip
tray, session moves, ratings, retention, queue); chips carry no "which blank"
or "trap" marker by design, and percentages are rounded only by `toPercent`.
Its §13 records the eight decisions Codex and Claude agreed on 2026-10-06 at
the user's request (answers in `docs/planning/tracks/reports/consult-srs-overhaul/`).
The ones that shape screens: the bottom bar keeps the mockup's four tabs
(phone labels 복습 · 소거 · 목록 · 통계; lectures and English listening move to
always-visible home cards plus a top switcher; navigation folds away during a
session); no star/board/base economy and no single "retention" score — the
home figure is today's reviews (done / planned) and the day streak; the
model answer opens only after a step is finished, and a stuck student uses
"아직 모르겠어요" (`giveUpStep`); do not word step 4 or success states as
mastery (chips are recognition, not free recall). The workspace menu
"오늘의 기억 · SRS" opens a teacher status view first (workspace design per
`05`), with a v2 preview of the student app that saves nothing.
Its §10 lists what is carried over and what is dropped; deleting the
explorers/bank-day screens is the last step, after the new app runs.

The student API exists (its §14; shapes in `src/contracts/fadingApi.contract.ts`):
`GET /api/learn/fading` (state), `POST /api/learn/fading` (one action:
`pick` · `drop` · `open` · `read` · `step` · `miss` · `rate` · `all-today`),
`GET /api/learn/fading/catalog?grade=`, `GET /api/learn/fading/concepts/{id}`.
A screen calls `open`, receives the session id, seed and the concept content,
runs `src/lib/fading/session.ts` locally with `chipTray(concept, step, { seed, traps })`,
then posts `read` / `step` (every placement in order, wrong ones included) /
`miss` (at step 4, the moment a wrong chip is placed) / `rate` (with a
request id the screen generates). Practising a concept that is not due uses
the concept endpoint and sends nothing. The server flag `MATH_FADING`
(`src/lib/fading/enabled.ts`) is **on when unset** (owner's decision,
2026-10-06): the student routes and page are open, `/learn` sends a student to
the new app, and the workspace SRS menu opens on the new status tab.
`MATH_FADING=off` (or any unknown value) closes everything with 404;
`MATH_FADING=read` opens only the two teacher status reads and writes nothing.
A student record that has gained the new section cannot be read by code older
than main `c77df4669` — merge main before running an older branch against the
shared database. The `session.id` a screen receives is not the stored session
number but a token built from the stored number and the content fingerprint
(concept + traps, `src/lib/fading/contentKey.ts`): when a bank sentence or the
trap table changes, a request from a screen holding the old content gets 409
and the screen re-reads the state (srs-overhaul §17.16). Never use the
response `session.id` as the stored number in tests or tools. An open session
may carry an optional `digest` (the content its step 4 was solved on); code
older than main `13ebe609b` (2026-10-07) cannot read such a record. Screens talk to a
`FadingSource` (`src/lib/fading/source.ts`); `createLocalFadingSource`
(`src/lib/fading/local.ts`) runs the same rules and returns the same shapes in
memory, with no server — develop and measure screens on that, and use it for
the workspace preview. The student pages live under `/learn/fading/**`
(already in `src/lib/studentRouteAccess.ts`); a page outside it must be added
there and to the two tests that lock that list. The current work order for
the screens is `docs/planning/tracks/brief-fading-screens-codex.md` plus its
three addenda (`…-addendum-1.md` to `-3.md`). The addenda win where they
differ: the owner's mockups are built as drawn, component by component — only
what the addenda's tables list is changed or left out.

The teacher status reads exist too (its §15; shapes in
`src/contracts/fadingTeacher.contract.ts`): `GET /api/math-srs/fading`
(roster: counts and "look at this student" flags per student) and
`GET /api/students/{id}/math-srs/fading` (one student: the same counts plus
the names and states of the concepts they picked — no sentences, no answers).
They use the existing "SRS 현황" gate, roster and branch scope. That screen is
workspace design (`05`), not v2, and goes through the Wire → Hi-fi steps; do
not show a blended score, and do not label `passed` as an accuracy rate.
The test console's partial reset has a new part, "오늘의 기억(새)".

# Check the remote before every push

Immediately before every push, fetch the target remote branch and compare it
with the local branch. Integrate any newer remote commits, resolve conflicts
without discarding others' work, and rerun the relevant checks before pushing.
Never force-push over newer commits. This is the user's explicit standing rule.

# Orca session cleanup

When an Orca-managed task is fully complete, its changes have been merged into
`main`, its worktree is clean, and it has no running work, remove the Orca
worktree so the finished session no longer appears in the workspace list.
Preserve its Git branch by default. Never remove an unmerged, dirty, or active
worktree.

# TypeSafe skill

Use the project-installed [TypeSafe skill](.agents/skills/typesafe-ai/SKILL.md)
for TypeSafe/Jev work and relevant AI judgment design in this project, including
grading, verification, and routing. Read the skill and the relevant live TypeSafe
documentation before designing or changing an integration. Preserve the project's
chosen stack and keep deterministic rules and calculations in code.

# Original listening production references

Before building original listening materials, read
[the production guide](docs/listening-production/PATTERN-GUIDE.md). The retained
[aggregate patterns](src/lib/english/listening/creation/assessment-patterns.json)
cover 193 sources and 3,699 questions; use
[`buildCreationBlueprint`](src/lib/english/listening/creation/assessmentPatterns.ts)
for grade-specific question allocations and generation constraints. Keep observed,
inferred and unknown evidence distinct, and exclude reconstructed questions from
official style quotas. Use these patterns to author new scripts, questions and
audio; retired originals and transcripts are not generation inputs.
