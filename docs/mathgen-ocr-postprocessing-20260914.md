# Mathgen OCR text parity — 2026-09-14

The repair runs for existing saved recognition and for new OCR, answers, and
solutions. It does not require another AI call or rewrite saved problem data.

## Evidence and actual missing stages

Read-only reference: `F:/Mathgen/src/services/ai/sanitize.ts`,
`src/lib/textPreprocess.ts`, `src/services/ai/ocr.ts`,
`src/lib/blocksToMarkdown.ts`, and `src/services/ai/solutions.ts` in Mathgen.

- Mathgen OCR (`ocr.ts:600–606`) normalizes typed contents/choice groups, serializes
  them with `blocksToMarkdown`, **then calls `sanitizeText`**. Its solutions path
  calls `sanitizeAnswer` and `sanitizeText` (`solutions.ts:484–495`). This is an
  intake stage in addition to its rendering preprocessor.
- Today's-math `parseDevAiResult` previously validated and returned those strings
  without that stage. Its shared preprocessor already had formula sizing, Hangul
  extraction, geometry labels, and malformed-command repair, but lacked the newer
  prose-prefixed display repair and the intake escape/circled-marker handling.
- There was also a repository-specific cause of the red prefix: the problem
  parser deliberately escapes a numbered Markdown leader to `15\.`. The loose
  symbol detector treated `\.` as a math trigger and manufactured
  `$\displaystyle 15\.$`, which KaTeX rejects. That symbol no longer triggers
  math wrapping. Escaped backslashes also no longer trigger that fallback.
- The old global `\[...\]` conversion could match escaped bracket commands
  **inside** a valid dollar-delimited formula. Delimiter conversion now scans
  outside existing math and distinguishes `\left\[...\right\]` from a display.
- `parseDevAiResult` used JSON repair before trying the original JSON. That repair
  interprets `\nnext` and `\ttext` as LaTeX-like escapes and damages ordinary
  whitespace. It now parses valid JSON first and repairs only invalid JSON;
  known post-parse LaTeX control damage is then restored by text normalization.
  This parsing-order change was explicitly delegated by the coordinator.

## Implementation and boundaries

`src/lib/math/normalizeMathgenText.ts` exports:

- `normalizeMathgenText(text: string): string`
- `normalizeMathgenAnswer(text: string): string`
- `repairProsePrefixedInlineMath(text: string): string`
- `LATEX_WRAP_TRIGGER_SOURCE` (also re-exported from `textPreprocess.ts` for
  compatibility; the intake and renderer command list has one definition).

The shared problem parser normalizes **before** choosing body/choice boundaries,
so saved `\textcircled{1}` choices are recognized. `normalizeOcrText` and the
shared `preprocessMathText` also apply it, covering `MathText`, `ProblemContent`,
the Markdown renderer, and `renderMathHtml`. New crop/page OCR fields and answer/
solution fields use the same exports in `dev-ai/tasks.ts`.

The Mathgen repairs ported here are prose/display-prefix repair, known damaged
JSON escapes and orphan brace commands, literal newline/tab escapes, circled
number/Hangul markers, stray math directives, balanced loose LaTeX wrapping,
empty internal KaTeX placeholder removal, and answer-list spacing. Whole loose
expressions retain scripts and paired delimiters. Existing math passes through
the established sizing/malformed-command/Hangul pipeline afterwards.

Conservative differences from Mathgen's broad sanitizer are intentional:

- Only known command tails justify recovering control characters. Ordinary
  English newlines/tabs and words such as `times` or `pm` are not guessed to be
  commands, including English prose in `\text{...}`.
- A prose-prefixed outer display is removed only at a line/problem-number boundary
  when Korean prose and a complete later inline formula provide evidence.
  Valid displays, math bracket commands, and escaped prose brackets are preserved.
- Code, image/link syntax, SVG/table markup, nonempty spans, and genuine prose
  remain intact. Only **empty**, explicitly marked `data-katex-id` spans are
  discarded. This is text repair, not HTML/SVG security sanitization.
- No blanket deletion of images or English `(Note: ...)` prose is applied to
  saved problem-bank content: there is no reliable evidence that such content
  is hallucinated. Existing figure handling retains ownership of those assets.
- Answer commas inside math or grouped quantities (`1,000`, `1,000,000원`) are
  preserved. We do not infer multiple-choice answers or turn improper fractions
  into mixed numbers. Existing display sizing and fraction policy remain intact.
- This task does not port Mathgen's provider calls, two-pass OCR recovery, typed
  block/schema pipeline, or figure-redraw prompts/schema.

## Verification

`src/__tests__/unit/normalizeMathgenText.test.tsx` reproduces the reported
`\displaystyle 15.\[` prefix with Korean prose and inline formulas, both with
and without a closing display delimiter. It exercises saved React body/answer
rendering, string HTML rendering, new crop/page/solution normalization, valid
formulas and choices, quantities, code/markup guards, and idempotence.

The preexisting `renderParity.test.tsx` golden comparison fails on this checkout
even with the **original** preprocessor: 16 of its 20 hash entries differ from
the historical fixture. The golden file was not changed. For a direct comparison,
temporary modules loaded the exact `HEAD` versions of `textPreprocess.ts` and
`parseProblemContent.ts`, rendered all 20 entries (including all mock-problem
bodies/answers/solutions), and captured those current baseline hashes. A second
run used the new implementation against that baseline: **all 20 hashes matched**.
Temporary baseline modules and the comparison file were removed before committing.

Final verification: **314 tests passed across 11 suites**, comprising 307 retained
tests in the following 10 suites and seven checks in the temporary direct-baseline
comparison suite:

```text
npx vitest run src/__tests__/unit/normalizeMathgenText.test.tsx src/__tests__/unit/devAiTasks.test.ts src/__tests__/unit/devAiResponseValidation.test.ts src/__tests__/unit/parseProblemContent.test.ts src/__tests__/components/MathText.test.tsx src/__tests__/unit/renderMathHtml.test.ts src/__tests__/unit/mathUnicodeSymbols.test.ts src/__tests__/unit/mixedNumberPolicy.test.ts src/__tests__/unit/mathgenPrint.test.ts src/__tests__/components/mathgenTemplates.test.tsx
```

ESLint passes for all changed TypeScript/TSX files. The four production modules
were checked using TypeScript's `createProgram` with the repository's parsed
compiler options, those modules as roots, and `incremental: false`.

The full repository TypeScript check is blocked by missing generated Prisma
types across unrelated application/admin files. A scoped TypeScript program for
all four changed production modules and their imports passes with zero diagnostics.
No full build, development-server restart, environment mutation, AI rerun, browser
operation, or write to `F:/Mathgen` was performed.
