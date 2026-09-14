import { db } from "@/lib/db";
async function main() {
  const rows = await db.problem.findMany({
    where: { source: "past_exam" },
    orderBy: { questionNumber: "asc" },
    select: {
      problemCode: true,
      questionNumber: true,
      school: true,
      subject: true,
      examId: true,
      sourceFile: true,
      externalId: true,
      score: true,
    },
    take: 3,
  });
  console.log("=== Problem 기출 행 (앞 3) ===");
  for (const r of rows) console.log(JSON.stringify(r));
  const distinct = await db.problem.groupBy({
    by: ["school", "subject", "examId"],
    where: { source: "past_exam" },
    _count: { _all: true },
  });
  console.log("\n=== 기출 19행의 school/subject/examId 조합 ===");
  for (const d of distinct) console.log(JSON.stringify(d));
  const exam = await db.exam.findFirst();
  console.log("\n=== Exam 행 ===\n" + JSON.stringify(exam, null, 1));
  // 본문·해설에 학교 이름이 남았나 (CHECK ㉣ 가 걷었다고 적은 것)
  const leak = await db.problem.count({
    where: {
      source: "past_exam",
      OR: [
        { content: { contains: "정화" } },
        { solution: { contains: "정화" } },
      ],
    },
  });
  console.log(`\n본문·해설에 「정화」: ${leak}행`);
  await db.$disconnect();
}
main();
