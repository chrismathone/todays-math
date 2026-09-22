import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { noteErrorLog } from "@/lib/errorLog/scope";
import type { AccountAccess } from "@/contracts/accountAccess.contract";

export const getAccountAccess = cache(
  async (): Promise<AccountAccess | null> => {
    const session = await auth();
    if (!session?.user?.id) return null;
    // 이 요청이 거절·실패하면 오류 기록에 누구였는지 남긴다 — 요청 밖이면 아무 일도 안 한다
    noteErrorLog({ userId: session.user.id });
    return {
      id: session.user.id,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      role: session.user.role,
      isAdmin: session.user.isAdmin === true,
      approvalStatus: session.user.approvalStatus ?? "pending",
      menus: session.user.menus ?? [],
    };
  },
);

export function sameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  const expected = configured
    ? new URL(configured).origin
    : new URL(request.url).origin;
  return (
    origin === expected &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}

export async function authorizeAccount(request?: Request, adminOnly = false) {
  const account = await getAccountAccess();
  const fail = (status: number, message: string) => ({
    account: null,
    response: Response.json(
      {
        error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message },
      },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  });
  if (!account) return fail(401, "로그인이 필요합니다.");
  if (account.approvalStatus !== "approved")
    return fail(403, "관리자의 가입 승인이 필요합니다.");
  if (adminOnly && !account.isAdmin)
    return fail(403, "관리자만 사용할 수 있습니다.");
  if (
    request &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !sameOriginMutation(request)
  )
    return fail(403, "같은 사이트에서 요청해 주세요.");
  return { account, response: null };
}
