# Offline migration tool verification

Verified on 2026-09-15 with Node 24.13.0 and Git on Windows.

## Results

- Full offline dry-run passed against source commit
  `6897d28554fe517ec446f7a230eb6ea06e201901`.
- Complete scope: **18,827 tracked images**, **471,962,501 canonical bytes**.
- Canonical manifest SHA256 at that source commit:
  `796e269181df6fee721e7f3ab680290f1667a3b73f7f8681999361122c4491b8`.
- `node --test scripts/storage/shared-figures.test.mjs`: all 18 original
  scenarios passed after the final manifest contract and CRLF handling changes.
- Added timeout scenario passed separately with
  `node --test --test-name-pattern 'request timeout' scripts/storage/shared-figures.test.mjs`.
  The final test file contains 19 scenarios.
- Targeted ESLint passed for all four JavaScript modules using the installed
  repository configuration; only its React-version detection warning appeared
  because this worker checkout has no `node_modules`.
- Prettier checks passed for the scripts, tests, and README.

Coverage includes deterministic manifests, scoped tracking, traversal, invalid
metadata/targets, dirty and staged sources, `skip-worktree`, missing/partial
sources, Git ancestry, SVG CRLF normalization, symlinks/junctions, dry-run,
concurrency, content/MIME/length mismatches, interrupted uploads, resume,
duplicate creation, transient retries, anonymous verification, current/legacy
missing errors, private buckets, redirect rejection, timeout, credential-safe
errors, concurrent Git changes, and preservation of existing output files.

The raw Windows inventory is 475,525,029 bytes. Its 3,562,528-byte difference from
the canonical total comes from SVG checkout CRLF normalization to the exact Git
blob bytes. The migration manifest hashes and uploads those Git-canonical bytes;
all raster image bytes remain exact.

## Remaining integration

No live Supabase requests, credential access, bucket changes, database work,
local asset deletion, deployment, or push were performed. The coordinator must
generate the final manifest at the chosen integration revision, perform the
explicit upload and independent public verification, inspect the target-bound
receipt, and complete its separately owned runtime/deployment rollout.

This report proves the local implementation and offline inventory checks. It is
not a live upload success receipt.
