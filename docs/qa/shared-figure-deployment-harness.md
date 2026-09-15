# Shared figure deployment and export QA

Run [the harness](../../scripts/qa/verify-shared-figure-deployment.mjs) against an
explicit deployed HTTPS origin after the coordinator uploads and verifies the
shared figure bucket and deploys the application. It makes read-only figure
requests and writes local evidence; it does not manage storage or deployments.

## Commands

From a checkout with installed dependencies:

```powershell
node scripts/qa/verify-shared-figure-deployment.mjs --origin https://YOUR-PREVIEW-HOST --out .qa-artifacts/shared-figure-preview
node scripts/qa/verify-shared-figure-deployment.mjs --origin https://YOUR-PRODUCTION-HOST --out .qa-artifacts/shared-figure-production
```

Replace the host with the actual deployment host. An origin containing a path,
query, fragment, or credentials is rejected. Each output directory must be new
or empty; an existing run is preserved and the new invocation fails.

In this dependency-free Orca worktree, use the existing root installation
explicitly (no install, package changes, symlink, or env-file loader is needed):

```powershell
node scripts/qa/verify-shared-figure-deployment.mjs --fixture --out .qa-artifacts/shared-figure-local-run --dependencies C:/Creative/testautocreator/node_modules
node scripts/qa/verify-shared-figure-deployment.mjs --origin https://YOUR-PREVIEW-HOST --out .qa-artifacts/shared-figure-preview-run --dependencies C:/Creative/testautocreator/node_modules
```

The script uses Node, Git, an installed Chromium/Chrome/Edge, Python, and existing
project dependencies: `tsx`'s esbuild, Puppeteer, PDF.js, Zod and Chromium support.
It bundles the checkout's existing TypeScript export helpers into the output
directory while resolving packages from `--dependencies`. The source Git commit
in the manifest must be available locally; canonical bytes come from `git show`,
so deleting the checkout's public files during deployment preparation does not
remove the reference data. No app server, private database, or AI is used.

`PDF_CHROMIUM_EXECUTABLE` and `PYTHON_BIN` retain their existing helper meanings.
The PDF helper may fetch its public font stylesheets; its Linux launcher may
download its Chromium pack unless a local executable is specified. The fixture
replaces figure delivery only and should not be described as fully offline.

## Protection bypass and PDF bridge

For a protected preview, the operator can supply
`VERCEL_AUTOMATION_BYPASS_SECRET` in the process environment. The harness reads
this variable directly and sends `x-vercel-protection-bypass` only to the explicit
origin's selected figure URLs and missing-path probes. It never loads env files,
puts the secret in URLs, emits raw request/response diagnostics, writes request
headers, captures a HAR, or saves the secret in evidence. The synthetic browser
document and canonical data URLs do not receive the header. Browser image
redirects are blocked before a second request; Node requests use manual redirect
handling and reject redirects without following them.

The current `buildPdf` helper launches its own browser with no header/cookie hook.
Consequently a supplied bypass variable requires **explicit** `--pdf-proxy`:

```powershell
# The operator has already supplied VERCEL_AUTOMATION_BYPASS_SECRET in the environment.
node scripts/qa/verify-shared-figure-deployment.mjs --origin https://YOUR-PREVIEW-HOST --pdf-proxy --out .qa-artifacts/shared-figure-protected-preview --dependencies C:/Creative/testautocreator/node_modules
```

This bridge listens on an ephemeral `127.0.0.1` port. It accepts only GET/HEAD for
the two exact selected paths, fetches those paths from the explicit deployment,
and checks status, no redirect, MIME, manifest SHA ETag, SVG CSP, size and SHA
before relaying bytes. The bridge passes only image MIME/length to PDF's browser.
Its upstream checks appear in `pdfBridgeRequests`.

**Bridge limitation:** PDF's browser uses loopback as its allowed asset origin.
This proves the local PDF pipeline embeds verified deployment bytes, but does
not prove that its browser can access the protected deployment directly or that
it processes the deployment's image response CSP. The separate browser/HWPX
checks still fetch the explicit deployment directly. A bridge pass is recorded as
`pdfTransport: "explicit-loopback-bridge"`; it must not be reported as a direct
deployed-origin PDF pass. Use the default `direct-origin` mode for public
production acceptance, with no bypass variable in that process environment.

## Checks and evidence

| Check                     | Acceptance                                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical source          | Validate the checked-in manifest; read each selected asset from its `sourceCommit`; verify byte size and SHA-256. Record manifest hash, Git HEAD and harness hash.                                                                                                       |
| Original same-origin URLs | GET and HEAD each return 200, exact MIME, matching length when provided, no redirect/Location, and the manifest `"sha256-…"` ETag. GET bytes match the canonical SHA/size; HEAD exposes no body.                                                                         |
| Actual proxy evidence     | Require the manifest SHA ETag on both methods. SVG must also have exactly `default-src 'none'; style-src 'unsafe-inline'; sandbox`. Correct bytes served as ordinary static files do not pass.                                                                           |
| Missing paths             | A randomly named absent PNG path under `/figures/` and SVG path under `/figures-svg/` both return 404 for GET and HEAD, without redirects. These are absent-path probes, not invented positive manifest fixtures.                                                        |
| Browser                   | A fresh browser, disabled cache/service workers, actual same-origin image requests, successful decode, nonblank images, matching dimensions and SHA-256 of decoded RGBA pixels against Git-backed data URLs. Record every selected image response status/redirect count. |
| HWPX                      | Run existing `collectHwpxLayout`, local `buildHwpxParts`, and `hwpxZip`; compare live/canonical layout and image pixels; require two image objects/assets; inspect actual ZIP stored entries and section image references.                                               |
| PDF                       | Run existing `buildPdf` for deployment images and Git-backed data URLs. Render both actual PDFs with installed PDF.js and require identical page pixel hashes, a raster image paint, and visible ink inside both image regions.                                          |

