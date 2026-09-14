import { db } from "../src/lib/db";
async function main() {
  const [exams, questions, runs] = await Promise.all([
    db.exam.count(),
    db.examQuestion.count(),
    db.predictionRun.count(),
  ]);
  console.log(
    `Exam ${exams} · ExamQuestion ${questions} · PredictionRun ${runs}`,
  );
  if (exams > 0) {
    const rows = await db.exam.findMany({
      select: {
        school: true,
        grade: true,
        subject: true,
        year: true,
        semester: true,
        round: true,
      },
      take: 2000,
    });
    const series = new Map<string, number>();
    for (const r of rows) {
      const k = `${r.school} · ${r.grade} · ${r.subject}`;
      series.set(k, (series.get(k) ?? 0) + 1);
    }
    console.log(`시리즈 ${series.size}종 (표본 ${rows.length}편)`);
    [...series.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([k, n]) =>
        console.log(`   ${n.toString().padStart(4)}편  ${k}`),
      );
  }
  await db.$disconnect();
}
void main();
