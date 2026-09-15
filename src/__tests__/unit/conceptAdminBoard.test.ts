/**
 * 원장님 «오늘의 개념» 첫 화면의 계산 — 반별 이번 주 차시 · 요약 · 끝까지 본 학생.
 *
 * 구현: `src/lib/concept/adminBoard.ts` (순수 함수 — DB 는 `adminService.ts` 가 읽는다).
 *
 * 브리프 §1.1 · §1.3 · §3 ③:
 *  - «이번 주 닿는 차시» = 반마다 **최근 진도 차시와 그 다음 차시**. 다음 차시는
 *    `nextOrderIndex`(진도 «다음으로» 와 같은 함수) — 새로 판정하지 않는다.
 *  - n/m 과 안 본 학생 이름은 **같은 모집단 함수**(`countWatchedToEnd`) 한 번에서 나온다.
 *    반 인원(m)도 같은 함수에서 — 셋이 갈라지면 화면이 거짓말을 한다.
 *  - 퇴원 학생은 인원에도 이름에도 없다.
 */
import { describe, expect, it } from "vitest";

import { conceptWatchSchema } from "@/contracts/conceptAdmin.contract";
import {
  buildConceptBoard,
  countLectures,
  type ConceptBoardInput,
} from "@/lib/concept/adminBoard";

describe("🔴 계약 — n/m 과 이름 수가 어긋난 응답은 나가지 못한다", () => {
  const base = {
    lectureId: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
    watched: 1,
    total: 3,
  };
  it("n + 이름 수 ≠ m 이면 거절", () => {
    expect(conceptWatchSchema.safeParse({ ...base, pending: [] }).success).toBe(
      false,
    );
    expect(
      conceptWatchSchema.safeParse({
        ...base,
        pending: [
          { id: "1a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70", name: "가" },
          { id: "2a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70", name: "나" },
          { id: "3a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70", name: "다" },
        ],
      }).success,
    ).toBe(false);
  });
  it("맞으면 받는다", () => {
    expect(
      conceptWatchSchema.safeParse({
        ...base,
        pending: [
          { id: "1a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70", name: "가" },
          { id: "2a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70", name: "나" },
        ],
      }).success,
    ).toBe(true);
  });
});

const U = (n: number) =>
  `4f000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const C = (n: number) =>
  `2f000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const S = (n: number) =>
  `3f000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const L = (n: number) =>
  `5f000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** 교육과정 차례 그대로 — 학년 순서는 이 차례에서 나온다 */
const UNITS = [
  {
    id: U(1),
    grade: "초3",
    chapter: "1. 덧셈과 뺄셈",
    section: "받아올림이 있는 덧셈",
    code: "E30101",
    orderIndex: 100,
  },
  {
    id: U(2),
    grade: "초3",
    chapter: "1. 덧셈과 뺄셈",
    section: "받아내림이 있는 뺄셈",
    code: "E30102",
    orderIndex: 101,
  },
  {
    id: U(3),
    grade: "중1",
    chapter: "1. 소인수분해",
    section: "소수와 거듭제곱",
    code: "J10101",
    orderIndex: 400,
  },
  {
    id: U(4),
    grade: "중1",
    chapter: "1. 소인수분해",
    section: "소인수분해",
    code: "J10102",
    orderIndex: 401,
  },
  {
    id: U(5),
    grade: "중1",
    chapter: "1. 소인수분해",
    section: "공약수와 최대공약수",
    code: "J10103",
    orderIndex: 402,
  },
];

function input(patch: Partial<ConceptBoardInput> = {}): ConceptBoardInput {
  return {
    // 입력 순서를 일부러 흩는다 — 표는 학년(교육과정) 순서 → 반 이름 순이다
    classes: [
      { id: C(2), name: "중1 B반", grade: "중1" },
      { id: C(1), name: "중1 A반", grade: "중1" },
      { id: C(3), name: "초3 A반", grade: "초3" },
      { id: C(4), name: "진도 없는 반", grade: "중1" },
    ],
    students: [
      { id: S(1), name: "김도윤", classId: C(1), eywaWithdrawnAt: null },
      { id: S(2), name: "이서준", classId: C(1), eywaWithdrawnAt: null },
      {
        id: S(3),
        name: "박지호",
        classId: C(1),
        eywaWithdrawnAt: "2026-09-01T00:00:00.000Z",
      },
      { id: S(4), name: "최수아", classId: C(1), eywaWithdrawnAt: null },
      { id: S(5), name: "정하윤", classId: C(2), eywaWithdrawnAt: null },
      { id: S(6), name: "한지우", classId: C(3), eywaWithdrawnAt: null },
    ],
    latestProgress: [
      { classId: C(1), unitId: U(4), recordedAt: "2026-09-15" },
      { classId: C(2), unitId: U(4), recordedAt: "2026-09-12" },
      { classId: C(3), unitId: U(2), recordedAt: "2026-09-15" },
    ],
    units: UNITS,
    lectures: [
      { id: L(1), unitId: U(4), status: "published", sortOrder: 1 },
      { id: L(2), unitId: U(4), status: "published", sortOrder: 0 },
      { id: L(3), unitId: U(4), status: "draft", sortOrder: 2 },
      { id: L(4), unitId: U(5), status: "draft", sortOrder: 0 },
      { id: L(5), unitId: U(2), status: "archived", sortOrder: 0 },
    ],
    views: [
      {
        studentId: S(1),
        lectureId: L(2),
        completedAt: "2026-09-15T05:00:00.000Z",
      },
      { studentId: S(2), lectureId: L(2), completedAt: null },
      // 퇴원 학생이 끝까지 봤어도 세지 않는다
      {
        studentId: S(3),
        lectureId: L(2),
        completedAt: "2026-09-15T05:00:00.000Z",
      },
      {
        studentId: S(4),
        lectureId: L(1),
        completedAt: "2026-09-15T05:00:00.000Z",
      },
    ],
    ...patch,
  };
}

