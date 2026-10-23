import { afterAll, vi } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
import {
  createOntologyActionService,
  type OntologyActionEvidencePort,
  type ResolvedActionEvidence,
} from "@/lib/math-ontology/actions/service";
import type { OntologyPlanArgs } from "@/contracts/mathOntologyAction.contract";
import { emptySrsState } from "@/lib/math-srs/serverState";
import {
  emptyCourseState,
  setCoursePlan,
} from "@/lib/math-srs/courseAutomation";

const pointer = path.join(
  tmpdir(),
  `ontology-operations-${createHash("sha256").update(process.cwd()).digest("hex").slice(0, 12)}.json`,
);
const local = JSON.parse(readFileSync(pointer, "utf8")) as {
  url: string;
  port: number;
};
const parsed = new URL(local.url);
if (
  parsed.hostname !== "127.0.0.1" ||
  parsed.pathname !== "/ontology_operations_qa" ||
  Number(parsed.port) !== local.port
)
  throw new Error("Not an isolated local QA database");
export const localDatabaseUrl = local.url;
export const db = new PrismaClient({
  datasources: { db: { url: `${local.url}?connection_limit=12` } },
});
export const now = new Date("2026-10-23T02:00:00Z");
export const baseArgs = {
  startSectionId: "5-1-5-3",
  dailyQuestionCount: 10 as const,
  enabled: true,
};
export const nextArgs = { ...baseArgs, dailyQuestionCount: 15 as const };
afterAll(() => db.$disconnect());
export async function fixture() {
  const branch = await db.branch.create({
    data: { name: `synthetic-${randomUUID()}` },
  });
  const user = await db.user.create({
    data: {
      name: "Synthetic teacher",
      email: `${randomUUID()}@example.test`,
      branchId: branch.id,
      approvalStatus: "approved",
    },
  });
  const cls = await db.class.create({
    data: {
      name: "Synthetic class",
      grade: "초5",
      userId: user.id,
      branchId: branch.id,
      difficultyRatio: {},
    },
  });
  const student = await db.student.create({
    data: { name: "Synthetic student", classId: cls.id, branchId: branch.id },
  });
  const state = {
    ...emptySrsState(),
    course: setCoursePlan(
      emptyCourseState(),
      { ...baseArgs, expectedRevision: 0 },
      new Date("2026-10-22T02:00:00Z"),
    ),
  };
  await db.studentSrsState.create({
    data: {
      studentId: student.id,
      revision: 1,
      payload: state as unknown as Prisma.InputJsonValue,
    },
  });
  const actor = { id: user.id, sessionVersion: 0 };
  const target = {
    studentId: student.id,
    classId: cls.id,
    branchId: branch.id,
  };
  const graphVersion = `opaque:graph:${randomUUID()}`,
    sourceSnapshotId = `opaque:snapshot:${randomUUID()}`;
  const scopeKey = `branch:${branch.id}`;
  await db.ontologyActiveGraph.create({
    data: { scopeKey, graphVersion, generation: 1, updatedAt: now },
  });
  const snapshot: ResolvedActionEvidence = {
    graphVersion,
    sourceSnapshotId,
    studentRevision: 1,
    actorId: actor.id,
    target,
    expiresAt: new Date(now.getTime() + 600000).toISOString(),
    sourceSnapshot: { retained: "synthetic:observation-1", revision: 1 },
    evidencePacket: {
      ids: ["synthetic:approved-evidence-1"],
      supports: "synthetic-only",
    },
  };
  // DB-backed current graph gate. Synthetic evidence tests operation binding,
  // not real SHACL/OWL correctness (owned by the formal engine worker).
  const evidence: OntologyActionEvidencePort = {
    resolve: async (tx, _actor, _target, ref) => {
      await tx.$queryRaw`SELECT scope_key FROM ontology_active_graph WHERE scope_key = ${scopeKey} FOR SHARE`;
      const current = await tx.ontologyActiveGraph.findUniqueOrThrow({
        where: { scopeKey },
      });
      if (current.graphVersion !== ref.graphVersion)
        throw Object.assign(new Error("STALE"), { code: "STALE" });
      return structuredClone(snapshot);
    },
  };
  const service = createOntologyActionService({ db, evidence, now: () => now });
  const input = {
    target,
    args: nextArgs as OntologyPlanArgs,
    graphVersion,
    sourceSnapshotId,
  };
  const propose = () => service.propose(actor, input);
  const ready = async () => {
    const p = await propose();
    return {
      p,
      approval: await service.approve(actor, {
        proposalId: p.proposalId,
        sealHash: p.sealHash,
      }),
    };
  };
  return {
    branch,
    user,
    cls,
    student,
    state,
    actor,
    target,
    graphVersion,
    scopeKey,
    snapshot,
    evidence,
    service,
    input,
    propose,
    ready,
  };
}
