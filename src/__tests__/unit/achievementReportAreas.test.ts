/**
 * 🔴 RED → 🟢 — **리포트의 네 영역 — 기록과 문장을 가른다** (Hi-fi 브리프 §0 · §1 #4·#5).
 *
 * 구현: src/lib/achievement/reportAreas.ts — 원장 화면과 학부모 A4 가 같이 부른다.
 *
 * 무엇을 잠그나
 * 1. 🔴 **문장을 만들 수 없어도 기록은 보인다.** Wire D 는 평균 문장이 없으면 회차 목록을 통째로
 *    지워 **전부 결시인 달의 결시 내역까지 증발**했다(§1 #4). 영역이 서는지는 **기록**이 정한다.
 * 2. 🔴 **있는 기록은 빠짐없이** — 영상이 있으면 영역이 선다(Wire D 는 영상 분기가 없었다 — §1 #5).
 * 3. 순서는 늘 같다 — 배운 것 → 시험 → 스스로 한 공부 → 선생님 의견.
 * 4. 빈 영역의 «무엇이 · 왜 · 어떻게»는 **원장 화면에만** 있다(`directorGaps`).
 * 5. 소단원은 대단원별로 묶고, 접으면 «대단원 + 소단원 수»(§2 규칙 1).
 */
import { describe, expect, it } from "vitest";

import { collectAchievement, type ResultRow } from "@/lib/achievement/collect";
import {
  AREA_ORDER,
  areaHasRecords,
  areaSummary,
  directorGaps,
  foldUnits,
  groupUnits,
  parentAreas,
} from "@/lib/achievement/reportAreas";
import type { CoveredUnit } from "@/lib/achievement/types";

const PERIOD = { from: "2026-08-01", to: "2026-08-31" };
const UNITS = Array.from({ length: 4 }, (_, i) => ({
  unitId: `u${i}`,
  grade: "초5",
  chapter: i < 3 ? "2. 소수의 곱셈" : "3. 합동과 대칭",
  section: `소단원 ${i}`,
  orderIndex: i,
}));

const base = (over: Parameters<typeof collectAchievement>[0] | object = {}) =>
  collectAchievement({
    student: { id: "s", name: "김하나", className: "반", classGrade: "초5" },
    period: PERIOD,
    progress: [
      { unitId: "u0", recordedAt: "2026-08-03" },
      { unitId: "u1", recordedAt: "2026-08-05" },
    ],
    units: UNITS,
    plan: null,
    results: [],
    lectures: { targets: [], views: [] },
    ...over,
  });

const absentRound = (testId: string, testDate: string): ResultRow => ({
  testId,
  testDate,
  takenAt: `${testDate}T09:00:00.000Z`,
  score: null,
  maxScore: 100,
  absent: true,
  items: [],
  recommendedUnitIds: null,
});

describe("🔴 기록이 영역을 세운다 — 문장이 아니다", () => {
  it("🔴 전부 결시인 달 — 평균 문장은 없어도 «시험» 영역은 서고 결시 기록이 남는다", () => {
    const f = base({
      results: [
        absentRound("t1", "2026-08-06"),
        absentRound("t2", "2026-08-13"),
      ],
    });
    const src = { factors: f, teacherNote: null };
    expect(areaSummary(src, "scored").join(" ")).not.toMatch(/평균/);
    expect(areaHasRecords(src, "scored")).toBe(true);
    expect(parentAreas(src)).toContain("scored");
    expect(f.scored.absentRounds).toHaveLength(2);
  });

  it("🔴 난이도 문장이 없어도(전부 12문항 미만) 시험 영역은 선다 — 숫자는 남는다", () => {
    const f = base({
      results: [
        {
          ...absentRound("t1", "2026-08-06"),
          absent: false,
          score: 50,
          items: [
            { unitId: "u0", difficulty: "기본", isCorrect: true },
            { unitId: "u0", difficulty: "응용", isCorrect: false },
          ],
        },
      ],
    });
    const src = { factors: f, teacherNote: null };
    expect(
      areaSummary(src, "scored").some(
        (s) => s.includes("잘 풀") || s.includes("막힙"),
      ),
    ).toBe(false);
    expect(parentAreas(src)).toContain("scored");
  });

  it("🔴 영상 기록이 있으면 «스스로 한 공부» 영역이 서고 완료 편수를 말한다 (§1 #5)", () => {
    const f = base({
      lectures: {
        targets: [{ lectureId: "l1" }, { lectureId: "l2" }],
        views: [
          {
            lectureId: "l1",
            percent: 100,
            completedAt: "2026-08-10T00:00:00.000Z",
          },
        ],
      },
    });
    const src = { factors: f, teacherNote: null };
    expect(parentAreas(src)).toContain("selfStudy");
    expect(areaSummary(src, "selfStudy")).toEqual([
      "이번 달 배운 내용의 영상 2편 중 월말까지 1편을 끝까지 봤습니다.",
    ]);
  });

  it("진도만 있는 달(지금 실데이터) — 학부모 지면에는 «배운 것» 하나만", () => {
    expect(parentAreas({ factors: base(), teacherNote: null })).toEqual([
      "learned",
    ]);
  });

  it("선생님 의견은 글이 있을 때만 — 빈 글은 없는 것이다", () => {
    expect(parentAreas({ factors: base(), teacherNote: "  " })).toEqual([
      "learned",
    ]);
    expect(parentAreas({ factors: base(), teacherNote: "좋습니다." })).toEqual([
      "learned",
      "note",
    ]);
  });

  it("순서는 늘 같다 — 배운 것 → 시험 → 스스로 한 공부 → 선생님 의견", () => {
    expect(AREA_ORDER).toEqual(["learned", "scored", "selfStudy", "note"]);
  });
});

