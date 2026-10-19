# Authored image adapter — adversarial read-only review r1

Reviewed 2026-10-19 in the existing source identity worker. Parent root: `C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008`. Findings apply to the uncommitted byte snapshots below, not to later parent revisions.

## Concrete finding

**[P2] CRC-valid but undecodable PNGs return successful SVG renders.** Location: `src/lib/engine/authoredImage.ts:158–174`, especially line 170 (counts IDAT chunks without validating their contents) and line 174 (returns dimensions as successful PNG validation). `IHDR` validation checks dimensions but not legal bit-depth/color-type combinations or compression/filter/interlace fields; no palette rule or image-data decoding runs before the bytes are embedded at line 256.

Executed three adversarial inputs against the actual parent implementation, transpiled in memory using the parent's installed TypeScript and Zod, with no source edits or new dependencies:

| CRC-correct mutation of the existing test's 1×1 PNG | Actual result |
| --- | --- |
| Replace the complete IDAT payload with bytes `01 02 03`, recomputing its length and CRC | `ok: true`, 60 bytes; independent `node:zlib.inflateSync(Buffer.from([1,2,3]))` rejects with `Z_DATA_ERROR` |
| Set IHDR bit depth to 3 while retaining color type 6, recomputing CRC | `ok: true`, 68 bytes |
| Set color type to indexed (3) without inserting PLTE, recomputing CRC | `ok: true`, 68 bytes |

The invalid-zlib PNG is exactly:

```text
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAA0lEQVQBAgNTNxetAAAAAElFTkSuQmCC
```

Reproduction: use the existing test fixture's `saved()`, replace `a.png` with `Buffer.from(theBase64Above, "base64")`, recompute `spec(a)` and call `renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]]), "preview")`. It succeeds. To confirm this is not restricted to held previews, the in-memory probe additionally used the existing test's **synthetic** passing-review helper plus fixture classification fields: all three inputs also returned `ok: true`, `heldChecks: []` with default approved-display. Those fixture assertions are counterexamples to validation, not genuine asset reviews or approvals.

Impact: a corrupted or malformed asset registered by trusted server code can be treated as successfully rendered and saved/displayed even though it has no decodable image. CRC verification and matching hashes establish integrity relative to the supplied record, not PNG validity. This is a correctness issue at the asset boundary; I did not demonstrate request-driven asset registration, script execution, SSRF, or a production approval bypass.

Suggested fix: validate PNG header semantics and required chunk ordering/palette constraints, then verify image data with a bounded decoder or equivalent bounded decompression/scanline validation before reporting render success. Enforce an output cap derived from the accepted dimensions and pixel format; do not add unbounded inflation. The checks should remain deterministic code. Add the three CRC-correct malformed cases above to `src/__tests__/unit/authoredImage.test.ts:174–194`; its current corruption tests detect hash/CRC changes and trailing bytes, so they miss internally consistent but undecodable data.

## Contract and trust-boundary observations

No additional definite defect was established in the reviewed scope.

