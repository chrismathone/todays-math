// 초5 회차의 보기 네 개 가운데 «정답과 크기가 동떨어진» 오답이 얼마나 되는지 — 로컬 DB(은행 후보) + 엔진.
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { loadCourseBankCandidates } from "@/lib/math-srs/courseBank";
import { db } from "@/lib/db";

const valueOf = (raw: string): number | null => {
  const t = raw
    .trim()
    .replace(/^\$(.*)\$$/, "$1")
    .replace(/\s*[A-Za-z가-힣²³°%]+$/, "");
  const frac =
    /^\\(?:dfrac|tfrac|frac)\{(\d+)\}\{(\d+)\}$/.exec(t) ??
    /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
// 동떨어짐: 정답이 1 이상일 때 세 배 넘게 크거나 3분의 1 보다 작다
const far = (answer: number, other: number) =>
  answer >= 1 && other > 0 && (other / answer > 3 || other / answer < 1 / 3);

async function main() {
  if (!process.env.DATABASE_URL?.includes("127.0.0.1:54335"))
    throw new Error("local only");
  const grade = Number(process.argv[2] ?? 5);
  let sets = 0,
    setsWithFar = 0,
    farChoices = 0,
    choiceProblems = 0,
    problems = 0;
  const samples: string[] = [];
  for (const s of COURSE_SECTIONS.filter((x) => x.grade === grade)) {
    const cands = await loadCourseBankCandidates(s.id);
    for (let seed = 1; seed <= 20; seed++) {
      const session = generateCourseSession(
        s.id,
        seed * 7919,
        new Date(),
        "learn",
        cands,
      );
      for (const p of session.problems) {
        problems++;
        if (!p.answerChoices) continue;
        choiceProblems++;
        sets++;
        const a = valueOf(p.answer);
        if (a === null) continue;
        const bad = p.answerChoices.filter(
          (c) =>
            c !== p.answer &&
            (() => {
              const v = valueOf(c);
              return v !== null && far(a, v);
            })(),
        );
        if (bad.length) {
          setsWithFar++;
          farChoices += bad.length;
          if (samples.length < 12)
            samples.push(
              `${s.id} | ${p.content.replace(/\s+/g, " ").slice(0, 60)} | 답 ${p.answer} | 보기 ${p.answerChoices.join(" · ")}`,
            );
        }
      }
    }
  }
  console.log({
    problems,
    choiceProblems,
    sets,
    setsWithFar,
    ratio: (setsWithFar / sets).toFixed(3),
    farChoices,
  });
  console.log(samples.join("\n"));
  await db.$disconnect();
}
main();
