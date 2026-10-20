// @vitest-environment node
/**
 * Plan §3.5: a grade-5 session has two 기본 and two 응용 slots, and 71% of engine
 * sessions asked the same frame twice (numbers changed only). A slot whose frame
 * repeats an earlier one is redrawn with another engine seed; the stored seed is
 * the one used. The figure route selects an engine candidate by seed + saved-spec fingerprint.
 */
import { describe, expect, it, vi } from "vitest";
import { GET as figure } from "@/app/lab/math-srs/figure/route";
import { courseFigureCandidates } from "@/lib/math-srs/elementary/courseFigureCandidates";
import { courseFigureFingerprint } from "@/lib/math-srs/elementary/figureFingerprint";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import {
  courseProblemFrame,
  COURSE_FRAME_REDRAWS,
  generateCourseSession,
} from "@/lib/math-srs/elementary/generator";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

const NOW = new Date("2026-10-20T01:00:00.000Z");
const grade5 = COURSE_SECTIONS.filter((section) => section.grade === 5);
vi.mock("@/lib/figure/renderFigureSpec", () => ({
  renderFigureSpec: vi.fn(async (spec: Record<string, unknown>) => ({
    ok: true,
    svg: `<svg data-spec="${courseFigureFingerprint(spec)}"/>`,
  })),
}));

describe("한 회차 안에서 같은 틀을 되풀이하지 않는다", () => {
  it("숫자만 다른 같은 문장은 같은 틀이다", () => {
    expect(
      courseProblemFrame("버스에 $12$명이 타고 있었습니다. 지금 몇 명입니까?"),
    ).toBe(
      courseProblemFrame("버스에 $7$명이 타고 있었습니다. 지금 몇 명입니까?"),
    );
  });

  it("새 재추첨 틀을 사용한 초5 회차에는 중복이 없다", () => {
    for (const section of grade5)
      for (let seed = 1; seed <= 12; seed++) {
        const session = generateCourseSession(section.id, seed * 104729, NOW);
        const frames: string[] = [];
        for (const [index, problem] of session.problems.entries()) {
          const frame = courseProblemFrame(problem.content);
          if (frames.includes(frame)) {
            const slotSeed =
              (((seed * 104729) >>> 0) + Math.imul(index + 1, 104729)) >>> 0;
            for (let k = 1; k <= COURSE_FRAME_REDRAWS; k++)
              expect(frames).toContain(
                courseProblemFrame(
                  generateCourseEngineRedraw(
                    section.unit,
                    (slotSeed + k * 7919) >>> 0,
                    problem.tier,
                  ).content,
                ),
              );
          }
          frames.push(frame);
        }
        // Baseline 740/1,680; first expansion 2/1,680. The final mixed-addition frame removes those two.
        expect(new Set(frames).size, `${section.id}:${seed}`).toBe(5);
      }
  });

  it("저장한 본문과 그림이 후보에 있고 라우트가 그 그림을 고른다", async () => {
    let redrawFigures = 0;
    for (const section of grade5)
      for (const seed of [1, 99, 4242]) {
        const session = generateCourseSession(section.id, seed, NOW);
        for (const problem of session.problems) {
          const candidates = courseFigureCandidates(
            section.unit,
            problem.seed,
            problem.tier,
          );
          const again = candidates.find(
            (candidate) => candidate.content === problem.content,
          )!;
          expect(again).toBeDefined();
          expect(problem.content).toBe(again.content);
          expect(problem.answer).toBe(again.answer);
          expect(problem.figureSpec).toEqual(again.figureSpec);
          if (problem.figureSpec) {
            if (candidates[0].content !== problem.content) redrawFigures++;
            const spec = courseFigureFingerprint(problem.figureSpec);
            const query = new URLSearchParams({
              sectionId: section.id,
              seed: String(problem.seed),
              tier: problem.tier,
              spec,
            });
            const response = await figure(
              new Request(`http://localhost/lab/math-srs/figure?${query}`),
            );
            expect(response.status).toBe(200);
            expect(await response.text()).toBe(`<svg data-spec="${spec}"/>`);
          }
          expect(problem.id).toBe(
            `${section.id}:${problem.seed}:${problem.tier}`,
          );
        }
        expect(new Set(session.problems.map((p) => p.id)).size).toBe(5);
      }
    expect(redrawFigures).toBeGreaterThan(0);
  });

  it("같은 입력이면 같은 회차", () => {
    expect(generateCourseSession("5-1-1-1", 7, NOW)).toEqual(
      generateCourseSession("5-1-1-1", 7, NOW),
    );
  });
});
