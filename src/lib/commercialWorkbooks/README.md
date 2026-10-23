# Commercial workbook teacher domain

This is a separate, actor-owned catalog and assignment domain. It does not read or write bank Test/TestResult, teacher-authored Textbook, WorkspaceDocument, app_setting, or student SRS records. No publisher questions are bundled. The local source seeds only a visibly fictional, teacher-authored reference workbook and students.

## UI contract

The authoritative DTOs and strict request schemas are in `src/contracts/commercialWorkbook.contract.ts`. The `CommercialWorkbookSource` interface is in `source.ts`; factories are `createHttpCommercialWorkbookSource({ ownerId? })` and `createLocalCommercialWorkbookSource({ seed?, roster?, policy?, actorId?, now?, newId? })`. Pass the active teacher ID as `ownerId` to bind an open browser tab to its account. The in-memory source never uses network or localStorage and runs the same domain service as production.

| Source method | Result |
| --- | --- |
| `listRoster()` | `WorkbookRosterClass[]` with currently writable classes and students |
| `listCatalog()` | `WorkbookEdition[]` metadata and coverage counts; no full history |
| `getEdition(id)` | `WorkbookEditionDetail`, including immutable revision history |
| `createEdition(input)` / `reviseEdition(id,input)` | `WorkbookEditionDetail` |
| `listAssignments()` | `WorkbookAssignment[]`; HTTP convenience drains bounded pages |
| `listAssignmentPage({after?,limit?})` | `{items: WorkbookAssignment[], nextCursor: string|null}` |
| `getAssignment(id)` / `createAssignment(input)` / `saveMarks(id,input)` | `WorkbookAssignment` |
| `listWrongNotes({assignmentId?,studentId?})` | `WorkbookWrongNote[]` |
| `updateWrongNote(id,input)` | `WorkbookWrongNote` |
| `getWrongNotePrint({noteIds,includeAnswers?})` | `WorkbookWrongNotePrint` |

Exact edition label and title are required; publisher, grade, curriculum and ISBN are optional. Source provenance requires `kind` (`teacher-authored`, `publisher`, `licensed-other`) and `description`; `reference` can record the source URL. Keys carry `answerText`, `status` (`unreviewed` or `reviewed`) and optional positive `sourcePage` (PDF page). Reviewed rows record the teacher ID/time. Arbitrary answer text is display-only; all judgments are explicit teacher marks. Missing key stays `null` and never implies wrong/unattempted.

CSV/TSV import is pure `parseWorkbookImport(text, delimiter?) -> {exercises,issues}`; issue fields are `row`, `field`, `message`. Headers: `volume,section,page,number,subpart,answerText,keyStatus,sourcePage`. `page` and `number` are required. An absent answer cell creates a missing key, and an absent status on a supplied key defaults to unreviewed. A status/sourcePage without a key is rejected. Quoted delimiters, escaped quotes, multiline fields and BOM are supported. Any invalid/duplicate row returns zero usable exercises. The server repeats validation for manual/structured submissions. Address parts trim/collapse whitespace and normalize Unicode NFC while preserving leading zeros and meaningful labels. Full revision imports retain every existing address/ID; a key correction cannot silently remove or renumber exercises.

Limits: 5,000 exercises per edition, 2 million characters of aggregate exercise JSON, 2 million input characters for CSV/TSV, 500 selected exercises and 100 explicit students per assignment, 100 selected wrong notes per print request. HTTP bodies are bounded at 8 MiB. Assignment HTTP pages default to 20, maximum 50, ordered by creation timestamp plus UUID; entries outside current scope are omitted, while cursors advance over the scanned page. No assignment entry is silently dropped by `listAssignments()`.

## Routes and errors

All routes are under `/api/commercial-workbooks`, return `{data:T}` on success and `{error:{code,message,details?}}` on failure, and use private/no-store responses. POST create-edition/create-assignment returns 201; other successes return 200. The interface unwraps envelopes and throws `CommercialWorkbookError` with `code`, `status` and `details`.

| Path | Methods / result |
| --- | --- |
| `/` | GET catalog; POST create edition |
| `/:id` | GET edition detail |
| `/:id/revisions` | POST complete key revision |
| `/roster` | GET authorized roster |
| `/assignments` | GET paginated `{items,nextCursor}` (`after`, `limit` query); POST assignment |
| `/assignments/:id` | GET assignment with current marks and ordered history |
| `/assignments/:id/marks` | POST partial explicit mark patch |
| `/wrong-notes` | GET filtered notes |
| `/wrong-notes/:id` | PATCH correction text and todo/done |
| `/wrong-notes/print` | POST safe reference-only print DTO |

