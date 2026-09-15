# Shared public figure migration

Node 20+ and Git are the only dependencies. Run commands from the repository root.
This tool handles **Git-tracked image files in `public/figures` and
`public/figures-svg` only**. The default command is an offline dry-run.

## Commands

```sh
# Scan the complete current tracked figure set. No output files or HTTP requests.
node scripts/storage/shared-figures-cli.mjs

# Write a new deterministic manifest. Parent directory must already exist.
node scripts/storage/shared-figures-cli.mjs manifest --out shared-figures.manifest.json

# Recheck an existing manifest against the current source without HTTP requests.
node scripts/storage/shared-figures-cli.mjs dry-run --manifest shared-figures.manifest.json

# Explicit remote write opt-in, using credentials already set in the environment.
node scripts/storage/shared-figures-cli.mjs upload --manifest shared-figures.manifest.json --bucket shared-figures --receipt shared-figures.upload.receipt.json

# Independent anonymous full download verification; no service key required.
node scripts/storage/shared-figures-cli.mjs verify --manifest shared-figures.manifest.json --bucket shared-figures --receipt shared-figures.verify.receipt.json

# Hermetic tests: temporary Git repositories and an injected in-memory fetch.
node --test scripts/storage/shared-figures.test.mjs
```

`upload` and `verify` require `SUPABASE_URL`, a credential-free HTTPS origin.
`upload` also requires `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
Set these outside the command arguments using the operator's environment or
secret manager; the CLI never loads `.env` files. Bucket creation/public access
configuration, credentials,
live execution, application routing, deployment, and rollout belong to the
coordinator. The bucket must already exist and permit public image downloads.

Every output filename must be a new `.json` file. Existing manifests and receipts
are preserved, including when a run fails. Choose a new receipt filename when
repeating verification. The CLI never deletes local assets, changes Git state,
creates buckets, lists buckets, accesses the database, uploads untracked files,
or sends PUT/DELETE requests.

### Upload credentials

Prefer `SUPABASE_SECRET_KEY` for the current `sb_secret_...` format. Existing
`SUPABASE_SERVICE_ROLE_KEY` configurations with a legacy `service_role` JWT
continue to work. A nonempty `SUPABASE_SECRET_KEY` takes precedence; an unset or
empty value falls back to `SUPABASE_SERVICE_ROLE_KEY`. An invalid or rejected
selected key stops the upload without trying the other key.

Headers follow the selected key's format, regardless of the variable name:

| Key format                             | Upload headers                       |
| -------------------------------------- | ------------------------------------ |
| `sb_secret_...`                        | `apikey` only                        |
| Legacy JWT with `role: "service_role"` | `apikey` and `Authorization: Bearer` |

This also supports operators who previously placed a new secret key in the
legacy variable. Publishable keys (`sb_publishable_...`), legacy `anon` JWTs,
user JWTs, malformed keys, and keys containing whitespace/control characters
are rejected before any HTTP request. Local JWT decoding checks the role only;
Supabase remains responsible for authenticating the key and signature.
Dry-run and public verification require no key. Public GETs never include
credentials, including during upload, and logs/receipts never include keys.

Audited against Supabase's official [API key documentation](https://supabase.com/docs/guides/getting-started/api-keys)
on 2026-09-15: secret keys are opaque, provide `service_role` access, and belong
in `apikey`, not a JWT Bearer header. New and legacy keys can coexist. Previously
this tool read only the legacy environment variable and sent every key in both
headers; the format-aware selection above corrects that behavior.

## Manifest contract

```json
{
  "schemaVersion": 1,
  "sourceCommit": "<full lowercase Git commit hash>",
  "entries": {
    "/figures/a.png": {
      "objectPath": "v1/<64-character lowercase SHA256>/figures/a.png",
      "mimeType": "image/png",
      "size": 123,
      "sha256": "<64-character lowercase SHA256>"
    }
  }
}
```

The example values illustrate the shape; generated manifests contain real hashes
and sizes. Map keys are the original same-origin URLs. Immutable object paths
are exactly `v1/` + SHA256 + original URL. The target bucket and Supabase origin
are deliberately separate from the manifest so identical content can be verified
against different approved targets.

`canonicalManifest()` sorts entry paths by JavaScript string order, emits header
fields as `schemaVersion, sourceCommit, entries`, emits each entry's fields as
`objectPath, mimeType, size, sha256`, and serializes with two-space indentation
plus one trailing LF. `manifestSha256()` hashes these UTF-8 bytes. Consumers must
use that exported helper rather than hashing arbitrary JSON formatting.

Paths are limited to ASCII letters/digits, underscores, hyphens, dots, and `/`
under the two exact roots. Empty segments, `.`/`..`, backslashes, escapes, query
strings, fragments, symlinks, and filesystem junctions fail closed. Allowed
extensions are png, jpg, jpeg, svg, webp, gif, and avif, with their fixed image
MIME types. Empty or partial manifests are rejected by the migration tools.
An application's empty placeholder manifest is not an uploadable manifest.

### Git identity and Windows line endings

Generation checks the complete scoped Git tree at current `HEAD`, the index,
and actual local bytes against each Git blob hash. It checks Git identity again
after scanning. Untracked files are ignored. Unrelated application or tool edits
do not block the figure scan. Staged additions/deletions, dirty tracked images,
missing images, and modified files hidden by `skip-worktree` are rejected.

For SVG only, Windows CRLF checkout bytes may normalize to LF **only if the
result matches the committed Git blob hash exactly**. SHA256, size, uploaded
bytes, and verification all use that canonical Git content. This keeps manifests
identical across Windows and Linux. No other conversion is applied. Differences
not explained by this exact match require restoring the committed image content.

Upload/verify rebuild the complete manifest before any HTTP request and after
all object checks. An older `sourceCommit` is accepted only if it is an ancestor
of current `HEAD` and the entire scoped tree is identical. Current `HEAD` must
stay fixed during a run. A shallow clone missing that ancestor cannot perform
migration: use the complete source checkout. Runtime consumers can validate the
manifest and receipt separately without requiring this Git history.

## Resume, retries, and verification

The checkpoint is remote content: each object first receives an anonymous GET
at `/storage/v1/object/public/<bucket>/<objectPath>`. Reuse requires HTTP 200,
matching MIME, exact byte count, and SHA256 of the **entire streamed response**.
No HEAD response, ETag, progress file, old receipt, or existence-only check is
trusted. Oversized responses stop as soon as they exceed the manifest size.

Only an explicit missing-object response permits upload. POST uses
`x-upsert: false` and immutable one-year caching. A duplicate insert or lost POST
response can recover only through successful public byte verification. Wrong
bytes/MIME at the target path are a fatal conflict and are never overwritten.
Unrelated objects are never read or mutated. A private/missing bucket is a
failure, not permission to create or reconfigure one.

`--concurrency` defaults to 4 (range 1–16), `--retries` to 3 (0–8 additional
attempts), and `--timeout-ms` to 30000 (1–120000 per request, including body reads).
Transport failures, HTTP 408/429/5xx, and temporary post-upload visibility gaps
retry with bounded exponential delays. Other HTTP failures and content
mismatches stop the run. Workers already in flight settle before failure is
returned. Run `upload` again to continue a partial run; already matching objects
are fetched and reused. This is whole-object resume, not multipart/TUS resume.

The REST behavior follows Supabase's [standard upload documentation](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
and [storage error codes](https://supabase.com/docs/guides/storage/debugging/error-codes).
Missing/duplicate responses recognize current codes and the narrow legacy
equivalents; arbitrary HTTP 400/404 responses do not authorize an upload.

## Success receipt and integration

Only a completed upload or verify run returns a receipt with:

- `schemaVersion: 1`, `status: "verified"`;
- `manifestSha256`, `sourceCommit`, `verifiedCommit`;
- `target: { supabaseUrl, bucket }` and derived `publicBaseUrl`;
- `count`, `totalBytes`, `uploaded`, `reused`, and `verifiedAt` (UTC).

`uploaded` counts completed items for which this invocation received a successful
POST/duplicate response; an ambiguous lost POST that succeeds remotely can count
as reused after its successful GET. It is diagnostic, not an insert audit.
`count`, `totalBytes`, target, and digest are the acceptance fields. A failed run
never produces a new success receipt. Receipts contain no key, request headers,
raw HTTP bodies, or raw transport errors. They are local verification records,
not cryptographically signed attestations or deployment authorization.

Reusable source helpers live in `shared-figures.mjs`: `validateManifest`,
`manifestSha256`, `canonicalManifest`, `validateTarget`, `publicObjectUrl`,
`readVerifiedFigure(repo, originalPath, entry)`, `buildManifest`, and
`assertManifestSource`. Transfer implementation is in `transfer.mjs`.
`readVerifiedFigure` checks safe filesystem traversal and canonical bytes; it
does not require Git history. A separate deployment integration must validate
the receipt/target and exact deployed file set before any removal or activation.
