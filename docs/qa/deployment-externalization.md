# Deployment externalization

> Historical rollout record (2026-09-15). As of 2026-09-23, the GitHub
> `Typecheck` Deployment Check and `VERCEL_TYPECHECK_EXTERNALIZED` production
> environment variable are absent from the live Vercel project. The GitHub
> Actions workflow has been removed. `next.config.ts` now explicitly keeps
> Next.js build-time type checking enabled in every environment. The local
> `pre-push` hook checks types on pushes to `main`; a failed Vercel build cannot
> be assigned the production domain. See
> [current type-check instructions](../../scripts/ci/README.md).

The shared figure delivery path and separate GitHub Typecheck job were prepared
in September 2026. At the time, production required the GitHub Typecheck result
before assigning its domain. The inline typecheck switch was enabled on
2026-09-15 after the live promotion gate proof below. Creating a workflow alone
did not make Vercel wait for its result.

## Historical Typecheck rollout

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
verification check was removed after the test; the real Typecheck requirement
remains. Evidence JSON is retained locally under `.qa-artifacts/vercel-gate-proof-*`.

The first [deployment with externalized typechecking](https://vercel.com/bigshols-projects/todays-math/GVeJrEcMDRqS1UTaKxeEZ26qexoA)
used commit `a15eda7033bf3f36a94063bb04cd6063552015da`. Its build log records
`Skipping validation of types`; the Vercel build-command interval was 35 seconds
versus 48 seconds in the preceding cached verification build. The separate
[GitHub Typecheck](https://github.com/chrismathone/todays-math/actions/runs/34923535780)
passed in 105 seconds, Vercel recorded `succeeded`, and the production alias was
assigned to that deployment. These are individual measurements, not a guarantee
of total deployment time; output transfer, cloning, and cache work still apply.

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
https://pqylrbowrfliicxzurex.supabase.co/storage/v1/object/public/todays-math-shared-figures
```

The value is public configuration, not an upload credential. A Supabase secret
key (or legacy service-role JWT) is used only by the operator's upload process;
it is unnecessary for app delivery.
Use an explicit public bucket for these already shared files. Do not change a
private user bucket's visibility.

### Upload and activate

See [storage tooling](../../scripts/storage/README.md) for the command contract.
Load the intended project's `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or legacy
`SUPABASE_SERVICE_ROLE_KEY`) into the upload process environment; do not commit
credentials. Opaque secret keys use only the `apikey` header. Upload is
resumable: it checks existing public bytes and never overwrites an object.

```text
node scripts/storage/shared-figures-cli.mjs dry-run --manifest src/config/shared-figures.manifest.json
node scripts/storage/shared-figures-cli.mjs upload --manifest src/config/shared-figures.manifest.json --bucket todays-math-shared-figures --receipt .qa-artifacts/shared-figures-upload.json
node scripts/storage/shared-figures-cli.mjs verify --manifest src/config/shared-figures.manifest.json --bucket todays-math-shared-figures --receipt .qa-artifacts/shared-figures-verification.json
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

### Mathgen storage rollout — 2026-09-15

The approved target is the existing **mathgen** project
(`pqylrbowrfliicxzurex`) and its dedicated public bucket
`todays-math-shared-figures`. This storage choice is independent of the
application database connection. The bucket permits image MIME types only and
has an 8 MiB object limit. App delivery uses anonymous public reads; no upload
secret is added to Vercel.

The initial upload completed at `2026-09-15T03:38:23.727Z`: all 18,827 immutable
objects were newly uploaded and individually read back successfully. The
separate anonymous verification receipt is checked into
`src/config/shared-figures.receipt.json` before the preview rollout. Use the
[deployment/export harness](shared-figure-deployment-harness.md) to record
actual hosted image responses and browser/PDF/HWPX results.

The immediately preceding production deployment, `dpl_4qRpJwMWBDsUvD4HdDEdRPUm8HfW`
at `f7323be6`, took 154.295 seconds from creation to ready. Its cached cloud build
reported 21.199 seconds cloning, 46 seconds building, and 76.051 seconds deploying
outputs. Build-cache creation/upload continued after the deployment was ready
and is excluded from that ready duration. The Git checkout retains the original
images; the migration therefore reduces deployment outputs, not Git clone size.

The separate anonymous verification finished at `2026-09-15T03:47:13.524Z`,
matching all 18,827 objects and 471,962,501 canonical bytes. Preview deployment
`dpl_JBZ3ZvnKfRovfA7kMdABrbLsZEcR` and production deployment
`dpl_Hmrsftwyi2Pk463VuicY5vLdJ1eR` both used commit `4006341f`. Both cloud logs
confirmed exclusion of the complete verified inventory before Next built.
Production is `READY / PROMOTED`, and the `todays-math.vercel.app` alias was
checked against that deployment ID.

| Observed production timing | Before (`f7323be6`) | After (`4006341f`) |
| -------------------------- | ------------------: | -----------------: |
| Creation to ready          |           154.295 s |           95.934 s |
| Vercel build command       |                46 s |               37 s |
| Deploying outputs          |            76.051 s |           31.684 s |

These are two observed cached deployments, not a guaranteed duration. Output
transfer fell by about 58%; creation to ready fell by about 38%. Build-cache
upload still runs after readiness and remains roughly 1.07 GB. The originals
remain in Git, and 43 other public files occupy about 5.2 MB in the checkout.

Acceptance evidence:

- [Production Typecheck run](https://github.com/chrismathone/todays-math/actions/runs/34926853915)
  passed for `4006341f`; the required production promotion check remains enabled.
- `.qa-artifacts/shared-figure-live-preview/result.json` passed all eight HTTP
  probes, two browser pixel comparisons, two HWPX images and one PDF page. The
  protected preview used the explicitly documented loopback PDF bridge.
- `.qa-artifacts/shared-figure-live-production/result.json` passed the same checks
  against `https://todays-math.vercel.app` using **direct-origin** PDF requests
  without a protection bypass. PNG/SVG bytes, SHA ETags and SVG CSP identify the
  remote-backed route rather than remaining original static files. The existing
  local export helpers produced a 46,774-byte PDF and 229,713-byte HWPX using
  actual production images; this is not a test of authenticated export APIs.
- Anonymous production `/` and `/login` returned 200; `/api/library/documents`
  retained its 401 response. Private user data and storage were not migrated.
- The temporary preview automation bypass was revoked and the three temporary
  preview database/auth variables were deleted. The two public figure settings
  remain enabled in preview and production; production Typecheck externalization
  remains enabled. No Supabase upload credential was added to Vercel.

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

### Move to the application project — 2026-10-08

On 2026-10-08 (KST afternoon) the mathgen project host
`pqylrbowrfliicxzurex.supabase.co` stopped resolving (NXDOMAIN from both the ISP
resolver and 8.8.8.8). Every uncached `/figures/*` request returned 502 from
`/api/shared-figures/...`; the error log held only the operator's own probes
because Vercel's edge cache had been answering the popular images.

At the owner's direction the bucket now lives in the **application's own
Supabase project** (`jyaguxwuaxgdnovtulna`, the same project as `DATABASE_URL`).
A public bucket `todays-math-shared-figures` (image MIME types only, 8 MiB
object limit — the same policy as before) was created with the project's secret
key. Because every original is tracked in Git, the full set was re-uploaded
rather than copied from the lost project:

- manifest: 23,288 objects, 517,133,026 bytes, `sourceCommit` `8e96de9d2`
  (18,827 earlier figures + 4,461 textbook figures under `/figures/tb/`),
  canonical SHA256 `d0ff25fd0afa48d20a2b43b278008be23bdf8e4b53ae96d24a26000f9e76d976`;
- upload receipt (`status: verified`, every object read back anonymously and
  byte-compared after its POST): 23,288 uploaded, 0 reused, `verifiedAt`
  `2026-10-08T06:31:51.770Z` — checked in as `src/config/shared-figures.receipt.json`;
- Vercel `SHARED_FIGURE_CDN_BASE_URL` (Production and Preview) overwritten with
  `https://jyaguxwuaxgdnovtulna.supabase.co/storage/v1/object/public/todays-math-shared-figures`
  before pushing main `9ab1fc7fc`; the production deployment became Ready and a
  12-object sample (old and textbook figures) returned 200 with manifest sizes.

A separate anonymous `verify` run writes
`E:\todays-math-textbook-import\storage\app-verify-receipt-20261008.json`
(outside the repository). The secret key stays in the operator's local `.env`;
no upload credential was added to Vercel beyond the pre-existing listening-storage
secret.
