# Standalone Typecheck validation

Historical record from the 2026-09-15 GitHub Actions rollout. The workflow and
its required Vercel Deployment Check have since been retired. See
[README.md](README.md) for the current local and Vercel checks.

## Delivery

- Branch: `BIGSHOL/external-typecheck-ci`.
- Base commit: `6897d28554fe517ec446f7a230eb6ea06e201901`.
- Workflow: `.github/workflows/typecheck.yml`.
- Exact configured job/check name: **Typecheck**.
- Workflow name: **Typecheck**; job ID: `typecheck`.
- Events: every `push`, every `pull_request`, and `workflow_dispatch`.

The workflow uses `contents: read`, does not persist checkout credentials,
pins the checkout/setup-node actions to verified v6 commit SHAs, selects Node 24,
caches npm downloads by `package-lock.json`, and performs a locked install
including development dependencies. It calls the standalone checker and then
the real malformed-TypeScript proof. Neither step has a failure bypass.

## Local evidence

Validated on Windows on 2026-09-15 with Node `v24.13.0`, npm `11.6.2`,
Next `16.3.0`, Prisma `6.19.3`, and TypeScript `5.9.3`.

1. `npm ci --include=dev --no-audit --no-fund` passed, installing 809 packages
   into this worktree's private `node_modules`. The install used `HUSKY=0`,
   `PRISMA_SKIP_POSTINSTALL_GENERATE=true`, and loopback placeholder database
   URLs. No shared dependency junction was created or shared Prisma client
   regenerated.
2. `node scripts/ci/typecheck.mjs` passed with exit code **0** from the fresh
   worktree, generating Prisma Client, `next-env.d.ts`, and `.next/types` before
   checking the complete root `tsconfig.json` project. The script confirmed the
   generated route declarations and validator were included in that project.
3. `node scripts/ci/verify-typecheck.mjs` passed: the exact CI command exited
   **2** for the injected source fixture and reported
   `error TS2322: Type 'string' is not assignable to type 'number'` at line 1,
   column 14. The fixture was
   `src/ci-typecheck-negative-fe5e15d7-33a8-474a-afda-4db9acea5767.ts`, containing
   `export const ciTypecheckMustFail: number = "invalid";`. Cleanup was verified;
   no malformed source is committed.
4. ESLint passed for both CI scripts. Prettier passed for the workflow, scripts,
   and usage documentation. YAML parsing and assertions passed for all three
   event triggers, `contents: read`, the stable job name, and locked installation.

The installed Next CLI and TypeScript guides were read before implementation.
The CLI guide explicitly recommends `next typegen` before standalone `tsc`, and
the installed `next-typegen.js` confirms the generated route validator and
ambient-file behavior used here. No alternate tsconfig or scope exclusions were
introduced.

## Remaining integration work

The changes are intended for coordinator review and merge; this worker does not
push. A GitHub-hosted Ubuntu Actions run has not been executed. The coordinator
must publish the workflow and observe the first hosted **Typecheck** run before
relying on it as a required check.

Branch protection and Vercel deployment-check settings are external to this
workflow and remain coordinator-owned. This task does not change
`next.config.ts`, `package.json`, `package-lock.json`, `vercel.json`, `.env`,
or pre-push hooks. It does not use a production database, invoke live AI, or
perform a build or deployment.
