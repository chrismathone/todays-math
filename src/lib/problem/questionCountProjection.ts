import "server-only";
import type { Prisma } from "@prisma/client";
import type { QuestionFormat } from "@/contracts/questionFormats.contract";
import { db } from "@/lib/db";
import { problemVisibleWhere } from "@/lib/problemPool";
import type { classifyFormat } from "./provenance";
import type { QuestionDb } from "./questionQueries";
import { loadQuestionCandidates } from "./questionProjection";
import { questionBucketsFromRows } from "./questionCountBuckets";
import type { CountBucket, CountDimension } from "./questionCountSql";

/** R2 fallback: the pre-R1 metadata/body reader is faster on the shared corpus
 * than SQL format aggregates, even after removing their second aggregate.
 * Preserve its request-local format evidence for the separate ID-only page query.
 */
export async function loadQuestionCounts(
  where: Prisma.ProblemWhereInput,
  client: QuestionDb &
    Partial<Pick<Prisma.TransactionClient, "unit" | "sourceMaterial">> = db,
  dimensions: readonly CountDimension[] = [],
  format?: QuestionFormat,
  formats = new Map<string, ReturnType<typeof classifyFormat>>(),
): Promise<CountBucket[]> {
  const rows = await loadQuestionCandidates(
    { AND: [problemVisibleWhere(), where] },
    undefined,
    client,
    formats,
  );
  const [units, materials] = await Promise.all([
    dimensions.includes("grade") && client.unit
      ? client.unit.findMany({ select: { id: true, grade: true } })
      : [],
    dimensions.some((d) => d === "book" || d === "kind") &&
    client.sourceMaterial
      ? client.sourceMaterial.findMany({
          select: { id: true, bookId: true, kind: true },
        })
      : [],
  ]);
  const buckets = questionBucketsFromRows(
    rows.map((row) => ({ ...row, weight: 1, rowCount: 1 })),
    dimensions,
    format,
    { units, materials },
  );
  if (!buckets.some((bucket) => bucket.axis === "all"))
    buckets.push({
      axis: "all",
      key: "",
      extra: null,
      held: 0,
      available: 0,
      rowCount: 0,
    });
  return buckets;
}
