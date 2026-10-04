# Isolated textbook studio browser checks

Run from the repository root with existing dependencies:

```powershell
node node_modules/typescript/bin/tsc --noEmit --pretty false -p e2e/textbook-admin/tsconfig.json
node node_modules/@playwright/test/cli.js test --config e2e/textbook-admin/playwright.config.ts
```

The harness builds and serves the production `TextbookStudioView`, its production client (`httpTextbookApi`) and production styles on `127.0.0.1:4322`. Only `next/navigation` and `next/image` are replaced with local adapters. No Next server, database, authentication or environment file is loaded. Every `/api/**` request is answered by the in-memory synthetic server in `fixtures.ts`; a request to another origin or an unknown API is recorded and fails the test. The product client re-validates each synthetic response against the strict contracts, so a malformed fixture shows the product's own read error.

`main.tsx` wraps the studio in a minimal stand-in for the workspace shell: it hides views with `hidden` instead of unmounting them and asks `requestTextbookNavigation` before switching. It is not the product `UnifiedWorkspace`; the real wiring is checked on the integrated branch.

The Chromium run covers the section answer memo (save, reload, clear), reverting an edit, the save / discard / continue prompt across section, workspace-view and outgoing-link transitions, the native `beforeunload` dialog, protection while a save is in flight, a failed edition read after a successful publish, a concept saved without its section link and the attach-only retry, and horizontal overflow at 320 and 390 pixels. Screenshots are written below `test-results/textbook-admin/`. The build goes to ignored `.tmp-admin-ui/textbook-browser-build`; only the product font is copied from `public/`.

Not covered here: student-facing responses and PDFs, manifest hashes, server-side conflict and stale-hash refusals (unit and PGlite tests cover those), real PDF generation, uploads, and the real workspace shell.
