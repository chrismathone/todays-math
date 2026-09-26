/**
 * GET /api/sso/eywa?token=<표> — eywa 에서 넘어오는 자동 로그인 (원장님 2026-09-26, D-139 ⑹ 2판).
 *
 * 판정은 Auth.js 의 `eywa-sso` 공급자(`src/lib/auth.ts` → `src/lib/eywaSso.ts`)가 한다. 세 갈래:
 *  ⑴ 표의 `sub` 가 연결된 계정 → 로그인하고 `/?entry=login`(이메일 로그인과 같은 표지 — 강사는 내 반, D-140 ⑶).
 *     이미 다른 계정·학생으로 로그인돼 있어도 **표의 계정으로 바꾼다** — eywa 에서 누른 사람이 곧 그 사람이다.
 *  ⑵ 표는 올바른데 그 `sub` 에 연결된 계정이 **아무 데도 없다** → 연결 대기 쿠키(`src/lib/eywaLinkPending.ts`)를
 *     심고, 🔴 **지금 세션(원장·학생 누구든)을 끝낸 뒤** `/login?callbackUrl=/account/eywa-link` 로. 연결은 반드시
 *     새 비밀번호 로그인 뒤 확인 화면의 [연결]에서만 일어난다.
 *     공격 모양: eywa 직원 A 가 **자기 표** 링크를 B 에게 눌리게 하면 B 브라우저에 A 의 연결 대기가 남는다 → B 가
 *     모르고 로그인해도 확인 화면에 A 의 이름·이메일이 보이고 버튼을 눌러야만 묶이므로 사람이 알아챈다.
 *     세션을 끊는 것은 B 가 **이미 로그인한 채로** 확인 화면에 닿지 않게 하려는 것이다(로그인 화면의 안내를 거치게).
 *  ⑶ 표가 틀림 · 연결된 계정이 정지·삭제·비밀번호 없음 → 평소 `/login`(연결 안내 없음 · 지금 세션 그대로).
 * 실패 문구 화면은 새로 만들지 않는다(D-07).
 *
 * 관문(`src/proxy.ts`)이 이 경로를 로그인 여부·학생 세션과 상관없이 통과시킨다.
 * 🔴 표는 주소에 실려 온다 — 오류 기록기는 `token` 칸을 가린다(`src/lib/errorLog/sanitize.ts`).
 */
import { CredentialsSignin } from "@auth/core/errors";
import { NextResponse, type NextRequest } from "next/server";

import { EYWA_LINK_PAGE_PATH } from "@/contracts/eywaLink.contract";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { LOGIN_LANDING } from "@/lib/loginLanding";
import {
  clearedEywaLinkPendingCookie,
  EYWA_LINK_PENDING_COOKIE,
  eywaLinkPendingCookie,
  sealEywaLinkPending,
} from "@/lib/eywaLinkPending";
import {
  EYWA_SSO_PROVIDER_ID,
  eywaSsoOptionsFromEnv,
  verifyEywaSsoToken,
} from "@/lib/eywaSso";

/**
 * ⑵ 인가 — 표가 올바르고 그 `sub` 가 **어느 계정에도** 연결돼 있지 않을 때만 연결 대기 값을 짓는다.
 * 연결된 계정이 있는데 로그인이 안 됐다면(정지·삭제·비밀번호 없음) 연결 안내를 띄우면 안 된다.
 * 🔴 여기서도 이메일로 찾지 않는다.
 */
async function pendingLinkFor(
  token: string,
  now: Date,
): Promise<string | null> {
  const verified = verifyEywaSsoToken(token, eywaSsoOptionsFromEnv(now));
  if (!verified.ok) return null;
  const { sub, name, email } = verified.claims;
  const linked = await db.user.findUnique({
    where: { eywaUserId: sub },
    select: { id: true },
  });
  if (linked) return null;
  return sealEywaLinkPending(
    { sub, name, email },
    { secret: process.env.AUTH_SECRET, now },
  );
}

async function handleGet(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const login = new URL("/login", request.nextUrl);
  const secure = request.nextUrl.protocol === "https:";
  if (!token) return NextResponse.redirect(login, 303);
  try {
    await signIn(EYWA_SSO_PROVIDER_ID, { token, redirect: false });
  } catch (error) {
    if (!(error instanceof CredentialsSignin)) throw error;
    const pending = await pendingLinkFor(token, new Date());
    if (!pending) return NextResponse.redirect(login, 303);
    await signOut({ redirect: false });
    login.searchParams.set("callbackUrl", EYWA_LINK_PAGE_PATH);
    const response = NextResponse.redirect(login, 303);
    response.cookies.set(eywaLinkPendingCookie(pending, secure));
    return response;
  }
  // 이메일 로그인과 같은 «로그인 직후» 표지 — 강사는 내 반, 나머지는 `/`(D-140 ⑶, `loginLanding.ts`)
  const response = NextResponse.redirect(
    new URL(LOGIN_LANDING, request.nextUrl),
    303,
  );
  // 연결된 계정으로 들어왔다 — 남아 있던 연결 대기는 더 물을 것이 없다
  if (request.cookies.has(EYWA_LINK_PENDING_COOKIE))
    response.cookies.set(clearedEywaLinkPendingCookie(secure));
  return response;
}

// 틀의 경로는 글자 그대로 — 전수 가드(errorLogRouteCoverage)가 상수를 «증명할 수 없는 모양»으로 본다
export const GET = withErrorLog("/api/sso/eywa", handleGet);
