import "server-only";
import type { Prisma } from "@prisma/client";
import type { QuestionFormat } from "@/contracts/questionFormats.contract";
import { db } from "@/lib/db";
import { problemVisibleWhere } from "@/lib/problemPool";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import type { classifyFormat } from "./provenance";
import type { QuestionDb } from "./questionQueries";
import { loadQuestionCandidates } from "./questionProjection";
import { questionBucketsFromRows } from "./questionCountBuckets";
import type { CountBucket, CountDimension } from "./questionCountSql";
import { questionCountsSql } from "./questionCountSql";
import { loadActualFormats } from "./actualFormatProjection";

/** Aggregate stored, verified facts in PostgreSQL. Only invalid facts use the
 * old classifier; unsupported Prisma predicates retain the original reader. */
export async function loadQuestionCounts(
  where: Prisma.ProblemWhereInput,
  client: QuestionDb &
    Partial<Pick<Prisma.TransactionClient, "unit" | "sourceMaterial">> = db,
  dimensions: readonly CountDimension[] = [],
  format?: QuestionFormat,
  formats = new Map<string, ReturnType<typeof classifyFormat>>(),
  includeFormats = true,
): Promise<CountBucket[]> {
  const sql = questionCountsSql(
    where,
    dimensions,
    format,
    formats,
    client,
    includeFormats,
  );
  if (
    sql &&
    typeof (client as Prisma.TransactionClient).$queryRaw === "function" &&
    (await loadActualFormats(
      JSON.stringify(where) === JSON.stringify(problemEligibleWhere())
        ? problemVisibleWhere()
        : where,
      client,
      formats,
    ))
  ) {
    const found = await (client as Prisma.TransactionClient).$queryRaw<
      CountBucket[]
    >(
      questionCountsSql(
        where,
        dimensions,
        format,
        formats,
        client,
        includeFormats,
      )!,
    );
    const buckets = found.map(({ firstAvailable, ...bucket }) =>
      Object.defineProperty(bucket, "firstAvailable", {
        value: firstAvailable ?? Infinity,
      }),
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
