/** Real PostgreSQL + signed HTTP source fixture; no application env files or source checkout.
 * node --conditions=react-server --import tsx scripts/qa/eywa-automatic-integration.ts
 * Resets ONLY eywa_auto_target_test in the existing localhost:55432 Docker fixture.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AccountAccess } from "../../src/contracts/accountAccess.contract";
import type {
  BindingConfig,
  Control,
  Manifest,
  SnapshotPage,
  SnapshotRows,
} from "../../src/lib/eywa/sync-contract";

const database = "eywa_auto_target_test";
const container = "eywa-sync-fixture-20261003";
const fixtureUrl = `postgresql://postgres@127.0.0.1:55432/${database}?sslmode=disable`;
const psql = (sql: string, target = database) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      target,
    ],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

async function prepareDatabase() {
  const ports = JSON.parse(
    execFileSync(
      "docker",
      ["inspect", "--format", "{{json .NetworkSettings.Ports}}", container],
      { encoding: "utf8" },
    ),
  );
  assert(
    ports["5432/tcp"].some(
      (p: { HostIp: string; HostPort: string }) =>
        p.HostIp === "127.0.0.1" && p.HostPort === "55432",
    ),
  );
  if (
    !psql(
      `SELECT datname FROM pg_database WHERE datname = '${database}';`,
      "postgres",
    ).includes(database)
  )
    psql(`CREATE DATABASE ${database};`, "postgres");
  const scratch = await mkdtemp(path.join(tmpdir(), "eywa-auto-schema-"));
  const schemaPath = path.join(scratch, "schema.prisma");
  try {
    await writeFile(
      schemaPath,
      execFileSync("git", [
        "show",
        "d65f042002eebb7ba04d6df97d9da6891c7d9171:prisma/schema.prisma",
      ]),
    );
    const baseline = execFileSync(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema-datamodel",
        schemaPath,
        "--script",
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    const migration = await readFile(
      "prisma/migrations/20261003085222_eywa_managed_sync/migration.sql",
      "utf8",
    );
    psql(
      `DROP SCHEMA public CASCADE; CREATE SCHEMA public;\n${baseline}\n${migration}`,
    );
  } finally {
    await unlink(schemaPath);
    await rmdir(scratch);
  }
}

async function main() {
  process.env.DATABASE_URL = fixtureUrl;
  process.env.DIRECT_URL = fixtureUrl;
  delete process.env.EYWA_SYNC_BINDINGS_JSON;
  delete process.env.EYWA_SYNC_AUTO_JSON;
  await prepareDatabase();
  const { db } = await import("../../src/lib/db");
  const wire = await import("../../src/lib/eywa/sync-contract");
  const transport = await import("../../src/lib/eywa/managedTransport");
  const accounts = await import("../../src/lib/eywa/managedAccounts");
  const sso = await import("../../src/lib/eywa/managedSso");
  const admin = await import("../../src/lib/eywa/managedAdministration");
  const legacy = await import("../../src/lib/eywa/legacyFence");
  const { POST: eventPost } =
    await import("../../src/app/api/integrations/eywa/v2/events/route");
  const { POST: processPost } =
    await import("../../src/app/api/integrations/eywa/v2/process/route");
  const { settleErrorLogWrites } =
    await import("../../src/lib/errorLog/withErrorLog");
  const configs = new Map<string, BindingConfig>();
  const controls = new Map<string, Control>();
  const snapshots = new Map<
    string,
    { manifest: Manifest; pages: SnapshotPage[] }
  >();
  let overrideControl: unknown;
  let invalidAssertion = false;
  let controlCalls = 0;
  const checks: string[] = [];
  const pass = (label: string) => {
    checks.push(label);
    console.log(`PASS ${label}`);
  };
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
      const url = new URL(request.url);
      const verified = wire.verifySignedRequest(
        request,
        raw,
        [...configs.values()],
        url.pathname.endsWith("/token") ? "sso" : "control",
      );
      const input = raw
        ? JSON.parse(raw)
        : Object.fromEntries(url.searchParams);
      assert.equal(input.bindingId, verified.config.bindingId);
      const control = controls.get(input.bindingId)!;
      let result: unknown;
      if (url.pathname.endsWith("/control")) {
        controlCalls++;
        result = overrideControl ?? {
          ...control,
          validatedAt: new Date().toISOString(),
          users: input.userId
            ? control.users.filter((u) => u.id === input.userId)
            : control.users,
        };
      } else if (url.pathname.endsWith("/snapshots")) {
        const snapshot = snapshots.get(input.bindingId)!;
        snapshot.manifest.control = {
          ...control,
          validatedAt: new Date().toISOString(),
        };
        snapshot.manifest.securityRevision = control.securityRevision;
        snapshot.manifest.generatedAt = new Date().toISOString();
        snapshot.manifest.expiresAt = new Date(
          Date.now() + 60_000,
        ).toISOString();
        result = snapshot.manifest;
      } else if (url.pathname.includes("/snapshots/")) {
        result = snapshots
          .get(input.bindingId)!
          .pages.find(
            (p) => p.kind === input.kind && p.page === Number(input.page),
          );
      } else if (url.pathname.endsWith("/token")) {
        const source = control.users[0];
        const iat = Math.floor(Date.now() / 1000);
        result = {
          assertion:
            wire.signAssertion(
              {
                iss: "aywa",
                aud: "todays-math",
                bindingId: control.bindingId,
                sourceEpoch: control.sourceEpoch,
                sub: source.id,
                tenantId: control.tenantId,
                email: source.email,
                name: source.name,
                securityRevision: control.securityRevision,
                tenantRevocationGeneration: control.tenantRevocationGeneration,
                accountRevocationGeneration: source.accountRevocationGeneration,
                iat,
                exp: iat + 60,
                jti: randomUUID(),
              },
              verified.config,
            ) + (invalidAssertion ? "invalid" : ""),
        };
      } else throw new Error("unexpected_fixture_path");
      outgoing.setHeader("Content-Type", "application/json");
      outgoing.end(JSON.stringify(result));
    } catch (error) {
      outgoing.statusCode = 503;
      outgoing.end(JSON.stringify({ error: String(error) }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  const auto = {
    sourceBaseUrl: `http://127.0.0.1:${address.port}`,
    targetBaseUrl: "http://localhost:3999",
    keyId: "auto-fixture",
    controlSecret: "c".repeat(32),
    webhookSecret: "w".repeat(32),
    ssoSecret: "s".repeat(32),
  };
  process.env.EYWA_SYNC_AUTO_JSON = JSON.stringify([auto]);

  function tenant(name = `Automatic ${randomUUID()}`) {
    const bindingId = randomUUID();
    const config: BindingConfig = {
      ...auto,
      bindingId,
      tenantId: bindingId,
      targetBranchId: bindingId,
      provision: "automatic",
    };
    configs.set(bindingId, config);
    const control: Control = {
      schemaVersion: 2,
      bindingId,
      tenantId: bindingId,
      targetBranchId: bindingId,
      tenantName: name,
      sourceEpoch: randomUUID(),
      securityRevision: "1",
      tenantRevocationGeneration: "0",
      enabled: true,
      mode: "active",
      validatedAt: new Date().toISOString(),
      nextEffectiveAt: null,
      healthy: true,
      users: [],
    };
    controls.set(bindingId, control);
    return { config, control };
  }
  function request(
    config: BindingConfig,
    body: unknown,
    endpoint = "/api/integrations/eywa/v2/events",
    headers: Record<string, string> = {},
    origin = config.targetBaseUrl,
  ) {
    const raw = JSON.stringify(body);
    return new Request(origin + endpoint, {
      method: "POST",
      headers: {
        ...wire.signedHeaders(config, "webhook", "POST", endpoint, raw),
        ...headers,
      },
      body: raw,
    });
  }
  function event(control: Control) {
    return {
      schemaVersion: 2,
      eventId: randomUUID(),
      bindingId: control.bindingId,
      tenantId: control.tenantId,
      sourceEpoch: control.sourceEpoch,
      securityRevision: control.securityRevision,
      tenantRevocationGeneration: control.tenantRevocationGeneration,
      occurredAt: new Date().toISOString(),
      kind: "reconcile",
      entityType: "binding",
      entityId: null,
    };
  }
  async function deliver(config: BindingConfig, control: Control) {
    const response = await eventPost(request(config, event(control)));
    assert.equal(response.status, 200, await response.clone().text());
    const applied = await processPost(
      request(
        config,
        { bindingId: config.bindingId },
        "/api/integrations/eywa/v2/process",
      ),
    );
    assert.equal(applied.status, 200, await applied.clone().text());
    const result = await applied.json();
    assert(
      result.results.every((r: { status: string }) => r.status === "applied"),
      JSON.stringify(result),
    );
  }
  async function absent(id: string) {
    assert.equal(await db.branch.count({ where: { id } }), 0);
    assert.equal(await db.eywaBinding.count({ where: { id } }), 0);
    assert.equal(await db.eywaInbox.count({ where: { bindingId: id } }), 0);
    assert.equal(
      await db.accountAuditLog.count({
        where: { eventId: `eywa:auto-branch:${id}` },
      }),
      0,
    );
  }
  try {
    const bad = tenant();
    const initialControlCalls = controlCalls;
    await assert.rejects(
      transport.verifyReceiverRequest(
        request(bad.config, event(bad.control), undefined, {
          "x-eywa-signature": "0".repeat(64),
        }),
      ),
      /invalid_signature/,
    );
    await assert.rejects(
      transport.verifyReceiverRequest(
        request(
          bad.config,
          event(bad.control),
          undefined,
          {},
          "http://localhost:4000",
        ),
      ),
      /target_origin_mismatch/,
    );
    assert.equal(controlCalls, initialControlCalls);
    await absent(bad.config.bindingId);
    pass(
      "invalid signature and wrong fixed origin do not fetch source or mutate target",
    );

    for (const patch of [
      { enabled: false },
      { healthy: false },
      { mode: "shadow" },
      { tenantName: undefined },
      { tenantName: null },
      { tenantName: "" },
      { tenantName: "   " },
      { tenantName: "bad\u0000name" },
      { tenantName: "x".repeat(101) },
      { tenantId: randomUUID() },
      { targetBranchId: randomUUID() },
      { validatedAt: new Date(Date.now() - 120_000).toISOString() },
      { validatedAt: new Date(Date.now() + 120_000).toISOString() },
      { nextEffectiveAt: new Date(Date.now() - 1).toISOString() },
    ]) {
      const item = tenant();
      overrideControl = { ...item.control, ...patch };
      await assert.rejects(
        transport.verifyReceiverRequest(
          request(item.config, event(item.control)),
        ),
      );
      await absent(item.config.bindingId);
    }
    overrideControl = undefined;
    pass(
      "OFF, unhealthy, shadow, missing/invalid names, identity and stale control reject without provisioning",
    );

    const primary = tenant("자동 연결 학원");
    const staffId = randomUUID(),
      classId = randomUUID(),
      studentId = randomUUID(),
      enrollmentId = randomUUID();
    primary.control.users = [
      {
        id: staffId,
        email: `${staffId}@example.test`,
        name: "자동 강사",
        status: "active",
        role: "teacher",
        subjects: ["math"],
        eligible: true,
        blockReasons: [],
        accountRevocationGeneration: "0",
        classListRevision: "1",
        classes: [
          {
            id: classId,
            permissionRevision: "1",
            capabilities: [...wire.CAPABILITIES],
            validUntil: null,
          },
        ],
      },
    ];
    const rows: SnapshotRows = {
      staff: primary.control.users,
      classes: [
        {
          id: classId,
          name: "자동 수학반",
          subject: "math",
          grade: "중1",
          active: true,
          closedAt: null,
          teacherId: staffId,
          permissionRevision: "1",
        },
      ],
      memberships: [
        {
          id: `${classId}:${staffId}`,
          classId,
          userId: staffId,
          role: "homeroom",
          startsOn: null,
          endsOn: null,
          revokedAt: null,
          capabilities: [...wire.CAPABILITIES],
        },
      ],
      students: [
        {
          id: studentId,
          name: "자동 학생",
          grade: "중1",
          school: null,
          status: "active",
          isTest: false,
        },
      ],
      enrollments: [
        {
          id: enrollmentId,
          studentId,
          classId,
          startsOn: "2026-01-01",
          endsOn: null,
          onHold: false,
          isTransferred: false,
          attendanceDays: [],
        },
      ],
      progress: [],
    };
    const snapshotId = randomUUID();
    const pages: SnapshotPage[] = [];
    const collections = Object.fromEntries(
      wire.COLLECTION_KINDS.map((kind) => {
        const json = JSON.stringify(rows[kind]),
          sha256 = wire.sha256(json);
        if (rows[kind].length)
          pages.push({
            snapshotId,
            bindingId: primary.config.bindingId,
            kind,
            page: 0,
            json,
            sha256,
          });
        return [
          kind,
          {
            total: rows[kind].length,
            pages: rows[kind].length
              ? [{ page: 0, count: rows[kind].length, sha256 }]
              : [],
          },
        ];
      }),
    ) as Manifest["collections"];
    snapshots.set(primary.config.bindingId, {
      pages,
      manifest: {
        schemaVersion: 2,
        snapshotId,
        bindingId: primary.config.bindingId,
        tenantId: primary.config.tenantId,
        targetBranchId: primary.config.targetBranchId,
        sourceEpoch: primary.control.sourceEpoch,
        securityRevision: "1",
        contentGeneration: "1",
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        complete: true,
        control: primary.control,
        collections,
      },
    });
    const firstEvent = event(primary.control);
    await absent(primary.config.bindingId);
    const concurrent = await Promise.all(
      Array.from({ length: 8 }, () =>
        eventPost(request(primary.config, firstEvent)),
      ),
    );
    for (const response of concurrent)
      assert.equal(response.status, 200, await response.clone().text());
    assert.equal(
      await db.branch.count({ where: { id: primary.config.targetBranchId } }),
      1,
    );
    const binding = await db.eywaBinding.findUniqueOrThrow({
      where: { id: primary.config.bindingId },
    });
    assert.equal(binding.mode, "active");
    assert.equal(binding.autoProvisionedBranch, true);
    assert.equal(binding.sourceEpoch, primary.control.sourceEpoch);
    assert.equal(
      await db.accountAuditLog.count({
        where: { eventId: `eywa:auto-branch:${binding.id}` },
      }),
      1,
    );
    assert.equal(
      await db.eywaInbox.count({ where: { eventId: firstEvent.eventId } }),
      1,
    );
    pass(
      "concurrent signed ON deliveries create one absent branch, active binding, audit and inbox row",
    );
    await deliver(primary.config, primary.control);
    const user = await db.user.findUniqueOrThrow({
      where: { eywaUserId: staffId },
    });
    const cls = await db.class.findUniqueOrThrow({
      where: { eywaClassId: classId },
    });
    const student = await db.student.findUniqueOrThrow({
      where: { eywaStudentId: studentId },
    });
    const enrollment = await db.studentEnrollment.findUniqueOrThrow({
      where: {
        bindingId_sourceId: { bindingId: binding.id, sourceId: enrollmentId },
      },
    });
    assert.equal(user.branchId, binding.targetBranchId);
    assert.equal(user.passwordHash, null);
    assert.equal(cls.userId, user.id);
    assert.equal(student.classId, cls.id);
    assert.equal(enrollment.studentId, student.id);
    assert.equal(
      (await accounts.getManagedClassGrants(user.id))?.sourceClasses
        .find((c) => c.id === classId)
        ?.capabilities.includes("student:read"),
      true,
    );
    pass(
      "automatic processing connects staff, class, membership, student and enrollment with real grants",
    );

    const begin = await sso.beginSso(binding.id, auto.targetBaseUrl);
    const exchanged = await sso.exchangeSso({
      cookie: begin.cookie,
      state: begin.url.searchParams.get("state")!,
      code: "fixture-code-for-auto-login",
      bindingId: binding.id,
      origin: auto.targetBaseUrl,
    });
    assert(exchanged.ticket);
    assert.equal(
      (await sso.getPendingSsoSwitch(exchanged.ticket))?.sourceName,
      primary.control.users[0].name,
    );
    assert.equal(
      (await sso.authorizeManagedSso(exchanged.ticket))?.id,
      user.id,
    );
    assert.equal(await sso.getPendingSsoSwitch(exchanged.ticket), null);
    pass(
      "dynamic automatic config supports signed SSO exchange, login and consumed switch expiry",
    );

    const audit = await db.accountAuditLog.create({
      data: {
        userId: user.id,
        action: "fixture.learning_history",
        outcome: "success",
        details: { classId: cls.id, studentId: student.id },
      },
    });
    const unit = await db.unit.create({
      data: {
        grade: "중1",
        chapter: "기록",
        section: "보존",
        orderIndex: 1,
        problemCodePrefix: "AUTO01",
      },
    });
    const progress = await db.progress.create({
      data: {
        classId: cls.id,
        studentId: student.id,
        unitId: unit.id,
        recordedAt: new Date("2026-01-01"),
      },
    });
    const test = await db.test.create({
      data: {
        userId: user.id,
        classId: cls.id,
        studentId: student.id,
        testType: "daily",
        rangeEndUnitId: unit.id,
        testDate: new Date("2026-01-01"),
      },
    });
    const before = {
      classId: cls.id,
      studentId: student.id,
      userId: user.id,
      enrollmentId: enrollment.id,
      bindingCreatedAt: binding.createdAt,
    };
    primary.control.enabled = false;
    primary.control.securityRevision = "2";
    primary.control.tenantRevocationGeneration = "1";
    await deliver(primary.config, primary.control);
    assert.equal(
      (await db.eywaBinding.findUniqueOrThrow({ where: { id: binding.id } }))
        .enabled,
      false,
    );
    await assert.rejects(
      accounts.getManagedClassGrants(user.id),
      /managed_access_denied/,
    );
    assert.equal(await db.branch.count({ where: { id: binding.id } }), 1);
    const manualSuspendedAt = new Date();
    await db.user.update({
      where: { id: user.id },
      data: { manualSuspendedAt },
    });
    primary.control.enabled = true;
    primary.control.securityRevision = "3";
    await deliver(primary.config, primary.control);
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(
      after.manualSuspendedAt?.getTime(),
      manualSuspendedAt.getTime(),
    );
    assert(after.suspendedAt);
    assert.equal(
      (await db.class.findUniqueOrThrow({ where: { eywaClassId: classId } }))
        .id,
      before.classId,
    );
    assert.equal(
      (
        await db.student.findUniqueOrThrow({
          where: { eywaStudentId: studentId },
        })
      ).id,
      before.studentId,
    );
    assert.equal(
      (
        await db.studentEnrollment.findUniqueOrThrow({
          where: {
            bindingId_sourceId: {
              bindingId: binding.id,
              sourceId: enrollmentId,
            },
          },
        })
      ).id,
      before.enrollmentId,
    );
    assert.equal(
      (
        await db.eywaBinding.findUniqueOrThrow({ where: { id: binding.id } })
      ).createdAt.getTime(),
      before.bindingCreatedAt.getTime(),
    );
    assert(await db.accountAuditLog.findUnique({ where: { id: audit.id } }));
    assert.deepEqual(
      await db.progress.findUnique({ where: { id: progress.id } }),
      progress,
    );
    assert.deepEqual(
      await db.test.findUnique({ where: { id: test.id } }),
      test,
    );
    assert.equal(
      await db.accountAuditLog.count({
        where: { eventId: `eywa:auto-branch:${binding.id}` },
      }),
      1,
    );
    await db.user.update({
      where: { id: user.id },
      data: { manualSuspendedAt: null },
    });
    assert(await accounts.getManagedClassGrants(user.id));
    pass(
      "OFF denies grants and ON reuses branch/roster IDs and history while preserving manual suspension",
    );

    for (const collision of ["id", "name"] as const) {
      const item = tenant();
      const branch = await db.branch.create({
        data: {
          id: collision === "id" ? item.config.bindingId : randomUUID(),
          name:
            collision === "name"
              ? item.control.tenantName!
              : "Existing unlinked branch",
        },
      });
      if (collision === "id")
        await assert.rejects(
          transport.verifyReceiverRequest(
            request(item.config, event(item.control)),
          ),
          /automatic_branch_conflict/,
        );
      else
        await transport.verifyReceiverRequest(
          request(item.config, event(item.control)),
        );
      assert.deepEqual(
        await db.branch.findUnique({ where: { id: branch.id } }),
        branch,
      );
      assert.equal(
        await db.eywaBinding.count({ where: { id: item.config.bindingId } }),
        collision === "id" ? 0 : 1,
      );
    }
    const sameName = `Concurrent name ${randomUUID()}`;
    const competing = [tenant(sameName), tenant(sameName)];
    const competed = await Promise.allSettled(
      competing.map((item) =>
        transport.verifyReceiverRequest(
          request(item.config, event(item.control)),
        ),
      ),
    );
    assert.equal(competed.filter((r) => r.status === "fulfilled").length, 2);
    assert.equal(await db.branch.count({ where: { name: sameName } }), 2);
    pass(
      "unlinked branch UUID collision rejects unchanged; same-named distinct tenants create separate branches without adoption",
    );

    const blocked = tenant();
    await db.branch.create({
      data: { id: blocked.config.bindingId, name: "Operator-owned branch" },
    });
    const retiredAt = new Date();
    const blockedBinding = await db.eywaBinding.create({
      data: {
        id: blocked.config.bindingId,
        tenantId: blocked.config.tenantId,
        targetBranchId: blocked.config.targetBranchId,
        mode: "shadow",
        retiredAt,
        lastError: "operator_block",
        sourceEpoch: blocked.control.sourceEpoch,
      },
    });
    assert.equal(blockedBinding.autoProvisionedBranch, false);
    const ownershipUpgrade = await readFile(
      "prisma/migrations/20261003103000_eywa_auto_branch/migration.sql",
      "utf8",
    );
    psql(ownershipUpgrade);
    psql(ownershipUpgrade);
    assert.equal(
      (
        await db.eywaBinding.findUniqueOrThrow({
          where: { id: blockedBinding.id },
        })
      ).autoProvisionedBranch,
      false,
    );
    const callsBeforeReuse = controlCalls;
    await transport.verifyReceiverRequest(
      request(blocked.config, event(blocked.control)),
    );
    assert.equal(controlCalls, callsBeforeReuse);
    assert.deepEqual(
      await db.eywaBinding.findUnique({ where: { id: blockedBinding.id } }),
      blockedBinding,
    );
    assert.equal(
      (
        await db.branch.findUniqueOrThrow({
          where: { id: blockedBinding.targetBranchId },
        })
      ).name,
      "Operator-owned branch",
    );
    await assert.rejects(
      sso.beginSso(blockedBinding.id, auto.targetBaseUrl),
      /binding_inactive/,
    );
    pass(
      "existing shadow and retired binding plus local operator error are untouched by automatic receiver reuse",
    );

    const mapped = tenant();
    const otherId = randomUUID(),
      otherBranch = randomUUID();
    await db.branch.create({
      data: { id: otherBranch, name: "Existing explicit mapping" },
    });
    await db.eywaBinding.create({
      data: {
        id: otherId,
        tenantId: mapped.config.tenantId,
        targetBranchId: otherBranch,
        mode: "shadow",
      },
    });
    await assert.rejects(
      transport.verifyReceiverRequest(
        request(mapped.config, event(mapped.control)),
      ),
      /automatic_mapping_conflict/,
    );
    await absent(mapped.config.bindingId);
    const manual = {
      ...auto,
      bindingId: otherId,
      tenantId: mapped.config.tenantId,
      targetBranchId: otherBranch,
      keyId: "manual-key",
    };
    process.env.EYWA_SYNC_BINDINGS_JSON = JSON.stringify([manual]);
    assert.equal(transport.bindingConfig(otherId).keyId, "manual-key");
    assert.throws(
      () => transport.bindingConfig(mapped.config.bindingId),
      /binding_not_configured/,
    );
    assert.throws(
      () => transport.bindingConfig(otherBranch),
      /binding_not_configured/,
    );
    await assert.rejects(
      transport.verifyReceiverRequest(
        request({ ...mapped.config, bindingId: otherId }, {}),
      ),
      /invalid_signature/,
    );
    pass(
      "persisted mapping collisions reject and explicit config takes priority without tenant/branch overlap",
    );
    delete process.env.EYWA_SYNC_BINDINGS_JSON;

    const operator: AccountAccess = {
      id: randomUUID(),
      name: "Operator",
      email: "operator@example.test",
      role: "director",
      isAdmin: false,
      isSuperAdmin: true,
      approvalStatus: "approved",
      menus: [],
    };
    primary.control.tenantName = "원본에서 바뀐 이름";
    primary.control.securityRevision = "4";
    await deliver(primary.config, primary.control);
    const status = await admin.managedStatus(operator);
    const listed = status.bindings.find((b) => b.id === binding.id)!;
    assert.equal(listed.configured, true);
    assert.equal(listed.branchNameMismatch, false);
    assert.equal(listed.targetBranchName, "원본에서 바뀐 이름");
    assert.equal(
      await db.accountAuditLog.count({
        where: { action: "eywa.branch_auto_renamed" },
      }),
      1,
    );
    const collisionName = "Existing explicit mapping";
    primary.control.tenantName = collisionName;
    primary.control.securityRevision = "5";
    await deliver(primary.config, primary.control);
    assert.equal(
      (await db.branch.findUniqueOrThrow({ where: { id: binding.id } })).name,
      collisionName,
    );
    assert.equal(
      (await admin.managedStatus(operator)).bindings.find(
        (b) => b.id === binding.id,
      )?.branchNameMismatch,
      false,
    );
    assert.equal(
      await db.accountAuditLog.count({
        where: {
          action: "eywa.branch_name_review",
          details: { path: ["reason"], equals: "branch_name_conflict" },
        },
      }),
      0,
    );
    await db.branch.update({
      where: { id: binding.id },
      data: { name: "Local operator rename" },
    });
    primary.control.tenantName = "Another source name";
    primary.control.securityRevision = "6";
    await deliver(primary.config, primary.control);
    assert.equal(
      (await db.branch.findUniqueOrThrow({ where: { id: binding.id } })).name,
      "Local operator rename",
    );
    const manualBinding = await db.eywaBinding.update({
      where: { id: otherId },
      data: { mode: "active", sourceEpoch: mapped.control.sourceEpoch },
    });
    const manualControl = {
      ...mapped.control,
      bindingId: otherId,
      targetBranchId: otherBranch,
      tenantName: "Do not rename manual",
    };
    await db.$transaction(async (tx) =>
      accounts.applyManagedControl(
        tx,
        await accounts.lockBinding(tx, otherId),
        manualControl,
        Date.now(),
      ),
    );
    assert.equal(manualBinding.autoProvisionedBranch, false);
    assert.equal(
      (await db.branch.findUniqueOrThrow({ where: { id: otherBranch } })).name,
      "Existing explicit mapping",
    );
    assert.equal(status.automaticProvisioningEnabled, true);
    await assert.rejects(
      admin.configureManagedBinding(operator, {
        bindingId: blocked.config.bindingId,
        action: "register",
      }),
      /automatic_receiver_required/,
    );
    assert.throws(
      () => legacy.assertLegacyTransportAllowed(randomUUID()),
      /legacy_sync_fenced/,
    );
    pass(
      "safe auto-owned rename can share a display name; local renames and manual-owned branches stay unchanged and reported",
    );

    const early = tenant("SSO before webhook");
    const earlyStaffId = randomUUID();
    early.control.users = [
      {
        ...primary.control.users[0],
        id: earlyStaffId,
        email: `${earlyStaffId}@example.test`,
        classes: [],
      },
    ];
    const badBegin = await sso.beginSso(
      early.config.bindingId,
      auto.targetBaseUrl,
    );
    invalidAssertion = true;
    await assert.rejects(
      sso.exchangeSso({
        cookie: badBegin.cookie,
        state: badBegin.url.searchParams.get("state")!,
        code: "invalid-first-assertion",
        bindingId: early.config.bindingId,
        origin: auto.targetBaseUrl,
      }),
      /invalid_assertion/,
    );
    await absent(early.config.bindingId);
    invalidAssertion = false;
    const earlyBegin = await sso.beginSso(
      early.config.bindingId,
      auto.targetBaseUrl,
    );
    await absent(early.config.bindingId);
    const earlyExchange = await sso.exchangeSso({
      cookie: earlyBegin.cookie,
      state: earlyBegin.url.searchParams.get("state")!,
      code: "first-sso-before-webhook",
      bindingId: early.config.bindingId,
      origin: auto.targetBaseUrl,
    });
    assert(earlyExchange.ticket);
    assert.equal(
      (
        await db.eywaBinding.findUniqueOrThrow({
          where: { id: early.config.bindingId },
        })
      ).autoProvisionedBranch,
      true,
    );
    assert.equal(
      await db.eywaInbox.count({
        where: { bindingId: early.config.bindingId },
      }),
      1,
    );
    assert(await sso.authorizeManagedSso(earlyExchange.ticket));
    pass(
      "first SSO creates no branch at unsigned start, then verified assertion provisions and enqueues roster reconcile",
    );
    console.log(
      JSON.stringify(
        { ok: true, database, groups: checks.length, checks },
        null,
        2,
      ),
    );
  } finally {
    await settleErrorLogWrites();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
