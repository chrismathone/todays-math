/**
 * 오늘의 개념 강의 계약 (D-123 ⑥′) — 수맥 0009a·0012a 의 규칙을 Zod 로 옮긴 자리.
 *
 * 수맥은 규칙이 **SQL CHECK** 와 **CLI 의 손 목록**(`fieldLimits`)에 흩어져 있었다 —
 * 그 CLI 머리말이 스스로 「DB 에는 길이 CHECK 가 없어서 여기서 막지 않으면 화면으로는
 * 못 넣는 길이가 CLI 로만 들어간다」고 적어 두었다. 우리는 계약 한 곳에 둔다.
 */
import { describe, expect, it } from "vitest";

import {
  CONCEPT_LECTURE_LIMITS,
  conceptLectureDraftSchema,
  conceptLectureSchema,
  conceptLectureStatusSchema,
  conceptLectureViewSchema,
  conceptWatchReportSchema,
} from "@/contracts/conceptLecture.contract";
import { normalizeYouTubeUrl } from "@/lib/concept/youtube";

const UNIT_ID = "3f0c8a8e-2f35-4e0b-9a55-1d7c0a4c2b11";
const WATCH = "https://www.youtube.com/watch?v=aQkPcPqTq4M";

const draft = (extra: Record<string, unknown> = {}) => ({
  unitId: UNIT_ID,
  title: "소수와 합성수",
  videoUrl: null,
  seconds: 139,
  disclosure: "선생님이 검수한 AI 보충 강의입니다.",
  sourceJobId: "20260722-0953-d093ce3f",
  sortOrder: 0,
  ...extra,
});

const row = (extra: Record<string, unknown> = {}) => ({
  id: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
  unitId: UNIT_ID,
  title: "소수와 합성수",
  videoUrl: WATCH,
  seconds: 139,
  disclosure: null,
  sourceJobId: null,
  sortOrder: 0,
  status: "draft",
  reviewedAt: null,
  publishedAt: null,
  createdById: null,
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
  ...extra,
});

describe("강의 계약 — 상태", () => {
  it("상태는 초안·게시·보관 셋뿐이다", () => {
    expect(conceptLectureStatusSchema.options).toEqual([
      "draft",
      "published",
      "archived",
    ]);
  });
});

