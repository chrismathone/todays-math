# Local and deployment type checking

GitHub Actions is not used for this project. A push to `main` starts a Vercel
production build, and `next build` fails on TypeScript errors because
`next.config.ts` keeps `typescript.ignoreBuildErrors` set to `false`. Vercel
automatically assigns the production domain only after a successful build.

The local pre-push hook also runs `npm run type-check` for pushes to `main`.
Before a push or when route types or Prisma schema have changed, run the complete
standalone check:

```sh
node scripts/ci/typecheck.mjs
```

This generates Prisma Client and Next route types, verifies that the generated
types belong to the TypeScript project, and checks the complete `tsconfig.json`
project with incremental caching disabled. It uses loopback placeholder database
URLs and does not connect to production services. Use a checkout with its own
`node_modules`, because Prisma generation writes there.

To verify that the checker catches a real type error after a successful baseline,
run `node scripts/ci/verify-typecheck.mjs`. It injects and then removes a
temporary malformed source file. This is an optional maintenance check, not part
of normal pushes or deployments.

The previous GitHub Actions and Vercel Deployment Check arrangement is recorded
as historical evidence in [deployment-externalization.md](../../docs/qa/deployment-externalization.md).
