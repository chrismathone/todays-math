import type { Prisma } from "@prisma/client";
import type { ProblemFormatFilter } from "@/contracts/problem.contract";
import { db } from "@/lib/db";
import { loadActualFormats } from "./actualFormatProjection";
import {
  classifyFormat,
  FORMAT_SUPERSET_WHERE,
  formatWithoutContent,
} from "./provenance";

/** Resolve the existing bank's derived format in server order. Only undecided
 * candidates need their contents read. Return IDs for pagination, not one giant
 * IN/NOT IN predicate: the live corpus exceeds PostgreSQL's bind limit on both
 * sides of the format partition. Final page queries contain at most pageSize IDs.
 */
export async function findProblemIdsByFormat(
  format: ProblemFormatFilter | undefined,
  base: Record<string, unknown>,
  orderBy: Prisma.ProblemOrderByWithRelationInput[],
): Promise<string[] | null> {
  if (!format) return null;
  const superset = FORMAT_SUPERSET_WHERE[format];
  const formats = new Map<string, ReturnType<typeof classifyFormat>>();
  await loadActualFormats({ AND: [base, superset] }, db, formats, false);
  const candidates = await db.problem.findMany({
    where: { AND: [base, superset] },
    orderBy,
    select: {
      id: true,
      answer: true,
      questionType: true,
      problemType: true,
      familyKey: true,
    },
  });

  // 본문을 읽어야만 갈리는 행만 골라 **그 행들의 본문만** 가져온다.
  const undecided = candidates.filter(
    (row) => !formats.has(row.id) && formatWithoutContent(row) === null,
  );
  const contentById = new Map<string, string>();
  // The shared bank now exceeds the PostgreSQL bind limit (32,767). Keep
  // transport batches bounded even when most rows need their content parsed.
  for (let offset = 0; offset < undecided.length; offset += 5000) {
    const rows = await db.problem.findMany({
      where: {
        id: { in: undecided.slice(offset, offset + 5000).map((row) => row.id) },
      },
      select: { id: true, content: true },
    });
    for (const row of rows) contentById.set(row.id, row.content);
  }

  const rejected = candidates
    .filter((row) => {
      const stored = formats.get(row.id);
      if (stored !== undefined) return stored !== format;
      const quick = formatWithoutContent(row);
      if (quick !== null) return quick !== format;
      const content = contentById.get(row.id);
      // 본문을 못 읽었다 = 두 조회 사이에 지워진 행이다. **남기지 않는다** —
      // 라벨을 확인하지 못한 것을 보여 주면 필터와 화면이 갈린다.
      if (content === undefined) return true;
      return classifyFormat({ ...row, content }) !== format;
    })
    .map((row) => row.id);

  const excluded = new Set(rejected);
  return candidates.filter((row) => !excluded.has(row.id)).map((row) => row.id);
}
