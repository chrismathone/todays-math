/**
 * 학생에게 열린 강의 — **목록과 시청 기록이 같은 판정 하나를 쓴다** (D-125 ⑸ · 브리프 §2.4 · §6).
 *
 * 규칙: src/lib/learn/lectureAccess.ts
 *  - 그 학생의 **반 진도**(studentId NULL) ∪ **개인 진도**(Progress.studentId)에 있던 차시만.
 *  - **게시된** 강의만(초안·보관 안 됨 — D-124 ⑵). 주소 없는 게시본은 없다(DB CHECK)지만 그래도 안 보낸다.
 *  - 진도보다 앞선 차시는 안 된다 — «있던 차시»의 집합에 없으면 앞섰든 건너뛰었든 안 된다.
 *  - 남의 반·남의 학생의 진도는 안 센다(남의 학년 강의 id 를 보내도 거부 — 브리프 §2.4).
 */
import { describe, expect, it } from "vitest";

import {
  lectureOpenToStudent,
  progressUnitIdsOf,
  sortLecturesForStudent,
} from "@/lib/learn/lectureAccess";

const ME = { id: "stu-me", classId: "class-a" };

const rows = [
  { classId: "class-a", studentId: null, unitId: "u1" }, // 반 진도
  { classId: "class-a", studentId: null, unitId: "u2" }, // 반 진도
  { classId: "class-a", studentId: "stu-me", unitId: "u5" }, // 내 개인 진도(반보다 앞섬)
  { classId: "class-old", studentId: "stu-me", unitId: "u9" }, // 옮기기 전 반에서 기록된 내 개인 진도
  { classId: "class-a", studentId: "stu-other", unitId: "u7" }, // 같은 반 다른 학생의 개인 진도
  { classId: "class-b", studentId: null, unitId: "u8" }, // 다른 반의 반 진도
];

describe("진도에 있던 차시 — 반 진도 ∪ 개인 진도", () => {
  it("🔴 내 반의 반 진도와 내 개인 진도만 — 남의 반·남의 개인 진도는 안 센다", () => {
    expect([...progressUnitIdsOf(rows, ME)].sort()).toStrictEqual([
      "u1",
      "u2",
      "u5",
      "u9",
    ]);
  });

  it("진도가 하나도 없으면 빈 집합 — 아무 강의도 안 열린다", () => {
    expect(progressUnitIdsOf([], ME).size).toBe(0);
  });
});

describe("🔴 강의가 이 학생에게 열렸나 — 목록과 기록이 부르는 판정", () => {
  const open = new Set(["u1", "u2", "u5"]);
  const lecture = (over: Record<string, unknown> = {}) => ({
    status: "published" as const,
    unitId: "u1",
    videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M",
    ...over,
  });

  it("게시 + 진도에 있던 차시면 열린다", () => {
    expect(lectureOpenToStudent(lecture(), open)).toBe(true);
    expect(lectureOpenToStudent(lecture({ unitId: "u5" }), open)).toBe(true);
  });

  it("🔴 초안·보관은 안 열린다", () => {
    expect(lectureOpenToStudent(lecture({ status: "draft" }), open)).toBe(
      false,
    );
    expect(lectureOpenToStudent(lecture({ status: "archived" }), open)).toBe(
      false,
    );
  });

  it("🔴 진도보다 앞선 차시·남의 학년 차시는 안 열린다", () => {
    expect(lectureOpenToStudent(lecture({ unitId: "u3" }), open)).toBe(false);
    expect(lectureOpenToStudent(lecture({ unitId: "u8" }), open)).toBe(false);
  });

  it("주소 없는 게시본은 보내지 않는다 (DB 가 막지만 한 번 더)", () => {
    expect(lectureOpenToStudent(lecture({ videoUrl: null }), open)).toBe(false);
  });
});

describe("목록 차례 — 차시 차례, 같은 차시 안에서는 강의 순서", () => {
  it("교육과정 차례(orderIndex) → 강의 순서(sortOrder) → 제목", () => {
    const order = new Map([
      ["u1", 413],
      ["u5", 418],
      ["u2", 414],
    ]);
    const sorted = sortLecturesForStudent(
      [
        { id: "c", unitId: "u5", sortOrder: 0, title: "가" },
        { id: "b", unitId: "u2", sortOrder: 1, title: "나" },
        { id: "a", unitId: "u2", sortOrder: 0, title: "다" },
        { id: "d", unitId: "u1", sortOrder: 5, title: "라" },
      ],
      order,
    ).map((l) => l.id);
    expect(sorted).toStrictEqual(["d", "a", "b", "c"]);
  });
});
