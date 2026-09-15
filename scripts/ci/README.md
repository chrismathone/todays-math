# Standalone Typecheck

The GitHub Actions workflow runs on every push, pull request, and manual
`workflow_dispatch`. The workflow name and stable job/check name are both
**Typecheck** (job ID: `typecheck`). Select **Typecheck** when configuring a
required status check; GitHub may display it under the Typecheck workflow.

## Commands

With the dependencies installed from `package-lock.json`:

```sh
node scripts/ci/typecheck.mjs
node scripts/ci/verify-typecheck.mjs
```

The first command generates Prisma Client, runs `next typegen`, verifies that
`next-env.d.ts`, `.next/types/routes.d.ts`, and `.next/types/validator.ts` exist
and belong to the TypeScript project, then runs the local `tsc` with `--noEmit`
and incremental caching disabled. It preserves the root `tsconfig.json` scope,
including its existing exclusions. No separate, narrower CI config is used.

The second command creates a temporary `.ts` source file assigning a string to
a number, runs the **same CI command**, requires a nonzero exit and that file's
TS2322 diagnostic, and removes the fixture in `finally`. Run the first command
before the proof to establish that the original project passes. The workflow
does both, so unrelated failures cannot stand in for a passing baseline.

CI caches npm downloads only and installs with `npm ci --include=dev`.
Prisma postinstall generation is disabled so generation happens explicitly in
the checker. Run this command in a checkout with its **own node_modules**:
Prisma generation writes there, so a shared dependency junction is unsuitable.

Generation uses fixed loopback placeholder database URLs and requires no
repository secrets, production database, AI calls, or deployment. It does not
start the app, run database migrations/seeds, or run a production build.
The script overrides inherited database URLs as well. Next type generation
loads `next.config.ts`, which must remain safe to evaluate without services.

## References

- Installed Next 16.3.0 guide: `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`, section `next typegen`.
- [setup-node: npm dependency caching](https://github.com/actions/setup-node#caching-global-packages-data).
- [checkout: token permissions and credentials](https://github.com/actions/checkout).

Required-check/branch rules and Vercel deployment checks are configured separately
by the coordinator. This workflow alone does not make a check mandatory or block
a Vercel deployment. A hosted Actions run remains to be observed after publishing.
