/**
 * 학생에게 가는 강의 읽기 모양 (D-124 ⑹) — **AI 고지는 원장님 화면에만.**
 *
 * 고지(`disclosure`)·잡 ID(`sourceJobId`)·원장님 시청 확인(`reviewedAt`)은 **저장한다** —
 * 검수·감사 기록이고, 도구가 만든 강의는 고지가 게시 조건이다. 다만 학생 화면에는 싣지 않는다
 * (수맥 2026-08-04 소유자 결정과 같다 — 수맥 `MaterialRow.disclosure` 주석).
 *
 * 그 약속을 **두 겹**으로 못 박는다:
 *  ㉠ 계약 — 학생 DTO 스키마에 그 칸이 **없다**(strict 라 실어 보내면 거절된다).
 *  ㉡ 배선 — 저장 행 → 학생 DTO 로 옮기는 함수가 그 칸을 **떼어 낸다**.
 * ㉠ 만 있으면 라우트가 행을 통째로 내보낸 날 계약 검사를 안 거치면 그대로 새고,
 * ㉡ 만 있으면 누가 DTO 에 칸을 더해도 아무도 안 운다(mathgen 이식 때 「가져왔는데 부르지
 * 않았다」 — 21번 §1.4 ⚠️).
 */
import { describe, expect, it } from "vitest";

import { conceptLectureForStudentSchema } from "@/contracts/conceptLecture.contract";
import { toStudentLecture } from "@/lib/concept/studentLecture";

const HIDDEN = ["disclosure", "sourceJobId", "reviewedAt"] as const;

/** 저장된 행 전부 — Prisma 가 돌려주는 모양 그대로(칸이 더 많다) */
const ROW = {
  id: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
  unitId: "3f0c8a8e-2f35-4e0b-9a55-1d7c0a4c2b11",
  title: "소수와 합성수",
  videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M",
  seconds: 139,
  disclosure: "선생님이 검수한 AI 보충 강의입니다.",
  sourceJobId: "20260722-0953-d093ce3f",
  sortOrder: 0,
  status: "published" as const,
  reviewedAt: new Date("2026-09-15T01:00:00Z"),
  publishedAt: new Date("2026-09-15T02:00:00Z"),
  createdById: null,
  createdAt: new Date("2026-09-15T00:00:00Z"),
  updatedAt: new Date("2026-09-15T02:00:00Z"),
};

describe("학생 DTO — 계약", () => {
  it("🔴 칸은 정확히 이것뿐이다 — 고지·잡 ID·시청 확인이 없다", () => {
    const keys = Object.keys(conceptLectureForStudentSchema.shape).sort();
    expect(keys).toEqual(
      [
        "id",
        "unitId",
        "title",
        "videoUrl",
        "seconds",
        "sortOrder",
        "watch",
      ].sort(),
    );
    for (const k of HIDDEN) expect(keys).not.toContain(k);
  });

  it("그 칸을 실어 보내면 거절한다 (strict)", () => {
    const dto = toStudentLecture(ROW, null)!;
    for (const k of HIDDEN) {
      expect(
        conceptLectureForStudentSchema.safeParse({ ...dto, [k]: ROW[k] })
          .success,
        k,
      ).toBe(false);
    }
  });
});

describe("학생 DTO — 저장 행에서 옮기기", () => {
  it("🔴 고지·잡 ID·시청 확인을 떼어 내고, 계약을 통과한다", () => {
    const dto = toStudentLecture(ROW, null);
    expect(dto).not.toBeNull();
    for (const k of HIDDEN) expect(Object.keys(dto!)).not.toContain(k);
    expect(conceptLectureForStudentSchema.safeParse(dto).success).toBe(true);
    expect(dto).toEqual({
      id: ROW.id,
      unitId: ROW.unitId,
      title: "소수와 합성수",
      videoUrl: ROW.videoUrl,
      seconds: 139,
      sortOrder: 0,
      watch: null,
    });
  });

  it("초안·보관 강의는 학생에게 가지 않는다 (D-124 ⑵ 목록에는 게시된 강의만)", () => {
    expect(toStudentLecture({ ...ROW, status: "draft" }, null)).toBeNull();
    expect(toStudentLecture({ ...ROW, status: "archived" }, null)).toBeNull();
  });

  it("자기 시청 기록은 싣는다 — 완료 = 완료 시각이 찍혔나", () => {
    expect(
      toStudentLecture(ROW, { maxSeconds: 60, percent: 43, completedAt: null })
        ?.watch,
    ).toEqual({ maxSeconds: 60, percent: 43, completed: false });
    expect(
      toStudentLecture(ROW, {
        maxSeconds: 139,
        percent: 100,
        completedAt: new Date("2026-09-15T03:00:00Z"),
      })?.watch,
    ).toEqual({ maxSeconds: 139, percent: 100, completed: true });
  });
});
