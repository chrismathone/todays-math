// Prototype: re-draw a slot whose frame matches an earlier slot (numbers stripped, bigram Dice).
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateElementaryProblem } from "@/lib/elementary/generate";

const TIERS = ["연산", "기본", "기본", "응용", "응용"] as const;
const shape = (c: string) =>
  c
    .replace(/\$[^$]*\$/g, "#")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
function dice(a: string, b: string) {
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++)
      m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const x = grams(a),
    y = grams(b);
  let both = 0;
  for (const [g, n] of x) both += Math.min(n, y.get(g) ?? 0);
  const total = Math.max(1, a.length - 1 + b.length - 1);
  return (2 * both) / total;
}
const threshold = Number(process.argv[2] ?? 0.75);
const tries = Number(process.argv[3] ?? 8);
let before = 0,
  after = 0,
  sessions = 0,
  redraws = 0;
for (const s of COURSE_SECTIONS.filter((x) => x.grade === 5)) {
  for (let seed = 1; seed <= 30; seed++) {
    const base = seed * 104729;
    sessions++;
    const plain: string[] = [];
    const varied: string[] = [];
    TIERS.forEach((tier, index) => {
      const ps = ((base >>> 0) + Math.imul(index + 1, 104729)) >>> 0;
      const p = shape(generateElementaryProblem(s.unit, ps, tier).content);
      plain.push(p);
      let chosen = p;
      for (
        let k = 1;
        k <= tries && varied.some((v) => dice(v, chosen) >= threshold);
        k++
      ) {
        chosen = shape(
          generateElementaryProblem(s.unit, (ps + k * 7919) >>> 0, tier)
            .content,
        );
        redraws++;
      }
      varied.push(chosen);
    });
    const same = (list: string[]) =>
      list.some((v, i) =>
        list.slice(0, i).some((w) => dice(v, w) >= threshold),
      );
    if (same(plain)) before++;
    if (same(varied)) after++;
  }
}
console.log({
  threshold,
  tries,
  sessions,
  framesRepeatBefore: before,
  framesRepeatAfter: after,
  redraws,
});
