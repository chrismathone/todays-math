# Production candidate rendering QA

Read-only, generic PaperProblemView QA. Run from the checkout containing this
harness; `--repo-root` selects the production source and installed dependencies.
No packages are installed and no source, generator, loader, UI, or database is
changed. The production root must include the coordinator-owned
`src/lib/import/schoolTextbook/qualification.ts` digest helper.

```powershell
node scripts/qa/textbook/retry-render-20261011/run.cjs `
  --repo-root C:/Creative/testautocreator `
  --input C:/Creative/testautocreator/.qa-artifacts/textbook-retry-stage2-20261011/pairs.json `
  --out docs/planning/tracks/reports/textbook-retry-render-20261011/final-packet `
  --chunk-size 100
```

Inputs may be `{candidates:[...]}`, `{sourceId,candidates:[...]}`, or an array
of source groups. Candidates require sourceId, positive integer slot, content,
answer and solution. External IDs must be unique; no candidate count is hard
coded. `--expect-count N` is an optional completeness assertion.

All five diagram properties are forwarded unchanged for the question:
figureSvg, figureUrls, figureDims, figureSourceMm and choiceFigureIndex. Answers
and solutions render their own text, as in production; question diagrams are
not duplicated into them. `framed:false` uses eager print rendering, within a
column built from PAPER_COLUMN_WIDTH and PAPER_CSS_VARIABLES. CSS Modules use
esbuild's local-css loader, KaTeX and both production fonts use data URLs, and
production globals/Tailwind are compiled for the actual emitted class names.
esbuild is resolved from the existing tsx dependency.

The SSR gate parses actual rendered HTML for KaTeX errors (including red command
fallbacks), raw figure markers, diagram correspondence, unresolved choice
numbering and deferred placeholders. Chromium inspects **every** article in
every chunk, for screen and print media at 1440 and 390 pixels. Checks cover
full-body and paper-content overflow, physical column/font parity, broken or
hidden images, placement of choice diagrams, actual inline SVGs, visible labels,
clipped labels, duplicate DOM IDs and unresolved SVG references. JavaScript is
disabled: this checks the production static print output, not client effects.

`component-render.json` and `browser-qa.json` contain input hashes, per-source/slot
payload hashes, chunk coverage, source/CSS/HTML hashes and precise failures.
`candidatePayloadSha256` calls the shared retryReviewPayloadDigest helper on the
flat packet, so qualification can bind the exact texts and diagrams. Browser
`checks` summarize all rows per viewport/media; `chunkChecks` and `entries`
retain full coverage and actual SVG label measurements. HTML/CSS hash mismatch
aborts browser QA. Local public assets are served read-only and hashed; external
asset requests are blocked and fail the run.

Generated HTML, CSS, bundles and fixture inputs are under ignored `runtime/`
directories. JSON receipts and screenshots are durable evidence. Both CLI
commands exit nonzero on any failed gate.

```powershell
# Inspect a previously rendered, unchanged packet again.
node scripts/qa/textbook/retry-render-20261011/browser_qa.cjs `
  docs/planning/tracks/reports/textbook-retry-render-20261011/final-packet `
  C:/Creative/testautocreator

# Positive diagram fixtures, seeded negative defects and artifact tamper gate.
node scripts/qa/textbook/retry-render-20261011/selftest.cjs C:/Creative/testautocreator
```

This gate verifies rendering, not mathematical correctness, source provenance,
pagination, physical printer output or human approval. Those remain separate
qualification evidence.
