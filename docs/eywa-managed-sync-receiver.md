# Eywa managed receiver implementation and rollout

Local implementation for the approved 2026-10-03 plan. This work does not apply a production migration, change environment variables, register a live binding, or deploy either application.

## Configuration and rollout order

1. Integrate both source and receiver changes and preserve a compatible recovery build. Apply the receiver Prisma migration before deploying code that queries the new ledger. Do not roll back to a build that lacks managed account, lease, generation, and SSO replay checks.
2. Configure the same server-only `EYWA_SYNC_BINDINGS_JSON` on both projects. Each entry requires `bindingId`, source `tenantId`, receiver `targetBranchId`, fixed `sourceBaseUrl`, fixed `targetBaseUrl`, `keyId`, `controlSecret`, `webhookSecret`, and `ssoSecret`. IDs must match the registered source and receiver records. Existing target Branch IDs are UUIDs. Origins must be HTTPS; HTTP is accepted only for localhost fixtures. Each of the three distinct secrets is trimmed and must be at least 32 characters. Keep preview and production bindings separate.
3. Existing receiver `DATABASE_URL`, `DIRECT_URL`, `AUTH_URL`/`NEXTAUTH_URL`, and `AUTH_SECRET` remain required. Use the actual receiver origin for auth. For a local Next fixture use `http://localhost:PORT`: NextURL canonicalizes loopback IPs to `localhost`, and the SSO origin check remains exact. The configuration validator below prints identifiers and origins only, never secrets, and makes no network or DB calls.
4. A platform operator registers a configured binding at `/admin/eywa-sync`; registration is always `shadow`. The optional archive owner must be a real, explicitly selected user in the target branch. A class without a mapped teacher, prior creator, or explicit archive owner remains a visible conflict.
5. Run the read-only preview, inspect existing account candidates and frozen historical branch attribution, and resolve protected/pending/suspended/deleted accounts through the existing account management procedures. Matching email and normalized name is a candidate, never proof of ownership.
6. Activate both ends after full fixture and mapping verification. The source scheduler posts signed events and calls the receiver process endpoint; receipt is durable before acknowledgement. The process endpoint also resumes previously stored work. No additional queue or SSO service is needed.
7. Monitor receiver inbox outcomes and relationship conflict records in the management screen. An existing account owner confirms with their current password at `/account/eywa-managed`; an authorized operator supplies independent ownership evidence. Approvals re-read source and target state and reject changed candidate versions. An approved transfer ends the prior managed mapping and revokes old memberships before opening the new mapping. Prior classes, exams, private work, and audit history are retained.

The v1 path remains available for nonmanaged identities. Configured managed tenants and current managed identities cannot use it. Provisioned accounts use `authSource=eywa`, no password, teacher branch role, no admin flags, explicit approval, and a limited teaching menu set. Existing passwords and approval/manual suspension/deletion decisions are not overwritten by source updates.

## Receiver surfaces

| Surface | Purpose |
| --- | --- |
| `POST /api/integrations/eywa/v2/events` | Signed, body-hashed durable inbox; same event/body is idempotent; altered body conflicts. |
| `POST /api/integrations/eywa/v2/process` | Signed nonce consumption, persisted retry, binding lease token fencing, current source control, one snapshot per successful batch. |
| `GET /api/integrations/eywa/v2/events/{eventId}?bindingId=...` | Binding-scoped receipt/application status. |
| `GET /api/integrations/eywa/v2/students/{sourceStudentId}?bindingId=...` | Signed minimal learning summary for Eywa student detail. |
| `/api/sso/eywa/v2/start`, `/callback`, `/complete` | Receiver-created state and PKCE, fixed origins, one-use code exchange and jti, explicit account switch confirmation. |
| `/admin/eywa-sync`, `/api/admin/eywa-sync` | Binding registration, shadow/active/retired state, previews, retries, conflict and mapping approval. Platform-only binding changes; branch operators approve only accounts already in their corresponding branch. |
| `/account/eywa-managed`, `/api/account/eywa-managed` | Current account ownership confirmation and managed status. |

Local binding retirement and switching back to shadow work even when the source is unavailable. They invalidate managed sessions and preserve manual suspensions. An explicit epoch rebaseline uses the platform API action `rebaseline` with a new source epoch and independent evidence; it suspends current access and requires reactivation after reconciliation. The source generation history is never reset inside an unchanged epoch.

Every managed password login, v2 login and JWT session refresh checks the management ledger. Source leases expire at the earliest of request start plus 60 seconds, source validation plus 60 seconds, or the next effective boundary. Expired source access never receives an outage grace period. Save-time class grants use current source revisions and capabilities through the relationship worker's permission guards. Already downloaded/offline browser content cannot be recalled.

## Migration

`prisma/migrations/20261003085222_eywa_managed_sync/migration.sql` was created with `supabase migration new eywa_managed_sync`, then placed in the existing Prisma migration layout. Prisma generated the schema delta; reviewed SQL adds manual suspension backfill, immutable historical branch attribution, managed privilege/unlink/password guards, durable/restricted foreign keys, partial live identity uniqueness, RLS and browser-role privilege revocation. New tables are server-only; there are no client-role policies. Managed mappings, source identities and old ownership are retained rather than cascade-deleted.