- `renderFigureSpec.ts:115–125` dispatches only the explicit authored-image kind and fails closed without the server-supplied asset map. The request spec schema is strict and contains IDs/hashes, not bytes, markup or URLs. `authoredImage.ts:204–225` resolves the registered ID, verifies generation-record shape and compares exact asset/binding hashes. Markup at line 256 is fixed with integer dimensions and base64 PNG; request text is not interpolated into SVG. The adapter itself does not perform filesystem/network lookups.
- Trusted means **server-established** here. `SavedAuthoredImage` and its generation/evidence hashes are records supplied by server code, not cryptographic proof of provenance, real classification membership or review truth. The renderer cannot prove those facts from nonempty hash strings. This is consistent with its documented boundary; no caller deserializing request JSON into that map was found in the source references inspected. Keep request JSON out of both `assets` and `purpose`.
- `authoredImage.ts:229–253` makes a mismatched review stale and holds every check; approved-display cannot pass that stale record. Current rejects in the eight student/grade surfaces block even preview. An executed probe confirmed current `withinGradeMethod: reject` returns `ok: false`; after changing the math binding and recomputing the request hash, the old review is stale and preview succeeds with **all 13 checks held**, not approval. This distinction is observable and should be intentional: the code does not preserve stale exclusions as permanent bans on a revised candidate.
- Applied-edition selection is deterministic (`authoredImage.ts:209–213`), restricted to middle-school grade 3. This review did not independently certify official curriculum applicability. Its declaration is a gate input, not proof of every method used by the student content.
- Binding hashes include student/diagram digests, parameters, curriculum, classification snapshot and variant metadata. The renderer does **not** receive actual current student content or vector diagram bytes to recompute those two content digests. Thus it checks consistency with the trusted binding, not consistency with whichever problem a caller later attaches the returned SVG to. A future consuming path must bind its real content/diagram to those digests; do not describe this helper alone as end-to-end stale-problem protection.
- The authored-image branch preserves the initial aborted-signal check and bypasses Python/MathJax. It returns a standalone raster-panel SVG, not a raster-plus-vector mathematical composition. It never evaluates `factRelations`/`constraints`; those strings and `calculationAuthority` record intent. Deterministic math validation and composition with a checked diagram remain caller responsibilities. The result explicitly has `problemApproval: false`.
- Existing renderer call sites do not supply the new asset option in the source references inspected; the test does exercise the opt-in branch. Consequently this is a reusable opt-in adapter, not evidence that production generation/adoption routes already serve these assets. The missing-map rejection prevents silent fallback to unchecked image support. No generic vector engine raster/URL permission was widened in the reviewed diff.

## Additional test gaps, not additional proven defects

`authoredImage.test.ts:98–120` says curriculum changes stale evidence but currently mutates facts, student digest, diagram digest and variant text only. Add actual curriculum/classification changes and a regenerated-spec-with-old-review check; the old-spec cases currently stop at the earlier spec-hash comparison. Verify stale review behavior through the runtime entrypoint too. Canonical key-order invariance, empty/unknown review keys, missing asset/ID mismatch, PNG dimension/byte limits, APNG, truncated chunks and valid multi-IDAT input deserve explicit boundary cases. The final test at lines 197–205 checks cancellation/null only; it does not render an ordinary vector spec and establish that the pre-existing vector behavior survives. Parent's scoped typecheck and native two-asset verification remain separate work and were not claimed here.

## Method, documentation and scope

Read the project-installed `.agents/skills/typesafe-ai/SKILL.md` and live [documentation index](https://docs.typesafe.ai/llms.txt), [confidence](https://docs.typesafe.ai/confidence) and [state](https://docs.typesafe.ai/concepts/state) pages. The `.md` confidence/state URLs failed in the browser tool, then the normal pages succeeded. The guidance distinguishes model uncertainty from correctness and asks for relevant facts/relationships in state. Applied here: byte parsing, hashing, arithmetic and exclusion policies stay in code; any later semantic grade/classification/similarity judgment needs its actual versioned state and separate review evidence. No confidence value can manufacture missing evidence or rights permission. No AI evaluation/API or DB request was made; documentation browsing only.

Probes ran through `node` stdin and in-memory TypeScript transpilation with the parent's installed dependencies, avoiding test-runner cache writes to the parent. The fixture block was read from the requested unit test; no pending blind author answers or source exam content were opened. No standalone asset files were created. No full suite, app build, scoped typecheck, native image visual review, independent mathematical solve, rights review or curriculum approval was performed. No parent files, old evidence, controller, installs, generated clients, branches or deployment were changed; no workers or pushes.

Parent snapshots (SHA256, identical on initial probe and final pre-report reread):

- `src/lib/engine/authoredImage.ts`: `f291067e9a0ffe23e6a71d71c9e0ab0b493aa1b6e5759fd3abd86e88598e2ca0`
- `src/lib/figure/renderFigureSpec.ts`: `19c10c1cb1aa416cbb376314931bb9dcdce45d17b3f707fb3c2b9dfb157598df`
- `src/__tests__/unit/authoredImage.test.ts`: `0847a4ac1b1e50d265d8e5dc80e610f57a24780cb5771dea3e0af0135b451887`

Only this new report is saved by this follow-up. Existing source-identity commits and snapshots remain intact.
