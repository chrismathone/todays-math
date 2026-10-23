import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { mathOntologyQuerySchema, type MathOntologyQuery } from "@/contracts/mathOntology.contract";
import type { OntologyActionTarget } from "@/contracts/mathOntologyAction.contract";
import { readMathOntologyDatabaseSourcesInTransaction, assertMathOntologySourceSnapshotTransaction } from "../sources/server";
import type { MathOntologyRuntime } from "../runtime/artifact";
import { queryOntology } from "../query/closed";
import { lockActiveOntologyReleaseInTransaction } from "../publish/store";
import { authorizeOntologyAction, type OntologyActionActor } from "./authorization";
import { canonicalBytes, checkedCanonical, digest, type CanonicalValue } from "./canonical";
import { requireOperation } from "./errors";
import type { OntologyActionEvidencePort, ResolvedActionEvidence } from "./service";

export interface OntologyEvidenceRuntimePort {
  /** Loads only dependency-closed immutable shards for this closed query.
   * The active release row is locked by the caller before this invocation. */
  load(tx: Prisma.TransactionClient, graphVersion: string, query: MathOntologyQuery): Promise<MathOntologyRuntime>;
}
export function createOntologyEvidenceStore(deps: {
  db: Pick<PrismaClient, "$transaction">;
  runtime: OntologyEvidenceRuntimePort;
  cursorSecret: () => string;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  async function read(tx: Prisma.TransactionClient, actor: OntologyActionActor, target: OntologyActionTarget, graphVersion: string, query: MathOntologyQuery, asOf: Date) {
    await authorizeOntologyAction(tx, actor, target, now);
    const active = await lockActiveOntologyReleaseInTransaction(tx, "global", graphVersion);
    const source = await readMathOntologyDatabaseSourcesInTransaction(tx, { actor, target, graphVersion, now: asOf, authorizationNow: now });
    assertMathOntologySourceSnapshotTransaction(source, tx);
    const sourceCanonical = canonicalBytes(source as unknown as CanonicalValue);
    const runtime = await deps.runtime.load(tx, graphVersion, query);
    requireOperation(runtime.identity.graphVersion === graphVersion && runtime.coverage.scope === "global", "BINDING_MISMATCH");
    const contextHash = digest(canonicalBytes({ actorId: actor.id, target, graphVersion, generation: active.generation, sourceHash: digest(sourceCanonical) }));
    const packet = await queryOntology(runtime, query, { allowedScopes: ["global"], contextHash, cursorSecret: deps.cursorSecret() });
    requireOperation(packet.graphVersion === graphVersion && !packet.truncated && !packet.cursor, "UNAVAILABLE");
    await authorizeOntologyAction(tx, actor, target, now);
    return { source, sourceCanonical, packet, evidenceCanonical: canonicalBytes(packet as unknown as CanonicalValue) };
  }
  const evidence: OntologyActionEvidencePort = {
    async resolve(tx, actor, target, ref, time): Promise<ResolvedActionEvidence> {
      const row = await tx.ontologyEvidenceSnapshot.findUnique({ where: { id: ref.sourceSnapshotId } });
      requireOperation(row && row.actorId === actor.id && row.studentId === target.studentId && row.classId === target.classId && row.branchId === target.branchId && row.graphVersion === ref.graphVersion, "NOT_FOUND");
      requireOperation(row.expiresAt > time, "EXPIRED");
      const source = checkedCanonical(row.sourceCanonical, row.sourceHash), packet = checkedCanonical(row.evidenceCanonical, row.evidenceHash);
      const query = mathOntologyQuerySchema.parse(checkedCanonical(row.queryCanonical, row.queryHash));
      const actual = await read(tx, actor, target, row.graphVersion, query, row.createdAt);
      requireOperation(actual.source.studentRevision === row.studentRevision && actual.sourceCanonical === row.sourceCanonical && actual.evidenceCanonical === row.evidenceCanonical, "STALE");
      requireOperation(row.expiresAt > now(), "EXPIRED");
      return { actorId: actor.id, target, graphVersion: row.graphVersion, sourceSnapshotId: row.id, studentRevision: row.studentRevision, expiresAt: row.expiresAt.toISOString(), sourceSnapshot: source, evidencePacket: packet };
    },
  };
  return {
    evidence,
    async capture(actor: OntologyActionActor, input: { target: OntologyActionTarget; graphVersion: string; query: unknown }) {
      const query = mathOntologyQuerySchema.parse(input.query);
      requireOperation(query.kind !== "catalog" && !query.cursor, "UNAVAILABLE");
      return deps.db.$transaction(async tx => {
        const time = now(), actual = await read(tx, actor, input.target, input.graphVersion, query, time);
        requireOperation(actual.packet.rows.length > 0 && "proofIds" in actual.packet && actual.packet.proofIds.length > 0, "UNAVAILABLE");
        const id = `ontology:snapshot:${randomUUID()}`, expiresAt = new Date(time.getTime() + 10 * 60_000), queryCanonical = canonicalBytes(query);
        await tx.ontologyEvidenceSnapshot.create({ data: { id, actorId: actor.id, ...input.target, graphVersion: input.graphVersion, studentRevision: actual.source.studentRevision, sourceCanonical: actual.sourceCanonical, sourceHash: digest(actual.sourceCanonical), evidenceCanonical: actual.evidenceCanonical, evidenceHash: digest(actual.evidenceCanonical), queryCanonical, queryHash: digest(queryCanonical), expiresAt, createdAt: time } });
        await authorizeOntologyAction(tx, actor, input.target, now);
        return { sourceSnapshotId: id, graphVersion: input.graphVersion, studentRevision: actual.source.studentRevision, evidencePacket: actual.packet, expiresAt: expiresAt.toISOString() };
      }, { maxWait: 10000, timeout: 20000 });
    },
  };
}
