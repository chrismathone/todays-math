# Studio figure data pipeline

The Studio data contract follows Mathgen's `useFigureCropDetect`, `figureCrops`,
and `Step1_5CropInspect` source-page geometry. Detection runs through the existing
development subscription CLI bridge only after an explicit action. It does not
run on mount, generate drawings, or use an external paid API fallback.

| Data                                          | Coordinates                                                   |
| --------------------------------------------- | ------------------------------------------------------------- |
| `StudioCrop.rect`, `StudioFigure.rect`        | Source page, normalized 0–1                                   |
| `figures` action `result.figures[].bbox`      | Supplied problem image, normalized 0–1000                     |
| `page-ocr` `result.problems[].figures[].bbox` | Source page, normalized 0–1000; never relative to the problem |

`StudioFigure` contains `id`, `rect`, and the cropped pixel `image` data URL.
`StudioCrop.figures` and `reviewed` are optional for backward compatibility.
Missing figures means no detection result yet; `[]` means an explicit empty
result. A missing `figures` field in a figures-action response is a retryable
error, preserving the current crop.

`processCrops("figures", ids)` maps crop-relative boxes to the page and intersects
them with the parent problem. Page OCR extracts its optional figures from the
original page canvas. Invalid or out-of-image model boxes are removed with
warnings; disjoint or sub-8-pixel boxes are removed during cropping. Canvas or
image decoding failures preserve current data and allow explicit retry.

Figure detection never patches content, answer, or solution. Ownership checks
cover abort, source/page/view replacement, crop revisions, rectangles, figures,
review state, and edits made while image decoding is pending. AI changes to text,
answers, solutions, or figures clear `reviewed` and `added` and advance the
revision; warning-only or identical results retain these fields and stable figure
IDs. UI edits must advance the revision and clear review/add state; the UI owns
recropping when a problem rectangle changes.

Text export uses the existing `figureUrls` and flattened `[width,height,...]`
`figureDims` fields. Populate optional `sourceSize: {width,height}` with original
page canvas pixels for manual crops and recrops; page OCR supplies it itself.
For older crop images, explicit figure detection can recover approximate page
pixel dimensions from crop size and normalized bounds. `sourceWidthMm` is an
optional measured page width: when known it supplies `figureSourceMm`; unknown
physical dimensions remain absent. Image export retains the full problem crop
and emits no duplicate figure images. Raw elementary fractions remain unchanged.

Focused verification uses mocked CLI responses and canvas pixels, with no AI
inference: `devAiTasks.test.ts`, `studioAiFigures.test.ts`, `useStudioAi.test.tsx`,
`devAiClient.test.tsx`, and `devAiRoute.test.ts`. They cover schema bounds,
coordinates, clipping, stale replies, image failures/retry, no text overwrite,
review preservation, and figure durability through the existing draft store.
