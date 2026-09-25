import "server-only";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { getCourseProblemInput } from "./elementary/answers";
import { getCourseSection } from "./elementary/catalog";
import type { CourseProblem } from "./elementary/types";

export type BankCourseCandidate = Pick<
  CourseProblem,
  "content" | "answer" | "solution" | "tier"
>;

/** Only approved, direct-use, self-contained numeric bank items can enter student practice. */
export async function loadCourseBankCandidates(
  sectionId: string,
): Promise<BankCourseCandidate[]> {
  const section = getCourseSection(sectionId);
  if (!section) return [];
  const unit = await db.unit.findFirst({
    where: {
      grade: section.unit.grade,
      chapter: section.unit.chapter,
      section: section.unit.section,
    },
    select: { id: true },
  });
  if (!unit) return [];
  const rows = await db.problem.findMany({
    where: {
      ...problemEligibleWhere(),
      unitId: unit.id,
      questionType: "단답형",
    },
    select: {
      difficulty: true,
      content: true,
      answer: true,
      solution: true,
      figureSvg: true,
      figureUrls: true,
    },
    orderBy: { id: "asc" },
    take: 200,
  });
  return rows.flatMap((row) => {
    if (
      !row.solution?.trim() ||
      row.figureSvg ||
      row.figureUrls.length ||
      /[①②③④⑤⑥⑦⑧⑨⑩]/.test(row.content) ||
      /(?:그림|표|그래프|사진)을?\s*(?:보고|보며|보고서)/.test(row.content) ||
      getCourseProblemInput(row).mode !== "number"
    )
      return [];
    return [
      {
        content: row.content,
        answer: row.answer,
        solution: row.solution,
        tier: row.difficulty,
      },
    ];
  });
}
