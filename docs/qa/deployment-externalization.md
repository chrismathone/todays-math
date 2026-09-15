# Deployment externalization

The shared figure delivery path and separate GitHub Typecheck job are prepared.
Production now requires the GitHub Typecheck result before assigning its domain.
The inline typecheck switch was enabled on 2026-09-15 after the live promotion
gate proof below. Shared figures remain local until storage upload and full
verification are complete. Creating a workflow alone does not make Vercel wait
for its result.

## Typecheck

`.github/workflows/typecheck.yml` runs the stable **Typecheck** job on every push,
pull request, and manual run. It generates Prisma and Next route types before
checking the complete TypeScript project, with loopback placeholder database
URLs. Its optional manual negative proof verifies that an actual malformed source
file fails. Enable `verify_failure` when manually dispatching the workflow; normal
pushes and pull requests run the complete checker once. The hosted failure proof
was verified before making it optional and took 49 seconds, so it is not repeated
on every deployment.
The first hosted run reached the default Node heap limit (~2 GB); the workflow
now gives Node a 4 GB heap without narrowing the checked project.

Before setting `VERCEL_TYPECHECK_EXTERNALIZED=1`:

1. Observe a successful hosted Typecheck run for the deployed commit.
2. In the **todays-math** project's Deployment Checks, require the GitHub
   **Typecheck** check. Confirm production automatic aliasing and repository
   linkage are configured for this project.
3. Verify a failed/pending check holds production promotion, and a successful
   check allows promotion of the same commit. Record the deployment evidence.
4. Set the switch only in the validated Vercel environment and redeploy.

Next skips its duplicate typecheck only when both `VERCEL=1` and this switch are
set. Ordinary local builds still check types. Existing pre-push checks remain.
Unset the switch and redeploy to restore the inline production check.

Reference: [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks).

### Live promotion gate proof — 2026-09-15

Project `todays-math` in `bigshols-projects` is linked to
`chrismathone/todays-math`, production branch `main`, with automatic domain
assignment enabled. Required check `chk_fcfa7e13-1afd-4e52-8d3b-a3040666e733`
uses GitHub's exact `Typecheck` name, targets production, and blocks deployment
aliasing. The GitHub job result was observed as `succeeded` inside Vercel.

