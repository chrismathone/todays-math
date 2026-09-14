// 기출 네 편(정화중·동도중·강동중·경산여중)에 실린 해설을 **읽기만** 해서 파일로 쓴다 — 해설 규칙 검수용.
//   npx tsx scratch/q-exam-sols.ts <출력 json>
import { writeFileSync } from "node:fs";
import { db } from "@/lib/db";

const IDS = [
  "2025-jeonghwa-3-2-mid",
  "2025-dongdo-3-2-mid",
  "2025-gangdong-3-2-mid",
  "2025-gyeongsanyeo-3-2-mid",
];

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("출력 경로를 주세요");
  const rows = await db.problem.findMany({
    where: { examId: { in: IDS } },
    select: {
      examId: true,
      questionNumber: true,
      questionType: true,
      answer: true,
      solution: true,
      solutionSource: true,
      content: true,
      problemCode: true,
    },
    orderBy: [{ examId: "asc" }, { questionNumber: "asc" }],
  });
  writeFileSync(out, JSON.stringify(rows, null, 1), "utf8");
  const by: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const k = r.examId ?? "?";
    by[k] = by[k] ?? {};
    by[k][r.solutionSource] = (by[k][r.solutionSource] ?? 0) + 1;
  }
  console.log(`${rows.length}행`, JSON.stringify(by));
  await db.$disconnect();
}
main();
