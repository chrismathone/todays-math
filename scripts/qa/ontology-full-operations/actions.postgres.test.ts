import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  db,
  now,
  baseArgs,
  nextArgs,
  fixture,
  localDatabaseUrl,
} from "./harness";
import {
  createOntologyActionService,
  type OperationFailpoint,
} from "@/lib/math-ontology/actions/service";
import { canonicalBytes } from "@/lib/math-ontology/actions/canonical";
import { authorizeOntologyAction } from "@/lib/math-ontology/actions/authorization";
import {
  changeSrsState,
  readSrsState,
  srsStateTableIn,
} from "@/lib/math-srs/serverStore";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
} from "@/lib/math-srs/courseAutomation";
import { legacyClassInScope } from "@/lib/classAccess";
describe("lost response recovery", () => {
  it("returns the original approval and receipt after execution without writing twice", async () => {
    const f = await fixture();
    const proposal = await f.service.propose(f.actor, f.input);
    const firstApproval = await f.service.approve(f.actor, {proposalId:proposal.proposalId,sealHash:proposal.sealHash});
    const receipt = await f.service.execute(f.actor, firstApproval);
    const recoveredApproval = await f.service.approve(f.actor, {proposalId:proposal.proposalId,sealHash:proposal.sealHash});
    expect(recoveredApproval).toEqual(firstApproval);
    expect(await f.service.execute(f.actor, recoveredApproval)).toEqual(receipt);
  });
});
describe("existing legacy test student parity", () => {
  it("keeps a legacy teacher's own test student usable", async () => {
    const f = await fixture();
    await db.student.update({ where: { id: f.student.id }, data: { isTest: true } });
    const result = await f.propose();
    expect(result.proposalId).toBeTruthy();
  });
});
describe("actual isolated PostgreSQL ontology action transactions", () => {
  it("preview/approval write no student record; execution matches the established teacher transition pipeline", async () => {
    const f = await fixture(),
      { p, approval } = await f.ready();
    expect(
      (
        await db.studentSrsState.findUniqueOrThrow({
          where: { studentId: f.student.id },
        })
      ).payload,
    ).toEqual(f.state);
    expect(p.preview.changedDomains).toContain("course");
    const control = await db.student.create({
      data: {
        name: "Synthetic control",
        classId: f.cls.id,
        branchId: f.branch.id,
      },
    });
    await db.studentSrsState.create({
      data: {
        studentId: control.id,
        revision: 1,
        payload: f.state as unknown as Prisma.InputJsonValue,
      },
    });
    const expected = await db.$transaction((tx) =>
      changeSrsState(
        control.id,
        (state) => {
          const previous = state.course ?? emptyCourseState();
          const course = setCoursePlan(
            previous,
            { ...nextArgs, expectedRevision: 1 },
            now,
          );
          const changed = (
            ["startSectionId", "dailyQuestionCount", "enabled"] as const
          ).some((k) => previous.plan?.[k] !== nextArgs[k]);
          return changed ? { ...state, course } : state;
        },
        srsStateTableIn(tx),
        1,
        { teacher: true },
        now,
      ),
    );
    const result = await f.service.execute(f.actor, approval);
    const actual = await readSrsState(f.student.id, srsStateTableIn(db));
    expect(result.outcome).toBe("applied");
    expect(actual).toEqual(expected);
    expect(
      await db.ontologyAudit.count({ where: { receiptId: result.id } }),
    ).toBe(1);
    expect(
      await db.ontologyOutbox.count({ where: { receiptId: result.id } }),
    ).toBe(1);
  });
  it("same args retain configuredAt, revision and journey while producing one durable no-op receipt", async () => {
    const f = await fixture();
    f.input.args = baseArgs;
    const { p, approval } = await f.ready();
    expect(p.preview.changedDomains).toEqual([]);
    const receipt = await f.service.execute(f.actor, approval);
    expect(receipt.outcome).toBe("no-op");
    expect(receipt.afterRevision).toBe(1);
    expect(await readSrsState(f.student.id, srsStateTableIn(db))).toEqual({
      revision: 1,
      state: f.state,
    });
    expect(await f.service.execute(f.actor, approval)).toEqual(receipt);
  });
  it("concurrent approvals and executions serialize on the proposal and return identical receipts", async () => {
    const f = await fixture(),
      p = await f.propose();
    const approvals = await Promise.all(
      Array.from({ length: 8 }, () =>
        f.service.approve(f.actor, {
          proposalId: p.proposalId,
          sealHash: p.sealHash,
        }),
      ),
    );
    expect(new Set(approvals.map((a) => a.approvalId)).size).toBe(1);
    const results = await Promise.all(
      approvals.map((a) => f.service.execute(f.actor, a)),
    );
    expect(new Set(results.map((r) => canonicalBytes(r))).size).toBe(1);
    expect(
      (await readSrsState(f.student.id, srsStateTableIn(db))).revision,
    ).toBe(2);
    expect(
      await db.ontologyReceipt.count({ where: { proposalId: p.proposalId } }),
    ).toBe(1);
  });
  it.each<OperationFailpoint>([
    "approval-consumed",
    "student-written",
    "receipt-written",
    "audit-written",
    "outbox-written",
  ])("rolls back the entire real transaction at %s", async (stage) => {
    const f = await fixture(),
      { approval } = await f.ready();
    const failing = createOntologyActionService({
      db,
      evidence: f.evidence,
      now: () => now,
      failpoint: async (current) => {
        if (current === stage) throw new Error(`injected-${stage}`);
      },
    });
    await expect(failing.execute(f.actor, approval)).rejects.toThrow(
      `injected-${stage}`,
    );
    expect(await readSrsState(f.student.id, srsStateTableIn(db))).toEqual({
      revision: 1,
      state: f.state,
    });
    expect(
      (
        await db.ontologyApproval.findUniqueOrThrow({
          where: { id: approval.approvalId },
        })
      ).consumedAt,
    ).toBeNull();
    expect(
      await db.ontologyReceipt.count({
        where: { approvalId: approval.approvalId },
      }),
    ).toBe(0);
    expect(
      await db.ontologyAudit.count({ where: { actorId: f.actor.id } }),
    ).toBe(0);
    expect((await f.service.execute(f.actor, approval)).outcome).toBe(
      "applied",
    );
  });
  it("a database audit failure cannot commit a student mutation or successful receipt", async () => {
    const f = await fixture(),
      { approval } = await f.ready();
    await db.$executeRawUnsafe(
      `ALTER TABLE ontology_audit ADD CONSTRAINT qa_fail_audit CHECK (actor_id != '${f.actor.id}'::uuid)`,
    );
    try {
      await expect(f.service.execute(f.actor, approval)).rejects.toThrow();
    } finally {
      await db.$executeRawUnsafe(
        "ALTER TABLE ontology_audit DROP CONSTRAINT qa_fail_audit",
      );
    }
    expect(
      (await readSrsState(f.student.id, srsStateTableIn(db))).revision,
    ).toBe(1);
    expect(
      await db.ontologyReceipt.count({
        where: { approvalId: approval.approvalId },
      }),
    ).toBe(0);
  });
  it("rejects client args injection, changed seal, current evidence/source mutation and changed graph", async () => {
    const f = await fixture(),
      { p, approval } = await f.ready();
    await expect(
      f.service.execute(f.actor, { ...approval, args: nextArgs }),
    ).rejects.toThrow();
    await expect(
      f.service.execute(f.actor, {
        ...approval,
        sealHash: `sha256:${"0".repeat(64)}`,
      }),
    ).rejects.toMatchObject({ code: "BINDING_MISMATCH" });
    await expect(
      db.ontologyProposal.update({
        where: { id: p.proposalId },
        data: { argumentsCanonical: "{}" },
      }),
    ).rejects.toThrow("immutable");
    f.snapshot.evidencePacket = { ids: ["different-but-known-id"] };
    await expect(f.service.execute(f.actor, approval)).rejects.toMatchObject({
      code: "BINDING_MISMATCH",
    });
    await db.ontologyActiveGraph.update({
      where: { scopeKey: f.scopeKey },
      data: { graphVersion: "opaque:new-graph", generation: 2 },
    });
    await expect(f.service.execute(f.actor, approval)).rejects.toMatchObject({
      code: "STALE",
    });
    expect(
      (await readSrsState(f.student.id, srsStateTableIn(db))).revision,
    ).toBe(1);
  });
  it("rejects current record change, account/menu revocation, student move and expired approvals", async () => {
    for (const kind of [
      "revision",
      "session",
      "menu",
      "student",
      "expired",
    ] as const) {
      const f = await fixture(),
        { approval } = await f.ready();
      if (kind === "revision")
        await db.studentSrsState.update({
          where: { studentId: f.student.id },
          data: { revision: 2 },
        });
      if (kind === "session")
        await db.user.update({
          where: { id: f.actor.id },
          data: { sessionVersion: 1 },
        });
      if (kind === "menu")
        await db.user.update({
          where: { id: f.actor.id },
          data: { disabledMenus: ["srs"] },
        });
      if (kind === "student") {
        const other = await db.class.create({
          data: {
            name: "Other",
            grade: "초5",
            userId: f.actor.id,
            branchId: f.branch.id,
            difficultyRatio: {},
          },
        });
        await db.student.update({
          where: { id: f.student.id },
          data: { classId: other.id },
        });
      }
      const service =
        kind === "expired"
          ? createOntologyActionService({
              db,
              evidence: f.evidence,
              now: () => new Date(now.getTime() + 600001),
            })
          : f.service;
      await expect(service.execute(f.actor, approval)).rejects.toMatchObject({
        code:
          kind === "revision"
            ? "STALE"
            : kind === "expired"
              ? "EXPIRED"
              : "FORBIDDEN",
      });
      expect(
        await db.ontologyReceipt.count({
          where: { approvalId: approval.approvalId },
        }),
      ).toBe(0);
    }
  });
  it("uses the existing legacy owner policy: same owner/branch admin allowed; foreign branch and read-only role denied", async () => {
    const f = await fixture();
    const cls = await db.class.findUniqueOrThrow({ where: { id: f.cls.id } });
    for (const config of [
      { isAdmin: false, branchRole: null },
      { isAdmin: true, branchRole: "manager" as const },
    ]) {
      await db.user.update({ where: { id: f.user.id }, data: config });
      expect(
        legacyClassInScope(
          { ...config, id: f.actor.id, branchId: f.branch.id },
          cls,
        ),
      ).toBe(true);
      await expect(
        db.$transaction((tx) =>
          authorizeOntologyAction(tx, f.actor, f.target, now),
        ),
      ).resolves.toHaveProperty("authorizationStamp");
    }
    const foreign = await db.branch.create({ data: { name: "Foreign" } });
    await db.user.update({
      where: { id: f.actor.id },
      data: { branchId: foreign.id },
    });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.user.update({
      where: { id: f.actor.id },
      data: { branchId: f.branch.id, isAdmin: false, role: "reviewer" },
    });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("preserves an unfinished session: changing start is refused while daily-count/paused changes preserve the session", async () => {
    const f = await fixture();
    const active = startAutomaticCourse(f.state.course, now, 17, randomUUID);
    await db.studentSrsState.update({
      where: { studentId: f.student.id },
      data: {
        payload: {
          ...f.state,
          course: active,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await expect(
      f.service.propose(f.actor, {
        ...f.input,
        args: { ...nextArgs, startSectionId: "5-1-5-4" },
      }),
    ).rejects.toThrow();
    const p = await f.service.propose(f.actor, {
      ...f.input,
      args: { ...nextArgs, enabled: false },
    });
    const approval = await f.service.approve(f.actor, {
      proposalId: p.proposalId,
      sealHash: p.sealHash,
    });
    await f.service.execute(f.actor, approval);
    const saved = await readSrsState(f.student.id, srsStateTableIn(db));
    expect(saved.state.course?.learner.session).toEqual(active.learner.session);
    expect(saved.state.course?.plan?.enabled).toBe(false);
  });
  it("reuses actual managed membership/grant/enrollment rules and refuses delegate/capability/lease revocation", async () => {
    const f = await fixture();
    const bindingId = randomUUID(),
      sourceUserId = randomUUID(),
      sourceClassId = randomUUID(),
      epoch = randomUUID();
    const expiry = new Date(now.getTime() + 60000);
    await db.eywaBinding.create({
      data: {
        id: bindingId,
        tenantId: randomUUID(),
        targetBranchId: f.branch.id,
        sourceEpoch: epoch,
        mode: "active",
        enabled: true,
        healthy: true,
        securityRevision: BigInt(1),
        tenantRevocationGeneration: BigInt(1),
        leaseExpiresAt: expiry,
      },
    });
    await db.user.update({
      where: { id: f.actor.id },
      data: { authSource: "eywa", branchRole: "teacher", isAdmin: false },
    });
    const managed = await db.eywaManagedAccount.create({
      data: {
        bindingId,
        sourceUserId,
        userId: f.actor.id,
        currentUserId: f.actor.id,
        currentSourceUserId: sourceUserId,
        status: "confirmed",
        sourceEmail: f.user.email,
        sourceName: "Synthetic",
        sourceEpoch: epoch,
        securityRevision: BigInt(1),
        tenantRevocationGeneration: BigInt(1),
        leaseExpiresAt: expiry,
        sourceClasses: [
          {
            id: sourceClassId,
            permissionRevision: "1",
            capabilities: ["progress:write"],
            validUntil: null,
          },
        ],
      },
    });
    await db.class.update({
      where: { id: f.cls.id },
      data: {
        eywaBindingId: bindingId,
        eywaClassId: sourceClassId,
        permissionRevision: BigInt(1),
      },
    });
    await db.student.update({
      where: { id: f.student.id },
      data: { eywaBindingId: bindingId },
    });
    const membership = await db.classMembership.create({
      data: {
        bindingId,
        sourceId: "synthetic-membership",
        classId: f.cls.id,
        userId: f.actor.id,
        sourceUserId,
        role: "homeroom",
        capabilities: ["progress:write"],
      },
    });
    const enrollment = await db.studentEnrollment.create({
      data: {
        bindingId,
        sourceId: randomUUID(),
        studentId: f.student.id,
        classId: f.cls.id,
        startsOn: new Date("2026-01-01"),
      },
    });
    await expect(f.propose()).resolves.toHaveProperty("sealHash");
    await db.student.update({ where: { id: f.student.id }, data: { isTest: true } });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.student.update({ where: { id: f.student.id }, data: { isTest: false } });
    await db.classMembership.update({
      where: { id: membership.id },
      data: { role: "delegate" },
    });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.classMembership.update({
      where: { id: membership.id },
      data: { role: "homeroom", capabilities: [] },
    });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.classMembership.update({
      where: { id: membership.id },
      data: { capabilities: ["progress:write"] },
    });
    await db.studentEnrollment.update({
      where: { id: enrollment.id },
      data: { onHold: true },
    });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.studentEnrollment.update({
      where: { id: enrollment.id },
      data: { onHold: false },
    });
    await db.eywaManagedAccount.update({
      where: { id: managed.id },
      data: { leaseExpiresAt: new Date(now.getTime() - 1) },
    });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("holds checked local capability rows through commit and observes revocation on replay", async () => {
    const f = await fixture(),
      { approval } = await f.ready();
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const reached = new Promise<void>((r) => {
      entered = r;
    });
    const revoker = new PrismaClient({
      datasources: {
        db: {
          url: `${localDatabaseUrl}?connection_limit=1&application_name=ontology_ops_revoker`,
        },
      },
    });
    const service = createOntologyActionService({
      db,
      evidence: f.evidence,
      now: () => now,
      failpoint: async (stage) => {
        if (stage === "student-written") {
          entered();
          await gate;
        }
      },
    });
    const execution = service.execute(f.actor, approval);
    let revoked = false;
    try {
      await reached;
      const revocation = revoker.user
        .update({ where: { id: f.actor.id }, data: { disabledMenus: ["srs"] } })
        .then(() => {
          revoked = true;
        });
      let waiting = false;
      for (let i = 0; i < 30; i++) {
        const rows = await db.$queryRaw<
          { pid: number }[]
        >`SELECT pid FROM pg_stat_activity WHERE application_name = 'ontology_ops_revoker' AND wait_event_type = 'Lock'`;
        if (rows.length) {
          waiting = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(waiting).toBe(true);
      expect(revoked).toBe(false);
      release();
      await execution;
      await revocation;
      await expect(f.service.execute(f.actor, approval)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    } finally {
      release();
      await execution.catch(() => {});
      await revoker.$disconnect();
    }
  });

  it("preserves the established superadmin SRS management exception without granting a teacher disabled menus", async () => {
    const f = await fixture();
    await db.user.update({
      where: { id: f.actor.id },
      data: { disabledMenus: ["srs"], isSuperAdmin: true },
    });
    await expect(f.propose()).resolves.toHaveProperty("sealHash");
    await db.user.update({
      where: { id: f.actor.id },
      data: { isSuperAdmin: false },
    });
    await expect(f.propose()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
