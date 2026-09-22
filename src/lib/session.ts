/**
 * 세션 헬퍼 — 이후 모든 API(`src/app/api/**`)의 소유권 검증(`user_id` 일치 여부)에
 * 재사용되는 공용 함수 (T1.1 REFACTOR 산출물).
 *
 * 참조: docs/planning/07-coding-convention.md §5.2 "모든 API에서 세션 확인 + user_id 소유권 검증"
 *
 * 사용 예 (T2.1 이후 각 Route Handler):
 * ```ts
 * const sessionUser = await getSessionUser();
 * if (!sessionUser) return unauthorizedError();
 * // ... sessionUser.id로 Prisma where 절 소유권 필터링
 * ```
 */
import { auth } from "@/lib/auth";
import { noteErrorLog } from "@/lib/errorLog/scope";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  /**
   * 학원 운영 데이터의 소유 울타리를 넘는 계정인가(D-130). 판정은 `ownerScope.ts` 한 곳이 한다 —
   * 라우트가 이 값을 직접 견주지 않는다. 필수 칸이다: 세션 사용자를 만드는 자리(cron 소유자 등)가
   * 이 값을 **빠뜨리지 못하게** 타입이 막는다.
   */
  isAdmin: boolean;
};

/** 현재 요청의 로그인 사용자를 반환한다. 미인증이면 null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  // 이 요청이 거절·실패하면 오류 기록에 누구였는지 남긴다(승인 전 계정도) — 요청 밖이면 아무 일도 안 한다
  if (session?.user?.id) noteErrorLog({ userId: session.user.id });
  if (!session?.user?.id || session.user.approvalStatus !== "approved") {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    // 🔴 boolean `true` 만 관리자다 — jwt 콜백이 세션을 읽을 때마다 DB 에서 새로 싣는다(auth.ts).
    isAdmin: session.user.isAdmin === true,
  };
}