describe("강의 계약 — 초안 입력", () => {
  it("주소 없는 초안을 받는다 (호스팅 미정 — 21번 §5-3)", () => {
    expect(
      conceptLectureDraftSchema.safeParse(draft({ videoUrl: null })).success,
    ).toBe(true);
  });

  it("주소는 정규 watch 형태만 받는다 — 다른 형태는 normalizeYouTubeUrl 을 거쳐 온다", () => {
    expect(
      conceptLectureDraftSchema.safeParse(draft({ videoUrl: WATCH })).success,
    ).toBe(true);
    const share = "https://youtu.be/aQkPcPqTq4M";
    expect(
      conceptLectureDraftSchema.safeParse(draft({ videoUrl: share })).success,
    ).toBe(false);
    expect(
      conceptLectureDraftSchema.safeParse(
        draft({ videoUrl: normalizeYouTubeUrl(share) }),
      ).success,
    ).toBe(true);
    expect(
      conceptLectureDraftSchema.safeParse(
        draft({ videoUrl: "https://vimeo.com/1" }),
      ).success,
    ).toBe(false);
  });

  it("초안 입력에는 상태·종류·소유 칸이 없다", () => {
    // 상태: 게시는 사람 버튼이다 — 초안을 만드는 길로 게시를 실어 보낼 수 없어야 한다.
    // 종류: 수맥의 reading·practice 는 옮기지 않았다(D-123 ⑵ — 영상 하나).
    // 소유: 강의는 서비스 공용 목록이다(브리프 §2.1 — 계정별 안은 원장님께 묻는 중).
    for (const extra of [
      { status: "published" },
      { kind: "video" },
      { userId: UNIT_ID },
    ]) {
      expect(
        conceptLectureDraftSchema.safeParse(draft(extra)).success,
        JSON.stringify(extra),
      ).toBe(false);
    }
  });

  it("입력 한계 — 제목·고지·잡 ID·순서 (수맥 폼·CLI 와 같은 수)", () => {
    const L = CONCEPT_LECTURE_LIMITS;
    expect(L).toMatchObject({
      titleMax: 200,
      disclosureMax: 300,
      sourceJobIdMax: 120,
      sortOrderMax: 999,
    });
    const ok = (extra: Record<string, unknown>) =>
      conceptLectureDraftSchema.safeParse(draft(extra)).success;
    expect(ok({ title: "가".repeat(L.titleMax) })).toBe(true);
    expect(ok({ title: "가".repeat(L.titleMax + 1) })).toBe(false);
    expect(ok({ title: "   " })).toBe(false);
    expect(ok({ disclosure: "가".repeat(L.disclosureMax + 1) })).toBe(false);
    expect(ok({ sourceJobId: "j".repeat(L.sourceJobIdMax + 1) })).toBe(false);
    expect(ok({ sortOrder: -1 })).toBe(false);
    expect(ok({ sortOrder: L.sortOrderMax + 1 })).toBe(false);
    expect(ok({ sortOrder: 1.5 })).toBe(false);
    expect(ok({ seconds: -1 })).toBe(false);
  });

  it("공백 고지·공백 잡 ID 는 받지 않는다 — 없으면 null 로 와야 한다", () => {
    // 수맥 0012a `disclosure_not_blank_ck` — 빈 고지는 고지가 아니다.
    for (const extra of [{ disclosure: "   " }, { sourceJobId: "  " }]) {
      expect(conceptLectureDraftSchema.safeParse(draft(extra)).success).toBe(
        false,
      );
    }
    expect(
      conceptLectureDraftSchema.safeParse(
        draft({ disclosure: null, sourceJobId: null }),
      ).success,
    ).toBe(true);
  });
});

describe("강의 계약 — 저장된 행", () => {
  it("게시된 강의에는 주소가 있어야 한다 (DB CHECK 와 같은 규칙)", () => {
    expect(
      conceptLectureSchema.safeParse(row({ status: "draft", videoUrl: null }))
        .success,
    ).toBe(true);
    expect(
      conceptLectureSchema.safeParse(
        row({ status: "published", videoUrl: null }),
      ).success,
    ).toBe(false);
    expect(
      conceptLectureSchema.safeParse(
        row({ status: "published", reviewedAt: "2026-09-15T01:00:00.000Z" }),
      ).success,
    ).toBe(true);
  });

  it("저장된 주소도 정규 watch 형태여야 한다", () => {
    expect(
      conceptLectureSchema.safeParse(
        row({ videoUrl: "https://youtu.be/aQkPcPqTq4M" }),
      ).success,
    ).toBe(false);
  });
});

describe("시청 기록 계약", () => {
  const view = (extra: Record<string, unknown> = {}) => ({
    studentId: "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
    lectureId: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
    maxSeconds: 60,
    percent: 46,
    completedAt: null,
    updatedAt: "2026-09-15T00:00:00.000Z",
    ...extra,
  });

  it("한 행 = 한 학생 × 한 강의 — 진도는 0~100 정수, 지점은 0 이상", () => {
    expect(conceptLectureViewSchema.safeParse(view()).success).toBe(true);
    for (const extra of [
      { percent: 101 },
      { percent: 46.5 },
      { maxSeconds: -1 },
    ]) {
      expect(conceptLectureViewSchema.safeParse(view(extra)).success).toBe(
        false,
      );
    }
  });

  it("재생기가 보내는 보고 — 음수·NaN 을 받지 않는다", () => {
    const report = {
      lectureId: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
      seconds: 12.4,
      percent: 9.6,
    };
    expect(conceptWatchReportSchema.safeParse(report).success).toBe(true);
    for (const extra of [
      { seconds: -1 },
      { percent: Number.NaN },
      { percent: 100.5 },
    ]) {
      expect(
        conceptWatchReportSchema.safeParse({ ...report, ...extra }).success,
      ).toBe(false);
    }
  });
});
