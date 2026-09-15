# Shared public figure delivery

The shared figure route proxies verified image bytes from a fixed external
Supabase public bucket. Browsers and headless PDF export keep using the original
same-origin `/figures/...` and `/figures-svg/...` URLs.

## Activation and ownership

The runtime requires both:

1. `SHARED_FIGURE_CDN_BASE_URL` set to the HTTPS public bucket/base directory,
   for example `https://PROJECT.supabase.co/storage/v1/object/public/shared-figures/`.
2. A nonempty, valid deployment manifest statically imported from
   `src/config/shared-figures.manifest.json`.

The checked-in placeholder has an empty `entries` object, so the new route is
disabled until the coordinator replaces it with the verified migration manifest.
The base URL and manifest are compiled into the handler at module initialization;
restart/redeploy when changing either. The base URL contains no credentials,
query, fragment, percent escapes, whitespace, backslashes or dot segments. Both
forms with and without the final slash identify the same base directory.

The coordinator owns deployment activation, `next.config.ts` afterFiles rewrites,
and the GET/HEAD auth bypass for the original shared figure paths. Expected rewrite
destinations are `/api/shared-figures/figures/:path*` and
`/api/shared-figures/figures-svg/:path*`. Using afterFiles lets existing local
public files retain their usual behavior; absent files reach this route.

The handler has no filesystem reads, directory enumeration, database access,
remote manifest fetches or private-library imports. Its only bundled asset input
is the static JSON manifest. No changes are needed to the headless PDF same-origin
asset policy. Private `/api/library` behavior remains owned by its existing routes
and auth policy.

## Deployment manifest contract

The coordinator-approved schema is:

```ts
{
  schemaVersion: 1,
  sourceCommit: "<lowercase 40- or 64-character Git commit hash>",
  entries: {
    "/figures/book/figure.png": {
      objectPath: "v1/<sha256>/figures/book/figure.png",
      mimeType: "image/png",
      size: 1234,
      sha256: "<64 lowercase hex characters>"
    }
  }
}
```

Each object path must be exactly `v1/${sha256}${originalURL}`. Entry keys are
restricted to `/figures/` and `/figures-svg/`; the latter contains SVG files only.
Supported extensions/MIME types are PNG, JPEG (`jpg`/`jpeg`), GIF, WebP, AVIF and
SVG. Sizes must be positive safe integers. Any invalid entry disables the entire
manifest, preventing partial activation of a malformed deployment.

Original path segments may contain Unicode and interior spaces. Empty segments,
`.`/`..`, slashes inside segments, backslashes, percent escapes, URL delimiters,
control characters and surrounding whitespace are rejected. The handler also
checks the available request URL so encoded separators cannot become permitted
catch-all segments during a rewrite. The manifest is an exact allowlist; query
parameters, cookies, host headers and request-provided URLs never select an
upstream destination.

## Responses and caching

| Condition                                                                                     | Response                                     | Upstream request                             |
| --------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Missing/invalid base, missing/empty/invalid manifest                                          | Empty `404`, `Cache-Control: no-store`       | None                                         |
| Missing asset or unsafe path                                                                  | Empty `404`, `Cache-Control: no-store`       | None                                         |
| Verified GET                                                                                  | `200` with exact original image bytes        | Anonymous GET of the one manifest object     |
| Verified HEAD                                                                                 | `200` with GET metadata and no response body | Full GET, with the same byte verification    |
| Matching `If-None-Match`                                                                      | Empty `304` with the current ETag            | Full verification before reporting unchanged |
| Redirect, any status other than `200`, timeout, transport/body error, MIME/size/hash mismatch | Empty `502`, `Cache-Control: no-store`       | No redirect/retry                            |
| Unsupported method                                                                            | `405`                                        | None                                         |

Upstream requests use `redirect: error`, `credentials: omit`, `cache: no-store`,
`Accept` set to the manifest MIME type, `Accept-Encoding: identity`, and a
15-second timeout. Incoming authorization, cookies, ranges and conditional
headers are not forwarded. Unexpected redirected/final URLs are rejected even
if a fetch implementation follows one despite the requested policy.

Only a complete `200` response is accepted. MIME must match the manifest (MIME
parameters are permitted); nonidentity content encoding is rejected. A supplied
Content-Length must match, and the actual streamed bytes must independently
match both size and SHA-256. Oversized streams are cancelled before further
buffering. No bytes are sent to the client until verification finishes. This
costs one upstream full-object read per uncached handler request, including HEAD
and conditional requests, and buffers at most the manifest-sized object plus
the final response copy.

Successful original URLs use:

```text
Cache-Control: public, max-age=0, s-maxage=300, must-revalidate
ETag: "sha256-<manifest sha256>"
Content-Type: <manifest MIME>
Content-Length: <verified size>  # 200 GET/HEAD only
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox
```

The original URLs can change on a later deployment, so they never receive an
immutable year-long cache policy. A shared cache may retain verified originals
for five minutes. The immutable upstream hash URLs may separately use a year-long
cache policy established by migration tooling; upstream cache headers, ETags,
cookies and redirect locations are never copied to the client.

## Verification

Run the focused suite without any live service access:

```text
node node_modules/vitest/vitest.mjs run src/__tests__/api/sharedFigures.test.ts
```

The suite uses mocked fetch implementations for allowed PNG/SVG bytes, internal
and original paths, manifest activation, invalid configuration/manifest entries,
traversal and encoded separators, arbitrary URL input, MIME/length/hash failures,
non-200 statuses, redirects, timeout/network/stream errors, oversized stream
cancellation, HEAD, ETag revalidation and both Next route exports. Tests mock the
manifest where needed, so replacing the placeholder with the real deployment
manifest does not change their inputs.

Local validation: 137 focused tests, focused ESLint, formatting and repository-wide
`tsc --noEmit --incremental false` passed. The local inventory
contains 16,360 raster images (5,752 PNG and 10,608 JPEG) plus 2,467 SVG images;
none are empty, no non-SVG file is under `figures-svg`, and no path violates the
segment length/character rules. Production storage verification,
rewrite/auth integration, deployment tracing and live anonymous/PDF smoke checks
belong to coordinator integration and were not performed by this runtime worker.
