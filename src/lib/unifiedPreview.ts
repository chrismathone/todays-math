import "server-only";
import { Difficulty, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import type { BankData } from "@/components/unified/types";

/** Read-only development workspace. Eligibility is shared with real issuance. */
export async function loadUnifiedBank(
  params = new URLSearchParams(),
): Promise<BankData> {
  const pageSize = 12;
  const requestedPage = Math.max(
    1,
    Math.min(10000, Number(params.get("page")) || 1),
  );
  const grade = (params.get("grade") || "").slice(0, 20);
  const chapter = (params.get("chapter") || "").slice(0, 100);
  const difficulty = Object.values(Difficulty).find(
    (value) => value === params.get("difficulty"),
  );
  const q = (params.get("q") || "").trim().slice(0, 120);
  const where: Prisma.ProblemWhereInput = {
    AND: [
      problemEligibleWhere(),
      {
        ...(grade || chapter
          ? {
              unit: {
                ...(grade ? { grade } : {}),
                ...(chapter ? { chapter } : {}),
              },
            }
          : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(q
          ? {
              OR: [
                { content: { contains: q, mode: "insensitive" } },
                { problemCode: { contains: q, mode: "insensitive" } },
                { unit: { section: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
    ],
  };
  const [total, units] = await Promise.all([
    db.problem.count({ where }),
    db.unit.findMany({
      select: {
        grade: true,
        chapter: true,
        _count: { select: { problems: { where: problemEligibleWhere() } } },
      },
      orderBy: [{ grade: "asc" }, { orderIndex: "asc" }],
    }),
  ]);
  const page = Math.min(
    Math.floor(requestedPage),
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const rows = await db.problem.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: [
      { unit: { orderIndex: "asc" } },
      { problemCode: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      content: true,
      answer: true,
      solution: true,
      difficulty: true,
      problemCode: true,
      figureUrls: true,
      figureSvg: true,
      figureDims: true,
      figureSourceMm: true,
      unit: { select: { grade: true, chapter: true, section: true } },
    },
  });
  const counts = new Map<string, number>();
  for (const unit of units)
    counts.set(
      unit.grade,
      (counts.get(unit.grade) || 0) + unit._count.problems,
    );
  return {
    problems: rows.map(({ unit, ...problem }) => ({
      ...problem,
      ...unit,
      solution: problem.solution || "",
      problemCode: problem.problemCode || "",
    })),
    total,
    page,
    pageSize,
    grades: Array.from(counts, ([grade, count]) => ({ grade, count })).filter(
      (item) => item.count > 0,
    ),
    chapters: [
      ...new Set(
        units
          .filter(
            (unit) =>
              (!grade || unit.grade === grade) && unit._count.problems > 0,
          )
          .map((unit) => unit.chapter),
      ),
    ],
  };
}
