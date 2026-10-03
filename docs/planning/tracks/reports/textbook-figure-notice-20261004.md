# Textbook figure-choice notice — 2026-10-04

Implemented the three-party consensus in `consult-bank-fix/consensus.md` §7 for the dedicated textbook renderer. Text choices with unknown figure links receive no public warning; a question containing a pure `[그림]` choice with incomplete links receives exactly one `보기 그림의 번호를 확인할 수 없는 문항입니다.` notice.

## Scope and shared dependency

- Changed `src/lib/textbook/render/html.ts`, its focused `textbookFigureMapping.test.ts` tests, and the actual renderer version in `src/lib/textbook/render/versions.ts`.
- Merged the coordinator-supplied shared bank commit `f73044a6766f8fa739419e3d3d096fd2f9ae3d5b` into this worktree. The final renderer imports `hasUnlinkedFigureChoices` and `UNLINKED_FIGURE_CHOICES_NOTICE` from that shared module; no shared helper was edited or copied.
- Choice classification uses the existing `parseProblemContent` parser. Its returned choices are used only to classify; rendering still passes the entire original `block.content` to `renderTextbookMarkdown`.
- All worker mutations stayed in the assigned worktree. No push or mutation of main/other worktrees was performed.

## Exact notice placement

The notice is a single paragraph immediately after the question header and before the complete original `.tb-prose` block. It therefore precedes every choice, including inline choices, and remains outside all source headings, tables, blockquotes, and lists.

The shared parser normalizes source content and does not supply original Markdown offsets. Rebuilding the question and choices from its output, or searching for a choice marker to split Markdown, could change markup or split a formula or structured block. Rendering the original prose intact avoids that risk; the coordinator explicitly approved this placement.

The old warning attached to each `null` figure was removed. Original asset order, explicit choice labels, `data-choice-index="unknown"`, physical image widths, unknown source arrays, and answer redaction remain intact. Integrity still reports `FIGURE_CHOICE_UNKNOWN` warnings and rejects malformed source mappings, duplicate positive links, missing assets, and corrupt bytes.

## Renderer-version recommendation and decision

Recommendation: bump only `TEXTBOOK_RENDERER_VERSION` to `injaewon.textbook.renderer.v2`. The rendered content and measured height change, so newly generated artifacts need a distinct renderer identity. The version participates in the manifest (`canonical.ts`) and publication reservation writes the actual renderer version into the edition (`publish/reserve.ts`).

The coordinator independently reviewed and approved that change, and the worker implemented it. The template version and server/books draft placeholder are unchanged. Source content and snapshot hashes remain unchanged during rendering; the renderer-version component of a newly reserved manifest intentionally changes.

## Verification

- Read repository `AGENTS.md` and the installed Next.js 16.3 Vitest guide before editing.
- Red phase: the expanded focused file ran all 22 tests and failed 14 against the original renderer, detecting both unwanted text-choice warnings and absent pure-figure notices.
- Green phase: `npm run test -- src/__tests__/unit/textbookFigureMapping.test.ts` passed all 22 tests through the repository gate, including file-completeness accounting.
- Focused cases cover pure/mixed/inline figure choices; text choices with null or mixed links; a figure marker accompanied by text; stem markers; absent figures; incomplete, duplicate, and out-of-range links; complete mappings; original image order; exact one-notice placement in student and answer variants; source hashes; answer redaction; frozen render inputs; and preservation of CRLF Markdown headings, tables, blockquotes, code, and formulas.
- The measurement and page render outputs contain the identical problem HTML, including the same single notice before choices.
- Scoped ESLint, Prettier check, and `git diff --check` passed.
- Final gate run passed all six intended adjacent regression files (91 tests): `textbookFigureMapping` (22), `textbookIntegrity` (12), `textbookCanonical` (23), `textbookPrintMapping` (5), `bankChoiceFigures` (16), and `choiceFigureNotice` (13). The npm wrapper stripped `--maxWorkers` and forwarded positional `2`, unintentionally expanding that run to 48 files/3,519 tests; all completed and passed before cancellation was attempted. This was not a full-suite run, and no additional broad run was started. The legacy mapping test emitted its existing duplicate React-key warnings.
- `npm run type-check` failed with widespread missing generated Prisma-client exports, including `Problem`, `EywaBinding`, and Prisma SQL helpers. This cold-worktree setup result is not claimed as a passing type check; the coordinator owns the final integrated check. No unrelated application code was changed to mask these errors.

## Coordinator-owned follow-up

The coordinator owns origin integration, real Chromium/PDF verification, publication regression checks, final push, and eventual worktree cleanup after merge. This worker did not edit `textbookRender.integration.test.ts` or run browser/PDF checks.
