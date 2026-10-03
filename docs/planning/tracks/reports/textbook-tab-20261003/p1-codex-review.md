# Codex P1 contract and hi-fi review

2026-10-03 · Task `task_b012383e1983` · Dispatch `ctx_060956892576`.

**P1: APPROVE** for `docs/planning/textbook-studio-p1-contracts-20261003.md`, SHA-256 **`e94aedb8a5bff13d64ddded08539a187aadc9111e39603eabb9554d6eff41ca1`**. The complete base document and both final amended paragraphs were read, and the current file hash was verified. There is no remaining blocking contract revision from Codex.

**Hi-fi: APPROVE H1**, including the corrected desktop and mobile-spread pixels, for HTML SHA-256 **`4bf3d37c9802df17727e2abee54301eafc327f49e9dd3ea5cb0c340bb82b6fa7`**. All eight requested desktop/mobile `-full.png` captures, the three first H1 replacement captures, and all four corrected `-v2.png` captures were inspected. The oversized mobile typography defect is resolved; no visual blocker remains for this direction/artifact vote.

This reviews the contracts that fix implementation boundaries and the visual direction. Executable contracts, migrations, student access controls, rendered output, and production behavior still require implementation and their specified acceptance checks. The accepted scope plan remains SHA-256 `60a508c008ea24abfcb8b361f3c639fbc19a80147ff404c045db9eb9cbb40702`.

## Contract findings

| Boundary | Decision and evidence in the final P1 document |
| --- | --- |
| Ownership and dependencies | APPROVE. Strict exchange, teacher, concept, and student contracts have separate owners. Pure canonicalization is shared; Node hashing stays server-only. Capture, printable conversion, reference validation, access, and publishing have named entry points. Existing bank/explorer modules do not acquire a dependency on textbook persistence. |
| Canonical bytes | APPROVE. Object keys use explicit UTF-16 code-unit ordering, arrays retain order, and ECMAScript escaping/number formatting is specified. There is no normalization of Unicode, whitespace, or newlines. UTF-8 bytes exclude BOM/trailing newline. Duplicate keys are rejected before JSON parsing, and invalid UTF-8, isolated surrogates, NUL, negative zero, unsafe integers, and other non-JSON inputs are rejected. |
| Hash projections | APPROVE. Payload `contentHash`, source/metadata/raw-source `snapshotHash`, concept content, edition manifest, and artifact byte hashes have distinct meanings. The manifest recomputes and binds both snapshot hashes. Metadata-only recapture has a distinct snapshot identity; video review remains tied to content. Package paths are checked by the separate file manifest. |
| Lossless references | APPROVE. Raw figure arrays and original SVG asset bytes survive capture even when rendering interpretation fails. Original metadata is retained independently of current bank rows. Unit/section references are scoped by the pair, server sections use UUIDs, block/item order conflicts fail publication, and repeated textbook placements have separate item/QR identities. |
| Optional concept extension | APPROVE. Existing packages without the extension remain readable without injecting default arrays/nulls or certifying nonexistent concept links. Concept publication requires the extension. External bank, course, graph, database-unit, and textbook-section namespaces stay distinct. Imported confirmation claims do not become local approval. |
| Exact-ID composition | APPROVE. The final `pick` tuple fixes section, entry kind/ID, form, and level; cardinality, per-form duplication, group order, counts/extras, form compatibility, and actual source membership are validated. Unknown IDs, contradictory selections, or separated recurring groups fail explicitly. No top-N substitution or misleading compact code is allowed. Frozen entry payloads, section labels/order, and parser/composer versions remove dependence on the current bank for old sheets. Exact selection handoff/printing uses an authorized saved-document or textbook-concept reference; the legacy `?s=` decoder rejects `pick`. |
| Student DTO and authorization | APPROVE. Answer-free paper/blank DTOs and authorized QR explanations use separate server allowlists. The answer-free blank DTO removes answer, explanation, hidden keyword, and teacher-note fields before delivery; the QR explanation DTO exposes only content authorized for that QR. Full teacher bank payloads are not bundled into student pages. Session identity, current assignment, referenced asset access, teacher menu prefix checks, student route patterns, and safe QR/login return paths are explicit. |
| Attempts and review | APPROVE. Student text supports recall/term/cloze; map/figure use teacher-observed paper activity. Student response and teacher review fields are separate, review updates use CAS, and new submissions do not overwrite old responses. Explorer outcomes come from typed CAS state, not prose matching. Existing receipt schemas remain unchanged; replays make no further mutation and return current resumed/deferred or unavailable/already-processed with `replayed:true`. Only actual first-request creation returns started. This does not invent automatic mastery or grading. |
| Archive and publication | APPROVE. Archive identity/package bytes are isolated from live book/edition/QR rows. Copying uses a new ID map. Child scope is enforced with same-edition/owner relationships; publication freezes the aggregate revision and uses server-validated jobs/artifacts before finalization. |
| Snapshot reissue | APPROVE. Nullable `TestProblem.snapshot_id` is additive. Snapshot absence preserves legacy behavior; a present ID with a missing relation or mismatched immutable source identity fails. No field-level live fallback is allowed. Print, grading, export, replacement, direct development readers, and achievement statistics must read the frozen content and metadata; `tp.score` remains the test-score override. |

