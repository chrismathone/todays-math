import { db } from "@/lib/db";
async function main() {
  const exams = await db.exam.findMany({
    select: {
      id: true,
      externalExamId: true,
      school: true,
      grade: true,
      year: true,
      semester: true,
      round: true,
      totalScore: true,
      questionCount: true,
    },
  });
  console.log("시험지", exams.length);
  for (const e of exams) console.log(" ", JSON.stringify(e));
  const pick = [
    ["2025-jeonghwa-3-2-mid", 3],
    ["2025-dongdo-3-2-mid", 1],
    ["2025-dongdo-3-2-mid", 10],
    ["2025-gangdong-3-2-mid", 16],
    ["2025-gyeongsanyeo-3-2-mid", 26],
  ] as const;
  for (const [examId, n] of pick) {
    const p = await db.problem.findFirst({
      where: { examId, questionNumber: n },
      select: {
        id: true,
        problemCode: true,
        school: true,
        score: true,
        questionType: true,
        difficulty: true,
      },
    });
    console.log(examId, n, JSON.stringify(p));
  }
  const eng = await db.problem.findFirst({
    where: {
      source: "manual",
      reviewStatus: "approved",
      directUseAllowed: true,
      familyKey: { startsWith: "mid:3-2|삼각비" },
    },
    select: { id: true, problemCode: true, source: true },
  });
  console.log("엔진 표본", JSON.stringify(eng));
  const scores = await db.problem.groupBy({
    by: ["score"],
    where: { source: "past_exam" },
    _count: { _all: true },
  });
  console.log(
    "배점 분포",
    scores.map((s) => `${s.score}:${s._count._all}`).join(" "),
  );
  await db.$disconnect();
}
main();
