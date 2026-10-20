// @vitest-environment node
/**
 * Reader floor (2026-10-20): the screen now sends the saved figure's fingerprint,
 * and the route answers 404 when no regenerated candidate matches. Sessions the
 * deployed generator already saved went through JSON (the student record), so
 * their figures must still match after that round trip, or every figure is lost.
 */
import { expect, it, vi } from "vitest";
import { GET as figure } from "@/app/lab/math-srs/figure/route";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { courseFigureFingerprint } from "@/lib/math-srs/elementary/figureFingerprint";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import type { CourseSession } from "@/lib/math-srs/elementary/types";

vi.mock("@/lib/figure/renderFigureSpec", () => ({
  renderFigureSpec: vi.fn(async (spec: Record<string, unknown>) => ({
    ok: true,
    svg: `<svg data-spec="${courseFigureFingerprint(spec)}"/>`,
  })),
}));

const NOW = new Date("2026-10-20T01:00:00.000Z");

it("figures of a saved session still load by fingerprint after a JSON round trip", async () => {
  let figures = 0;
  for (const section of COURSE_SECTIONS)
    for (const seed of [1, 99, 4242]) {
      const saved = JSON.parse(
        JSON.stringify(generateCourseSession(section.id, seed, NOW)),
      ) as CourseSession;
      for (const problem of saved.problems) {
        if (!problem.figureSpec) continue;
        figures++;
        const spec = courseFigureFingerprint(problem.figureSpec);
        const query = new URLSearchParams({
          sectionId: problem.sectionId,
          seed: String(problem.seed),
          tier: problem.tier,
          spec,
        });
        const response = await figure(
          new Request(`http://localhost/lab/math-srs/figure?${query}`),
        );
        expect(response.status, problem.id).toBe(200);
        expect(await response.text(), problem.id).toBe(
          `<svg data-spec="${spec}"/>`,
        );
      }
    }
  expect(figures).toBeGreaterThan(100);
});
