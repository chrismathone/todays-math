import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: vi.fn(),
  refreshManagedBinding: vi.fn(),
}));
const w = vi.hoisted(() => ({
  user: {} as Record<string, unknown>,
  student: {} as Record<string, unknown>,
  cls: {} as Record<string, unknown>,
  managed: null as Record<string, unknown> | null,
  memberships: [] as Record<string, unknown>[],
  enrollments: [] as Record<string, unknown>[],
  state: null as Record<string, unknown> | null,
  plans: [] as Record<string, unknown>[],
  progress: [] as Record<string, unknown>[],
  units: [] as Record<string, unknown>[],
  problems: [] as Record<string, unknown>[],
}));
function matches(
  row: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (k === "AND" || k === "OR") {
      const list = (Array.isArray(v) ? v : [v]) as Record<string, unknown>[];
      return k === "AND"
        ? list.every((x) => matches(row, x))
        : list.some((x) => matches(row, x));
    }
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const a = v as Record<string, unknown>;
      if ("in" in a) return (a.in as unknown[]).includes(row[k]);
      if ("not" in a) return row[k] !== a.not;
      const n =
        row[k] instanceof Date
          ? (row[k] as Date).getTime()
          : (row[k] as number);
      if ("lte" in a) return n <= (a.lte as Date).getTime();
      if ("gte" in a) return n >= (a.gte as Date).getTime();
      if ("gt" in a) return n > (a.gt as Date).getTime();
      return matches((row[k] ?? {}) as Record<string, unknown>, a);
    }
    return (row[k] ?? null) === v;
  });
}
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn(async () => w.user) },
    eywaManagedAccount: { findUnique: vi.fn(async () => w.managed) },
    class: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === w.cls.id ? w.cls : null,
      ),
    },
    student: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === w.student.id ? { ...w.student, class: w.cls } : null,
      ),
    },
    classMembership: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.memberships.filter((x) => matches(x, where)),
      ),
    },
    studentEnrollment: {
      findFirst: vi.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          w.enrollments.find((x) => matches(x, where)) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.enrollments.filter((x) => matches(x, where)),
      ),
    },
    studentSrsState: { findUnique: vi.fn(async () => w.state) },
    progressPlan: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.plans.filter((x) => matches(x, where)),
      ),
    },
    progress: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.progress.filter((x) => matches(x, where)),
      ),
    },
    unit: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.units.filter((x) => matches(x, where)),
      ),
    },
    problem: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.problems.filter((x) => matches(x, where)),
      ),
    },
  },
}));
import { db } from "@/lib/db";
import { emptySrsState } from "@/lib/math-srs/serverState";
import {
  freshInsightV2Access,
  freshInsightV2Student,
} from "@/lib/math-insight/v2Access";
import {
  authorizeMathOntologySourceRead,
  type MathOntologySourceTransaction,
} from "@/lib/math-ontology/sources/databaseAccess";
import {
  readMathOntologyDatabaseSources,
  readMathOntologyDatabaseSourcesInTransaction,
  assertMathOntologySourceSnapshotTransaction,
} from "@/lib/math-ontology/sources/database";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  now = new Date("2026-10-23T01:00:00Z");
const input = () => ({
  actor: { id: id(1), sessionVersion: 0 },
  target: { studentId: id(3), classId: id(2), branchId: id(4) },
  graphVersion: `sha256:${"a".repeat(64)}`,
  now,
});
const tx = () => db as unknown as MathOntologySourceTransaction;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.clearAllMocks();
  w.user = {
    id: id(1),
    name: "NEVER-EXPORT-NAME",
    email: "NEVER-EXPORT-EMAIL",
    role: "director",
    approvalStatus: "approved",
    isAdmin: false,
    isSuperAdmin: false,
    branchId: id(4),
    branchRole: "teacher",
    disabledMenus: [],
    branch: { disabledMenus: [], ownerDisabledMenus: [], menuRevision: 0 },
    sessionVersion: 0,
    deletedAt: null,
    suspendedAt: null,
    manualSuspendedAt: null,
    authSource: "local",
  };
  w.cls = {
    id: id(2),
    userId: id(1),
    branchId: id(4),
    eywaBindingId: null,
    eywaClassId: id(6),
    grade: "초3",
    active: true,
    closedAt: null,
    permissionRevision: BigInt(1),
  };
  w.student = {
    id: id(3),
    classId: id(2),
    branchId: id(4),
    name: "NEVER-EXPORT-STUDENT",
    eywaBindingId: null,
    isTest: false,
    eywaWithdrawnAt: null,
    useIndividualProgress: false,
  };
  w.managed = null;
  w.memberships = [];
  w.enrollments = [];
  w.state = { revision: 5, payload: emptySrsState(), updatedAt: now };
  w.plans = [];
  w.progress = [];
  w.units = [];
  w.problems = [];
});
afterEach(() => vi.useRealTimers());
async function parity() {
  const request = new Request(
      `http://local/api/students/${id(3)}/math-srs/insight`,
    ),
    access = await freshInsightV2Access(request, {
      ...w.user,
      menus: ["srs"],
    } as unknown as AccountAccess);
  const old = access
    ? await freshInsightV2Student(
        id(3),
        { classId: id(2), branchId: id(4) },
        access,
      )
    : null;
  let allowed = true;
  try {
    await authorizeMathOntologySourceRead(tx(), input());
  } catch {
    allowed = false;
  }
  expect(allowed).toBe(!!old && !old.response);
  return allowed;
}
function managed() {
  w.user.authSource = "eywa";
  w.cls.eywaBindingId = id(5);
  w.student.eywaBindingId = id(5);
  w.managed = {
    id: id(10),
    bindingId: id(5),
    status: "confirmed",
    currentUserId: id(1),
    blockReasons: [],
    branchRoleOverride: null,
    leaseExpiresAt: new Date(now.getTime() + 600000),
    sourceEpoch: id(8),
    tenantRevocationGeneration: BigInt(1),
    accountRevocationGeneration: BigInt(1),
    securityRevision: BigInt(1),
    classListRevision: BigInt(1),
    sourceClasses: [
      {
        id: id(6),
        permissionRevision: "1",
        capabilities: ["student:read"],
        validUntil: null,
      },
    ],
    user: w.user,
    binding: {
      id: id(5),
      targetBranchId: id(4),
      retiredAt: null,
      mode: "active",
      enabled: true,
      healthy: true,
      leaseExpiresAt: new Date(now.getTime() + 600000),
      sourceEpoch: id(8),
      tenantRevocationGeneration: BigInt(1),
    },
  };
  w.memberships = [
    {
      id: id(11),
      classId: id(2),
      userId: id(1),
      bindingId: id(5),
      role: "homeroom",
      startsOn: new Date("2026-01-01"),
      endsOn: null,
      revokedAt: null,
      capabilities: ["student:read"],
    },
  ];
  w.enrollments = [
    {
      id: id(9),
      studentId: id(3),
      classId: id(2),
      bindingId: id(5),
      startsOn: new Date("2026-01-01"),
      endsOn: null,
      endedAt: null,
      isTransferred: false,
      onHold: false,
    },
  ];
}
describe("concrete Prisma source read composition (synthetic delegate fixtures, no live database)", () => {
  it("matches actual existing fresh ownership/menu helpers across local and managed authority changes", async () => {
    expect(await parity()).toBe(true);
    w.cls.userId = id(20);
    expect(await parity()).toBe(false);
    w.user.isAdmin = true;
    w.user.branchRole = "manager";
    expect(await parity()).toBe(true);
    w.user.disabledMenus = ["srs"];
    expect(await parity()).toBe(false);
    w.user.disabledMenus = [];
    w.user.isAdmin = false;
    w.user.branchRole = "teacher";
    w.cls.userId = id(1);
    managed();
    expect(await parity()).toBe(true);
    w.memberships[0].revokedAt = now;
    expect(await parity()).toBe(false);
    w.memberships[0].revokedAt = null;
    w.enrollments[0].endsOn = new Date("2026-10-23");
    w.enrollments[0].isTransferred = true;
    expect(await parity()).toBe(false);
    w.enrollments[0].isTransferred = false;
    expect(await parity()).toBe(true);
    w.cls.permissionRevision = BigInt(2);
    expect(await parity()).toBe(false);
  });
  it("does not read learning/source rows before current authorization succeeds", async () => {
    w.user.suspendedAt = now;
    await expect(
      readMathOntologyDatabaseSourcesInTransaction(tx(), input()),
    ).rejects.toThrow("not available");
    expect(db.studentSrsState.findUnique).not.toHaveBeenCalled();
    expect(db.problem.findMany).not.toHaveBeenCalled();
  });
  it("binds the actual transaction, retains reader revision, and exports no names/raw payload", async () => {
    const s = await readMathOntologyDatabaseSourcesInTransaction(tx(), input());
    expect(s.studentRevision).toBe(5);
    expect(JSON.stringify(s)).not.toContain("NEVER-EXPORT");
    expect(() =>
      assertMathOntologySourceSnapshotTransaction(s, tx()),
    ).not.toThrow();
    expect(() =>
      assertMathOntologySourceSnapshotTransaction(
        JSON.parse(JSON.stringify(s)),
        tx(),
      ),
    ).toThrow(/transaction/);
    expect(() =>
      assertMathOntologySourceSnapshotTransaction(
        s,
        {} as MathOntologySourceTransaction,
      ),
    ).toThrow(/transaction/);
    const selects = JSON.stringify(
      vi.mocked(db.user.findUnique).mock.calls[0][0],
    );
    expect(selects).not.toContain('"name"');
    expect(selects).not.toContain('"email"');
  });
  it("rejects unknown reader fields and does not create/reset a missing SRS row", async () => {
    w.state!.payload = { ...emptySrsState(), unknownNewWriter: true };
    await expect(
      readMathOntologyDatabaseSourcesInTransaction(tx(), input()),
    ).rejects.toThrow();
    w.state = null;
    const s = await readMathOntologyDatabaseSourcesInTransaction(tx(), input());
    expect(s.studentStatePresent).toBe(false);
    expect(s.studentRevision).toBe(0);
    expect(s.learning.sourcePresence).toBe("missing");
  });
});

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import { sourceByteDigest } from "@/lib/math-ontology/sources/canonical";
import { MATH_ONTOLOGY_SOURCE_NAMESPACES } from "@/contracts/mathOntologySource.contract";
import {
  sealMathOntologySourcePayload,
  assembleMathOntologySources,
} from "@/lib/math-ontology/sources/assembler";
import { writeSourcePartitions } from "../../../scripts/ontology/census/writePartitions";
import { loadSourcePartitionManifest } from "@/lib/math-ontology/sources/partitions";
import { readNativeDefinitionEvidenceInTransaction } from "@/lib/math-ontology/sources/definitionEvidence";
import { loadBundledMathOntologySourcePartitions } from "@/lib/math-ontology/sources/catalog";
import sourceRuntimeFixture from "@/../ontology/source-manifests/source-runtime-fixture.v1.json";
it("rejects lease expiry after awaited account reads and before native text export, while the current control returns real bounded evidence", async () => {
  managed();
  const release = loadBundledMathOntologySourcePartitions(sourceRuntimeFixture.pins), nativeId = BANK_PARTS.e5.concepts[0].id;
  const live = { ...input(), authorizationNow: () => new Date() };
  expect((await readNativeDefinitionEvidenceInTransaction(tx(), live, [nativeId], release)).packets).toHaveLength(1);
  vi.mocked(db.eywaManagedAccount.findUnique).mockImplementationOnce((async () => { vi.setSystemTime(new Date(now.getTime() + 600001)); return w.managed; }) as never);
  await expect(readNativeDefinitionEvidenceInTransaction(tx(), live, [nativeId], release)).rejects.toThrow(/not available/);
  vi.setSystemTime(now);
  const delayed = { ...release, read: (path: string) => { const bytes = release.read(path); vi.setSystemTime(new Date(now.getTime() + 600001)); return bytes; } };
  await expect(readNativeDefinitionEvidenceInTransaction(tx(), live, [nativeId], delayed)).rejects.toThrow(/not available/);
  expect(live.now).toEqual(now);
});
it("rejects lease expiry during private source reads at the final export boundary", async () => {
  managed();
  vi.mocked(db.studentSrsState.findUnique).mockImplementationOnce((async () => { vi.setSystemTime(new Date(now.getTime() + 600001)); return w.state; }) as never);
  await expect(readMathOntologyDatabaseSourcesInTransaction(tx(), { ...input(), authorizationNow: () => new Date() })).rejects.toThrow(/not available/);
});
it("returns bounded exact native definition evidence only after actual policy authorization and approved revision correspondence", async () => {
  const current = BANK_PARTS.e5.concepts[0],
    origin = {
      repositoryPath: "src/lib/concept-blank/bank/e5.ts",
      pointer: "/bank/concepts/" + current.id,
      byteHash: sourceByteDigest("synthetic-byte-receipt"),
      extractorVersion: "repo-sources-1" as const,
    };
  const make = (hash: string) =>
    sealMathOntologySourcePayload({
      schemaVersion: 1,
      adapterVersion: "repo-sources-1",
      inputs: [
        { path: origin.repositoryPath, byteHash: origin.byteHash, bytes: 22 },
      ],
      records: [
        {
          namespace: "bank-definition",
          nativeId: current.id,
          scope: "global",
          kind: "Definition",
          distribution: "native-metadata",
          sourceProvenance: "native-source",
          edition: "unknown",
          origin,
          metadata: { definitionTextHash: hash as `sha256:${string}` },
          labels: [
            {
              value: current.term,
              language: "ko",
              sourceField: "term",
              sourceTextHash: sourceByteDigest(current.term),
              origin,
            },
          ],
        },
      ],
      assertions: [],
      expectedCoverage: MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
        namespace,
        expected: namespace === "bank-definition" ? 1 : 0,
      })),
    });
  const root = mkdtempSync(join(tmpdir(), "native-definition-evidence-"));
  try {
    const e = make(sourceByteDigest(current.definition));
    const p = writeSourcePartitions(
      assembleMathOntologySources(e, { expectedPayloadHash: e.payloadHash }),
      root,
    );
    const read = (path: string) => readFileSync(join(root, path));
    const release = {
      read,
      manifest: loadSourcePartitionManifest(read, {
        projectionHash: p.manifest.projectionHash,
        manifestByteHash: p.manifestByteHash,
      }),
    };
    const packet = await readNativeDefinitionEvidenceInTransaction(
      tx(),
      input(),
      [current.id],
      release,
    );
    expect(db.student.findUnique).not.toHaveBeenCalled();
    expect(packet.packets[0]).toMatchObject({
      term: current.term,
      definition: current.definition,
      definitionTextHash: sourceByteDigest(current.definition),
    });
    expect(JSON.stringify(packet)).not.toContain("bQuestion");
    expect(JSON.stringify(packet)).not.toContain("clozeQuestion");
    expect(JSON.stringify(packet)).not.toContain("answer");
    await expect(
      readNativeDefinitionEvidenceInTransaction(
        tx(),
        input(),
        Array.from({ length: 7 }, (_, i) => "x" + i),
        release,
      ),
    ).rejects.toThrow(/bounded/);
    w.user.suspendedAt = now;
    await expect(
      readNativeDefinitionEvidenceInTransaction(
        tx(),
        input(),
        [current.id],
        release,
      ),
    ).rejects.toThrow(/not available/);
    w.user.suspendedAt = null;
    const bad = make(sourceByteDigest("stale definition"));
    const b = writeSourcePartitions(
      assembleMathOntologySources(bad, {
        expectedPayloadHash: bad.payloadHash,
      }),
      root,
    );
    const badRelease = {
      read,
      manifest: loadSourcePartitionManifest(read, {
        projectionHash: b.manifest.projectionHash,
        manifestByteHash: b.manifestByteHash,
      }),
    };
    await expect(
      readNativeDefinitionEvidenceInTransaction(
        tx(),
        input(),
        [current.id],
        badRelease,
      ),
    ).rejects.toThrow(/differs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("keeps observation asOf fixed but rejects expiry during the production wrapper final wall-clock authorization", async () => {
  managed();
  let calls = 0;
  vi.mocked(db.$transaction).mockImplementation((async (callback: unknown) => {
    if (typeof callback !== "function")
      throw new Error("synthetic transaction expects callback");
    const result = await callback(tx());
    calls++;
    if (calls === 1) vi.setSystemTime(new Date(now.getTime() + 600001));
    return result;
  }) as never);
  await expect(readMathOntologyDatabaseSources(input())).rejects.toThrow(
    /not available/,
  );
  expect(calls).toBe(1);
});
