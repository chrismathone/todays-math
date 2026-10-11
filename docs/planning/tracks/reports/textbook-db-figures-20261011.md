# DB textbook retry figures — ownership C

Date: 2026-10-11. Base: `e2de60f0dcb5af3ecf6c7e206c0c40eca271ed74`.
Worker branch: `BIGSHOL/textbook-db-figures-20261011`.
Task: `task_af1531ef012c`; dispatch: `ctx_248bd7ba30d8`.

## Delivered contract

`src/lib/import/schoolTextbook/dbRetryFigures.ts` exports:

- `loadDbRetryFigures(source, options?) → Promise<DbRetryFigures>`.
- `renderDbRetryFigure(spec, content) → Promise<{ svg, figures }>`.
- `figuresFromDbRetrySvg(svg) → Promise<DbRetryFigures>`.
- `DbRetryFigureError`, with a stable `code` and a reason without credentials or
  image payloads.

The loader accepts snake_case DB original fields and camelCase candidate fields.
It reads inline SVG first as stem index `0`, then every URL in its stored order,
preserving the URL array's `choiceFigureIndex`. A missing, malformed, duplicate,
or partial choice mapping rejects the packet instead of inventing stem/choice
ownership. Metadata `figure_dims` is not used to guess intrinsic image sizes:
actual image bytes and SVG dimensions determine whether the picture is readable.
DB figures are generation inputs; no Q/E/G extraction, source import, or shared DB
operation is required by this module.

Each `sha256` hashes the exact bytes encoded in the solver `dataUrl`. Each
`sourceSha256` hashes the bytes read before conversion; for unchanged raster
inputs both hashes are identical. Source SVG fingerprints include UTF-8 BOM bytes.
SVG is rendered locally to PNG at 144 DPI with a white background. PNG/JPEG/WebP
source bytes are preserved after full pixel decoding; supported single-frame
GIF/AVIF sources are converted to PNG for solver input.

The final coordinator/B agreement is:

```ts
reviewDigest(
  images.map((image) => ({
    sha256: image.sha256,
    choiceIndex: image.choiceIndex,
    origin: image.origin,
    sourceSha256: image.sourceSha256 ?? null,
  })),
);
```

Order is significant, and an empty figure packet has `reviewDigest([])`.
Worker B owns the optional `DbRetryImage.sourceSha256` shared type addition; C
does not edit `dbRetry.types.ts`. This digest invalidates evidence when fetched
SVG bytes change even if the resulting PNG pixels remain identical. A reviewer
can rehash PNG bytes; qualification must freshly reload source assets to verify
their source-byte hashes.

## Boundaries and failures

Local paths are limited to `public/figures/**` and `public/figures-svg/**`.
Raw dot segments, encoded segments/separators, backslashes, query strings,
fragments, other public subtrees, and arbitrary hosts are rejected. Canonical
real paths must remain inside the public root, including directory junctions.
Only a missing local file may fall back to the configured shared CDN.

Remote loading reuses `createSharedFigureAssetHandler`, including its complete
manifest validation, response MIME/size/SHA checks, and redirect refusal. A direct
CDN URL must exactly identify an object in that manifest beneath the configured
HTTPS base. The module rejects oversized manifest objects before downloading;
there is no caller-selected request host or remote manifest.

SVG uses the existing static `validDevAiSvg` grammar. Original vector exports may
carry the known inert Inkscape namespace and escaped `data-text` glyph metadata;
these are adapted only in the validation copy, while rendering/fingerprinting
uses the original bytes. Scripts, CSS, entities/DTDs, animation, external
resources, embedded raster images, malformed XML, multiple/nested roots, and
unsupported SVG constructs fail explicitly. Fixed width/height or a finite,
positive viewBox is required; percentage sizes are rejected.

Bounds are 24 images per question, 16 MiB per image, 1 MiB per SVG, 8,192 pixels
per decoded side, 16,777,216 decoded pixels, and a 15-second local PNG processing
timeout. One failed image rejects the whole packet. Existing missing-figure
rules, explicit `[그림]` markers, or `requireFigures: true` reject empty required
evidence instead of yielding text-only success.

New candidates marked `source: "transformed"` cannot reuse source URLs/raster
assets. New diagrams are rendered from a FigureSpec with `strict: true`, after
the existing `figureFabricationReason(spec, candidateContent)` guard. Invalid
geometry or crowded dimensions reject without automatic dimension removal or
repair. `figuresFromDbRetrySvg` supplies generated SVG evidence and rejects
embedded/source raster reuse.

These checks establish byte correspondence and safe rendering. The existing
fabrication guard is limited to printed numeric labels in its supported fields;
it is not independent mathematical validation or complete scene/content
correspondence. Local libvips solver PNG rendering is not a certification of
production Chromium print layout. Those remain B/root checks.

## Exact validation

- `npx vitest run src/__tests__/unit/dbRetryFigures.test.ts
src/__tests__/unit/figureMatchesContent.test.ts
src/__tests__/api/sharedFigures.test.ts` — **3 files / 204 tests passed**,
  including **61 new ownership C tests**, 2026-10-11 15:20 KST.
- `npx eslint src/lib/import/schoolTextbook/dbRetryFigures.ts
src/__tests__/unit/dbRetryFigures.test.ts` — passed.
- `npm run type-check` — passed, exit `0` after fixing test-only Buffer-to-Response
  typings. The initial run exposed exactly three such typing errors.
- Prettier was run on the two owned TypeScript files.

The new tests cover actual Python FigureSpec rendering, strict crowded-dimension
refusal, fabrication, real SVG-to-PNG conversion, raw raster/hash/order/index
preservation, source SVG byte edits with identical pixels, BOM preservation,
missing/invalid evidence, malformed sizes, inherited raster refusal,
path/junction/host attacks, CDN redirects/integrity failures, and pre-download
CDN size bounds. The public SVG sample is a tracked existing asset, not a mock.

## Local visual evidence

Ignored local artifacts are in
`.qa-artifacts/db-retry-figures-20261011/{database-q10.png,generated-triangle.png,proof.json}`.
Both PNGs were opened and inspected; the condition-box text and triangle point/
length labels are visible and readable.

| Picture                                            | PNG dimensions | PNG bytes | Non-white pixels (<245) |
| -------------------------------------------------- | -------------- | --------- | ----------------------- |
| Existing `/figures-svg/1318/q10.svg` condition box | 794 × 193      | 21,322    | 13,967                  |
| New strict FigureSpec triangle with `12 cm`        | 475 × 361      | 7,402     | 6,744                   |

The proof records actual SHA256, source SHA256, ordered figure digest, and local
Sharp `0.35.5` for each image without embedding base64. Installed Sharp types
and its [official constructor documentation](https://sharp.pixelplumbing.com/api-constructor/)
were checked for strict decoding, DPI and pixel limits. Relevant local Next
16.3.8 server/client and module-boundary guides were read before implementation.

## Integration left to coordinator

Cherry-pick C together with B's shared optional source hash type and final review
digest changes, then connect A's generator to the exports above. Run a bounded
actual generation/review/production-page pilot and fresh asset/payload binding
checks before any approval or wider batch. No shared DB writes, paid inference,
whole-batch generation, or production approval were performed by C.

The worktree's `node_modules` is a junction to main's dependencies and was not
removed or modified. Coordinator cleanup must detach that junction without
recursion before removing the completed worktree, preserving main dependencies
and the branch as specified in the brief.
