import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
const modes: Record<string, number> = {};
for (const s of COURSE_SECTIONS.filter((x) => x.grade === 5))
  for (let seed = 1; seed <= 30; seed++)
    for (const p of generateCourseSession(
      s.id,
      seed * 104729,
      new Date(),
      "learn",
      [],
    ).problems)
      modes[p.input.mode] = (modes[p.input.mode] ?? 0) + 1;
console.log(modes);
