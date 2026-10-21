// 초5 소단원마다 실제 회차(은행 후보 + 엔진)를 지어, «스스로 평가» 문제와 보기 문제가 몇 개 나오는지 센다 — 로컬 DB 만.
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { loadCourseBankCandidates } from "@/lib/math-srs/courseBank";
import { db } from "@/lib/db";

async function main() {
  if (!process.env.DATABASE_URL?.includes("127.0.0.1:54335"))
    throw new Error("local only");
  const grade = Number(process.argv[2] ?? 5);
  let total = 0,
    self = 0,
    choice = 0,
    typed = 0,
    sessionsWithSelf = 0,
    sessions = 0;
  const bySection: string[] = [];
  for (const s of COURSE_SECTIONS.filter((x) => x.grade === grade)) {
    const candidates = await loadCourseBankCandidates(s.id);
    let secSelf = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const session = generateCourseSession(
        s.id,
        seed * 7919,
        new Date(),
        "learn",
        candidates,
      );
      sessions++;
      let has = false;
      for (const p of session.problems) {
        total++;
        const mode = p.input.mode;
        if (mode === "self-check") {
          self++;
          secSelf++;
          has = true;
        } else if ((p as { choices?: unknown[] }).choices?.length) choice++;
        else typed++;
      }
      if (has) sessionsWithSelf++;
    }
    if (secSelf) bySection.push(`${s.id} ${s.title}: ${secSelf}/100`);
  }
  console.log({ total, self, choice, typed, sessions, sessionsWithSelf });
  console.log(bySection.join("\n"));
  await db.$disconnect();
}
main();
