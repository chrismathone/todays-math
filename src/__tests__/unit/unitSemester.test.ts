import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { semesterOfUnit } from "@/lib/curriculum/unitSemester";

describe("semesterOfUnit — 차시가 속한 학기 (D-161)", () => {
  it("초등은 대단원 이름의 앞 숫자가 학기다", () => {
    expect(semesterOfUnit("초3", "1-6 분수와 소수")).toBe(1);
    expect(semesterOfUnit("초3", "2-1 곱셈")).toBe(2);
  });

  it("중학교는 대단원 번호로 가른다 — 1학기는 수 · 식 · 함수, 2학기는 도형 · 통계", () => {
    expect(semesterOfUnit("중1", "4. 그래프와 비례")).toBe(1);
    expect(semesterOfUnit("중1", "5. 기본 도형")).toBe(2);
    expect(semesterOfUnit("중2", "4. 함수")).toBe(1);
    expect(semesterOfUnit("중2", "5. 도형의 성질")).toBe(2);
    expect(semesterOfUnit("중3", "4. 이차함수")).toBe(1);
    expect(semesterOfUnit("중3", "5. 삼각비")).toBe(2);
  });

  it("공통수학1 · 2 는 과목이 곧 학기다", () => {
    expect(semesterOfUnit("공통수학1", "4. 행렬")).toBe(1);
    expect(semesterOfUnit("공통수학2", "1. 도형의 방정식")).toBe(2);
  });

  it("고등 선택 과목은 학교마다 달라 정하지 않는다", () => {
    for (const grade of ["대수", "미적분1", "미적분2", "확률과 통계", "기하"]) {
      expect(semesterOfUnit(grade, "1. 아무 단원")).toBeNull();
    }
  });

  it("모르는 학년 · 읽을 수 없는 대단원 이름은 지어내지 않는다", () => {
    expect(semesterOfUnit("중4", "1. 없는 학년")).toBeNull();
    expect(semesterOfUnit("중1", "번호 없는 단원")).toBeNull();
    expect(semesterOfUnit("초3", "3-1 없는 학기")).toBeNull();
  });

  it("교육과정 시드 전부에 대어 본다 — 초 · 중 · 공통수학은 빠짐없이 1 또는 2", () => {
    const decided = new Set([
      "초1",
      "초2",
      "초3",
      "초4",
      "초5",
      "초6",
      "중1",
      "중2",
      "중3",
      "공통수학1",
      "공통수학2",
    ]);
    const missing = CURRICULUM_UNITS.filter(
      (unit) =>
        decided.has(unit.grade) &&
        semesterOfUnit(unit.grade, unit.chapter) === null,
    );
    expect(missing).toEqual([]);
    // 학년마다 두 학기가 다 나온다(한쪽으로 쏠리면 규칙이 틀린 것이다)
    for (const grade of ["초1", "초6", "중1", "중2", "중3"]) {
      const seen = new Set(
        CURRICULUM_UNITS.filter((unit) => unit.grade === grade).map((unit) =>
          semesterOfUnit(unit.grade, unit.chapter),
        ),
      );
      expect([...seen].sort()).toEqual([1, 2]);
    }
  });

  it("차례가 뒤로 가는데 학기가 앞으로 돌아오지 않는다", () => {
    const byGrade = new Map<string, Array<1 | 2>>();
    for (const unit of CURRICULUM_UNITS) {
      const semester = semesterOfUnit(unit.grade, unit.chapter);
      if (semester === null) continue;
      const list = byGrade.get(unit.grade) ?? [];
      list.push(semester);
      byGrade.set(unit.grade, list);
    }
    for (const [grade, list] of byGrade) {
      const firstSecond = list.indexOf(2);
      const lastFirst = list.lastIndexOf(1);
      if (firstSecond !== -1)
        expect(lastFirst, grade).toBeLessThan(firstSecond);
    }
  });
});
