// How often does a grade-5 session repeat the same problem template (numbers stripped)?
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";

const seeds = Number(process.argv[2] ?? 30);
const shape = (content: string) =>
  content
    .replace(/\$[^$]*\$/g, "#")
    .replace(/\d+/g, "#")
    .replace(/[㉠-㉣]/g, "@")
    .replace(/\s+/g, " ")
    .trim();
let sessions = 0;
let withRepeat = 0;
let adjacent = 0;
let nextDaySame = 0;
const worst: Record<string, number> = {};
const samples: string[] = [];
for (const s of COURSE_SECTIONS.filter((x) => x.grade === 5)) {
  let previous: string[] | null = null;
  for (let seed = 1; seed <= seeds; seed++) {
    const session = generateCourseSession(
      s.id,
      seed * 104729,
      new Date(),
      "learn",
      [],
    );
    const shapes = session.problems.map((p) => shape(p.content));
    sessions++;
    const repeated = shapes.length - new Set(shapes).size;
    if (repeated) {
      withRepeat++;
      worst[s.id] = (worst[s.id] ?? 0) + 1;
      if (samples.length < 8)
        samples.push(
          `${s.id} | ${session.problems.map((p) => p.tier).join(",")} | ${shapes.join(" ¦ ").slice(0, 220)}`,
        );
    }
    if (shapes.some((v, i) => i > 0 && v === shapes[i - 1])) adjacent++;
    if (previous && shapes.filter((v) => previous!.includes(v)).length >= 3)
      nextDaySame++;
    previous = shapes;
  }
}
console.log({
  sessions,
  withRepeat,
  adjacent,
  nextDaySameAtLeast3: nextDaySame,
});
console.log(
  Object.entries(worst)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15),
);
console.log(samples.join("\n"));
