# OCR quality fixes and keyless replay

This harness authors source fixtures, freezes the HTTP bodies serialized by
`executeStudioTask → runModelApi`, and replays raw replies produced by a separate
API owner. It never reads a real key or loads application `.env` files. Fetch,
HTTP and HTTPS are blocked except for the in-memory replay fetch implementation;
no browser, server, database, production import or deployment runs here.

Use an absolute evidence directory outside Git:

```sh
node scripts/qa/ocr-quality-20261022/run.mjs capture /absolute/evidence
node scripts/qa/ocr-quality-20261022/run.mjs replay /absolute/evidence /absolute/response-map.json
node scripts/qa/ocr-quality-20261022/run.mjs guards /absolute/guard-evidence
```

For independent sources, pass an empty response-map argument during capture and
an external SVG manifest as the fourth argument. The manifest supplies immutable
SVG SHA256, required/excluded pixel regions, source stem and observed choice
count. Only the image and task are sent to the model. A fresh fixture may also
require `expectedChoiceLayout: "auto"`; this does not alter old expectations.

`shadow-capture` and `shadow-replay` explicitly override the actual API call to
Opus 5.5 / high / 8,192 tokens for QA. Normal modes use the supported Opus 5 route
with medium / 4,096 evaluation limits. Product routing, allowlists and defaults
are unchanged. Raw response `model` must equal the captured requested model.

Response maps have shape `{ "responses": { "case-id.1": "/absolute/raw.json" } }`.
Missing dependent replies remain pending; no synthetic reply substitutes for a
live result. Existing files are compared byte for byte before reuse. Summaries
retain transport/schema failures and objective quality failures separately.
Replay exits 1 for transport/schema/pending failures and 2 for quality failures;
exit 0 requires all frozen objective checks to pass. Earlier transport-only
exit-0 history remains in external evidence and is not a quality success.

Objective page checks count every dark source pixel in each authored required
region and every excluded neighboring/key/workspace pixel inside a returned
crop. Any lost or foreign pixel fails; warnings do not make a failed crop pass.
Text checks normalize whitespace and math delimiters, not language or numbers.
Choice checks preserve observed count and the conservative completeness flag.
The optional layout expectation is checked only when independently authored.
`summarize.py` displays raw counts and a clearly labeled post-hoc loss-size bin;
that bin never changes a pass/fail expectation.

For the base replay, `OCR_BASELINE` is set only for the `baseline-v2` evidence
root. Its alias points to `base-snapshot/src/lib`, exported unchanged from
`35169949839a97e2ff0eefb6e348e260575bc85a`; export `scripts/figure` there too for
relative catalog imports. The external provenance bindings verify this snapshot
against Git. Other modes use the current source. Vitest uses one worker and an
empty `server-only` test shim; it does not change the product boundary.

See [REPORT.md](REPORT.md) for measured results and limitations. Input images,
expectations, requests, raw replies, parsed results, logs and immutable history
remain under the external evidence root named there.
