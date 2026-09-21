import { describe, expect, it } from "vitest";

import { COURSES } from "@/lib/lab/courses";
import { implementationSummary, units } from "@/lib/lab/curriculum";

describe("교육과정 범위", () => {
  it("71개 주요 단원을 넘기지 않고, 열린 코스만 수업으로 표시한다", () => {
    const all = units();
    expect(all).toHaveLength(71);
    expect(COURSES.map((c) => c.id)).toEqual([
      "number",
      "measure",
      "clock",
      "calc",
      "pattern",
      "fraction",
      "shape",
      "data",
      "area",
      "space",
      "volume",
      "ratio",
    ]);
    const summary = implementationSummary();
    expect(summary.implemented).toBe(57);
    expect(summary.partial).toBe(0);
    expect(
      summary.implemented + summary.partial + summary.hold + summary.excluded,
    ).toBe(71);
  });

  it("코스마다 회상·조작·적용·오류 찾기가 있다", () => {
    for (const course of COURSES) {
      const kinds = new Set(course.activities.map((a) => a.kind));
      expect(kinds.has("recall") || kinds.has("predict")).toBe(true);
      expect(kinds.has("manipulate") || kinds.has("observe")).toBe(true);
      expect(kinds.has("apply")).toBe(true);
      expect(kinds.has("error-hunt") || kinds.has("reason")).toBe(true);
      expect(course.activities.length).toBeGreaterThanOrEqual(12);
    }
  });

  it("학생 문구에 개발 용어를 넣지 않는다", () => {
    const banned = /TODO|WIP|구현|엔진|GLB|JSON|placeholder/i;
    for (const course of COURSES) {
      for (const activity of course.activities) {
        expect(activity.title).not.toMatch(banned);
        expect(activity.intro).not.toMatch(banned);
        expect(activity.success).not.toMatch(banned);
      }
    }
  });
});