The [verification deployment](https://vercel.com/bigshols-projects/todays-math/8VKrKQGq5dAjwoxrNUMkbxy877qE)
rebuilt the unchanged, passing commit
`c3513b64bc6c3fbb461cac1598a5acdfa14205d7`. A separately named temporary GitHub
status, `Deployment gate verification`, exercised the same required-check path
without altering or fabricating the real Typecheck result:

- Pending: the build reached `READY / STAGED`, with no domain assignment.
- Failure: Vercel recorded the failed check while `todays-math.vercel.app`
  still pointed to the previous deployment `dpl_4VgBwRDw45ef9PS8DXFR2pLTnJH1`.
- Success: the same verification deployment automatically received the production
  domain, verified through the alias API at `2026-09-15T02:54:53Z`.

After that proof, `VERCEL_TYPECHECK_EXTERNALIZED=1` was configured for production
only. Local builds and preview builds retain inline typechecking. The temporary
verification check is removed after the test; the real Typecheck requirement
remains. Build-log confirmation of the enabled switch is recorded with the next
deployment. Evidence JSON is retained locally under `.qa-artifacts/vercel-gate-proof-*`.

## Shared figures

Only Git-tracked `public/figures` and `public/figures-svg` are migration inputs.
The initial inventory has **18,827 files**, **471,962,501 Git-canonical bytes**.
Windows checkouts occupy 475,525,029 bytes because some SVG files have CRLF
line endings. Normalization is accepted only when it exactly matches the Git
blob or manifest hash. Private workspace files, extracted user materials, and
their `/api/library` authorization remain unchanged.

The manifest maps existing `/figures/...` and `/figures-svg/...` addresses to
immutable `v1/<sha256>/<original-path>` objects. The runtime route verifies
downloaded MIME, byte count, and SHA256 before returning bytes. Next afterFiles
rewrites retain same-origin URLs for canvas, PDF, and HWPX. Existing local files
take precedence during rollout. No external redirect or new image host is
required in the PDF renderer's request allowlist.

The runtime uses `SHARED_FIGURE_CDN_BASE_URL`, for example:

```text
https://<intended-project>.supabase.co/storage/v1/object/public/shared-figures
```

The value is public configuration, not a service-role key. The service-role key
is used only by the operator's upload process; it is unnecessary for app delivery.
Use an explicit public bucket for these already shared files. Do not change a
private user bucket's visibility.

### Upload and activate

See [storage tooling](../../scripts/storage/README.md) for the command contract.
Load the intended project's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into
the upload process environment; do not commit either credential. Upload is
resumable: it checks existing public bytes and never overwrites an object.

```text
node scripts/storage/shared-figures-cli.mjs dry-run --manifest src/config/shared-figures.manifest.json
node scripts/storage/shared-figures-cli.mjs upload --manifest src/config/shared-figures.manifest.json --bucket shared-figures --receipt .qa-artifacts/shared-figures-upload.json
node scripts/storage/shared-figures-cli.mjs verify --manifest src/config/shared-figures.manifest.json --bucket shared-figures --receipt .qa-artifacts/shared-figures-verification.json
```

After every public object passes the full-byte check:

1. Copy the verification receipt to `src/config/shared-figures.receipt.json`.
   It contains hashes, target, counts and timestamps, never credentials.
2. Configure the same `SHARED_FIGURE_CDN_BASE_URL` for a preview deployment.
3. Set `SHARED_FIGURE_ASSETS_EXTERNALIZED=1` in that environment. The build
   validates the receipt, complete local inventory, and every local file's bytes
   before excluding any file. Missing/changed/extra files fail the build.
4. Verify deployed image responses, real browser pixels, PDF and HWPX exports,
   and absence of these directories from deployment static output. Only then
   enable the two figure settings in production and deploy.

The exclusion script runs inside Vercel's cloud `/vercel/pathN` checkout and
unlinks only individually verified files under the two managed directories.
It refuses local `vercel build` when the exclusion switch is inherited. For
local builds, unset that switch. Repository originals remain available for
local development and rollback; Git clone size therefore remains unchanged.
Unset the exclusion switch and redeploy to restore local static delivery.
Do not delete immutable storage objects while deployed revisions reference them.

Changes to managed images require a new manifest, upload, verification receipt,
and rollout. The build intentionally rejects an old receipt for a new asset set.
No per-build upload or full remote rescan is performed, so deployment latency
does not grow with a remote transfer on every push.

## Validation

```text
node --test scripts/storage/shared-figures.test.mjs scripts/deploy/prepare-shared-figures.test.mjs
npx vitest run src/__tests__/api/sharedFigures.test.ts src/__tests__/unit/proxyRoleGate.test.ts
npm run build
```

Local test evidence proves the request and export behavior with fixture storage.
Live CDN byte verification, external required-check configuration, and actual
post-switch deployment timing must be recorded separately before claiming that
externalization is active or that deployment time has improved.

Validated on 2026-09-15:

- Hosted [Typecheck run 34918169862](https://github.com/chrismathone/todays-math/actions/runs/34918169862)
  passed for `6c86f76c`, including the real malformed-source failure proof.
- 23 storage/exclusion tests and 163 route, access, PDF and HWPX tests passed.
- A local HTTP fixture used the real verified PNG `/figures/1111/q06.png`, SVG
  `/figures-svg/1318/q10.svg`, and an SVG with inline CSS. All three matched the
  original rendered pixels. The existing PDF builder produced a 57,004-byte PDF;
  the existing HWPX layout/writer/ZIP pipeline produced a valid 181,678-byte HWPX
  with three `BinData` images. No live CDN, production DB or AI calls were used.
- The full manifest is 5,678,581 bytes with canonical SHA256
  `796e269181df6fee721e7f3ab680290f1667a3b73f7f8681999361122c4491b8`.
  It is loaded as a traced server data file to avoid compiling/inferencing the
  entire JSON index as application source.
- The final production build passed (compile 23.6 seconds, TypeScript 15.8
  seconds in this local run). Production-server smoke checks confirmed anonymous
  PNG/SVG GET and HEAD, exact source bytes, missing-image rewrites returning empty
  404s, and retained authentication for `/studio`. The function trace includes
  the manifest and no `public/figures*` image files. These local timings do not
  establish a change in Vercel deployment duration.