The schema also introduces ClassMembership, StudentEnrollment (including per-class last report date/text), retained Progress retirement, per-class/student ProgressPlan uniqueness, and stable EnglishExam branch attribution. The relationship worker owns their runtime application and permissions.

## Local checks

```powershell
npx.cmd prisma validate
npx.cmd tsc --noEmit
npx.cmd vitest run src/__tests__/unit/eywaManagedPolicy.test.ts src/__tests__/unit/eywaSso.test.ts src/__tests__/api/authDirectorUnchanged.test.ts src/__tests__/api/eywaSsoLogin.test.ts src/__tests__/api/eywaLinkApi.test.ts --maxWorkers=1
node --import tsx scripts/qa/eywa-managed-config.ts
# Only a disposable local database named eywa_target_test is accepted:
node --conditions=react-server --import tsx scripts/qa/eywa-managed-integration.ts
# After npm run build, starts and stops a real local production Next server:
node --conditions=react-server --import tsx scripts/qa/eywa-managed-http-smoke.ts
```

The PostgreSQL script requires `EYWA_TEST_DATABASE_URL` pointing to that fixture and overrides Prisma URLs before importing the application DB client. Generate its baseline from the pre-change schema, then apply the receiver migration. `scripts/qa/eywa-managed-sql-check.sql` verifies RLS, grants, guard triggers and restrictive preservation inside a rollback transaction. It refuses another database name. The coordinator's separate source-to-target fixture covers the wire integration with the actual source RPCs.

Final receiver evidence (2026-10-03):

- Full production `npm run build` passes with TypeScript checking enabled, 165 prerendered pages, and all new routes compiled. Only disposable fixture database URLs were supplied to this build.
- Nine focused auth/account/policy test files pass **167 tests**. The earlier route/account serialization follow-up passes 42 tests. Managed v1 bypass, branch/admin escalation, password recovery evidence, manual OFF preservation and unchanged nonmanaged login paths have regression coverage.
- Receiver migration applies on PostgreSQL 17. **19 actual receiver DB scenarios** pass, including concurrent claim/takeover, nonce collision, account provisioning/confirmation, OFF→ON session revocation, manual suspension preservation, managed privilege/unlink/password restrictions, consumed handoff and duplicate jti rejection, source outage and approved branch transfer with late old-binding OFF.
- `eywa-managed-migration-check.sql` passes against a separate empty fixture: pre-change baseline, seeded historical data, final migration with per-enrollment report fields, manual/branch backfill and immutable branch guard, then full DDL rollback. `eywa-managed-sql-check.sql` separately passes RLS, browser-role grant, trigger and restrictive FK checks.
- The production Next HTTP smoke passes **four end-to-end flows** with actual Auth.js cookies: v2 callback issues a usable managed session; an existing-account candidate receives no automatic session and requires password confirmation before SSO; switching from a different current account requires an explicit confirmation; a signed OFF event plus process request invalidates existing session cookies. Its source is a signed local HTTP fixture; actual source SQL/RPC integration is covered by the coordinator's separate 15-group source-to-target harness.
- Prisma validation, targeted ESLint, UI affordance guard and whitespace checks pass. The wire file remains byte-identical to the source contract, SHA256 `2F729825A3BDF765B9BEBD20C3D7D9DDB55106E7FBA4B64FB33AAB7584DFA46D`.

The HTTP smoke verifies rendered account confirmation HTML and server behavior; it is not a visual browser layout or hydration test. The broad legacy API suite exposed a pre-existing student sweep misclassification of `/api/english/learn/listening`; the untouched listening handler intentionally accepts student sessions. The sweep now separately exercises that helper with genuine encrypted student sessions and keeps the teacher route denial requirement; all **five sweep tests pass**. Broader relationship/API regression evidence is recorded by the relationship worker.

Receiver-owned implementation: `prisma/schema.prisma` and the migration; `src/lib/eywa/{managedAccounts,managedAdministration,managedPolicy,managedReceiver,managedSso,managedTransport,sync-contract}.ts`; v2 integration and SSO routes; account/admin management routes and pages; `EywaManagement` UI; existing auth, proxy, account password/link and admin account gates; associated focused auth tests; `scripts/qa/eywa-managed-*`; this report. Relationship/data API files and `eywa-source-target-integration.ts` are owned by the other dispatched workers. No receiver-only commit was made; the coordinator integrates the combined checkout with hooks enabled and preserves the frozen shared contract.

Handoff cleanup: the coordinator verified and removed all 16 receiver scratch files using explicit absolute file paths, then removed the empty directory. Durable scripts and this report are preserved. The disposable PostgreSQL fixture remains available for final verification; no receiver server process is still running.

Production latency/load, real mapping ownership, actual Vercel environment values, deployment and canary activation remain coordinator/operator steps. No production success is inferred from local fixture evidence. Reverse problem-solving event export remains the explicitly deferred follow-up.
