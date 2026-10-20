// @vitest-environment node
/**
 * Plan §3.5: a grade-5 session has two 기본 and two 응용 slots, and 71% of engine
 * sessions asked the same frame twice (numbers changed only). A slot whose frame
 * repeats an earlier one is redrawn with another engine seed; the stored seed is
 * the one used, so the engine reproduces the problem (and its figure) exactly.
 */
import { describe, expect, it } from "vitest";
import { generateElementaryProblem } from "@/lib/elementary/generate";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import {
  COURSE_FRAME_REDRAWS,
  courseProblemFrame,
  generateCourseSession,
} from "@/lib/math-srs/elementary/generator";

const NOW = new Date("2026-10-20T01:00:00.000Z");
const grade5 = COURSE_SECTIONS.filter((section) => section.grade === 5);

describe("한 회차 안에서 같은 틀을 되풀이하지 않는다", () => {
  it("숫자만 다른 같은 문장은 같은 틀이다", () => {
    expect(
      courseProblemFrame("버스에 $12$명이 타고 있었습니다. 지금 몇 명입니까?"),
    ).toBe(
      courseProblemFrame("버스에 $7$명이 타고 있었습니다. 지금 몇 명입니까?"),
    );
  });

  it("되풀이는 다른 틀을 뽑을 수 없을 때만 남는다", () => {
    let repeats = 0;
    for (const section of grade5)
      for (let seed = 1; seed <= 12; seed++) {
        const session = generateCourseSession(section.id, seed * 104729, NOW);
        const seen: string[] = [];
        for (const problem of session.problems) {
          const frame = courseProblemFrame(problem.content);
          if (seen.includes(frame)) {
            repeats++;
            // Every alternative the generator could try gives an earlier frame too.
            for (let k = 1; k <= COURSE_FRAME_REDRAWS; k++) {
              const other = generateElementaryProblem(
                section.unit,
                (problem.seed + k * 7919) >>> 0,
                problem.tier,
              );
              expect(seen).toContain(courseProblemFrame(other.content));
            }
          }
          seen.push(frame);
        }
      }
    // Measured 2026-10-20: about 44% of sessions still repeat (single-frame slots).
    expect(repeats).toBeGreaterThan(0);
  });

  it("다시 뽑은 문제도 저장한 씨앗으로 엔진이 그대로 다시 만든다", () => {
    for (const section of grade5.slice(0, 20))
      for (const seed of [1, 99, 4242]) {
        const session = generateCourseSession(section.id, seed, NOW);
        for (const problem of session.problems) {
          const again = generateElementaryProblem(
            section.unit,
            problem.seed,
            problem.tier,
          );
          expect(problem.content).toBe(again.content);
          expect(problem.id).toBe(
            `${section.id}:${problem.seed}:${problem.tier}`,
          );
        }
        expect(new Set(session.problems.map((p) => p.id)).size).toBe(5);
      }
  });

  it("같은 입력이면 같은 회차", () => {
    expect(generateCourseSession("5-1-1-1", 7, NOW)).toEqual(
      generateCourseSession("5-1-1-1", 7, NOW),
    );
  });
});
