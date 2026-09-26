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
  canManageClassStudents,
  canManageRoster,
  crossesOwnerFence,
  ownedRowsWhere,
  ownedStudentsWhere,
  personalViewer,
  withinOwnerScope,
} from "@/lib/ownerScope";

const ME = "10000000-0000-4000-8000-0000000000ad";
const ROLE_OWNER = "10000000-0000-4000-8000-000000000002";

const PLAIN = { id: ME, isAdmin: false };
const ADMIN = { id: ME, isAdmin: true, isSuperAdmin: true };
const MANAGER = { id: ME, isAdmin: true, branchId: "branch-1" };

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

describe("지점별 소유 범위", () => {
  // D-140 — 이 판정은 «반 만들기·반 설정·지점 전체»만 뜻한다. 자기 반 학생 명단·계정은 아래 `canManageClassStudents`.
  it("지점 강사만 반 만들기·지점 명단을 막고 독립 운영자는 자기 반을 관리한다", () => {
    expect(
      canManageRoster({ id: ME, branchId: "branch-1", isAdmin: false }),
    ).toBe(false);
    expect(canManageRoster(MANAGER)).toBe(true);
    expect(canManageRoster(PLAIN)).toBe(true);
    expect(canManageRoster({ id: ME, branchRole: "teacher" })).toBe(false);
  });
  it("지점장은 같은 지점의 반·학생만 조회하고 다른 지점은 거절한다", () => {
    expect(ownedRowsWhere(MANAGER)).toEqual({ user: { branchId: "branch-1" } });
    expect(ownedStudentsWhere(MANAGER)).toEqual({
      class: { user: { branchId: "branch-1" } },
    });
    expect(withinOwnerScope(MANAGER, ROLE_OWNER, "branch-1")).toBe(true);
    expect(withinOwnerScope(MANAGER, ROLE_OWNER, "branch-2")).toBe(false);
    expect(withinOwnerScope({ id: ME, isAdmin: true }, ROLE_OWNER)).toBe(false);
  });
});

describe("D-140 — 자기 반 학생 명단·계정은 담당 강사도 (원장님 2026-09-26)", () => {
  const TEACHER = {
    id: ME,
    isAdmin: false,
    branchId: "branch-1",
    branchRole: "teacher" as const,
  };

  it("강사는 자기 반 학생 명단·계정을 다룬다 — 반 만들기·지점 전체는 여전히 못 한다", () => {
    expect(canManageClassStudents(TEACHER)).toBe(true);
    expect(canManageRoster(TEACHER)).toBe(false);
  });

  it("원장·관리자·독립 운영자·서비스 관리자는 둘 다 된다 — 넓힌 쪽이 좁아지지 않는다", () => {
    for (const viewer of [MANAGER, PLAIN, ADMIN]) {
      expect(canManageClassStudents(viewer)).toBe(true);
      expect(canManageRoster(viewer)).toBe(true);
    }
  });

  it("🔴 «자기 반»은 이 판정이 아니라 소유 범위가 정한다 — 강사에게 남의 반은 여전히 밖", () => {
    expect(withinOwnerScope(TEACHER, ME)).toBe(true);
    expect(withinOwnerScope(TEACHER, ROLE_OWNER, "branch-1")).toBe(false);
    expect(crossesOwnerFence(TEACHER)).toBe(false);
    expect(ownedStudentsWhere(TEACHER)).toEqual({ class: { userId: ME } });
  });

  it("🔴 빈 값은 열지 않는다 — 지점에 속했는데 역할이 비었거나 모르는 값이면 닫힌다", () => {
    expect(
      canManageClassStudents({ id: ME, isAdmin: false, branchId: "branch-1" }),
    ).toBe(false);
    expect(
      canManageClassStudents({
        id: ME,
        isAdmin: false,
        branchId: "branch-1",
        branchRole: "Teacher" as unknown as "teacher",
      }),
    ).toBe(false);
  });
});
