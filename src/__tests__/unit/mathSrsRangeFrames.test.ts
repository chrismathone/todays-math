// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";
import {
  getCourseProblemInput,
  gradeCourseAnswer,
} from "@/lib/math-srs/elementary/answers";

// Solve the printed question. Enumerate admissible numbers instead of reusing
// the generator's closed-form counts, rounding helpers or RNG assumptions.
function solve(content: string): string {
  const math = [...content.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
  const values = math.flatMap((m) => m.match(/\d+(?:\.\d+)?/g)!.map(Number));
  const [a, b] = values;
  if (/^\$\d+\$의 일의 자리 숫자/.test(content))
    return String(Number(String(a).at(-1)));
  const pool = math
    .find((m) => m.includes(","))
    ?.match(/\d+/g)
    ?.map(Number);
  if (content.includes("배송 요금")) {
    const [edge, low, high] = values;
    const fee = (weight: number) => (weight <= edge ? low : high);
    if (content.includes("줄었"))
      return String(fee(values[3]) - fee(values[3] - values[4]));
    const [, , , w1, c1, w2, c2] = values;
    return String(
      Array.from({ length: c1 }, () => fee(w1))
        .concat(Array.from({ length: c2 }, () => fee(w2)))
        .reduce((x, y) => x + y, 0),
    );
  }
  if (content.includes("택배 요금")) {
    const [e1, f1, , e2, f2, , f3, weight] = values;
    return String(weight <= e1 ? f1 : weight <= e2 ? f2 : f3);
  }
  if (/올림|버림|반올림/.test(content)) {
    const place = /천의 자리까지/.test(content)
      ? 1000
      : /백의 자리까지/.test(content)
        ? 100
        : 10;
    const rounded = (x: number, p: number) => {
      const multiples = Array.from(
        { length: Math.ceil((x + p) / p) + 1 },
        (_, i) => i * p,
      );
      if (content.includes("반올림"))
        return multiples.reduce((best, v) =>
          Math.abs(v - x) <= Math.abs(best - x) ? v : best,
        );
      return content.includes("올림")
        ? multiples.find((v) => v >= x)!
        : multiples.filter((v) => v <= x).at(-1)!;
    };
    if (content.includes("어떤 자연수")) {
      const possible = Array.from(
        { length: a + place + 1 },
        (_, i) => i,
      ).filter((v) => v > 0 && rounded(v, place) === a);
      return String(
        content.includes("가장 작은") ? possible[0] : possible.at(-1),
      );
    }
    if (/일의 자리 숫자|바로 아래 자리 숫자/.test(content))
      return String(Number(String(a).at(-1)));
    if (content.includes("천의 자리 숫자"))
      return String(Number(String(rounded(a, place)).padStart(4, "0").at(-4)));
    if (content.includes("십의 자리까지 나타낸 수와 백의"))
      return String(Math.abs(rounded(a, 10) - rounded(a, 100)));
    if (/차를|더해지는|버려지는/.test(content))
      return String(Math.abs(rounded(a, place) - a));
    if (content.includes("소수 첫째"))
      return String(rounded(Math.round(a * 100), 10) / 100);
    return String(rounded(a, place));
  }
  if (content.includes("담")) {
    const bundles = Array.from({ length: a + 1 }, (_, i) => i);
    return String(
      content.includes("모두 담으려면")
        ? bundles.find((v) => v * b >= a)
        : bundles.filter((v) => v * b <= a).at(-1)! * b,
    );
  }
  if (pool && content.includes("가장 큰 값"))
    return String([...pool].sort((x, y) => y - x)[0]);
  if (pool && !math[0].includes(",")) {
    const passing = pool.filter((v) =>
      content.includes("초과여야") ? v > a : v >= a,
    );
    if (content.includes("맞지 않는"))
      return String(pool.filter((v) => v < a).length);
    if (content.includes("개수의 차") || content.includes("수의 차"))
      return String(pool.filter((v) => v === a).length);
    if (content.includes("가장 작은"))
      return String([...passing].sort((x, y) => x - y)[0]);
    return String(passing.length);
  }
  if (pool) {
    const rest = values.slice(pool.length);
    const hit = pool.filter((v) => {
      if (content.includes("초과"))
        return v > rest[0] && (rest.length < 2 || v < rest[1]);
      if (content.includes("미만")) return v < rest[0];
      if (content.includes("이하") && rest.length === 1) return v <= rest[0];
      return v >= rest[0] && (rest.length < 2 || v <= rest[1]);
    });
    if (content.includes("가장 큰"))
      return String([...hit].sort((x, y) => y - x)[0]);
    return content.includes("모두 쓰시오")
      ? hit.join(", ")
      : String(hit.length);
  }
  const integers = Array.from({ length: (b ?? a) + 2 }, (_, i) => i).filter(
    (v) => v > 0,
  );
  if (content.includes("가장 작은"))
    return String(
      integers.find((v) => (content.includes("초과") ? v > a : v >= a)),
    );
  if (content.includes("가장 큰"))
    return String(integers.filter((v) => v < a).at(-1));
  const closed = integers.filter((v) => v >= a && v <= b);
  const open = integers.filter((v) => v > a && v < b);
  if (content.includes("개수의 차")) return String(closed.length - open.length);
  const hits = content.includes("초과") ? open : closed;
  if (content.includes("짝수"))
    return String(hits.filter((v) => v % 2 === 0).length);
  if (content.includes("배수"))
    return String(hits.filter((v) => v % values[2] === 0).length);
  return String(hits.length);
}

it("recalculates each new range redraw from its question by enumeration", () => {
  for (const s of COURSE_SECTIONS.filter((s) => s.chapterId === "5-2-1"))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const p = generateCourseEngineRedraw(s.unit, seed * 7919, tier);
        const expected = solve(p.content);
        const q = {
          ...p,
          id: "probe",
          sectionId: s.id,
          tier,
          seed,
          input: getCourseProblemInput(p),
        };
        expect(
          gradeCourseAnswer(q, expected),
          `${s.id} ${p.content} -> ${expected} / ${p.answer}`,
        ).toBe(true);
      }
});
