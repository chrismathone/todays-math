"use server";

import { auth, signOut } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

/**
 * 로그아웃 — **확인 없이 즉시** 나가고 로그인 화면으로 보낸다
 * (원장님 확정 2026-08-24: 되돌리기 쉬운 동작이라 확인 단계가 오히려 방해다).
 *
 * 서버 액션인 이유: 세션 쿠키를 지우는 일이라 서버에서만 할 수 있다.
 * 클라이언트 컴포넌트(AccountBadge)가 `<form action={signOutAction}>` 로 부른다.
 */
export async function signOutAction() {
  const session = await auth();
  if (session?.user?.id)
    await recordAudit({
      userId: session.user.id,
      actorId: session.user.id,
      action: "auth.logout",
      outcome: "success",
    });
  await signOut({ redirectTo: "/login" });
}
