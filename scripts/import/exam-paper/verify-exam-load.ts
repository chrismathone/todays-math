import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main(): Promise<void> {
  const rows = await p.problem.findMany({
    where: { examId: "2025-jeonghwa-3-2-mid" },
    orderBy: { questionNumber: "asc" },
    select: {
      problemCode: true,
      questionNumber: true,
      questionType: true,
      difficulty: true,
      score: true,
      figureSvg: true,
      solution: true,
      solutionSource: true,
      reviewStatus: true,
      directUseAllowed: true,
      school: true,
      sourceFile: true,
      unit: { select: { grade: true, chapter: true, section: true } },
    },
  });
  console.log(`적재 확인 ${rows.length}행\n`);
  for (const r of rows) {
    console.log(
      `${String(r.questionNumber).padStart(2)} ${r.problemCode} ` +
        `${r.unit.section.padEnd(9)} ${r.difficulty.padEnd(4)} ${r.questionType} ${r.score}점 ` +
        `그림 ${r.figureSvg ? `${r.figureSvg.length}자` : "없음"} · ` +
        `해설 ${r.solution ? `${r.solution.length}자/${r.solutionSource}` : "없음"} · ${r.reviewStatus}`,
    );
  }
  const bad = rows.filter((r) => r.school !== "정화중" || !r.sourceFile);
  console.log(
    `\n메타 빠진 행 ${bad.length} · 학년 ${[...new Set(rows.map((r) => r.unit.grade))].join(",")}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
