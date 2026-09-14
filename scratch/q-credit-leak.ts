// 적재된 기출 행에 원고 작업자 이름(워드:·오검:·완료:)이 남았나 — 읽기만 한다.
//   npx tsx scratch/q-credit-leak.ts
import { db } from "@/lib/db";
async function main() {
  const rows = await db.problem.findMany({
    where: {
      examId: { not: null },
      OR: [
        { content: { contains: "워드" } },
        { content: { contains: "오검" } },
        { solution: { contains: "워드" } },
        { solution: { contains: "오검" } },
      ],
    },
    select: {
      examId: true,
      questionNumber: true,
      content: true,
      solution: true,
    },
  });
  const all = await db.problem.count({ where: { examId: { not: null } } });
  console.log(`기출 행 ${all} 중 작업자 낱말이 든 행 ${rows.length}`);
  for (const r of rows) {
    const t = `${r.content}\n${r.solution ?? ""}`;
    const i = Math.max(t.indexOf("워드"), t.indexOf("오검"));
    console.log(
      `  ${r.examId} 문${r.questionNumber}: …${t.slice(Math.max(0, i - 20), i + 40).replace(/\s+/g, " ")}…`,
    );
  }
  await db.$disconnect();
}
main().catch((e) => {
  console.error(String(e).slice(0, 300));
  process.exit(1);
});
