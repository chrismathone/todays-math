/* eslint-disable @typescript-eslint/no-explicit-any -- SQL fixture RPCs are dynamically dispatched; production wire schemas validate their actual results. */
/** Disposable PostgreSQL integration, no application credentials or env files.
 * node --conditions=react-server --import tsx scripts/qa/eywa-source-target-integration.ts --source-root <Eywa checkout>
 * Resets ONLY localhost:55432/eywa_e2e_source and eywa_e2e_target.
 * Requires those two empty/disposable databases, source postgres dependency,
 * target generated Prisma client, and the local Docker PostgreSQL fixture.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const sourceRoot = process.argv[process.argv.indexOf("--source-root") + 1];
  assert(
    sourceRoot && process.argv.includes("--source-root"),
    "--source-root is required",
  );
  const targetRoot = process.cwd();
  assert(
    (await readFile(path.join(sourceRoot, "package.json"), "utf8")).includes(
      '"postgres"',
    ),
  );
  const requireSource = createRequire(path.join(sourceRoot, "package.json"));
  const postgres = requireSource("postgres");
  const connection = (database: string) =>
    postgres({
      host: "127.0.0.1",
      port: 55432,
      user: "postgres",
      database,
      max: 1,
      onnotice: () => {},
      connect_timeout: 5,
    });
  const source = connection("eywa_e2e_source"),
    target = connection("eywa_e2e_target");
  process.env.DATABASE_URL =
    "postgresql://postgres@127.0.0.1:55432/eywa_e2e_target?sslmode=disable";
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  const servers: Server[] = [];
  let disconnect: (() => Promise<void>) | undefined;
  const checks: string[] = [];
  const pass = (name: string) => {
    checks.push(name);
    console.log(`PASS ${name}`);
  };
  const sourceRead = (name: string) =>
    readFile(path.join(sourceRoot, name), "utf8");
  // These functions have no URL or arbitrary database argument by design.
  try {
    assert.equal(
      (await source.unsafe("select current_database() db"))[0].db,
      "eywa_e2e_source",
    );
    assert.equal(
      (await target.unsafe("select current_database() db"))[0].db,
      "eywa_e2e_target",
    );
    await source.unsafe(
      "drop schema if exists tm_sync_private cascade; drop schema if exists auth cascade; drop schema public cascade; create schema public;",
    );
    await source.unsafe(
      (
        await sourceRead("supabase/tests/todays_math_sync_fixture.sql")
      ).replaceAll("eywa_source_test", "eywa_e2e_source"),
    );
    for (const name of [
      "0000_fair_amazoness",
      "0001_parallel_meggan",
      "0013_last_swarm",
      "0021_fat_gideon",
      "0023_amazing_doctor_faustus",
      "0027_big_swordsman",
      "0044a_class_teacher_handover",
      "0049a_lesson_reports",
      "0059a_class_closed_at",
      "0075a_mirror_trigger_role_hardening",
      "0083a_lesson_reports_classnote",
      "0089a_lesson_reports_textbook_makeup",
      "0134a_lesson_reports_class_id",
      "0141a_students_is_test",
      "0171a_lesson_reports_makeup_class",
      "0173a_class_delegations",
      "0274a_class_period_enrollment_end",
      "0337a_todays_math_sync_v2",
    ])
      await source.unsafe(await sourceRead(`supabase/migrations/${name}.sql`));
    const scratch = await mkdtemp(path.join(tmpdir(), "eywa-e2e-schema-"));
    try {
      const schemaPath = path.join(scratch, "schema.prisma");
      // Pin the migration predecessor so reruns still work after this change is committed.
      await writeFile(
        schemaPath,
        execFileSync(
          "git",
          [
            "show",
            "d65f042002eebb7ba04d6df97d9da6891c7d9171:prisma/schema.prisma",
          ],
          { cwd: targetRoot },
        ),
      );
      const baseline = execFileSync(
        process.execPath,
        [
          path.join(targetRoot, "node_modules/prisma/build/index.js"),
          "migrate",
          "diff",
          "--from-empty",
          "--to-schema-datamodel",
          schemaPath,
          "--script",
        ],
        { cwd: targetRoot, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
      );
      await target.unsafe("drop schema public cascade; create schema public;");
      await target.unsafe(baseline);
      await target.unsafe(
        await readFile(
          path.join(
            targetRoot,
            "prisma/migrations/20261003085222_eywa_managed_sync/migration.sql",
          ),
          "utf8",
        ),
      );
      await target.unsafe(
        await readFile(
          path.join(
            targetRoot,
            "prisma/migrations/20261003103000_eywa_auto_branch/migration.sql",
          ),
          "utf8",
        ),
      );
    } finally {
      assert.equal(path.dirname(path.resolve(scratch)), path.resolve(tmpdir()));
      assert(path.basename(scratch).startsWith("eywa-e2e-schema-"));
      await rm(scratch, { recursive: true, force: true });
    }
    pass(
      "actual source migrations and target Prisma HEAD baseline plus full managed migration",
    );

    const { db } = await import("../../src/lib/db");
    disconnect = () => db.$disconnect();
    const accounts = await import("../../src/lib/eywa/managedAccounts");
    const receiver = await import("../../src/lib/eywa/managedReceiver");
    const transport = await import("../../src/lib/eywa/managedTransport");
    const sso = await import("../../src/lib/eywa/managedSso");
    const access = await import("../../src/lib/classAccess");
    const wire = await import("../../src/lib/eywa/sync-contract");
    const sourceWire = await import(
      pathToFileURL(
        path.join(
          sourceRoot,
          "src/features/integrations/todays-math/sync-contract.ts",
        ),
      ).href
    );
    assert.equal(
      await sourceRead(
        "src/features/integrations/todays-math/sync-contract.ts",
      ),
      await readFile(
        path.join(targetRoot, "src/lib/eywa/sync-contract.ts"),
        "utf8",
      ),
      "Source and target wire contracts must be identical",
    );
    const { hash } = await import("bcryptjs");
    const ids = {
      tenants: [randomUUID(), randomUUID()],
      bindings: [randomUUID(), randomUUID()],
      branches: [randomUUID(), randomUUID()],
      teachers: Array.from({ length: 8 }, () => randomUUID()),
      classes: Array.from({ length: 4 }, () => randomUUID()),
      students: Array.from({ length: 5 }, () => randomUUID()),
      delegate: randomUUID(),
    };
    // SQL RPC calls authenticate as service_role, exactly like a Supabase service client.
    const rpc = async (name: string, args: unknown[] = []): Promise<any> => {
      assert(/^tm_sync_[a-z_]+$/.test(name));
      return source.begin(async (tx: any) => {
        await tx.unsafe("set local role service_role");
        return (
          await tx.unsafe(
            `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) value`,
            args,
          )
        )[0].value;
      });
    };
    let configs: ReturnType<typeof wire.parseBindingConfigs> = [];
    let failPage = false;
    let overrideControl: any = null;
    const calls = { control: 0, snapshots: 0, pages: 0, tokens: 0 };
    async function serve(handler: (request: Request) => Promise<Response>) {
      const server = createServer(async (incoming, outgoing) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
          const raw = Buffer.concat(chunks).toString("utf8");
          const request = new Request(
            `http://${incoming.headers.host}${incoming.url}`,
            {
              method: incoming.method,
              headers: incoming.headers as HeadersInit,
              ...(raw ? { body: raw } : {}),
            },
          );
          const result = await handler(request);
          outgoing.statusCode = result.status;
          result.headers.forEach((value, key) =>
            outgoing.setHeader(key, value),
          );
          outgoing.end(await result.text());
        } catch (error) {
          outgoing.statusCode = 409;
          outgoing.end(JSON.stringify({ error: String(error) }));
        }
      });
      servers.push(server);
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address();
      assert(address && typeof address !== "string");
      return `http://127.0.0.1:${address.port}`;
    }
    const sourceOrigin = await serve(async (request) => {
      const url = new URL(request.url),
        raw = await request.text();
      const purpose = url.pathname.endsWith("/token") ? "sso" : "control";
      const verified = sourceWire.verifySignedRequest(
        request,
        raw,
        configs,
        purpose,
      );
      const input = raw
        ? JSON.parse(raw)
        : Object.fromEntries(url.searchParams);
      assert.equal(input.bindingId, verified.config.bindingId);
      const bid = input.bindingId;
      if (url.pathname.endsWith("/control")) {
        calls.control++;
        return Response.json(
          overrideControl ??
            (await rpc("tm_sync_control", [bid, input.userId ?? null])),
        );
      }
      if (url.pathname.endsWith("/snapshots")) {
        calls.snapshots++;
        assert(
          await rpc("tm_sync_consume_nonce", [
            bid,
            verified.nonce,
            new Date(verified.timestamp + 120000).toISOString(),
          ]),
        );
        return Response.json(await rpc("tm_sync_create_snapshot", [bid]));
      }
      if (url.pathname.includes("/snapshots/")) {
        calls.pages++;
        if (failPage && input.kind === "students")
          return Response.json(
            { error: "fixture_page_unavailable" },
            { status: 503 },
          );
        return Response.json(
          await rpc("tm_sync_snapshot_page", [
            bid,
            url.pathname.split("/").pop(),
            input.kind,
            Number(input.page),
          ]),
        );
      }
      if (url.pathname.endsWith("/token")) {
        calls.tokens++;
        const result = await rpc("tm_sync_exchange_code", [
          bid,
          sourceWire.sha256(input.code),
          sourceWire.sha256(input.state),
          sourceWire.s256(input.codeVerifier),
          verified.nonce,
          new Date(verified.timestamp + 120000).toISOString(),
        ]);
        if (!result)
          return Response.json({ error: "code_invalid" }, { status: 401 });
        const { control, user, jti, issuedAt, expiresAt } = result;
        return Response.json({
          assertion: sourceWire.signAssertion(
            {
              iss: "aywa",
              aud: "todays-math",
              bindingId: bid,
              sourceEpoch: control.sourceEpoch,
              sub: user.id,
              tenantId: control.tenantId,
              email: user.email,
              name: user.name,
              securityRevision: control.securityRevision,
              tenantRevocationGeneration: control.tenantRevocationGeneration,
              accountRevocationGeneration: user.accountRevocationGeneration,
              jti,
              iat: Math.floor(Date.parse(issuedAt) / 1000),
              exp: Math.floor(Date.parse(expiresAt) / 1000),
            },
            verified.config,
          ),
        });
      }
      return new Response(null, { status: 404 });
    });
    const targetOrigin = await serve(async (request) => {
      const processing = new URL(request.url).pathname.endsWith("/process");
      const verified = await transport.verifyReceiverRequest(
        request,
        processing,
      );
      if (processing)
        return Response.json(
          await receiver.processBinding(verified.binding.id, 20),
        );
      return Response.json(
        await receiver.receiveEvent(verified.raw, verified.binding.id),
      );
    });
    configs = wire.parseBindingConfigs(
      JSON.stringify(
        ids.bindings.map((bindingId, i) => ({
          bindingId,
          tenantId: ids.tenants[i],
          targetBranchId: ids.branches[i],
          sourceBaseUrl: sourceOrigin,
          targetBaseUrl: targetOrigin,
          keyId: "fixture",
          controlSecret: "control-fixture-".repeat(3),
          webhookSecret: "webhook-fixture-".repeat(3),
          ssoSecret: "sso-fixture-".repeat(3),
        })),
      ),
    );
    process.env.EYWA_SYNC_BINDINGS_JSON = JSON.stringify(configs);
    const send = async (
      i: number,
      path: string,
      body: unknown,
      headers?: Record<string, string>,
    ) => {
      const raw = JSON.stringify(body);
      return fetch(targetOrigin + path, {
        method: "POST",
        headers:
          headers ??
          wire.signedHeaders(configs[i], "webhook", "POST", path, raw),
        body: raw,
      });
    };
    const eventPath = "/api/integrations/eywa/v2/events",
      processPath = "/api/integrations/eywa/v2/process";
    for (let i = 0; i < 2; i++) {
      await source.unsafe(
        "insert into public.tenants(id,slug,name) values($1,$2,$3)",
        [ids.tenants[i], `e2e-${i}`, `Fixture ${i}`],
      );
      await source.unsafe(
        "insert into public.tenant_licenses(tenant_id,feature,is_active) values($1,'todays_math',true)",
        [ids.tenants[i]],
      );
      await db.branch.create({
        data: { id: ids.branches[i], name: `Fixture ${i}` },
      });
    }
    for (let i = 0; i < ids.teachers.length; i++) {
      await source.unsafe("insert into auth.users(id,email) values($1,$2)", [
        ids.teachers[i],
        `teacher${i}@example.invalid`,
      ]);
      await source.unsafe(
        "insert into public.users(id,tenant_id,email,display_name,system_role,status,subjects) values($1,$2,$3,$4,'teacher',$5,$6)",
        [
          ids.teachers[i],
          ids.tenants[0],
          `teacher${i}@example.invalid`,
          `Teacher ${i}`,
          i === 6 ? "pending" : "active",
          i === 5 ? ["english"] : ["math"],
        ],
      );
    }
    await source.unsafe(
      "insert into public.super_admins(id,email,display_name) values($1,'teacher7@example.invalid','Teacher 7')",
      [ids.teachers[7]],
    );
    for (let i = 0; i < 4; i++)
      await source.unsafe(
        "insert into public.classes(id,tenant_id,class_name,subject,teacher_id) values($1,$2,$3,$4,$5)",
        [
          ids.classes[i],
          ids.tenants[0],
          `Class ${i}`,
          i === 3 ? "english" : "math",
          ids.teachers[i === 1 ? 1 : 0],
        ],
      );
    await source.unsafe(
      "insert into public.class_delegations(id,tenant_id,class_id,delegate_user_id,from_date,to_date) values($1,$2,$3,$4,(now() at time zone 'Asia/Seoul')::date,(now() at time zone 'Asia/Seoul')::date)",
      [ids.delegate, ids.tenants[0], ids.classes[0], ids.teachers[2]],
    );
    await source.unsafe(
      "update public.classes set pending_teacher_id=$2,pending_teacher_date=(now() at time zone 'Asia/Seoul')::date-1 where id=$1",
      [ids.classes[0], ids.teachers[1]],
    );
    for (let i = 0; i < 5; i++)
      await source.unsafe(
        "insert into public.students(id,tenant_id,name,status,is_test,parent_phone,school,grade) values($1,$2,$3,$4,$5,'DO_NOT_EXPORT','Fixture School','7')",
        [
          ids.students[i],
          ids.tenants[0],
          `Student ${i}`,
          i === 1 ? "on_hold" : "enrolled",
          i === 4,
        ],
      );
    const enrollment = async (
      student: number,
      cls: number,
      start: number,
      end: number | null,
      hold = false,
      transferred = false,
    ) =>
      source.unsafe(
        "insert into public.enrollments(id,tenant_id,student_id,class_id,start_date,end_date,on_hold,is_transferred,attendance_days) values($1,$2,$3,$4,(now() at time zone 'Asia/Seoul')::date+$5::int,case when $6::int is null then null else (now() at time zone 'Asia/Seoul')::date+$6::int end,$7,$8,'{}')",
        [
          randomUUID(),
          ids.tenants[0],
          ids.students[student],
          ids.classes[cls],
          start,
          end,
          hold,
          transferred,
        ],
      );
    await enrollment(0, 0, -10, null);
    await enrollment(0, 1, -10, null);
    await enrollment(1, 0, -10, null, true);
    await enrollment(2, 0, -10, 0);
    await enrollment(2, 1, -10, 0, false, true);
    await enrollment(3, 0, 1, null);
    await enrollment(4, 0, -10, null);
    const passwordHash = await hash("isolated-fixture-password", 4);
    const candidate = await db.user.create({
      data: {
        email: "teacher3@example.invalid",
        name: "Teacher 3",
        passwordHash,
        approvalStatus: "approved",
        branchId: ids.branches[0],
        branchRole: "teacher",
      },
    });
    const mismatch = await db.user.create({
      data: {
        email: "teacher4@example.invalid",
        name: "Different Person",
        passwordHash,
        approvalStatus: "approved",
        branchId: ids.branches[0],
        branchRole: "teacher",
      },
    });
    const operator = await db.user.create({
      data: {
        email: "operator@example.invalid",
        name: "Fixture Operator",
        approvalStatus: "approved",
        isAdmin: true,
        isSuperAdmin: true,
      },
    });
    const actor = (user: typeof candidate) =>
      ({
        ...user,
        role: user.role,
        permissions: [],
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
      }) as unknown as Parameters<typeof accounts.approveManagedCandidate>[0];
    for (let i = 0; i < 2; i++) {
      await rpc("tm_sync_configure_binding", [
        ids.bindings[i],
        ids.tenants[i],
        ids.branches[i],
        "shadow",
        true,
      ]);
      await rpc("tm_sync_configure_binding", [
        ids.bindings[i],
        ids.tenants[i],
        ids.branches[i],
        "active",
        true,
      ]);
      await db.eywaBinding.create({
        data: {
          id: ids.bindings[i],
          tenantId: ids.tenants[i],
          targetBranchId: ids.branches[i],
          mode: "active",
        },
      });
    }
    const publish = async () => {
      const claims = await rpc("tm_sync_claim_events", [100]);
      for (const claim of claims) {
        const index = ids.bindings.indexOf(claim.event.bindingId);
        const response = await send(index, eventPath, claim.event);
        assert.equal(response.status, 200, await response.text());
        assert(
          await rpc("tm_sync_finish_event", [
            claim.event.eventId,
            claim.leaseToken,
            "received",
            null,
          ]),
        );
      }
      return claims;
    };
    const drain = async (i = 0) => {
      const response = await send(i, processPath, {
        bindingId: ids.bindings[i],
        limit: 20,
      });
      assert.equal(response.status, 200);
      return response.json() as Promise<any>;
    };
    const sync = async (i = 0) => {
      await publish();
      const result = await drain(i);
      assert(
        !result.results.some((r: any) => r.status === "received"),
        JSON.stringify(result),
      );
      return result;
    };
    const initial = await publish();
    assert(initial.length > 0);
    await drain();
    const user = await db.user.findUniqueOrThrow({
      where: { eywaUserId: ids.teachers[0] },
    });
    const second = await db.user.findUniqueOrThrow({
      where: { eywaUserId: ids.teachers[1] },
    });
    const delegate = await db.user.findUniqueOrThrow({
      where: { eywaUserId: ids.teachers[2] },
    });
    assert.equal(user.authSource, "eywa");
    assert.equal(user.passwordHash, null);
    assert.equal(user.branchRole, "teacher");
    assert(!user.isAdmin && !user.isSuperAdmin);
    const { ALL_WORKSPACE_MENUS } =
      await import("../../src/contracts/accountAccess.contract");
    assert.deepEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => !user.disabledMenus.includes(menu)),
      ["home", "teaching", "concept"],
    );
    assert.equal(
      await db.user.count({
        where: { eywaUserId: { in: ids.teachers.slice(5) } },
      }),
      0,
    );
    assert.equal(
      await db.class.count({ where: { eywaBindingId: ids.bindings[0] } }),
      3,
    );
    assert.equal(
      await db.student.count({ where: { eywaBindingId: ids.bindings[0] } }),
      4,
    );
    pass(
      "real outbox signed receiver provisions least-privilege math teachers and excludes English/pending/protected/test identities",
    );
    const candidateMap = await db.eywaManagedAccount.findFirstOrThrow({
      where: { sourceUserId: ids.teachers[3] },
    });
    const mismatchMap = await db.eywaManagedAccount.findFirstOrThrow({
      where: { sourceUserId: ids.teachers[4] },
    });
    assert.equal(candidateMap.status, "candidate");
    assert.equal(mismatchMap.status, "conflict");
    assert.deepEqual(
      await db.user.findUniqueOrThrow({ where: { id: candidate.id } }),
      candidate,
    );
    assert.deepEqual(
      await db.user.findUniqueOrThrow({ where: { id: mismatch.id } }),
      mismatch,
    );
    await assert.rejects(
      accounts.approveManagedCandidate(actor(operator), {
        id: mismatchMap.id,
        version: mismatchMap.candidateVersion!,
        method: "operator",
        evidence:
          "Independently verified fixture identity with signed approval evidence",
      }),
    );
    await accounts.approveManagedCandidate(actor(candidate), {
      id: candidateMap.id,
      version: candidateMap.candidateVersion!,
      method: "owner",
      password: "isolated-fixture-password",
    });
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: candidate.id } }))
        .passwordHash,
      passwordHash,
    );
    pass(
      "email/name candidate preserved until explicit password approval; mismatch remains blocked",
    );
    const cls = await db.class.findUniqueOrThrow({
      where: { eywaClassId: ids.classes[0] },
    });
    const clsB = await db.class.findUniqueOrThrow({
      where: { eywaClassId: ids.classes[1] },
    });
    assert(await access.classAccessAllowed(user, cls, "test:write"));
    assert(!(await access.classAccessAllowed(second, cls, "test:read")));
    assert(await access.classAccessAllowed(delegate, cls, "test:read"));
    assert(!(await access.classAccessAllowed(delegate, cls, "test:write")));
    const roster = await access.loadOperationalRoster([cls.id, clsB.id]);
    const linked = await db.student.findUniqueOrThrow({
      where: { eywaStudentId: ids.students[0] },
    });
    assert.equal(roster.filter((s) => s.id === linked.id).length, 2);
    assert.equal(roster.length, 3); // two classes for Student0 + inclusive normal end today for Student2
    assert.equal(
      (await access.loadOperationalRoster([cls.id, clsB.id], true)).length,
      4,
    );
    pass(
      "real class gates honor homeroom/delegate read-only, manual pending handover, multiple enrollments, hold/start/end/transfer dates",
    );
    const manifest = await rpc("tm_sync_create_snapshot", [ids.bindings[0]]);
    const page = await rpc("tm_sync_snapshot_page", [
      ids.bindings[0],
      manifest.snapshotId,
      "students",
      0,
    ]);
    assert.equal(wire.sha256(page.json), page.sha256);
    assert(!page.json.includes("DO_NOT_EXPORT"));
    const current = await transport.fetchSnapshot(configs[0]);
    wire.validateCompleteSnapshot(current.manifest, current.pages);
    pass(
      "exact stored JSON-string SHA256 and complete typed snapshot survive SQL-to-HTTP-to-target parsing without private phone data",
    );
    const issue = async (sourceUser: string, index = 0) => {
      const begin = await sso.beginSso(ids.bindings[index], targetOrigin);
      const state = begin.url.searchParams.get("state")!,
        challenge = begin.url.searchParams.get("code_challenge")!;
      const code = randomBytes(32).toString("base64url");
      assert(
        await rpc("tm_sync_issue_code", [
          ids.bindings[index],
          sourceUser,
          wire.sha256(code),
          wire.sha256(state),
          challenge,
        ]),
      );
      return {
        cookie: begin.cookie,
        code,
        state,
        bindingId: ids.bindings[index],
        origin: targetOrigin,
      };
    };
    const loginInput = await issue(ids.teachers[0]);
    const login = await sso.exchangeSso(loginInput);
    assert(login.ticket);
    const authenticated = await sso.authorizeManagedSso(login.ticket);
    assert.equal(authenticated?.id, user.id);
    assert.equal(await sso.authorizeManagedSso(login.ticket), null);
    await assert.rejects(sso.exchangeSso(loginInput));
    const values = JSON.parse(
      Buffer.from(loginInput.cookie, "base64url").toString(),
    );
    await assert.rejects(
      transport.sourceRequest(
        configs[0],
        "sso",
        "/api/integrations/todays-math/v2/token",
        {
          bindingId: ids.bindings[0],
          code: loginInput.code,
          state: loginInput.state,
          codeVerifier: values.verifier,
        },
      ),
    );
    pass(
      "source one-time PKCE exchange issues a real target SSO login; code, callback and assertion ticket replays fail",
    );
    const wrongVerifierInput = await issue(ids.teachers[0]);
    await assert.rejects(
      transport.sourceRequest(
        configs[0],
        "sso",
        "/api/integrations/todays-math/v2/token",
        {
          bindingId: ids.bindings[0],
          code: wrongVerifierInput.code,
          state: wrongVerifierInput.state,
          codeVerifier: randomBytes(32).toString("base64url"),
        },
      ),
    );
    const afterWrongVerifier = await sso.exchangeSso(wrongVerifierInput);
    assert.equal(
      (await sso.authorizeManagedSso(afterWrongVerifier.ticket))?.id,
      user.id,
    );
    pass(
      "incorrect PKCE verifier cannot redeem a code or prevent its subsequent legitimate exchange",
    );
    assert.equal((await send(0, eventPath, initial[0].event, {})).status, 409);
    assert.equal(
      (
        await send(
          ids.bindings.indexOf(initial[0].event.bindingId),
          eventPath,
          initial[0].event,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await send(
          ids.bindings.indexOf(initial[0].event.bindingId),
          eventPath,
          { ...initial[0].event, kind: "content" },
        )
      ).status,
      409,
    );
    const rawProcess = JSON.stringify({ bindingId: ids.bindings[0] });
    const repeatHeaders = wire.signedHeaders(
      configs[0],
      "webhook",
      "POST",
      processPath,
      rawProcess,
    );
    assert.equal(
      (await send(0, processPath, JSON.parse(rawProcess), repeatHeaders))
        .status,
      200,
    );
    assert.equal(
      (await send(0, processPath, JSON.parse(rawProcess), repeatHeaders))
        .status,
      409,
    );
    pass(
      "unsigned delivery denied; event body idempotency and mutating-request durable nonce replay guards execute on real target DB",
    );
    const oldLogin = await sso.exchangeSso(await issue(ids.teachers[0]));
    const beforeOff = await db.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    await source.unsafe(
      "update public.tenant_licenses set is_active=false where tenant_id=$1",
      [ids.tenants[0]],
    );
    assert.equal(
      (await transport.fetchControl(configs[0])).control.enabled,
      false,
    );
    await source.unsafe(
      "update public.tenant_licenses set is_active=true where tenant_id=$1",
      [ids.tenants[0]],
    );
    assert(await accounts.managedLoginAllowed(user.id, true));
    assert(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .sessionVersion > beforeOff.sessionVersion,
    );
    assert.equal(await sso.authorizeManagedSso(oldLogin.ticket), null);
    pass(
      "OFF control stays service-readable; unseen OFF-ON generation revokes old session version and outstanding SSO assertion",
    );
    const oldVersion = (
      await db.user.findUniqueOrThrow({ where: { id: user.id } })
    ).sessionVersion;
    await source.unsafe(
      "update public.users set status='inactive' where id=$1",
      [ids.teachers[0]],
    );
    assert(!(await accounts.managedLoginAllowed(user.id, true)));
    await source.unsafe("update public.users set status='active' where id=$1", [
      ids.teachers[0],
    ]);
    assert(await accounts.managedLoginAllowed(user.id, true));
    assert(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .sessionVersion > oldVersion,
    );
    await db.user.update({
      where: { id: user.id },
      data: { manualSuspendedAt: new Date(), suspendedAt: new Date() },
    });
    await accounts.managedLoginAllowed(user.id, true);
    assert(!(await accounts.managedLoginAllowed(user.id)));
    assert(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .manualSuspendedAt,
    );
    await db.user.update({
      where: { id: user.id },
      data: { manualSuspendedAt: null, suspendedAt: null },
    });
    assert(await accounts.managedLoginAllowed(user.id, true));
    await source.unsafe(
      "update auth.users set banned_until=now()+interval '1 hour' where id=$1",
      [ids.teachers[0]],
    );
    assert(!(await accounts.managedLoginAllowed(user.id, true)));
    await source.unsafe("update auth.users set banned_until=null where id=$1", [
      ids.teachers[0],
    ]);
    assert(await accounts.managedLoginAllowed(user.id, true));
    pass(
      "retirement/rejoin and Auth ban/unban revoke access, while source recovery preserves explicit local suspension",
    );
    await source.unsafe("update public.classes set teacher_id=$2 where id=$1", [
      ids.classes[0],
      ids.teachers[1],
    ]);
    assert(
      !(await access.classAccessAllowed(user, cls, "test:read", {
        forceRefresh: true,
      })),
    );
    assert(
      !(await access.classAccessAllowed(second, cls, "test:read", {
        forceRefresh: true,
      })),
    );
    await sync();
    const changedClass = await db.class.findUniqueOrThrow({
      where: { id: cls.id },
    });
    assert(await access.classAccessAllowed(second, changedClass, "test:write"));
    assert(!(await access.classAccessAllowed(user, changedClass, "test:read")));
    await source.unsafe(
      "update public.class_delegations set from_date=(now() at time zone 'Asia/Seoul')::date-2,to_date=(now() at time zone 'Asia/Seoul')::date-1 where id=$1",
      [ids.delegate],
    );
    assert(
      !(await access.classAccessAllowed(delegate, changedClass, "test:read", {
        forceRefresh: true,
      })),
    );
    await sync();
    pass(
      "class move denies old teacher immediately and grants new teacher only after matching relation revision; expired delegation loses access",
    );
    const contentBefore = (
      await db.eywaBinding.findUniqueOrThrow({ where: { id: ids.bindings[0] } })
    ).contentGeneration;
    await source.unsafe(
      "update public.classes set class_name='Changed during partial export' where id=$1",
      [ids.classes[1]],
    );
    await rpc("tm_sync_reconcile");
    failPage = true;
    await publish();
    const partial = await drain();
    assert(partial.results.some((r: any) => r.status === "received"));
    assert.equal(
      (
        await db.eywaBinding.findUniqueOrThrow({
          where: { id: ids.bindings[0] },
        })
      ).contentGeneration,
      contentBefore,
    );
    assert.equal(
      (await db.class.findUniqueOrThrow({ where: { id: clsB.id } })).name,
      clsB.name,
    );
    await source.unsafe(
      "update public.tenant_licenses set is_active=false where tenant_id=$1",
      [ids.tenants[0]],
    );
    await publish();
    await drain();
    assert(!(await accounts.managedLoginAllowed(second.id)));
    failPage = false;
    await source.unsafe(
      "update public.tenant_licenses set is_active=true where tenant_id=$1",
      [ids.tenants[0]],
    );
    await db.eywaInbox.updateMany({
      where: { bindingId: ids.bindings[0], status: "received" },
      data: { retryAt: new Date(0) },
    });
    await sync();
    assert.equal(
      (await db.class.findUniqueOrThrow({ where: { id: clsB.id } })).name,
      "Changed during partial export",
    );
    pass(
      "missing snapshot page commits no content generation or roster changes; independent OFF control still blocks access and retry recovers",
    );
    const stale = await transport.fetchControl(configs[0]);
    await source.unsafe(
      "update public.users set status='inactive' where id=$1",
      [ids.teachers[2]],
    );
    await sync();
    const revision = (
      await db.eywaBinding.findUniqueOrThrow({ where: { id: ids.bindings[0] } })
    ).securityRevision;
    overrideControl = stale.control;
    await accounts.managedLoginAllowed(delegate.id, true);
    overrideControl = null;
    assert.equal(
      (
        await db.eywaBinding.findUniqueOrThrow({
          where: { id: ids.bindings[0] },
        })
      ).securityRevision,
      revision,
    );
    assert(!(await accounts.managedLoginAllowed(delegate.id)));
    pass(
      "late older signed control cannot roll security revision back or revive a retired teacher",
    );
    // Actual source tenant move creates a new candidate but cannot re-home target data automatically.
    await source.unsafe("update public.users set tenant_id=$2 where id=$1", [
      ids.teachers[0],
      ids.tenants[1],
    ]);
    await sync(0);
    await sync(1);
    const transfer = await db.eywaManagedAccount.findFirstOrThrow({
      where: { bindingId: ids.bindings[1], sourceUserId: ids.teachers[0] },
    });
    assert.equal(transfer.status, "conflict");
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).branchId,
      ids.branches[0],
    );
    await accounts.approveManagedCandidate(actor(operator), {
      id: transfer.id,
      version: transfer.candidateVersion!,
      method: "operator",
      evidence:
        "Independent fixture identity verification and explicit approved transfer between branches",
    });
    const moved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(moved.branchId, ids.branches[1]);
    assert.equal(
      (await db.class.findUniqueOrThrow({ where: { id: cls.id } })).branchId,
      ids.branches[0],
    );
    assert.equal(
      (await db.student.findUniqueOrThrow({ where: { id: linked.id } }))
        .branchId,
      ids.branches[0],
    );
    assert(
      !(await access.classAccessAllowed(moved, changedClass, "test:read")),
    );
    assert(await accounts.managedLoginAllowed(user.id, true));
    await source.unsafe(
      "update public.tenant_licenses set is_active=false where tenant_id=$1",
      [ids.tenants[0]],
    );
    await sync();
    assert(await accounts.managedLoginAllowed(user.id, true));
    const transferredLogin = await sso.exchangeSso(
      await issue(ids.teachers[0], 1),
    );
    assert.equal(
      (await sso.authorizeManagedSso(transferredLogin.ticket))?.id,
      user.id,
    );
    pass(
      "explicit approved managed branch transfer preserves old class/student branch ownership and old-binding OFF cannot revoke new access",
    );
    // Real source license trigger -> signed receiver, with no manual target branch/binding.
    const autoTenant = randomUUID(),
      autoTeacher = randomUUID(),
      autoClass = randomUUID(),
      autoStudent = randomUUID();
    const automatic = wire.parseAutomaticConfigs(JSON.stringify([configs[0]]));
    process.env.EYWA_SYNC_AUTO_JSON = JSON.stringify(automatic);
    await rpc("tm_sync_configure_automatic", [true, ids.tenants]);
    configs.push(...wire.resolveBindingConfigs(configs, automatic, autoTenant));
    ids.tenants.push(autoTenant);
    ids.bindings.push(autoTenant);
    ids.branches.push(autoTenant);
    await source.unsafe(
      "insert into public.tenants(id,slug,name) values($1,$2,$3)",
      [autoTenant, "auto-chimsan", "인재원 침산"],
    );
    await source.unsafe(
      "insert into public.tenant_licenses(tenant_id,feature,is_active) values($1,'todays_math',false)",
      [autoTenant],
    );
    assert.equal(await rpc("tm_sync_control", [autoTenant]), null);
    assert.equal(
      await db.branch.findUnique({ where: { id: autoTenant } }),
      null,
    );
    await source.unsafe("insert into auth.users(id,email) values($1,$2)", [
      autoTeacher,
      "automatic@example.invalid",
    ]);
    await source.unsafe(
      "insert into public.users(id,tenant_id,email,display_name,system_role,status,subjects) values($1,$2,$3,$4,'teacher','active',ARRAY['math'])",
      [autoTeacher, autoTenant, "automatic@example.invalid", "자동 교사"],
    );
    await source.unsafe(
      "insert into public.classes(id,tenant_id,class_name,subject,teacher_id) values($1,$2,$3,'math',$4)",
      [autoClass, autoTenant, "자동 수학반", autoTeacher],
    );
    await source.unsafe(
      "insert into public.students(id,tenant_id,name,status,is_test) values($1,$2,$3,'enrolled',false)",
      [autoStudent, autoTenant, "자동 학생"],
    );
    await source.unsafe(
      "insert into public.enrollments(id,tenant_id,student_id,class_id,start_date,attendance_days) values($1,$2,$3,$4,current_date,ARRAY['mon'])",
      [randomUUID(), autoTenant, autoStudent, autoClass],
    );
    await source.unsafe(
      "update public.tenant_licenses set is_active=true where tenant_id=$1",
      [autoTenant],
    );
    const automaticControl = await rpc("tm_sync_control", [autoTenant]);
    assert.equal(automaticControl.targetBranchId, autoTenant);
    assert.equal(automaticControl.tenantName, "인재원 침산");
    await sync(2);
    const automaticBinding = await db.eywaBinding.findUniqueOrThrow({
      where: { id: autoTenant },
    });
    assert.equal(automaticBinding.autoProvisionedBranch, true);
    const automaticBranch = await db.branch.findUniqueOrThrow({
      where: { id: autoTenant },
    });
    assert.equal(automaticBranch.name, "인재원 침산");
    const automaticUser = await db.user.findUniqueOrThrow({
      where: { eywaUserId: autoTeacher },
    });
    assert.equal(automaticUser.branchId, autoTenant);
    assert.equal(
      await db.class.count({ where: { eywaBindingId: autoTenant } }),
      1,
    );
    assert.equal(
      await db.student.count({ where: { eywaBindingId: autoTenant } }),
      1,
    );
    assert(await accounts.managedLoginAllowed(automaticUser.id, true));
    await source.unsafe(
      "update public.tenant_licenses set is_active=false where tenant_id=$1",
      [autoTenant],
    );
    await sync(2);
    assert(!(await accounts.managedLoginAllowed(automaticUser.id, true)));
    assert.equal(
      await db.class.count({ where: { eywaBindingId: autoTenant } }),
      1,
    );
    assert.equal(
      await db.student.count({ where: { eywaBindingId: autoTenant } }),
      1,
    );
    await source.unsafe(
      "update public.tenant_licenses set is_active=true where tenant_id=$1",
      [autoTenant],
    );
    await source.unsafe("update public.tenants set name=$2 where id=$1", [
      autoTenant,
      "인재원 침산 새이름",
    ]);
    await sync(2);
    const resumedBranch = await db.branch.findUniqueOrThrow({
      where: { id: autoTenant },
    });
    assert.equal(
      resumedBranch.createdAt.getTime(),
      automaticBranch.createdAt.getTime(),
    );
    assert.equal(resumedBranch.name, "인재원 침산 새이름");
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { eywaUserId: autoTeacher } }))
        .id,
      automaticUser.id,
    );
    assert(await accounts.managedLoginAllowed(automaticUser.id, true));
    pass(
      "first license ON automatically creates branch, teacher, class and student; OFF suspends without deletion; ON and rename reuse the same identities",
    );
    // The independent byte-size fixture explicitly registers its own tenant mapping.
    await rpc("tm_sync_configure_automatic", [false, []]);
    await source.unsafe(
      await sourceRead("supabase/tests/todays_math_sync_page_bytes.sql"),
    );
    pass(
      "serialized escaped SQL Page byte limit rejects atomically without damaging the prior frozen export",
    );
    console.log(
      JSON.stringify(
        {
          passed: checks.length,
          checks,
          sourceHttpCalls: calls,
          databases: ["eywa_e2e_source", "eywa_e2e_target"],
          limitations: [
            "Local HTTP transport adapters; no Next browser routing or real Auth.js cookie session",
            "No production network latency or scheduler timing assertion",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.closeAllConnections();
            server.close(() => resolve());
          }),
      ),
    );
    if (disconnect) await disconnect();
    await source.end({ timeout: 5 });
    await target.end({ timeout: 5 });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
