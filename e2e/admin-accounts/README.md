# Isolated administration UI checks

Run from the repository root with existing dependencies:

```powershell
node node_modules/vitest/vitest.mjs run --config e2e/admin-accounts/vitest.config.mts
node node_modules/typescript/bin/tsc --noEmit --pretty false -p e2e/admin-accounts/tsconfig.json
node node_modules/@playwright/test/cli.js test --config e2e/admin-accounts/playwright.config.ts
```

The browser harness builds and serves the actual admin, approval and document-preview components and production styles on `127.0.0.1:4318`. Next navigation, the access loader and logout are replaced with local test adapters. No Next server or environment files are loaded. Every browser API request is intercepted; requests to another origin or an unexpected API fail the test. All accounts and material contents are fixtures.

The 320, 390 and 1440 pixel browser matrix checks keyboard selection, explicit menu saves, approval, stale-version recovery, waiting/rejected screens, logout wiring, math previews, activity history and horizontal overflow. Screenshots are written below `test-results/admin-accounts/`. The harness compiles into ignored `.tmp-admin-ui/browser-build` before the readiness probe succeeds, avoiding Vite dev dependency reloads during interaction tests. The 20-second assertion timeout matches the repository's browser-test expectation budget.

Component tests also cover search/filter/paging, aborted search results, pending/error/empty states, immutable administrator rows, rejection confirmation, protected asset URLs, image failures, long-document pagination and server-page redirect gates. The isolated type-check substitutes only the server access and logout boundaries; it does not validate the backend implementation, root activity reporting or the real authentication provider. Those integration checks belong to the main branch.
