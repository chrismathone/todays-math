import type { Prisma } from "@prisma/client";
import type { EligibleProblem } from "@/lib/findEligibleProblems";
import { lockProblemRows } from "@/lib/problem/lockRows";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import { familyIdOf } from "@/lib/generator/familyKey";

/** Recheck the actual chosen tasks inside the write transaction; never replace them with siblings. */
export async function selectionStillCurrent(
  tx: Prisma.TransactionClient,
  expected: readonly EligibleProblem[],
): Promise<boolean> {
  await lockProblemRows(
    tx,
    expected.map((row) => row.id),
  );
  const rows = await tx.problem.findMany({
    where: {
      AND: [
        problemEligibleWhere(),
        { id: { in: expected.map((row) => row.id) } },
      ],
    },
    select: {
      id: true,
      unitId: true,
      difficulty: true,
      familyKey: true,
      questionGroupKey: true,
      content: true,
      answer: true,
      questionType: true,
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return (
    rows.length === expected.length &&
    new Set(rows.map(questionIdOf)).size === rows.length &&
    new Set(rows.map(familyIdOf)).size === rows.length &&
    expected.every((old) => {
      const row = byId.get(old.id);
      return (
        row &&
        questionIdOf(row) === questionIdOf(old) &&
        familyIdOf(row) === familyIdOf(old) &&
        row.unitId === old.unitId &&
        row.difficulty === old.difficulty &&
        row.content === old.content &&
        row.answer === old.answer &&
        row.questionType === old.questionType
      );
    })
  );
}