The existing HWPX helper is forced to its local Python writer by removing
`STUDIO_ENGINE_URL` and `VERCEL` from this QA process's environment. The parent
shell environment is unchanged. No signed remote engine or deployed export API
is called.

The browser navigates to a locally intercepted synthetic document at the chosen
origin; **only that document** is substituted. Its PNG/SVG requests go directly
to the deployment with their real response headers and bytes. This is not an
inspection of an application page, its HTML CSP, authentication flow, worksheet
UI, or deployed PDF/HWPX endpoints. The harness tests the local checkout's export
helper implementation using deployment assets. Bucket identity, full object
inventory and cloud build exclusion remain coordinator-owned evidence.

### Real samples

Defaults are the first manifest PNG by path and the smallest Git SVG containing
inline CSS/style, with path order breaking size ties. For the current manifest:

| Type | Actual manifest path                                          | Canonical SHA-256                                                  |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| PNG  | `/figures/1111/q06.png`                                       | `e1a21dcdd5edb509dd080ecb5a9138e73394f5818d16dbd230e16789fd31cfb0` |
| SVG  | `/figures-svg/rpm/019fd1d5-bb46-77ad-bab9-cc661c214052/0.svg` | `38798cff61039b465705ba3077640ee413983dc2ba7e2854582048ed9cc490ff` |

Use `--png /figures/...png --svg /figures-svg/...svg` to select different actual
manifest entries. The SVG override must contain inline CSS/style. This is a
two-image smoke test, not a verification of all 18,827 objects or every format.

The chosen SVG uses real `style="mix-blend-mode:multiply"` attributes. The harness
also compares a local data-URL variant with inline styles removed and reports
`svgStyleChangesPixels`. For this sample the value is **false**: its selected
blend styles do not change the sampled rendered pixels. Accordingly this result
does not independently demonstrate visible sensitivity to a stricter style CSP.
The real SVG, its exact CSP, source bytes and rendered output are still checked;
no synthetic style-proof path is added to the live manifest.

### Output

`result.json` contains the verdict, mode, origin, revisions, selected paths,
HTTP metadata, decoded pixel hashes, export hashes, and any failure stage. A
compact summary goes to stdout; any failure exits nonzero. Raw exceptions are
suppressed to keep request secrets out of diagnostics. A dependency/runtime
failure can therefore need a separate local investigation.

Other artifacts include:

- Downloaded PNG/SVG samples and `runtime.cjs` compiled from local helpers.
- `browser-deployed.png` and `browser-canonical.png` screenshots.
- `shared-figures.hwpx` and its two extracted `hwpx-image*.png` images.
- `shared-figures.pdf`, `canonical.pdf`, `pdf-deployed.png`, and `pdf-canonical.png`.

`status: "passed"` with `mode: "local-fixture"` is local validation only. A
production acceptance record must identify `mode: "live-deployment"`, the real
production origin, and `pdfTransport: "direct-origin"`. Preserve preview and
production reports separately and associate them with the coordinator's upload
receipt and deployment record.

## Local validation — 2026-09-15

Validation used Node 24.13.0, Edge 153.0.4234.32, the installed root dependencies,
and source commit `6897d28554fe517ec446f7a230eb6ea06e201901`. The manifest has
18,827 entries and canonical hash
`796e269181df6fee721e7f3ab680290f1667a3b73f7f8681999361122c4491b8`.

- `.qa-artifacts/shared-figure-direct/result.json`: passed eight HTTP probes,
  two browser pixel matches, two HWPX image matches, and one PDF page pixel match.
  Both PDF image regions contain visible ink. The rendered PDF was visually
  inspected and contains both figures.
- `.qa-artifacts/shared-figure-protected/result.json`: passed the same checks
  using a synthetic protection secret and explicit PDF bridge. The fixture
  requires the header, exercising header propagation to browser and bridge.
  `secret-scan.json` records that the synthetic secret, its URL encoding and its
  base64 encoding are absent from all 13 artifacts and captured stdout/stderr.
- Six fault-injected runs returned nonzero for redirects, incorrect GET MIME,
  changed bytes, incorrect HEAD MIME, a missing path returning 200, and removal
  of proxy-identifying headers. Each saved its corresponding failure stage.
- Node syntax checking and focused ESLint passed using the root ESLint config.
  The dependency-free checkout produces a harmless React version-detection
  warning while linting this standalone JavaScript script.

Reproduce a rejection, expecting exit code 1:

```powershell
node scripts/qa/verify-shared-figure-deployment.mjs --fixture --fixture-fault static-headers --out .qa-artifacts/shared-figure-rejection-run --dependencies C:/Creative/testautocreator/node_modules
```

Other fixture faults: `redirect`, `mime`, `bytes`, `head-mime`, `missing-200`.
Fixture mode uses the existing shared-figure asset handler with Git-verified
upstream bytes, and an ephemeral local HTTP server; it does not run Next routing,
hosting protection, or a real CDN. Live preview/production execution is left to
the coordinator after upload and deployment.

Before implementation, the installed Next 16.3.0 guides for Route Handlers,
rewrites and public assets were consulted. In particular, `afterFiles`
rewrites follow public file lookup, motivating the explicit proxy-header checks.
