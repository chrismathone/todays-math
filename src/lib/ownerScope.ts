/**
 * 학원 운영 데이터의 **소유 범위** — D-130 의 «관리자면 넘는다»는 이 파일 **한 곳**에서만 판정한다.
 *
 * 결정: docs/planning/07-coding-convention.md D-130 · 브리프: docs/planning/tracks/briefs/admin-sees-all.md
 *
 * ## 넘는 것 · 안 넘는 것
 *
 *   넘는다(읽기 + 쓰기) — 반 · 학생 · 진도 · 진도 계획 · 시험지 · 「오늘의 확인테스트」 · 기본 범위 ·
 *                        작업실 개요 숫자 · 주간 지표 · 오늘의 개념 판(반·진도 읽기) · 아침 자동 초안 ·
 *                        학생 로그인 계정 발급·다시 발급·끄기(원장님 2026-09-16 «발급도 관리자에게 열고»)
 *   안 넘는다          — 장바구니 · 작업실 문서·자료 · 예측 회차(과 그 시험지 배점) · 문항 소유(D-31) ·
 *                        eywa 갈래(`isEywaOwner`)
 *
 * ## 왜 한 곳인가
 *
 * 2026-09-07 에 새 계정이 원장님 학원 데이터를 봤다(넓게 샌 쪽). 이번 결정은 그 반대 방향으로
 * **일부러** 넓힌다. 라우트마다 `userId: session.id` 옆에 `isAdmin ? … : …` 를 적으면 넓히는 자리와
 * 안 넓히는 자리가 스무 곳에 흩어지고, 한 곳이 뒤집혀도 아무도 모른다. 그래서
 *
 *   · 판정은 `crossesOwnerFence` 하나 — 변이 하네스(`scripts/qa/mutate-admin-scope.ts`)가 이 한 줄을
 *     «절대 안 넘는다»·«항상 넘는다» **두 방향으로** 뒤집어 짝 시험이 빨개지는지 본다.
 *   · 라우트는 where 조각(`ownedRowsWhere`·`ownedStudentsWhere`)이나 404/403 헬퍼(`ownership.ts`)만 쓴다.
 *
 * ## 🔴 빈 값은 «넘지 않는다»다
 *
 * 표시가 없거나 boolean `true` 가 아니면 넘지 않는다 — 세션 모양 하나 틀린 날 전원이 관리자가 되는
 * 길을 막는다(`isEywaOwner` 의 «빈 값끼리 같다고 통과시키지 않는다»와 같은 결).
 * `isAdmin` 은 로그인 때가 아니라 **세션을 읽을 때마다** DB 에서 새로 읽힌다(`auth.ts` jwt 콜백) —
 * 관리자 표시를 내리면 다음 요청부터 좁혀진다.
 */

/** 소유 범위를 묻는 사람 — 세션 사용자(`SessionUser`)·계정(`AccountAccess`)이 그대로 들어온다. */
export interface ScopeViewer {
  readonly id: string;
  readonly isAdmin?: boolean;
  readonly isSuperAdmin?: boolean;
  readonly branchId?: string | null;
  readonly branchRole?: "owner" | "manager" | "teacher" | null;
}

/**
 * **반 만들기 · 반 설정 · 학생 삭제·이름 바꾸기 — 지점 전체** 판정. 지점 소속 강사는 못 한다.
 * 독립 운영자는 본인 반을 직접 관리한다. 자기 반 학생 명단·계정은 `canManageClassStudents`(D-140).
 */
export function canManageRoster(viewer: ScopeViewer): boolean {
  if (viewer.isSuperAdmin === true) return true;
  if (viewer.branchRole === "teacher") return false;
  return viewer.isAdmin === true || !viewer.branchId;
}

/**
 * **자기 반 학생 등록 · 로그인 발급 · 다시 발급 · 끄기** 판정 — 위 판정에 **담당 강사**를 더한다
 * (D-140, 원장님 2026-09-26 «강사가 로그인했을 때 자신의 반이 뜨고 … 학생들 계정 생성 가능하게»).
 *
 * 🔴 «자기 반»은 여기서 정하지 않는다 — 라우트가 반·학생을 읽은 뒤 `withinOwnerScope`(`ownership.ts` 헬퍼)로
 *    거른다. 강사는 소유 울타리를 넘지 않으므로(`crossesOwnerFence` 거짓) `Class.userId` 가 나인 반만 안이다.
 *    역할이 비었거나 모르는 값이면 위 판정 그대로다(빈 값은 열지 않는다).
 */
export function canManageClassStudents(viewer: ScopeViewer): boolean {
  return canManageRoster(viewer) || viewer.branchRole === "teacher";
}

/** 🔴 **유일한 판정** — 이 사람은 학원 운영 데이터의 소유 울타리를 넘는가. */
export function crossesOwnerFence(viewer: ScopeViewer): boolean {
  return (
    viewer.isSuperAdmin === true ||
    (viewer.isAdmin === true && Boolean(viewer.branchId))
  );
}

/**
 * `userId` 칸을 가진 표(반 `Class` · 시험지 `Test`)의 where 조각.
 * 관리자 아님은 `{ userId }` — 넓히기 전과 **글자 그대로 같다**. 관리자는 소유자 조건이 없다.
 *
 * ⚠️ 좁힐 때 `userId: undefined` 를 내지 않는다 — Prisma 는 undefined 조건을 «조건 없음»으로 읽는다.
 */
export function ownedRowsWhere(viewer: ScopeViewer) {
  if (viewer.isSuperAdmin === true) return {};
  if (viewer.isAdmin === true && viewer.branchId)
    return { branchId: viewer.branchId };
  return {
    userId: viewer.id,
    OR: [
      { branchId: null },
      ...(viewer.branchId ? [{ branchId: viewer.branchId }] : []),
    ],
  };
}

/** 학생(`Student`)의 where 조각 — 학생은 `userId` 가 없어 소속 반을 거쳐 소유자에 닿는다. */
export function ownedStudentsWhere(
  viewer: ScopeViewer,
):
  | { class: { userId: string } }
  | { class: { branchId: string } }
  | Record<string, never> {
  if (viewer.isSuperAdmin === true) return {};
  if (viewer.isAdmin === true && viewer.branchId)
    return { class: { branchId: viewer.branchId } };
  return { class: { userId: viewer.id } };
}

/** 이미 읽어 온 행의 소유자(`ownerUserId`)가 이 사람의 범위 안인가 — 404/403 을 가르는 자리가 쓴다. */
export function withinOwnerScope(
  viewer: ScopeViewer,
  ownerUserId: string,
  ownerBranchId?: string | null,
): boolean {
  return (
    viewer.isSuperAdmin === true ||
    (ownerUserId === viewer.id &&
      (!ownerBranchId || ownerBranchId === viewer.branchId)) ||
    (viewer.isAdmin === true &&
      Boolean(viewer.branchId) &&
      viewer.branchId === ownerBranchId)
  );
}

/**
 * 개인 작업물 라우트가 쓰는 뷰어 — **관리자여도 넘지 않는다**(D-130 ⑶).
 * 장바구니에서 시험지를 만드는 길(`api/basket/test`)이 반 소유를 물을 때 쓴다. 넓히려면 리드 결정이 먼저다.
 */
export function personalViewer(viewer: ScopeViewer): ScopeViewer {
  return {
    id: viewer.id,
    isAdmin: false,
    isSuperAdmin: false,
    ...(viewer.branchId ? { branchId: viewer.branchId } : {}),
  };
}
