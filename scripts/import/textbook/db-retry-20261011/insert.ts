/** A single source transaction inserts exactly two pending rows, or inserts nothing. */
import { Prisma, type PrismaClient, type Problem } from "@prisma/client";
import type {
  DbRetryFigures,
  DbRetryOrigin,
} from "../../../../src/lib/import/schoolTextbook/dbRetry.types";
import {
  DbRetryGenerationError,
  prepareDbRetryInsertion,
} from "../../../../src/lib/import/schoolTextbook/dbRetryGeneration";
import { reviewDigest } from "../../../../src/lib/import/schoolTextbook/qualification";
import {
  matchesTextbookRetryInsertion,
  textbookRetryExternalId,
} from "../../../../src/lib/import/schoolTextbook/retryPairPlan";
import type { TextbookVariantSource } from "../../../../src/lib/import/schoolTextbook/variants";
import { textbookVariantSourceDigest } from "../../../../src/lib/import/schoolTextbook/variants";
import type { DbRetryCheckpoint, DbRetryReceipt } from "./checkpoint";

export interface DbRetryLiveSource {
  problem: TextbookVariantSource;
  unit: { grade: string; chapter: string; section: string };
}
export async function readLiveDbRetryOrigin(
  client: Pick<PrismaClient, "$queryRaw">,
  sourceId: string,
): Promise<DbRetryOrigin> {
  const rows = await client.$queryRaw<DbRetryLiveSource[]>(Prisma.sql`
    SELECT to_jsonb(p) AS problem, to_jsonb(u) AS unit FROM problem p JOIN unit u ON u.id=p.unit_id WHERE p.id=${sourceId}::uuid`);
  if (!rows[0]) throw new DbRetryGenerationError("source-deleted");
  return {
    problem: rows[0].problem,
    grade: rows[0].unit.grade,
    chapter: rows[0].unit.chapter,
    section: rows[0].unit.section,
  };
}
export function dbRetryRowsWithIntent(
  origin: DbRetryOrigin,
  entry: DbRetryCheckpoint,
): Prisma.ProblemCreateManyInput[] {
  if (!entry.pair || !entry.insertionIds)
    throw new DbRetryGenerationError("insertion-intent-missing");
  if (entry.pair.candidatePayloadDigest !== reviewDigest(entry.pair.candidates))
    throw new DbRetryGenerationError("candidate-payload-changed");
  return prepareDbRetryInsertion(origin, entry.pair.candidates).map(
    (row, index) => ({ ...row, id: entry.insertionIds![index] }),
  );
}

export type DbRetryInsertOutcome =
  { state: "inserted"; receipt: DbRetryReceipt } | { state: "existing-pair" };
export async function insertDbRetryPendingPair(
  client: Pick<PrismaClient, "$transaction">,
  origin: DbRetryOrigin,
  entry: DbRetryCheckpoint,
  sourceFigures: DbRetryFigures,
): Promise<DbRetryInsertOutcome> {
  const planned = dbRetryRowsWithIntent(origin, entry);
  if (entry.rowPayloadDigest !== reviewDigest(planned))
    throw new DbRetryGenerationError("insertion-payload-changed");
  if (entry.pair!.sourceFigureDigest !== sourceFigures.digest)
    throw new DbRetryGenerationError("source-figure-bytes-changed");
  return client.$transaction(
    async (tx) => {
      // Serialize this importer by source; the existing external_id UNIQUE constraint also protects races with older importers.
      await tx.$queryRaw(
        Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${origin.problem.id}, 0))`,
      );
      const captured = await tx.$queryRaw<DbRetryLiveSource[]>(Prisma.sql`
      SELECT to_jsonb(p) AS problem, to_jsonb(u) AS unit FROM problem p JOIN unit u ON u.id=p.unit_id
      WHERE p.id=${origin.problem.id}::uuid FOR SHARE OF p,u`);
      if (!captured[0]) throw new DbRetryGenerationError("source-deleted");
      const p = captured[0].problem;
      const live: DbRetryOrigin = {
        problem: p,
        grade: captured[0].unit.grade,
        chapter: captured[0].unit.chapter,
        section: captured[0].unit.section,
      };
      const externalIds = [
        textbookRetryExternalId(p.id, 1),
        textbookRetryExternalId(p.id, 2),
      ] as [string, string];
      const existing = await tx.problem.findMany({
        where: { externalId: { in: externalIds } },
      });
      const isLinked = (row: Problem) =>
        row.source === "transformed" &&
        row.originProblemId === p.id &&
        row.unitId === p.unit_id &&
        row.sourceMaterialId === p.source_material_id &&
        row.familyKey === p.family_key;
      const recoveredOwned =
        existing.length === 2 &&
        planned.every((row) => {
          const stored = existing.find(
            (item) => item.externalId === row.externalId,
          );
          return (
            stored &&
            stored.id === row.id &&
            matchesTextbookRetryInsertion(stored, row) &&
            stored.sourceFile === row.sourceFile
          );
        });
      if (existing.length) {
        if (existing.length !== 2 || !existing.every(isLinked))
          throw new DbRetryGenerationError(
            "existing-partial-or-conflicting-pair",
          );
        // Existing approved/edited pairs are preserved verbatim. Preallocated IDs let a lost commit receipt recover only this run's rows.
        if (!recoveredOwned) return { state: "existing-pair" };
      }
      if (
        textbookVariantSourceDigest(p) !== entry.sourceDigest ||
        reviewDigest(live) !== entry.originDigest
      )
        throw new DbRetryGenerationError("source-digest-changed");
      if (!recoveredOwned) {
        const livePlanned = dbRetryRowsWithIntent(live, entry);
        if (reviewDigest(livePlanned) !== entry.rowPayloadDigest)
          throw new DbRetryGenerationError("insertion-payload-changed");
        // No skipDuplicates, upsert, UPDATE, partial completion or promotion.
        const created = await tx.problem.createManyAndReturn({
          data: livePlanned,
          select: { id: true, externalId: true },
        });
        if (created.length !== 2)
          throw new DbRetryGenerationError("insertion-count-not-two");
        const readback = await tx.problem.findMany({
          where: { externalId: { in: externalIds } },
        });
        if (
          readback.length !== 2 ||
          !livePlanned.every((row) =>
            readback.some(
              (stored) =>
                stored.id === row.id &&
                stored.reviewStatus === "pending" &&
                !stored.directUseAllowed &&
                stored.sourceFile === row.sourceFile &&
                matchesTextbookRetryInsertion(stored, row),
            ),
          )
        )
          throw new DbRetryGenerationError("insertion-readback-mismatch");
      }
      return {
        state: "inserted",
        receipt: {
          sourceId: p.id,
          sourceDigest: entry.sourceDigest,
          candidatePayloadDigest: entry.pair!.candidatePayloadDigest,
          rowPayloadDigest: entry.rowPayloadDigest!,
          ownedIds: entry.insertionIds!,
          externalIds,
          committedAt: new Date().toISOString(),
        },
      };
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
