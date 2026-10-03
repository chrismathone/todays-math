/** Local fixture only. Run with node --conditions=react-server --import tsx. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function main() {
  const fixtureUrl = process.env.EYWA_TEST_DATABASE_URL;
  if (!fixtureUrl) throw new Error("EYWA_TEST_DATABASE_URL required");
  const url = new URL(fixtureUrl);
  assert.ok(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.port === "55432" &&
      ["/eywa_target_test", "/eywa_auto_target_test"].includes(url.pathname),
    "Only the isolated localhost:55432 target fixture databases are allowed",
  );
  process.env.DATABASE_URL = fixtureUrl;
  process.env.DIRECT_URL = fixtureUrl;
  const { db } = await import("../../src/lib/db");
  const {
    applyManagedControl,
    lockBinding,
    reconcileManagedAccounts,
    getManagedClassGrants,
    approveManagedCandidate,
  } = await import("../../src/lib/eywa/managedAccounts");
  const { receiveEvent, claimBinding, assertFence } =
    await import("../../src/lib/eywa/managedReceiver");
  const { beginSso, exchangeSso, authorizeManagedSso } =
    await import("../../src/lib/eywa/managedSso");
  const { signAssertion } = await import("../../src/lib/eywa/sync-contract");
  const { hash } = await import("bcryptjs");
  const bindingId = randomUUID(),
    tenantId = randomUUID(),
    branchId = randomUUID(),
    sourceEpoch = randomUUID(),
    sourceUserId = randomUUID();
  const config = {
    bindingId,
    tenantId,
    targetBranchId: branchId,
    sourceBaseUrl: "http://localhost:3998",
    targetBaseUrl: "http://localhost:3999",
    keyId: "fixture",
    controlSecret: "c".repeat(32),
    webhookSecret: "w".repeat(32),
    ssoSecret: "s".repeat(32),
  };
  process.env.EYWA_SYNC_BINDINGS_JSON = JSON.stringify([config]);
  const source = {
    id: sourceUserId,
    email: `${sourceUserId}@example.test`,
    name: "Fixture Teacher",
    status: "active",
    role: "teacher",
    subjects: ["math"],
    eligible: true,
    blockReasons: [] as string[],
    accountRevocationGeneration: "0",
    classListRevision: "1",
    classes: [],
  };
  let control = {
    schemaVersion: 2 as const,
    bindingId,
    tenantId,
    targetBranchId: branchId,
    sourceEpoch,
    securityRevision: "1",
    tenantRevocationGeneration: "0",
    enabled: true,
    mode: "active" as const,
    validatedAt: new Date().toISOString(),
    nextEffectiveAt: null,
    healthy: true,
    users: [source],
  };
  const apply = async (provision = false) =>
    db.$transaction(async (tx) => {
      const binding = await lockBinding(tx, bindingId);
      const error = await applyManagedControl(tx, binding, control, Date.now());
      if (provision)
        await reconcileManagedAccounts(tx, binding, control, Date.now());
      return error;
    });
  let checks = 0;
  try {
    await db.branch.create({
      data: { id: branchId, name: "Receiver fixture" },
    });
    await db.eywaBinding.create({
      data: {
        id: bindingId,
        tenantId,
        targetBranchId: branchId,
        mode: "active",
      },
    });
    await apply(true);
    let user = await db.user.findUniqueOrThrow({
      where: { eywaUserId: sourceUserId },
    });
    assert.equal(user.authSource, "eywa");
    assert.equal(user.passwordHash, null);
    assert.equal(user.isAdmin, false);
    assert.equal(user.branchRole, "teacher");
    checks++;
    await apply(true);
    assert.equal(
      await db.user.count({ where: { eywaUserId: sourceUserId } }),
      1,
    );
    checks++;
    assert.ok(await getManagedClassGrants(user.id));
    checks++;
    control = {
      ...control,
      enabled: false,
      securityRevision: "2",
      tenantRevocationGeneration: "1",
      validatedAt: new Date().toISOString(),
    };
    await apply();
    user = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.ok(user.suspendedAt);
    assert.equal(user.sessionVersion, 1);
    await assert.rejects(getManagedClassGrants(user.id));
    checks++;
    await db.user.update({
      where: { id: user.id },
      data: { suspendedAt: null },
    });
    assert.ok(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).suspendedAt,
    );
    checks++;
    await assert.rejects(
      db.user.update({ where: { id: user.id }, data: { isSuperAdmin: true } }),
    );
    await assert.rejects(
      db.user.update({ where: { id: user.id }, data: { eywaUserId: null } }),
    );
    await assert.rejects(
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: "forbidden" },
      }),
    );
    checks++;
    const manual = new Date();
    await db.user.update({
      where: { id: user.id },
      data: { manualSuspendedAt: manual },
    });
    control = {
      ...control,
      enabled: true,
      securityRevision: "3",
      validatedAt: new Date().toISOString(),
    };
    await apply();
    user = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(user.manualSuspendedAt?.getTime(), manual.getTime());
    assert.ok(user.suspendedAt);
    assert.equal(user.sessionVersion, 1);
    checks++;
    await db.user.update({
      where: { id: user.id },
      data: { manualSuspendedAt: null },
    });
    assert.ok(await getManagedClassGrants(user.id));
    control = {
      ...control,
      securityRevision: "5",
      tenantRevocationGeneration: "2",
      validatedAt: new Date().toISOString(),
    };
    await apply();
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .sessionVersion,
      2,
    );
    checks++;
    control = {
      ...control,
      users: [],
      securityRevision: "6",
      validatedAt: new Date().toISOString(),
    };
    await apply();
    assert.ok(
      (
        await db.eywaManagedAccount.findUniqueOrThrow({
          where: { currentUserId: user.id },
        })
      ).blockReasons.includes("source_removed"),
    );
    checks++;
    control = {
      ...control,
      users: [source],
      securityRevision: "7",
      validatedAt: new Date().toISOString(),
    };
    await apply();
    const eventId = randomUUID();
    const event = {
      schemaVersion: 2,
      eventId,
      bindingId,
      tenantId,
      sourceEpoch,
      securityRevision: "7",
      tenantRevocationGeneration: "2",
      occurredAt: new Date().toISOString(),
      kind: "security",
      entityType: "binding",
      entityId: null,
    };
    assert.equal(
      (await receiveEvent(JSON.stringify(event), bindingId)).status,
      "received",
    );
    await receiveEvent(JSON.stringify(event), bindingId);
    await assert.rejects(
      receiveEvent(JSON.stringify({ ...event, kind: "content" }), bindingId),
    );
    checks++;
    const claims = await Promise.all([
      claimBinding(bindingId),
      claimBinding(bindingId),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    checks++;
    const oldLease = claims.find(Boolean)!;
    await db.eywaBinding.update({
      where: { id: bindingId },
      data: { leaseUntil: new Date(0) },
    });
    const replacement = await claimBinding(bindingId);
    assert.ok(replacement);
    await assert.rejects(
      db.$transaction((tx) => assertFence(tx, bindingId, oldLease.token)),
    );
    checks++;
    await db.eywaBinding.update({
      where: { id: bindingId },
      data: { leaseToken: null, leaseUntil: null },
    });
    const nonce = randomUUID();
    await db.eywaNonce.create({
      data: { bindingId, nonce, expiresAt: new Date(Date.now() + 60000) },
    });
    await assert.rejects(
      db.eywaNonce.create({
        data: { bindingId, nonce, expiresAt: new Date(Date.now() + 60000) },
      }),
    );
    checks++;
    const candidateSource = {
      ...source,
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
      name: "Existing Teacher",
    };
    const existing = await db.user.create({
      data: {
        email: candidateSource.email,
        name: candidateSource.name,
        approvalStatus: "approved",
        passwordHash: await hash("fixture-password", 4),
      },
    });
    control = {
      ...control,
      users: [source, candidateSource],
      securityRevision: "8",
      validatedAt: new Date().toISOString(),
    };
    await apply(true);
    let mapping = await db.eywaManagedAccount.findFirstOrThrow({
      where: { sourceUserId: candidateSource.id, bindingId },
    });
    assert.equal(mapping.status, "candidate");
    assert.equal(mapping.currentUserId, null);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: existing.id } }))
        .suspendedAt,
      null,
    );
    checks++;
    const originalFetch = globalThis.fetch;
    let assertion = "";
    let alternateControl: typeof control | undefined;
    globalThis.fetch = async (request, init) => {
      const path = new URL(String(request)).pathname;
      if (path.endsWith("/token")) return Response.json({ assertion });
      const body = JSON.parse(String(init?.body));
      const selected =
        alternateControl && alternateControl.bindingId === body.bindingId
          ? alternateControl
          : control;
      return Response.json({
        ...selected,
        validatedAt: new Date().toISOString(),
        users: body.userId
          ? selected.users.filter((u) => u.id === body.userId)
          : selected.users,
      });
    };
    try {
      const actor = {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        isAdmin: false,
        isSuperAdmin: false,
        branchId: null,
        branchRole: null,
        approvalStatus: "approved" as const,
        menus: [],
      };
      await assert.rejects(
        approveManagedCandidate(actor, {
          id: mapping.id,
          version: mapping.candidateVersion!,
          method: "owner",
          password: "wrong",
        }),
      );
      await approveManagedCandidate(actor, {
        id: mapping.id,
        version: mapping.candidateVersion!,
        method: "owner",
        password: "fixture-password",
      });
      mapping = await db.eywaManagedAccount.findUniqueOrThrow({
        where: { id: mapping.id },
      });
      assert.equal(mapping.currentUserId, existing.id);
      assert.ok(
        (await db.user.findUniqueOrThrow({ where: { id: existing.id } }))
          .passwordHash,
      );
      checks++;
      // A copied callback cannot bind another browser's handshake; code exchange is one-use.
      const flow = await beginSso(bindingId, config.targetBaseUrl);
      const state = flow.url.searchParams.get("state")!;
      assertion = signAssertion(
        {
          iss: "aywa",
          aud: "todays-math",
          bindingId,
          tenantId,
          sourceEpoch,
          sub: sourceUserId,
          email: source.email,
          name: source.name,
          securityRevision: control.securityRevision,
          tenantRevocationGeneration: control.tenantRevocationGeneration,
          accountRevocationGeneration: "0",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60,
          jti: randomUUID(),
        },
        config,
      );
      await assert.rejects(
        exchangeSso({
          cookie: flow.cookie,
          code: "c".repeat(32),
          state: "different",
          bindingId,
          origin: config.targetBaseUrl,
        }),
      );
      const exchanged = await exchangeSso({
        cookie: flow.cookie,
        code: "c".repeat(32),
        state,
        bindingId,
        origin: config.targetBaseUrl,
      });
      await assert.rejects(
        exchangeSso({
          cookie: flow.cookie,
          code: "c".repeat(32),
          state,
          bindingId,
          origin: config.targetBaseUrl,
        }),
      );
      const logged = await authorizeManagedSso(exchanged.ticket);
      assert.equal(logged?.id, user.id);
      assert.equal(await authorizeManagedSso(exchanged.ticket), null);
      checks++;
      const replayFlow = await beginSso(bindingId, config.targetBaseUrl);
      const replayExchange = await exchangeSso({
        cookie: replayFlow.cookie,
        code: "d".repeat(32),
        state: replayFlow.url.searchParams.get("state")!,
        bindingId,
        origin: config.targetBaseUrl,
      });
      assert.equal(
        await authorizeManagedSso(replayExchange.ticket),
        null,
        "A distinct handoff must not reuse an already consumed jti",
      );
      checks++;
      const newBranch = randomUUID(),
        newBinding = randomUUID(),
        newTenant = randomUUID();
      const nextConfig = {
        ...config,
        bindingId: newBinding,
        tenantId: newTenant,
        targetBranchId: newBranch,
      };
      process.env.EYWA_SYNC_BINDINGS_JSON = JSON.stringify([
        config,
        nextConfig,
      ]);
      await db.branch.create({
        data: { id: newBranch, name: "Transfer destination fixture" },
      });
      await db.eywaBinding.create({
        data: {
          id: newBinding,
          tenantId: newTenant,
          targetBranchId: newBranch,
          mode: "active",
        },
      });
      const oldClass = await db.class.create({
        data: {
          userId: user.id,
          branchId,
          name: "Historical class",
          grade: "중1",
          difficultyRatio: {},
        },
      });
      control = {
        ...control,
        users: [candidateSource],
        securityRevision: "9",
        validatedAt: new Date().toISOString(),
      };
      await apply();
      alternateControl = {
        ...control,
        bindingId: newBinding,
        tenantId: newTenant,
        targetBranchId: newBranch,
        users: [source],
        securityRevision: "1",
        tenantRevocationGeneration: "0",
      };
      await db.$transaction(async (tx) => {
        const binding = await lockBinding(tx, newBinding);
        await applyManagedControl(tx, binding, alternateControl!, Date.now());
        await reconcileManagedAccounts(
          tx,
          binding,
          alternateControl!,
          Date.now(),
        );
      });
      const transfer = await db.eywaManagedAccount.findFirstOrThrow({
        where: { bindingId: newBinding, sourceUserId },
      });
      assert.equal(transfer.currentUserId, null);
      const operator = await db.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          name: "Fixture Operator",
          approvalStatus: "approved",
          isSuperAdmin: true,
          isAdmin: true,
        },
      });
      await approveManagedCandidate(
        { ...actor, id: operator.id, isAdmin: true, isSuperAdmin: true },
        {
          id: transfer.id,
          version: transfer.candidateVersion!,
          method: "operator",
          evidence:
            "Verified independent account ownership from historical approval and authentication records.",
        },
      );
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } })).branchId,
        newBranch,
      );
      assert.equal(
        (await db.class.findUniqueOrThrow({ where: { id: oldClass.id } }))
          .branchId,
        branchId,
      );
      assert.equal(
        (
          await db.eywaManagedAccount.findFirstOrThrow({
            where: { bindingId, sourceUserId },
          })
        ).status,
        "ended",
      );
      control = {
        ...control,
        enabled: false,
        securityRevision: "10",
        tenantRevocationGeneration: "3",
        validatedAt: new Date().toISOString(),
      };
      await apply();
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
          .suspendedAt,
        null,
      );
      checks++;
      await db.eywaManagedAccount.update({
        where: { currentUserId: user.id },
        data: { leaseExpiresAt: new Date(0) },
      });
      globalThis.fetch = async () => {
        throw new Error("fixture source outage");
      };
      await assert.rejects(getManagedClassGrants(user.id));
      checks++;
    } finally {
      globalThis.fetch = originalFetch;
    }
    console.log(
      `PASS ${checks} receiver PostgreSQL integration scenarios (provisioning, candidate confirmation, OFF/ON, revocation, manual suspension, DB guards, inbox collision, lease race, nonce, state/PKCE handoff, jti reuse, outage)`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "fixture failed");
  process.exitCode = 1;
});
