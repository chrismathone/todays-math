import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

/**
 * 그림 한 줄 — **두 컬럼을 다 본다.**
 *
 * 기출은 `figureUrls`(원본 래스터)를 쓰고 엔진은 `figureSvg`(인라인)를 쓴다.
 * 어느 쪽도 없을 때만 «없음»이라 적는다.
 */
function figureNote(r: {
  figureSvg: string | null;
  figureUrls: string[];
  figureSource: string | null;
}): string {
  if (r.figureUrls.length > 0)
    return `원본 ${r.figureUrls.length}장(${r.figureSource ?? "?"})`;
  if (r.figureSvg) return `svg ${r.figureSvg.length}자`;
  return "없음";
}

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
      // 🔴 **한 컬럼만 보면 다른 컬럼에 있는 답이 «없는 것»이 된다.**
      //    기출은 원본 그림을 옮기므로 `figureSvg` 는 **늘 비어 있다**(D-119 · 기출은
      //    다시 그리지 않는다). `figureSvg` 만 보고 「그림 없음」이라 찍으면 그 줄이
      //    거짓말을 한다 — 2026-09-06 에 실제로 19행 전부 「그림 없음」으로 나왔고,
      //    같은 시각 pre-push 가드는 18건을 세고 있었다.
      figureSvg: true,
      figureUrls: true,
      figureSource: true,
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
        `그림 ${figureNote(r)} · ` +
        `해설 ${r.solution ? `${r.solution.length}자/${r.solutionSource}` : "없음"} · ${r.reviewStatus}`,
    );
  }
  const noFig = rows.filter(
    (r) => r.figureUrls.length === 0 && !r.figureSvg,
  ).length;
  const figFiles = rows.reduce((n, r) => n + r.figureUrls.length, 0);
  console.log(
    `
그림 있는 행 ${rows.length - noFig}/${rows.length} · 원본 파일 ${figFiles}장 · ` +
      `그림 없는 행 ${noFig}`,
  );
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
