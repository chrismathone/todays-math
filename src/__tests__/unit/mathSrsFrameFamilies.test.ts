// @vitest-environment node
import { expect, it } from "vitest";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";
import {
  courseProblemFrame,
  generateCourseSession,
} from "@/lib/math-srs/elementary/generator";

it("counts mathematical targets rather than place names or nouns as new families", () => {
  for (const [id, tier] of [
    ["5-2-1-6", "기본"],
    ["5-2-2-3", "기본"],
    ["5-2-4-7", "응용"],
  ] as const) {
    const families = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const p = generateCourseEngineRedraw(
        getCourseSection(id)!.unit,
        seed * 7919,
        tier,
      );
      families.add(
        id === "5-2-1-6"
          ? /차를/.test(p.content)
            ? "change"
            : /자리 숫자/.test(p.content)
              ? "digit"
              : "rounding"
          : id === "5-2-2-3"
            ? /분자는/.test(p.content)
              ? "numerator"
              : /분모는/.test(p.content)
                ? "denominator"
                : "quantity"
            : /차를/.test(p.content)
              ? "difference"
              : /소수점을/.test(p.content)
                ? "shift"
                : "composition",
      );
    }
    expect(families.size, id).toBe(3);
  }
});

it("keeps three-mixed-number arithmetic from repeating the calculation slot", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const session = generateCourseSession(
      "5-1-5-2",
      seed * 104729,
      new Date("2026-10-20T00:00:00Z"),
    );
    expect(
      new Set(session.problems.map((p) => courseProblemFrame(p.content))).size,
      `seed ${seed}`,
    ).toBe(5);
  }
});
