/**
 * 🔴 RED → 🟢 — 학원 운영 데이터의 소유 범위 (D-130 ⑷ «판정은 한 곳»).
 *
 * 구현: src/lib/ownerScope.ts
 * 브리프: docs/planning/tracks/briefs/admin-sees-all.md §3·§4
 *
 * 여기서 잠그는 것은 **판정 하나와 그 판정이 내는 where 조각**이다. 라우트 배선은
 * `src/__tests__/api/adminSeesAll.test.ts` 가 같은 뷰어 짝으로 본다.
 *
 * 🔴 짝으로 둔다 — «관리자면 넓힌다»만 시험하면 «항상 넓힌다»가 초록이고(2026-09-07 재판),
 *    «관리자 아니면 좁힌다»만 시험하면 «항상 좁힌다»가 초록이다.
 */
import { describe, expect, it } from "vitest";

import {
  crossesOwnerFence,
  ownedRowsWhere,
  ownedStudentsWhere,
  personalViewer,
  withinOwnerScope,
} from "@/lib/ownerScope";

const ME = "10000000-0000-4000-8000-0000000000ad";
const ROLE_OWNER = "10000000-0000-4000-8000-000000000002";

const PLAIN = { id: ME, isAdmin: false };
const ADMIN = { id: ME, isAdmin: true };

describe("crossesOwnerFence — 넘는가", () => {
  it("관리자만 넘는다", () => {
    expect(crossesOwnerFence(ADMIN)).toBe(true);
    expect(crossesOwnerFence(PLAIN)).toBe(false);
  });

  it("🔴 표시가 없으면 넘지 않는다 — 빈 값을 «관리자»로 읽으면 세션 모양 하나 틀린 날 전원이 넘는다", () => {
    expect(crossesOwnerFence({ id: ME })).toBe(false);
    // 참 같은 값(문자열·숫자)도 참이 아니다 — 세션은 boolean 을 싣는다
    expect(
      crossesOwnerFence({ id: ME, isAdmin: "true" as unknown as boolean }),
    ).toBe(false);
    expect(
      crossesOwnerFence({ id: ME, isAdmin: 1 as unknown as boolean }),
    ).toBe(false);
  });
});

describe("ownedRowsWhere — 반·시험지(userId 칸) where 조각", () => {
  it("관리자 아님: 자기 것만 — 지금과 글자 그대로 같다", () => {
    expect(ownedRowsWhere(PLAIN)).toEqual({ userId: ME });
  });

  it("관리자: 소유자 조건이 없다", () => {
    expect(ownedRowsWhere(ADMIN)).toEqual({});
  });

  it("🔴 좁힐 때 userId 가 undefined 로 새지 않는다 — Prisma 는 undefined 조건을 «조건 없음»으로 읽는다", () => {
    const where = ownedRowsWhere({ id: ME });
    expect(Object.keys(where)).toEqual(["userId"]);
    expect((where as { userId?: string }).userId).toBe(ME);
  });
});

describe("ownedStudentsWhere — 학생은 반을 거쳐 소유자에 닿는다", () => {
  it("관리자 아님: 소속 반의 소유자가 나", () => {
    expect(ownedStudentsWhere(PLAIN)).toEqual({ class: { userId: ME } });
  });

  it("관리자: 조건이 없다", () => {
    expect(ownedStudentsWhere(ADMIN)).toEqual({});
  });
});

describe("withinOwnerScope — 읽어 온 행의 소유자가 범위 안인가", () => {
  it("관리자 아님: 내 것은 안, 남의 것은 밖", () => {
    expect(withinOwnerScope(PLAIN, ME)).toBe(true);
    expect(withinOwnerScope(PLAIN, ROLE_OWNER)).toBe(false);
  });

  it("관리자: 남의 것도 안", () => {
    expect(withinOwnerScope(ADMIN, ME)).toBe(true);
    expect(withinOwnerScope(ADMIN, ROLE_OWNER)).toBe(true);
  });
});

describe("personalViewer — 개인 작업물 라우트는 관리자여도 안 넘는다 (D-130 ⑶)", () => {
  it("관리자 세션에서 만들어도 넘지 않는다", () => {
    const viewer = personalViewer(ADMIN);
    expect(viewer.id).toBe(ME);
    expect(crossesOwnerFence(viewer)).toBe(false);
    expect(withinOwnerScope(viewer, ROLE_OWNER)).toBe(false);
    expect(ownedRowsWhere(viewer)).toEqual({ userId: ME });
  });
});
