import { describe, expect, it } from "vitest";
import {
  FADING_QUOTA_CHOICES,
  FADING_SERVICE_QUOTA,
  canEditFadingQuota,
  fadingQuotaChange,
  fadingQuotaOn,
  fadingQuotaView,
  type FadingQuotaRow,
} from "@/lib/fading/quota";
import { FADING_DAILY_CAP } from "@/lib/fading/numbers";

/**
 * 학생별 하루 분량 — 원장님 결정(2026-10-17 · `fading-quota-consensus-20261017.md` §7).
 * 서비스 기본 15칸 · 학생 지정 10 · 15 · 20 · 바꾼 값은 다음 한국 날짜부터. 오늘의 계획은 하루 도중에 바뀌지 않는다.
 */

const row = (o: Partial<FadingQuotaRow> = {}): FadingQuotaRow => ({
  quota: 10,
  previousQuota: null,
  effectiveOn: "2026-10-18",
  revision: 1,
  ...o,
});

describe("값", () => {
  it("서비스 기본은 15칸이고 홈 · 계획의 하루 상한과 한 값이다", () => {
    expect(FADING_SERVICE_QUOTA).toBe(15);
    expect(FADING_DAILY_CAP).toBe(FADING_SERVICE_QUOTA);
    expect([...FADING_QUOTA_CHOICES]).toEqual([10, 15, 20]);
  });
});

describe("그날의 분량", () => {
  it("행이 없으면 서비스 기본(null)", () => {
    expect(fadingQuotaOn(null, "2026-10-17")).toBeNull();
  });
  it("적용일 전날까지는 앞의 값, 적용일부터 새 값", () => {
    const r = row({ previousQuota: 20 });
    expect(fadingQuotaOn(r, "2026-10-17")).toBe(20);
    expect(fadingQuotaOn(r, "2026-10-18")).toBe(10);
    expect(fadingQuotaOn(r, "2026-11-01")).toBe(10);
  });
});

describe("바꾸기 — 다음 한국 날짜부터", () => {
  it("처음 바꾸면 오늘 값(기본)을 앞의 값으로 남기고 내일부터 새 값", () => {
    expect(fadingQuotaChange(null, "2026-10-17", 10)).toEqual({
      quota: 10,
      previousQuota: null,
      effectiveOn: "2026-10-18",
    });
  });
  it("같은 날 두 번 바꿔도 오늘 값은 그대로다", () => {
    const first = row({
      quota: 10,
      previousQuota: 20,
      effectiveOn: "2026-10-18",
    });
    expect(fadingQuotaChange(first, "2026-10-17", 15)).toEqual({
      quota: 15,
      previousQuota: 20,
      effectiveOn: "2026-10-18",
    });
  });
  it("며칠 뒤에 바꾸면 그날 적용 중인 값이 앞의 값이 된다", () => {
    expect(fadingQuotaChange(row({ quota: 10 }), "2026-10-25", null)).toEqual({
      quota: null,
      previousQuota: 10,
      effectiveOn: "2026-10-26",
    });
  });
  it("내일 값과 같으면 바꿀 것이 없다", () => {
    expect(fadingQuotaChange(row({ quota: 10 }), "2026-10-17", 10)).toBeNull();
    expect(fadingQuotaChange(null, "2026-10-17", null)).toBeNull();
  });
  it("고를 수 없는 값은 받지 않는다", () => {
    expect(() => fadingQuotaChange(null, "2026-10-17", 12 as never)).toThrow();
  });
});

describe("교사에게 내려가는 꼴", () => {
  it("오늘 값 · 예약된 다음 값 · revision", () => {
    expect(fadingQuotaView(row({ previousQuota: null }), "2026-10-17")).toEqual(
      {
        today: { quota: null, slots: 15 },
        next: { quota: 10, slots: 10, on: "2026-10-18" },
        revision: 1,
      },
    );
  });
  it("적용일이 지났으면 예약은 없다", () => {
    expect(fadingQuotaView(row(), "2026-10-20")).toEqual({
      today: { quota: 10, slots: 10 },
      next: null,
      revision: 1,
    });
  });
  it("행이 없으면 revision 0", () => {
    expect(fadingQuotaView(null, "2026-10-17")).toEqual({
      today: { quota: null, slots: 15 },
      next: null,
      revision: 0,
    });
  });
});

describe("누가 바꾸는가 — 원장 · 지점 관리자", () => {
  const base = { id: "u1" };
  it("지점 원장 · 지점 관리자 · 혼자 운영하는 원장 · 최고관리자는 바꾼다", () => {
    expect(
      canEditFadingQuota({ ...base, branchId: "b", branchRole: "owner" }),
    ).toBe(true);
    expect(
      canEditFadingQuota({ ...base, branchId: "b", branchRole: "manager" }),
    ).toBe(true);
    expect(canEditFadingQuota({ ...base, branchId: null })).toBe(true);
    expect(
      canEditFadingQuota({
        ...base,
        isSuperAdmin: true,
        branchRole: "teacher",
      }),
    ).toBe(true);
  });
  it("강사는 보기만이다 — 지점 관리 표시가 남아 있어도", () => {
    expect(
      canEditFadingQuota({ ...base, branchId: "b", branchRole: "teacher" }),
    ).toBe(false);
    expect(
      canEditFadingQuota({
        ...base,
        branchId: "b",
        branchRole: "teacher",
        isAdmin: true,
      }),
    ).toBe(false);
  });
  it("역할이 비면 지점 관리 표시로만 연다", () => {
    expect(canEditFadingQuota({ ...base, branchId: "b" })).toBe(false);
    expect(canEditFadingQuota({ ...base, branchId: "b", isAdmin: true })).toBe(
      true,
    );
  });
});