describe("빈 영역의 사유 — 원장 화면에만", () => {
  it("🔴 진도만 있는 달 — 무엇이 · 왜 · 어떻게를 다 적는다", () => {
    const gaps = directorGaps({ factors: base(), teacherNote: null });
    expect(gaps.map((g) => g.what)).toEqual([
      "계획 대비 진도",
      "시험 점수",
      "예습 영상",
      "숙제",
      "선생님 의견",
    ]);
    for (const g of gaps) {
      expect(g.why.trim()).not.toBe("");
      expect(g.how.trim()).not.toBe("");
    }
  });

  it("다 차 있으면 사유가 없다", () => {
    const f = base({
      results: [absentRound("t1", "2026-08-06")],
      lectures: { targets: [{ lectureId: "l1" }], views: [] },
      homework: [{ checkedOn: "2026-08-04", missed: false }],
      plan: {
        weekdays: [1, 3, 5],
        unitsPerLesson: 1,
        startUnitId: "u0",
        startDate: "2026-08-03",
        active: true,
      },
    });
    expect(
      directorGaps({ factors: f, teacherNote: "의견" }).map((g) => g.what),
    ).toEqual([]);
  });
});

describe("소단원 묶음 — 대단원별로, 이름은 줄이지 않는다", () => {
  const units: CoveredUnit[] = [
    { ...UNITS[0]!, lessons: 1 },
    { ...UNITS[1]!, lessons: 2 },
    { ...UNITS[2]!, lessons: 1 },
    { ...UNITS[3]!, lessons: 1 },
  ].map(({ unitId, grade, chapter, section, lessons }) => ({
    unitId,
    grade,
    chapter,
    section,
    lessons,
  }));

  it("대단원별로 묶고 차례를 지킨다 — 두 번 나간 소단원은 차시를 붙인다", () => {
    expect(groupUnits(units)).toEqual([
      {
        chapter: "2. 소수의 곱셈",
        sections: ["소단원 0", "소단원 1 (2차시)", "소단원 2"],
      },
      { chapter: "3. 합동과 대칭", sections: ["소단원 3"] },
    ]);
  });

  it("🔴 학년이 섞이면 대단원 앞에 학년을 붙인다 — 하나뿐이면 안 붙인다", () => {
    const mixed: CoveredUnit[] = [
      ...units,
      {
        unitId: "m1",
        grade: "중1",
        chapter: "1. 소인수분해",
        section: "소인수분해",
        lessons: 1,
      },
    ];
    expect(groupUnits(mixed).map((g) => g.chapter)).toEqual([
      "초5 2. 소수의 곱셈",
      "초5 3. 합동과 대칭",
      "중1 1. 소인수분해",
    ]);
    expect(foldUnits(mixed).map((g) => g.chapter)).toEqual([
      "초5 2. 소수의 곱셈",
      "초5 3. 합동과 대칭",
      "중1 1. 소인수분해",
    ]);
  });

  it("접으면 «대단원 + 소단원 수 + 차시»", () => {
    expect(foldUnits(units)).toEqual([
      { chapter: "2. 소수의 곱셈", units: 3, lessons: 4 },
      { chapter: "3. 합동과 대칭", units: 1, lessons: 1 },
    ]);
  });
});
