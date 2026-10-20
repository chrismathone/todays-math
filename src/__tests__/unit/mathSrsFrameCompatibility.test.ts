// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { courseLearnerSchema } from "@/lib/math-srs/elementary/progress";
import { generateElementaryProblem } from "@/lib/elementary/generate";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

it("round-trips new frames through the unchanged stored-session reader without a new field", () => {
  const problemKeys = new Set([
    "id",
    "sectionId",
    "tier",
    "seed",
    "content",
    "answer",
    "solution",
    "figureSpec",
    "input",
    "answerChoices",
    "interactive",
  ]);
  for (const section of COURSE_SECTIONS.filter((s) => s.grade === 5))
    for (const seed of [1, 104729, 4294967295]) {
      const session = generateCourseSession(
        section.id,
        seed,
        new Date("2026-10-20T00:00:00Z"),
      );
      const stored = JSON.parse(
        JSON.stringify({
          selectedSectionId: section.id,
          progress: {},
          session,
        }),
      );
      const parsed = courseLearnerSchema.safeParse(stored);
      expect(
        parsed.success,
        parsed.success ? section.id : JSON.stringify(parsed.error.issues),
      ).toBe(true);
      if (!parsed.success) continue;
      expect(JSON.stringify(parsed.data)).toBe(JSON.stringify(stored));
      for (const p of parsed.data.session!.problems) {
        expect(
          Object.keys(p).every((key) => problemKeys.has(key)),
          p.content,
        ).toBe(true);
        const legacy = generateElementaryProblem(section.unit, p.seed, p.tier);
        const source =
          legacy.content === p.content
            ? legacy
            : generateCourseEngineRedraw(section.unit, p.seed, p.tier);
        expect(source.content).toBe(p.content);
        expect(JSON.stringify(source.figureSpec)).toBe(
          JSON.stringify(p.figureSpec),
        );
      }
    }
});
