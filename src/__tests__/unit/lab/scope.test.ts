import { describe, expect, it } from "vitest";

import { COURSES } from "@/lib/lab/courses";
import { implementationSummary, units } from "@/lib/lab/curriculum";
import { LAB_SCOPE, labScopeById, scopeSummary } from "@/lib/lab/scope";
import raw from "@/lib/lab/units.json";

describe("실험실 단원 문지기", () => {
  it("71개 단원마다 판정이 있고 겹치지 않는다", () => {
    const ids = (raw.units as { id: string }[]).map((u) => u.id);
    expect(ids).toHaveLength(71);
    expect(LAB_SCOPE.map((r) => r.unitId).sort()).toEqual([...ids].sort());
    expect(new Set(LAB_SCOPE.map((r) => r.unitId)).size).toBe(71);
  });

  it("열린 코스에 제외 단원을 넣지 않는다", () => {
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
    const byId = labScopeById();
    for (const course of COURSES) {
      for (const id of course.unitIds) {
        expect(byId[id]?.gate, `${course.id} ${id}`).toBe("play");
      }
    }
    const playIds = LAB_SCOPE.filter((r) => r.gate === "play").map(
      (r) => r.unitId,
    );
    const inCourses = new Set(COURSES.flatMap((c) => c.unitIds));
    expect([...playIds].sort()).toEqual([...inCourses].sort());
  });

  it("실물·숙달·자료수집을 빼면 수업 단원보다 제외가 많다", () => {
    const s = scopeSummary();
    expect(s.excluded).toBeGreaterThanOrEqual(12);
    expect(s.physical).toBeGreaterThanOrEqual(5);
    expect(s.drill).toBeGreaterThanOrEqual(5);
    expect(s.fieldData).toBeGreaterThanOrEqual(3);
    expect(s.play).toBe(57);
    expect(s.play + s.hold + s.excluded).toBe(71);
  });

  it("적재된 단원 상태 합이 71이다", () => {
    const summary = implementationSummary();
    expect(summary.catalog).toBe(71);
    expect(summary.excluded).toBe(scopeSummary().excluded);
    expect(
      summary.implemented + summary.partial + summary.hold + summary.excluded,
    ).toBe(71);
    expect(units().every((u) => u.scopeReason.length > 8)).toBe(true);
  });
});