The new test is created through the shared manual-test creation path, retaining `testType`, `rangeEndUnitId`, and eligibility checks. Reissue rejects selected duplicate `problemId` values with an explanation because the current result identity cannot distinguish those placements; it does not silently deduplicate them. The current test-submit route is a teacher-authenticated answer-entry path, and P1 does not claim an existing digital student test-submission API.

The route table's repeated `{id}` tokens describe the access-pattern syntax. The final document explicitly uses distinct Next folder segments such as `[editionId]` and `[sectionId]` and distinguishes `accountRouteAllowed` prefix matching from student pattern matching.

## Implementation checks carried forward

These are already required by P1 and do not reopen the approved scope:

- Compare independent Node/browser hash vectors, including numeric-looking object keys, array order, NFC/NFD, CRLF/LF, metadata-only recapture, asset reassignment, and mutable video changes.
- Exercise strict reference errors, legacy optional-extension absence, exact-pick counts/order/form failures, and composition after the live bank section is renamed or removed.
- Verify a frozen test after changing the live bank's answer, figures, unit, grade, difficulty, source score, and display code; print, grading, exports, and statistics must remain internally consistent.
- Verify missing/mismatched snapshot failure, duplicate-problem reissue rejection, normal legacy tests, and test-score override behavior.
- Verify student JSON/assets directly, including revoked assignment and foreign IDs; the mockup's answer toggle provides no security evidence.
- Exercise CAS, idempotent retries/body conflicts, archive identity isolation, and publication immutability with the actual contracts/migrations.

No product tests were run or claimed in this review-only dispatch. No product code, database, paid AI, merge, or push was performed.

## H1-H4 visual comparison

Evidence directory: `D:/tmp/textbook-tab-20261003/design/`. The HTML was read, and each image below was opened directly; these are the full captures, not the earlier cropped variants.

| Direction | Desktop evidence | Mobile evidence | Assessment |
| --- | --- | --- | --- |
| H1 | `hifi-h1-desktop-full.png` | `hifi-h1-mobile-full.png` | **Selected.** Clear outlined form controls, balanced manuscript/preview space, and a direct transition to the mobile manuscript/preview tabs fit the agreed W3 structure. |
| H2 | `hifi-h2-desktop-full.png` | `hifi-h2-mobile-full.png` | Less clear field boundaries and a competing toolbar hierarchy. Its original compact toolbar was undersized; the revised shared HTML specifies 44px controls, but a corrected H2 capture was not independently reviewed. H2 is not the selected direction. |
| H3 | `hifi-h3-desktop-full.png` | `hifi-h3-mobile-full.png` | The review table consumes the first screen and pushes authoring down, especially on mobile. Its status presentation is useful for the review state. |
| H4 | `hifi-h4-desktop-full.png` | `hifi-h4-mobile-full.png` | More preview space, but the 300px desktop manuscript column constrains routine editing. Larger preview remains useful as an explicit mode within H1. |

