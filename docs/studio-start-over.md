# Studio start-over delivery

Implementation commit: `3cc8361a8c395951ababca01408f4c3399ea35a1` on `BIGSHOL/studio-start-over`.

Changed only `src/components/unified/StudioView.tsx` and `StudioView.module.css`, plus this report. The Next.js installed `use client` and CSS guides and the React performance skill were read before implementation.

## Behavior

- **새로 시작** appears next to **파일 가져오기** in the crop/review toolbar and initial import header. It remains enabled during imports. Controls use the existing 44px height, 8px radius, and 14px type; shorter panel/expand text keeps the desktop toolbar on one row and avoids unnecessary mobile wrapping.
- An empty workspace resets immediately. Original documents, crops, an active selection, or an ongoing import require an in-app native confirmation. The explanation states that already-added worksheet problems remain intact.
- Accepting clears originals, crops and edited review fields, active source/crop, rendered canvas, selection/pointer capture, page, grade/level, zoom, busy/drag state, messages, coordinates, inspector state and focus mode. It does not call the worksheet mutation callback; saved worksheet image data remains usable.
- Reset cancels image decoding and revokes its blob URL, destroys pending PDF loading tasks and loaded documents, cancels the active PDF render, and invalidates old async continuations. Late completions cannot recreate old content or unlock a newer import. External requests queued behind the discarded import are consumed; subsequent new requests still work.
- Native dialog semantics supply its accessible title/description and focus handling. Cancel receives initial focus; Escape/cancel preserve work and restore the visible trigger. Accepted reset restores focus to the initial header's reset action. Expanded-workspace Tab handling yields to native dialogs, including the existing global quick-search dialog. Leaving the kept-mounted Studio view closes its modal and releases focus-mode inert/scroll state without deleting work.
- Effect cleanup also releases import/PDF resources on unmount and permits the cancelled initial external request to retry when React development Strict Mode replays mount effects.

## Validation

Passed:

- `node node_modules/eslint/bin/eslint.js src/components/unified/StudioView.tsx`
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `git diff --check`
- Eleven focused Chromium checks using the actual Studio component, CSS, sample canvas, image decoding, native dialogs, and React development Strict Mode. PDF loading/rendering was controllably mocked to force late completion; math output components were stubbed because their rendering is outside this change.

The browser checks covered initial external import under Strict Mode; empty reset; toolbar adjacency and control dimensions; Escape preservation/focus; review reset with exact worksheet data preservation; focus mode and stacked quick-search dialogs; inactive-view cleanup; delayed image batch cancellation and same-file reimport; PDF destruction/render cancellation and late completion; queued versus new external import requests; and a 390px viewport without horizontal page overflow. All eleven passed with no page errors. Desktop and mobile screenshots were visually reviewed.

The temporary harness and results are in `.tmp-studio-reset-qa/` (Git-ignored worker artifacts); rerun with `node .tmp-studio-reset-qa/run.mjs` while this worktree exists. No Next server was started or stopped, no full application build was run, and no database was accessed. A node_modules junction points to the root's installed dependencies.

The coordinator owns merging and full integration checks at `http://127.0.0.1:3000/dev/unified`, including a real PDF import and the actual global quick-search shell. The worker harness validates the dialog interaction against an equivalent native shell dialog, not the complete Next application.
