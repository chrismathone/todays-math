# Seven existing Claude feature cases

Offline helper for base `1f20540ec8bdd6777b498f9692b00f0f3bf1368a`. It has no credential, live HTTP, DB, browser, server, build, deployment or product-edit authority. API owner supplies raw Messages responses through a file map. The sources are newly authored synthetic worksheets, not recovered textbook/operational material.

Run from the helper worktree with an independent dependency copy:

```sh
node scripts/qa/claude-api-evaluation/features/run.mjs guards /absolute/features-evidence
node scripts/qa/claude-api-evaluation/features/run.mjs regression /absolute/features-evidence
node scripts/qa/claude-api-evaluation/features/run.mjs capture /absolute/features-evidence
# API owner executes each missing private/requests.json .cases[] request exactly once.
# map.json is {"ocr.01":"/absolute/raw-response.json", ...} (or {"responses":{...}}).
node scripts/qa/claude-api-evaluation/features/run.mjs capture /absolute/features-evidence /absolute/map.json
# Repeat capture with the accumulated map until no dependent requests are missing.
node scripts/qa/claude-api-evaluation/features/run.mjs replay /absolute/features-evidence /absolute/map.json
```

`capture` may succeed with `pending-response`; that means prepared, never live-verified. Final `replay` fails unless every case completes and meets its assertions, including the coordinator-approved Korean OCR control (eight specimens, seven features). The observed two quality failures deliberately keep final replay red; the separate synthetic guards and existing unit regressions pass. No network call is made by any mode. The launcher creates a child environment from a small allowlist with dummy Anthropic authentication, disabled Jev, localhost port 1 DB URLs, private cache and `envDir:false`. It never reads project `.env` or the API owner's credential file.

## Current function map

| Case                 | Actual server path and contract                                                                                                                                                                                                 | Authored representative and checks                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ocr`                | `DevAiRequestSchema` → `executeStudioTask` → `executeMathgenTask` → `buildDevAiPrompt`/native Mathgen OCR prompt → `runModelApi` → `parseDevAiResult`/`NativeOcrItemSchema` → normalizer                                        | Image contains `18 + 27`, four choices 35/45/55/65, no printed answer; verify sentence, operands, choice order, multiple-choice type, empty answer/solution and no invented figure               |
| `page-ocr`           | Same execute/tasks path; final prompt requests `detectionOnly:true`; actual bbox/grade/problem parser                                                                                                                           | Two problems and answer blank; verify count/order, crop ink anchors, no inferred answer/grade. Current page function does **not** transcribe the two problems: isolated `ocr` is a later UI step |
| `figures`            | Same execute/tasks path; bbox parsing drops invalid optional figures with warning                                                                                                                                               | Triangle plus separate question; crop must contain triangle/label anchors and exclude question text                                                                                              |
| `figure-redraw`      | `executeStudioTask` → `redrawDevAiFigure` → spec prompt/parser → `withLabelMetrics` → actual `renderFigureSpec(strict:true,typeset:false)` Python engine → comparison seam → actual review prompt/parser → optional repair loop | Source A-right triangle, AB 4 cm and AC 3 cm; verify strict renderer, labels, coordinates, perpendicularity, 4:3 leg ratio and model review; inspect generated comparison pixels directly        |
| `figure-edit`        | `executeStudioTask` → `editDevAiFigure` → edit prompt → `parseFigureEditResult`/`FigureEditCommandSchema`                                                                                                                       | Actual source image and numbered element map; exactly `text(target=3,text="7 cm")`, leaving other elements unchanged. Editor application is not executed                                         |
| `solution`           | `executeStudioTask` → `executeMathgenTask` → current solution prompt → parser, `resolveMCAnswer`, `validateSolution`, optional cleanup/regeneration                                                                             | 8×5 rectangle perimeter; code computes `2*(8+5)=26`; verify final answer and operands, then directly review explanation. Model prose is not mathematical proof                                   |
| `english-photo-read` | `readEnglishPhoto` → PNG magic/config → r2 transcription prompt → `runModelApi` → `cleanEnglishReadText` → `polishEnglishReadText`                                                                                              | Seven original lines including numeric facts, options and a printed answer; exact text after whitespace normalization. Explicit Anthropic's current verify/twice defaults are off                |

`provider:'anthropic'` deliberately bypasses auto routing, whose redraw review can use Gemini. Studio uses current allowlisted `claude-opus-5`; `5.5` remains rejected by the studio allowlist. English's own current allowlist supports `claude-opus-5-5`, explicitly low effort. No product defaults or allowlists are changed. This is current function coverage using explicit evaluation settings, not proof of production environment wiring.

## Injection boundaries

1. The real `runModelApi` is called with a documented evaluation override for output cap and effort: extraction 4,096/low; solution and redraw generation 8,192/medium; redraw review 3,000/medium; edit 4,096/medium; English 4,096/low. The production studio default is 16,000 and Opus5 medium; those defaults are separately inspected, not silently represented as the evaluated settings.
2. Fetch captures the exact actual wrapper-serialized Messages body, excluding all headers, and supplies an untouched raw JSON response to the same wrapper. No generic prompt reconstruction or copied direct-API script stands in for application execution.
3. Only `buildFigureComparisonImage` is replaced by a native sharp compositor. It uses actual source bytes plus the actual strict engine SVG after the product MathJax substitution, at the same 1840×960 side-by-side dimensions and headings. Product Chromium/browser rendering is not run or claimed.

All input, SVG/PNG, request, parsed and raw-derived artifacts are outside Git under `private/`, directories 0700/files 0600. Each request has an immutable manifest with case/phase, original input SHA, actual attached image SHA (review has its own comparison SHA), prompt/request SHA, model, effort, cap, expected values and dependency IDs. Existing frozen bytes must match on every run. `requests.json` is a current index, while individual manifests are immutable. Owner's transport ledger establishes request↔raw response provenance; helper replay records raw SHA, actual model, stop reason and usage.

## Negative tests and limits

Synthetic guards exercise actual API completion/truncation/refusal/tool stop reasons, empty/oversized/malformed response, abort/timeout, input/output contracts, current allowlists and native strict rendering. The evidence guard additionally rejects all content blocks except text/thinking/redacted_thinking and requires assistant/message/model/usage/end_turn. The product wrapper itself filters a mixed `tool_use` block when accompanied by text and `end_turn`; the independent guard catches that known gap. Tests label synthetic responses and do not count them as live evidence.

These tiny representatives are neither all domain cases nor a quality benchmark. No UI, routes, authorization, persistence, full-page-to-crop orchestration, production deployment or measured educational outcome is verified. Dependent stages use only owner-provided raw responses; a model refusal, contract failure, truncation, renderer failure or missing response remains visible rather than being counted as success.
