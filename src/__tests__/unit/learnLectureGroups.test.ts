/**
 * 🔴 ③ 학생 목록의 **날짜 묶음 · «오늘» 표시** (브리프 §1.1 · 05 §8.9 학생 화면).
 *
 * 규칙: src/lib/learn/lectureGroups.ts — 화면(`LectureList.tsx`)은 이 묶음을 그리기만 한다.
 *  - 묶음은 **그 차시를 수업한 날**(`taughtOn` — 서버가 반 진도 ∪ 개인 진도에서 가장 최근 날짜를 셈)이다.
 *  - 가장 최근 날의 묶음이 **남색 판**(맨 앞)이다. 나머지는 최근 순.
 *  - 🔴 «오늘» 은 그 날이 오늘(학원 시간 KST)일 때만 — 어제 수업이면 날짜만.
 */
import { describe, expect, it } from "vitest";

import type { ConceptLectureForStudent } from "@/contracts/conceptLecture.contract";
import type { LearnUnit } from "@/contracts/studentAccount.contract";
import {
  groupLecturesByDay,
  kstDateOf,
  nextLectureAfter,
  watchState,
} from "@/lib/learn/lectureGroups";

const unit = (id: string, orderIndex: number, taughtOn: string): LearnUnit => ({
  id,
  grade: "중1",
  chapter: "소인수분해",
  section: `차시 ${id}`,
  orderIndex,
  taughtOn,
});
const lecture = (
  id: string,
  unitId: string,
  watch: ConceptLectureForStudent["watch"] = null,
): ConceptLectureForStudent => ({
  id,
  unitId,
  title: `강의 ${id}`,
  videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M",
  seconds: 120,
  sortOrder: 0,
  watch,
});

const U11 = unit("u11", 501, "2026-09-10");
const U12 = unit("u12", 502, "2026-09-12");
const U13 = unit("u13", 503, "2026-09-15");
const LECTURES = [
  lecture("l1", "u11"),
  lecture("l2", "u11"),
  lecture("l3", "u12"),
  lecture("l4", "u12"),
  lecture("l5", "u13"),
];

const shape = (groups: ReturnType<typeof groupLecturesByDay>) =>
  groups.map((g) => ({
    day: g.day,
    isToday: g.isToday,
    units: g.units.map((u) => [u.unit.id, u.lectures.map((l) => l.id)]),
  }));

describe("🔴 날짜 묶음 — 수업한 날 순, 최근이 먼저", () => {
  it("수업 여러 날 — 오늘(9/15)이 맨 앞 «오늘», 그 뒤 9/12 · 9/10", () => {
    expect(
      shape(groupLecturesByDay([U11, U12, U13], LECTURES, "2026-09-15")),
    ).toStrictEqual([
      { day: "2026-09-15", isToday: true, units: [["u13", ["l5"]]] },
      { day: "2026-09-12", isToday: false, units: [["u12", ["l3", "l4"]]] },
      { day: "2026-09-10", isToday: false, units: [["u11", ["l1", "l2"]]] },
    ]);
  });

  it("🔴 어제 수업이면 날짜만 — «오늘» 표시가 어디에도 없다", () => {
    const groups = groupLecturesByDay([U11, U12, U13], LECTURES, "2026-09-16");
    expect(groups[0]!.day).toBe("2026-09-15");
    expect(groups.map((g) => g.isToday)).toStrictEqual([false, false, false]);
  });

  it("🔴 오늘이 가장 최근 날이 아니면(날짜가 미래로 적힌 진도) 오늘 표시는 그 날에만", () => {
    const future = unit("u14", 504, "2026-09-17");
    const groups = groupLecturesByDay(
      [U13, future],
      [lecture("l5", "u13"), lecture("l6", "u14")],
      "2026-09-15",
    );
    expect(groups.map((g) => [g.day, g.isToday])).toStrictEqual([
      ["2026-09-17", false],
      ["2026-09-15", true],
    ]);
  });

  it("같은 날 여러 차시 — 한 묶음 안에 교육과정 차례로, 강의는 받은 차례 그대로 (5편 이상)", () => {
    const a = unit("ua", 700, "2026-09-15");
    const b = unit("ub", 699, "2026-09-15");
    const many = [
      lecture("a1", "ua"),
      lecture("a2", "ua"),
      lecture("a3", "ua"),
      lecture("b1", "ub"),
      lecture("b2", "ub"),
      lecture("b3", "ub"),
    ];
    expect(shape(groupLecturesByDay([a, b], many, "2026-09-15"))).toStrictEqual(
      [
        {
          day: "2026-09-15",
          isToday: true,
          units: [
            ["ub", ["b1", "b2", "b3"]],
            ["ua", ["a1", "a2", "a3"]],
          ],
        },
      ],
    );
  });

  it("강의가 없는 차시는 묶음에 안 선다 · 차시를 모르는 강의는 버리지 않고 알린다", () => {
    const empty = unit("u-empty", 400, "2026-09-15");
    expect(
      shape(groupLecturesByDay([empty, U13], [lecture("l5", "u13")], "x")),
    ).toStrictEqual([
      { day: "2026-09-15", isToday: false, units: [["u13", ["l5"]]] },
    ]);
    expect(() =>
      groupLecturesByDay([U13], [lecture("l9", "u-missing")], "2026-09-15"),
    ).toThrow(/u-missing/);
  });

  it("강의가 하나도 없으면 빈 목록", () => {
    expect(groupLecturesByDay([], [], "2026-09-15")).toStrictEqual([]);
  });
});

describe("🔴 학원 날짜(KST) — 서버 시계의 UTC 자정이 아니다", () => {
  it("UTC 15:00 = KST 다음날 0시", () => {
    expect(kstDateOf(new Date("2026-09-15T14:59:59.999Z"))).toBe("2026-09-15");
    expect(kstDateOf(new Date("2026-09-15T15:00:00.000Z"))).toBe("2026-09-16");
  });
});

describe("상태 알약 · 다음 영상", () => {
  it("새로 · n% 봄 · 끝까지 봄 — 서버가 센 % 그대로", () => {
    expect(watchState(null)).toStrictEqual({ key: "new", label: "새로" });
    expect(
      watchState({ maxSeconds: 0, percent: 0, completed: false }),
    ).toStrictEqual({ key: "new", label: "새로" });
    expect(
      watchState({ maxSeconds: 81, percent: 64, completed: false }),
    ).toStrictEqual({ key: "mid", label: "64% 봄" });
    expect(
      watchState({ maxSeconds: 118, percent: 97, completed: true }),
    ).toStrictEqual({ key: "done", label: "끝까지 봄" });
  });

  it("다음 영상 — 받은 차례에서 바로 뒤, 마지막이면 없다", () => {
    expect(nextLectureAfter(LECTURES, "l3")?.id).toBe("l4");
    expect(nextLectureAfter(LECTURES, "l5")).toBeNull();
    expect(nextLectureAfter(LECTURES, "nope")).toBeNull();
  });
});