describe("반별 표 — 순서와 차시", () => {
  it("학년은 교육과정 차례, 같은 학년은 반 이름 순이다", () => {
    const board = buildConceptBoard(input());
    expect(board.rows.map((r) => r.className)).toEqual([
      "초3 A반",
      "중1 A반",
      "중1 B반",
      "진도 없는 반",
    ]);
  });

  it("최근 진도와 그 다음 차시(orderIndex + 1)를 붙인다", () => {
    const a = buildConceptBoard(input()).rows.find((r) => r.classId === C(1))!;
    expect(a.progress).toEqual({ unitId: U(4), recordedAt: "2026-09-15" });
    expect(a.nextUnitId).toBe(U(5));
  });

  it("다음 차시가 교육과정에 없으면(마지막 차시) null 이다 — 지어내지 않는다", () => {
    const board = buildConceptBoard(
      input({
        latestProgress: [
          { classId: C(1), unitId: U(5), recordedAt: "2026-09-15" },
        ],
      }),
    );
    expect(board.rows.find((r) => r.classId === C(1))!.nextUnitId).toBeNull();
  });

  it("진도가 없는 반도 표에 남는다 — 차시 칸만 비운다", () => {
    const none = buildConceptBoard(input()).rows.find(
      (r) => r.classId === C(4),
    )!;
    expect(none).toMatchObject({ progress: null, nextUnitId: null, watch: [] });
  });
});

describe("🔴 끝까지 본 학생 — n/m 과 이름이 같은 모집단에서", () => {
  it("게시 강의마다 한 줄, 순서(sortOrder)대로 — 초안·내림은 학생이 못 보므로 세지 않는다", () => {
    const a = buildConceptBoard(input()).rows.find((r) => r.classId === C(1))!;
    expect(a.watch.map((w) => w.lectureId)).toEqual([L(2), L(1)]);
  });

  it("퇴원 학생은 인원(m)에도 이름에도 없다", () => {
    const a = buildConceptBoard(input()).rows.find((r) => r.classId === C(1))!;
    expect(a.enrolled).toBe(3);
    const first = a.watch[0]!;
    expect(first).toEqual({
      lectureId: L(2),
      watched: 1,
      total: 3,
      pending: [
        { id: S(2), name: "이서준" },
        { id: S(4), name: "최수아" },
      ],
    });
  });

  it("🔴 모든 반 × 강의에서 n + 안 본 이름 수 = m = 반 인원", () => {
    for (const row of buildConceptBoard(input()).rows) {
      for (const w of row.watch) {
        expect(w.watched + w.pending.length, row.className).toBe(w.total);
        expect(w.total, row.className).toBe(row.enrolled);
      }
    }
  });

  it("다른 반 학생의 시청 기록은 이 반에서 세지 않는다", () => {
    const b = buildConceptBoard(
      input({
        views: [
          // 중1 A반 학생이 본 기록 — 중1 B반 표에는 안 들어간다
          {
            studentId: S(1),
            lectureId: L(2),
            completedAt: "2026-09-15T05:00:00.000Z",
          },
        ],
      }),
    ).rows.find((r) => r.classId === C(2))!;
    expect(b.watch[0]).toMatchObject({ watched: 0, total: 1 });
  });

  it("시청 기록 행 수를 센다 — 0 이면 화면이 빈 상태 문구를 둔다", () => {
    expect(buildConceptBoard(input()).watchRecords).toBe(3);
    expect(buildConceptBoard(input({ views: [] })).watchRecords).toBe(0);
  });
});

describe("요약 — 이번 주 닿는 차시", () => {
  it("반마다 최근 진도 + 다음 차시, 겹치면 하나 · 게시 / 초안만 / 영상 없음", () => {
    const { summary, touchedUnitIds } = buildConceptBoard(input());
    // U4(A·B 최근) · U5(A·B 다음) · U2(초3 최근) · U3? 아니다 — 초3 다음은 orderIndex 102 없음
    expect(new Set(touchedUnitIds)).toEqual(new Set([U(4), U(5), U(2)]));
    expect(summary).toEqual({
      units: 3,
      classes: 4,
      published: 1, // U4
      draftOnly: 1, // U5
      none: 1, // U2 — 내린 강의만 있다
    });
  });

  it("차시별 강의 수 — 게시·초안·내림을 나눠 센다", () => {
    const lectures = input().lectures;
    expect(countLectures(lectures, U(4))).toEqual({
      published: 2,
      draft: 1,
      archived: 0,
    });
    expect(countLectures(lectures, U(2))).toEqual({
      published: 0,
      draft: 0,
      archived: 1,
    });
    expect(countLectures(lectures, U(1))).toEqual({
      published: 0,
      draft: 0,
      archived: 0,
    });
  });
});
