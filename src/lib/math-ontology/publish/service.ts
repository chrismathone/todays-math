import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  mathOntologyCompileInputSchema,
  mathOntologyArtifactSchema,
  type MathOntologyCompileInput,
  type MathOntologyCompilePort,
  type MathOntologyArtifact,
} from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import type { OntologyActionActor } from "../actions/authorization";
import { canonicalBytes, checkedCanonical, digest } from "../actions/canonical";
import { OntologyOperationError, requireOperation } from "../actions/errors";
import { authorizeOntologyPublisher } from "../review/authorization";
import { recordOntologyReviewEvent } from "../review/events";
import { lockOntologyScope } from "./scope";

export async function approvedOntologyReviews(
  tx: Prisma.TransactionClient,
  scopeKey: string,
) {
  await tx.$queryRaw`SELECT id FROM ontology_relation_review WHERE scope_key = ${scopeKey} AND state = 'approved' ORDER BY id FOR SHARE`;
  const rows = await tx.ontologyRelationReview.findMany({
    where: { scopeKey, state: "approved" },
    orderBy: { id: "asc" },
  });
  for (const row of rows) {
    checkedCanonical(row.assertionCanonical, row.assertionHash);
    requireOperation(
      row.validationCanonical &&
        row.validationHash &&
        row.reviewerId &&
        row.reviewedAt,
      "BINDING_MISMATCH",
    );
    checkedCanonical(row.validationCanonical, row.validationHash);
  }
  const hash = digest(
    canonicalBytes(
      rows.map((row) => ({
        id: row.id,
        revision: row.revision,
        assertionHash: row.assertionHash,
        validationHash: row.validationHash,
        reviewerId: row.reviewerId,
        reviewedAt: row.reviewedAt!.toISOString(),
      })),
      64 * 1024 * 1024,
    ),
  );
  return { rows, hash };
}

