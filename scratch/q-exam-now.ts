import { db } from "@/lib/db";
async function main() {
  const exams = await db.exam.findMany({
    select: { id: true, _count: { select: { questions: true } } },
    orderBy: { id: "asc" },
  });
  console.log(`Exam 행 ${exams.length}개`);
  for (const e of exams) console.log(`  ${e.id} · 문항 ${e._count.questions}`);
  const withExam = await db.problem.count({ where: { examId: { not: null } } });
  const bySource = await db.problem.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  console.log(`\nexamId 가 붙은 Problem ${withExam}행`);
  console.log(
    "출처별:",
    bySource.map((r) => `${r.source} ${r._count._all}`).join(" · "),
  );
  await db.$disconnect();
}
main();
