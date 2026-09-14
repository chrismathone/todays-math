# Subscription OCR protocol validation — 2026-09-14

The original two page-6 HTTP 502 failures were **not reproduced** in the direct
subscription CLI runs. Their exact JSON/schema cause remains unproven: the
historical final responses were not available. A 33-second request duration and
the old generic parse message do not establish a timeout or an escaping defect.

The existing saved page-6 source render was inspected and passed directly to the
existing subscription bridge, without calling the running development server.
Raw responses and replay scripts were written exclusively to the worker's ignored
local `.qa-artifacts/ocr-protocol/`. That completed, merged worker worktree was
removed during session cleanup; its private artifacts were not committed.
No private exam transcription or credentials are included here or in the fixtures.

| Local invocation                        | Result                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------- |
| Claude, original page prompt, attempt 1 | 18.620 s; valid JSON/schema; all 4 problems                                |
| Claude, original page prompt, attempt 2 | 18.564 s; valid JSON/schema; all 4 problems                                |
| Codex, same source                      | Bridge rejected `login-required` before inference; no fallback             |
| Claude, new page prompt                 | 18.675 s; all 4 problems; all types `descriptive`, matching printed labels |
| Claude, synthetic crop OCR              | 3.226 s; 1 figure returned in input coordinates                            |
| Claude, synthetic figure redraw         | 7.568 s; accepted static SVG, 586 characters                               |

A separate synthetic response containing an unescaped literal tab reproduced
the old exact generic error against the pre-change parser. The new parser
escapes literal control characters inside strings and preserves both synthetic
problems, text, formulas and choices. This proves a parser gap and its repair;
it does **not** identify the historical private-page failure's cause.

JSON failures now say that JSON is invalid or truncated. Schema failures include
at most five field paths and validation codes, such as
`problems[1].bbox.width: invalid_type`. The error contains no raw response, source
value, filename, Zod message or exception cause. Required problem validation is
still all-or-nothing: malformed or truncated pages never become empty or partial
successful pages, and whitespace-only problem content is rejected.

Protocol additions:

- `DevAiQuestionType` is `multiple-choice | short-answer | descriptive`.
  `questionType?` belongs to each page problem and to top-level crop OCR only.
  Invalid optional metadata is omitted with a warning; missing/null is omitted.
  Prompts prioritize printed type labels over circled characters, distinguish
  actual choices from conditions, and omit ambiguity. `구하시오`, numbered
  subparts, `서답형`/`주관식` alone, and absent choices do not establish a subtype.
- Mathgen's `ocr.ts` and `ocrSchema.ts` were read for parity. Exact printed label
  preservation is retained; its broader imperative/subpart heuristics were not
  copied. `sourceName` and `detectedGrade` contracts remain intact.
- Crop OCR now requests and returns optional `figures` in INPUT crop coordinates.
  Missing figures preserve absence; explicit valid `[]` stays empty; entirely
  invalid crop figure entries produce a warning and absence, not a false empty
  detection. Page problem figures remain in source PAGE coordinates.
- `figure-redraw` requires an image and nonblank `content` instructions, accepts
  optional `svg` up to 500,000 characters, and returns `result.svg` only for this
  action. The output must pass a limited static SVG grammar with balanced tags,
  quoted attributes and no scripts, events, external references or active CSS.
  The browser must still sanitize before applying. The existing bridge's
  128 KiB prompt limit also applies to the combined serialized request.

Validation: 249 tests passed across `devAiTasks`, `devAiResponseValidation`,
`aiGenerator`, `devAiRoute`, `devAiGuard`, `devAiCli`, `devAiCliProcess`, and
`devAiCliProtocol`. Full `tsc --noEmit --incremental false`, targeted ESLint,
formatting and `git diff --check` passed. No build, server restart, browser state
mutation, paid API request, push, or additional worker was used.

Root integration now consumes question types/crop figures and applies sanitized
redraw output through the Mathgen figure editor. See the
[integration verification](studio-review-redesign.md). A future recurrence can
identify the failing parse stage from the new safe diagnostic; the original
historical cause is still open.