Errors: `UNAUTHORIZED` 401; `FORBIDDEN` and `SCOPE_CHANGED` 403; `NOT_FOUND` 404; `VALIDATION_ERROR` and `DUPLICATE_ADDRESS` 400; `STALE_REVISION` and `IDEMPOTENCY_CONFLICT` 409; `UNAVAILABLE` 503. Unknown internal failures return a generic 503, never SQL or key text. Origin checks protect mutations. Missing/changed teaching access or a mismatching `x-workspace-owner` fails before source operations. The parent integration owns proxy `accountRouteAccess` registration under teaching.

## Persistence and semantics

Six dedicated tables: edition, immutable revision, immutable assignment snapshot, immutable grade event, wrong note, immutable request receipt. They enable RLS and revoke all PUBLIC/anon/authenticated table grants, with no browser policies. The SQL repository uses parameterized Prisma raw SQL; it does not depend on generating new model delegates into shared dependencies. Prisma models remain additive and validate. Database triggers enforce frozen assignment selection, stable revision exercise IDs, original wrong-event identity and immutable history. JSON predicates use `IS TRUE` and required-key checks so missing fields cannot pass via SQL UNKNOWN.

A mutation transaction serializes by authenticated actor using a Postgres advisory lock. Account role, approval, suspension and current personal/branch teaching menus are read before every operation, including receipt replay. Current class `test:read`/`test:write` capability and every selected student's enrollment are checked; writes hold class/student rows through commit and use existing managed-enrollment helpers. Catalog and assignments are personal to their creator, even for administrators. Assignment reads and replay responses project targets to currently authorized students. A transferred student cannot block peers who remain enrolled; addressed grading/note/print operations explicitly deny that student, while the stored historical roster and grades remain intact. Loss of the class capability denies the assignment and list views omit it. Class name and student names are frozen as historical assignment labels.

Assignments freeze exact edition/key revision, selected ordered exercises and explicit students. Due date is optional and is not an access expiry. A missing mark is ungraded. Explicit correct/wrong/unattempted marks save only the submitted patch; each target has an optimistic revision and append-only history, with no invented student answer or score. Duplicate request/body returns the saved result; changing content for the same request ID conflicts. A replay is authorized again before reading its receipt. Request IDs are unique per actor across this domain.

Entering wrong creates a note tied to that original grade event. Re-saving wrong does not create another failure; leaving wrong and becoming wrong later creates a new todo note. Correcting note text/status never changes the original event or grades. `latestMark` is projected from current grading whenever notes are read. Default print DTOs contain reference addresses and correction text but **no key fields**; correction text is teacher-entered and may itself discuss an answer. Explicit `includeAnswers:true` adds `answerText` and `keyStatus`. No full question print, automatic math grading, or publisher-content rights are implied.

## Verification and rollout handoff (2026-10-23)

Owned tests: `commercialWorkbooks.test.ts`, `commercialWorkbookSql.test.ts`, `commercialWorkbookPolicy.test.ts`, and `commercialWorkbookRoutes.test.ts` (21 cases), plus existing `errorLogRouteCoverage.test.ts` (14 cases). Coverage includes CSV errors/duplicate addresses, unsupported and missing keys, immutable revisions, partial marks, stale edits, concurrent identical requests/conflicting bodies, fresh role/menu/scope rejection, foreign class/student/owner, transfer isolation and replay redaction, note history, key-free print, pagination, SQL UNKNOWN rejection, RLS grants and rollback of grade/note/receipt after injected failure. SQL tests run the actual migration and repository against isolated PGlite, not a shared database.

No migration was applied to a live database, no shared Prisma client generated, no environment files changed, and no push/deployment performed. The coordinator must integrate the teacher UI/proxy gate, review/apply the additive migration through the existing deployment process, and run integrated browser/build checks. Existing tables and compatibility reader floors are unchanged. No deletion/archive or student-submission API is introduced.

Database review used the installed Supabase/Postgres skills, current [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security), and [Data API default-grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically). The explicit RLS/revoke boundary is retained regardless of project defaults.