export function createOntologyPublisher(deps: {
  db: Pick<PrismaClient, "$transaction" | "ontologyCompileJob">;
  compiler: MathOntologyCompilePort;
  engineLockHash: string;
  now?: () => Date;
  buildInput: (
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    scopeKey: string,
    reviews: Awaited<ReturnType<typeof approvedOntologyReviews>>,
  ) => Promise<MathOntologyCompileInput>;
  /** Production uses loadOntologyRuntime, including actual SHACL + proofs. */
  verifyArtifact: (
    artifact: MathOntologyArtifact,
    input: MathOntologyCompileInput,
  ) => Promise<MathOntologyArtifact>;
}) {
  const now = deps.now ?? (() => new Date());
  const transaction = <T>(run: (tx: Prisma.TransactionClient) => Promise<T>) =>
    deps.db.$transaction(run, { timeout: 30000, maxWait: 10000 });
  type ExpectedPublication = { jobId: string; reviewStateHash: string; generation: number };
  async function enqueueInTransaction(tx: Prisma.TransactionClient, actor: OntologyActionActor, scopeKey: string, expected?: ExpectedPublication) {
    requireOperation(
      scopeKey.length > 0 && scopeKey.length <= 200,
      "FORBIDDEN",
    );
      await authorizeOntologyPublisher(tx, actor, now);
      if (expected) {
        const previous = await tx.ontologyCompileJob.findUnique({ where: { id: expected.jobId } });
        if (previous) {
          requireOperation(previous.requestedBy === actor.id && previous.scopeKey === scopeKey && previous.approvedReviewStateHash === expected.reviewStateHash && previous.expectedActiveGeneration === expected.generation, "BINDING_MISMATCH");
          return { jobId: previous.id, state: previous.state };
        }
      }
      const time = now(),
        active = await lockOntologyScope(tx, scopeKey, time),
        reviews = await approvedOntologyReviews(tx, scopeKey);
      if (expected) requireOperation(active.generation === expected.generation && reviews.hash === expected.reviewStateHash, "STALE");
      const input = mathOntologyCompileInputSchema.parse(
        await deps.buildInput(tx, actor, scopeKey, reviews),
      );
      requireOperation(input.scope === scopeKey, "BINDING_MISMATCH");
      const inputCanonical = canonicalOntologyJson(input),
        inputManifestHash = ontologyDigest(inputCanonical);
      const existing = await tx.ontologyCompileJob.findFirst({
        where: {
          scopeKey,
          inputManifestHash,
          approvedReviewStateHash: reviews.hash,
          expectedActiveGeneration: active.generation,
          state: { in: ["queued", "leased"] },
        },
        orderBy: { createdAt: "asc" },
      });
      if (existing) return { jobId: existing.id, state: existing.state };
      const row = await tx.ontologyCompileJob.create({
        data: {
          id: expected?.jobId ?? randomUUID(),
          scopeKey,
          requestedBy: actor.id,
          inputCanonical,
          inputManifestHash,
          approvedReviewStateHash: reviews.hash,
          expectedActiveGeneration: active.generation,
          engineLockHash: deps.engineLockHash,
          createdAt: time,
        },
      });
      await recordOntologyReviewEvent(
        tx,
        actor.id,
        scopeKey,
        row.id,
        "publish.queued",
        {
          inputManifestHash,
          approvedReviewStateHash: reviews.hash,
          expectedGeneration: active.generation,
          engineLockHash: deps.engineLockHash,
        },
        time,
      );
      await authorizeOntologyPublisher(tx, actor, now);
      return { jobId: row.id, state: row.state };
  }
  const enqueue = (actor: OntologyActionActor, scopeKey: string) => transaction(tx => enqueueInTransaction(tx, actor, scopeKey));
  async function run(actor: OntologyActionActor, jobId: string) {
    const lease = await transaction(async (tx) => {
      await authorizeOntologyPublisher(tx, actor, now);
      await tx.$queryRaw`SELECT id FROM ontology_compile_job WHERE id = ${jobId}::uuid FOR UPDATE`;
      const row = await tx.ontologyCompileJob.findUnique({
        where: { id: jobId },
      });
      requireOperation(row, "NOT_FOUND");
      if (row.state === "published") {
        const release = await tx.ontologyRelease.findUniqueOrThrow({
          where: { jobId },
        });
        return {
          published: true as const,
          graphVersion: release.graphVersion,
          row,
        };
      }
      const time = now();
      requireOperation(
        row.state === "queued" ||
          row.state === "failed" ||
          (row.state === "leased" && row.leaseUntil && row.leaseUntil <= time),
        "CONFLICT",
      );
      requireOperation(
        ontologyDigest(row.inputCanonical) === row.inputManifestHash &&
          row.engineLockHash === deps.engineLockHash,
        "BINDING_MISMATCH",
      );
      const input = mathOntologyCompileInputSchema.parse(
        JSON.parse(row.inputCanonical),
      );
      requireOperation(
        canonicalOntologyJson(input) === row.inputCanonical,
        "BINDING_MISMATCH",
      );
      const updated = await tx.ontologyCompileJob.update({
        where: { id: jobId },
        data: {
          state: "leased",
          leaseGeneration: { increment: 1 },
          attempt: { increment: 1 },
          leaseUntil: new Date(time.getTime() + 300000),
          lastErrorCode: null,
        },
      });
      await recordOntologyReviewEvent(
        tx,
        actor.id,
        row.scopeKey,
        row.id,
        "publish.leased",
        { leaseGeneration: updated.leaseGeneration, attempt: updated.attempt },
        time,
      );
      await authorizeOntologyPublisher(tx, actor, now);
      return { published: false as const, row: updated, input };
    });
    if (lease.published)
      return { jobId, state: "published", graphVersion: lease.graphVersion };
    try {
      // Actual compiler work is outside every database transaction.
      const raw = await deps.compiler.compile(lease.input, {
        jobId,
        inputHash: lease.row.inputManifestHash,
        leaseGeneration: lease.row.leaseGeneration,
        // This is the durable DB lease. The transport separately binds its
        // short request-auth start window; it must not cap job lifetime to 55s.
        expiresAt: lease.row.leaseUntil!.toISOString(),
      });
      const artifact = mathOntologyArtifactSchema.parse(
        await deps.verifyArtifact(raw, lease.input),
      );
      const artifactCanonical = canonicalOntologyJson(artifact),
        artifactHash = ontologyDigest(artifactCanonical);
      return await transaction(async (tx) => {
        await authorizeOntologyPublisher(tx, actor, now);
        const time = now(),
          active = await lockOntologyScope(tx, lease.row.scopeKey, time);
        await tx.$queryRaw`SELECT id FROM ontology_compile_job WHERE id = ${jobId}::uuid FOR UPDATE`;
        const current = await tx.ontologyCompileJob.findUniqueOrThrow({
          where: { id: jobId },
        });
        requireOperation(
          current.state === "leased" &&
            current.leaseGeneration === lease.row.leaseGeneration &&
            current.leaseUntil &&
            current.leaseUntil > time &&
            current.inputManifestHash === lease.row.inputManifestHash &&
            current.engineLockHash === deps.engineLockHash,
          "STALE",
        );
        requireOperation(
          active.generation === current.expectedActiveGeneration &&
            (await approvedOntologyReviews(tx, current.scopeKey)).hash ===
              current.approvedReviewStateHash,
          "STALE",
        );
        // Rebuild from current server sources/approval decisions, never client bytes.
        const rebuilt = mathOntologyCompileInputSchema.parse(
          await deps.buildInput(
            tx,
            actor,
            current.scopeKey,
            await approvedOntologyReviews(tx, current.scopeKey),
          ),
        );
        requireOperation(
          ontologyDigest(canonicalOntologyJson(rebuilt)) ===
            current.inputManifestHash,
          "STALE",
        );
        await tx.ontologyRelease.create({
          data: {
            graphVersion: artifact.identity.graphVersion,
            scopeKey: current.scopeKey,
            jobId,
            identityCanonical: canonicalOntologyJson(artifact.identity),
            artifactCanonical,
            artifactHash,
            publishedAt: time,
          },
        });
        const changed = await tx.ontologyActiveGraph.updateMany({
          where: {
            scopeKey: current.scopeKey,
            generation: current.expectedActiveGeneration,
          },
          data: {
            graphVersion: artifact.identity.graphVersion,
            generation: { increment: 1 },
            updatedAt: time,
          },
        });
        requireOperation(changed.count === 1, "STALE");
        await tx.ontologyCompileJob.update({
          where: { id: jobId },
          data: {
            state: "published",
            leaseUntil: null,
            resultCanonical: canonicalOntologyJson({
              graphVersion: artifact.identity.graphVersion,
              artifactHash,
            }),
            resultHash: ontologyDigest(
              canonicalOntologyJson({
                graphVersion: artifact.identity.graphVersion,
                artifactHash,
              }),
            ),
          },
        });
        await recordOntologyReviewEvent(
          tx,
          actor.id,
          current.scopeKey,
          jobId,
          "publish.activated",
          {
            graphVersion: artifact.identity.graphVersion,
            generation: current.expectedActiveGeneration + 1,
            artifactHash,
          },
          time,
        );
        await authorizeOntologyPublisher(tx, actor, now);
        return {
          jobId,
          state: "published",
          graphVersion: artifact.identity.graphVersion,
        };
      });
    } catch (error) {
      await deps.db.ontologyCompileJob.updateMany({
        where: {
          id: jobId,
          state: "leased",
          leaseGeneration: lease.row.leaseGeneration,
        },
        data: {
          state:
            error instanceof OntologyOperationError && error.code === "STALE"
              ? "stale"
              : "failed",
          leaseUntil: null,
          lastErrorCode:
            error instanceof OntologyOperationError
              ? error.code
              : "compile-or-validation-failed",
        },
      });
      throw error;
    }
  }
  return { enqueue, enqueueInTransaction, run, recover: run };
}