H1 retains the agreed collapsible outline, per-section save/state handling, larger preview mode, exact-reference status, and existing mobile navigation as implementation acceptance requirements. The fixture does not demonstrate working persistence, publication, or student security.

### First replacement capture check (superseded)

HTML examined at this checkpoint: SHA-256 `e50f306232a9da898a50a854b4c3a5b8c5964e71ba3aa0242533227a8d5fb685`.

| Evidence | Observed result |
| --- | --- |
| `hifi-h1-final-desktop.png` | Save button now has a visible blue background and readable white label. Manuscript/preview balance remains sound. |
| `hifi-h1-final-mobile.png` | Manuscript tab retains the selected H1 layout. This capture alone does not verify spread fitting. |
| `hifi-h1-final-spread.png` | **Rejected at this checkpoint.** Both page boxes exist, but enormous Korean text is clipped through them. This was not a usable fitted spread. |

The rejected spread image has SHA-256 `b1ef3e2b1ae4798e0e5db00b2d754a16c839096508d7155c4979125f5c79fac8`. That HTML assigned `font-size: 7.5cqw` to the same `.page` that established the query container; the element's own font did not size itself against its own container. The defect was escalated and corrected by the artifact owner. No artifact outside this report was edited by this worker.

### Final corrected pixels: APPROVE H1

The corrected HTML is SHA-256 `4bf3d37c9802df17727e2abee54301eafc327f49e9dd3ea5cb0c340bb82b6fa7`. Its mobile page typography uses explicit page-appropriate sizes. The actual corrected image, not the stylesheet alone, establishes that the clipping blocker is resolved.

| Opened evidence | SHA-256 | Final observation |
| --- | --- | --- |
| `hifi-h1-final-desktop-v2.png` | `d6ccf84227f0f8e1bfce1500583f853b34281ef56036bab12230f302e90909f2` | Clear primary save label/background and balanced manuscript/preview panels. |
| `hifi-h1-final-mobile-v2.png` | `b82bd5bf2df0778aad0a777203a77d538e38263649b6683c616afd2d0a1c345f` | Mobile manuscript form and manuscript/preview tab direction remain as reviewed; bytes match the earlier manuscript capture. |
| `hifi-h1-final-spread-v2.png` | `6424d0093ccc459a9f7dec8e7a1ff3acaab8660d76a6dfdd291bf63f4d224194` | Two pages fit side by side; dialogue, fraction, page numbers, and the parity notice are visible without the former giant-text clipping. |
| `hifi-h1-final-wide-v2.png` | `7da80f53c3c537fff3ac5e82745262cb8420f5812395df924232c3dfdf1faf58` | The enlarged mode shows a readable first page. Its horizontal navigation still requires the agreed interaction check in the implementation. |

This closes the named save-button and mobile-fit visual blockers for H1. The per-section states, larger preview interaction, exact-reference status, current app mobile menus, and security behavior remain product acceptance checks, as already agreed with the coordinator.

## Coordination and preservation

- The initial dispatch hash `613573a7ad1b80191cf8829a40515621be05fc275f6d63ccd95e1665031d0d5b` was superseded by coordinator message `msg_4a41df252679` before review. The intermediate `034b80e0...` version received approval in `msg_ec5e139eed97`.
- The next P1 target was supplied in `msg_9768fb53c8ff`; the intermediate `647397f8...` vote was sent as `msg_4dbb149b518e`. Coordinator message `msg_18c2a27dbeba` then added the URL-handoff and receipt-replay clauses; final approval `msg_756d33ce14ec` applies to the full `e94aedb8...` hash above.
- H1 direction after all eight captures was sent in `msg_7c5d34ec0860`; the replacement mobile spread defect was escalated in `msg_60706b86e583`. Root independently acknowledged the same regression in `msg_40852f06cdae`.
- Corrected H1 pixel approval was sent in `msg_d30b0c8aa925`. Coordinator message `msg_f2cfd4a7f766` confirmed all three P1 approvals and supplied the four final captures; the mobile and wide captures were also opened before settlement.
- The setup-modified `package-lock.json` and all prior reports are preserved; their SHA-256 values were rechecked against the start-of-review values. This report is the only authorized file change in this dispatch.
