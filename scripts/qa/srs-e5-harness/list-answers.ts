// Which self-check problems are numeric lists, and what does the question ask (all / in order)?
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import {
  needsComparison,
  parseCourseAnswerQuantity,
} from "@/lib/math-srs/elementary/answers";

const grades = (process.argv[2] ?? "5").split(",").map(Number);
const seeds = Number(process.argv[3] ?? 30);
let total = 0;
let selfCheck = 0;
const kinds: Record<string, number> = {};
const sections: Record<string, Record<string, number>> = {};
const samples: Record<string, Set<string>> = {};
const strip = (answer: string) =>
  answer
    .replace(/\$/g, "")
    .replace(/\\[,;! ]/g, " ")
    .replace(/\{,\}/g, "")
    .trim();
for (const s of COURSE_SECTIONS.filter((x) => grades.includes(x.grade))) {
  for (let seed = 1; seed <= seeds; seed++) {
    const session = generateCourseSession(
      s.id,
      seed * 104729,
      new Date(),
      "learn",
      [],
    );
    for (const p of session.problems) {
      total++;
      if (p.input.mode !== "self-check" || needsComparison(p)) continue;
      selfCheck++;
      const text = strip(p.answer);
      const parts = text.split(/\s*[,，、]\s*/).filter(Boolean);
      const numeric =
        parts.length > 1 && parts.every((x) => parseCourseAnswerQuantity(x));
      const ask = /차례로|순서대로/.test(p.content)
        ? "차례로"
        : /모두|전부/.test(p.content)
          ? "모두"
          : "그 밖";
      const kind = numeric ? `목록 · ${ask}` : "목록 아님";
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      if (numeric) {
        (sections[s.id] ??= {})[ask] = (sections[s.id]?.[ask] ?? 0) + 1;
      }
      const set = (samples[kind] ??= new Set());
      if (set.size < 14)
        set.add(
          `${s.id} | ${p.content.replace(/\s+/g, " ").slice(0, 80)} => ${p.answer.slice(0, 50)}`,
        );
    }
  }
}
console.log({ total, selfCheck, kinds });
console.log(sections);
for (const [k, v] of Object.entries(samples))
  console.log(`\n## ${k}\n${[...v].join("\n")}`);
