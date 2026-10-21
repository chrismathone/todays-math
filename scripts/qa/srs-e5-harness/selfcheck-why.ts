// 초3~초6 엔진 회차에서 self-check 가 생기는 까닭을 가른다 — DB 없음(엔진만).
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import {
  needsComparison,
  parseCourseAnswerQuantity,
} from "@/lib/math-srs/elementary/answers";

const grades = (process.argv[2] ?? "5").split(",").map(Number);
const why: Record<string, number> = {};
const samples: Record<string, string[]> = {};
let total = 0;
for (const s of COURSE_SECTIONS.filter((x) => grades.includes(x.grade))) {
  for (let seed = 1; seed <= 30; seed++) {
    const session = generateCourseSession(
      s.id,
      seed * 104729,
      new Date(),
      "learn",
      [],
    );
    for (const p of session.problems) {
      total++;
      if (p.input.mode !== "self-check") continue;
      const parts = p.answer.split(/\s*[,，、]\s*/).filter(Boolean);
      const kind = needsComparison(p)
        ? "표기 · 설명 요구(needsComparison)"
        : parts.length > 1 && parts.every((x) => parseCourseAnswerQuantity(x))
          ? "여러 수(쉼표)"
          : "그 밖(한 값으로 못 읽음)";
      why[kind] = (why[kind] ?? 0) + 1;
      (samples[kind] ??= []).length < 6 &&
        samples[kind].push(
          `${s.id} | ${p.content.replace(/\s+/g, " ").slice(0, 70)} => ${p.answer.slice(0, 40)}`,
        );
    }
  }
}
console.log({ total, why });
for (const [k, v] of Object.entries(samples))
  console.log(`\n## ${k}\n${v.join("\n")}`);
