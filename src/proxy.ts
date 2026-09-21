/**
 * 모든 요청이 지나는 관문 — 로그인 확인과 **역할 게이트**.
 *
 * 역할 규칙: src/lib/routeAccess.ts (허용 목록)
 *
 * ⚠️ Next 16 은 `middleware` 를 `proxy` 로 바꿨다. 둘 다 있으면 **서버가 안 뜬다**
 *    (2026-08-20 에 실제로 그랬다 — 단위 테스트 148파일이 전부 초록인데 앱이 안 켜졌다).
 *    관문은 **이 파일 하나**다. `src/middleware.ts` 를 새로 만들지 말 것.
 *
 * 왜 관문 하나인가: 라우트마다 검사를 넣으면 **새 라우트에서 넣는 걸 잊는다.**
 * 그리고 잊었을 때 열려 버린다. 관문이 하나면 잊을 자리가 없다.
 */
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requestedCallbackUrl } from "@/lib/callbackUrl";
import { routeAccessFor } from "@/lib/routeAccess";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { recordAudit } from "@/lib/audit";
import {
  anonymousLearnGate,
  studentGateFor,
  type LearnGate,
} from "@/lib/studentRouteAccess";
import type { AccountAccess } from "@/contracts/accountAccess.contract";

/** 학생 관문의 판정 → 응답. 막힌 API 는 403 **JSON**(화면용 되돌림을 fetch 가 파싱하다 죽는다). */
function learnGateResponse(gate: LearnGate, url: URL): Response {
  if (gate.kind === "allow") return NextResponse.next();
  if (gate.kind === "redirect")
    return NextResponse.redirect(new URL(gate.to, url));
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: gate.message } },
    { status: 403 },
  );
}

/**
 * 수학 랩실 읽기 — `/lab` 과 그 아래의 GET·HEAD. 판정은 **이 함수 하나**다.
 * `startsWith("/lab")` 는 `/label`·`/labx` 까지 열어서 `/lab` 과 그 아래로 좁혔다(proxyLabGate.test.ts).
 */
function isLabRead(method: string, pathname: string): boolean {
  return (
    (method === "GET" || method === "HEAD") &&
    (pathname === "/lab" || pathname.startsWith("/lab/"))
  );
}

export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;
  /**
   * 수학 랩실은 **누구든** 읽는다 — 로그인 안 한 사람 · 원장 · 선생님 · 검수 · 승인 대기 · 학생 세션
   * (원장님 2026-09-21, D-135 ⑻⑼). 랩실은 서버·DB 를 안 부르고 진도는 브라우저에만 있다.
   * 그래서 학생 갈래·역할 갈래보다 **먼저** 보내고, 운영 데이터를 안 보니 요청 감사 기록도 안 남긴다.
   * 쓰기와 `/lab` 밖은 아래 규칙 그대로다 — 학생 세션이 `/lab` 밖에서 얻는 것은 늘지 않는다.
   */
  if (isLabRead(req.method, pathname)) return NextResponse.next();
  /**
   * 🔴 학생 세션 — **원장 갈래보다 먼저** 가둔다 (D-124 ⑶ · D-125 ⑷).
   * 학생 세션에는 `user` 가 없다(src/lib/learn/studentSession.ts). 아래로 흘러가면 «로그인 안 한
   * 사람»으로 읽혀 `/` · `/api/**` · 공개 그림이 열린다 — 그래서 허용 목록
   * (src/lib/studentRouteAccess.ts)으로 여기서 끝낸다. 학생 요청은 아래 줄을 하나도 타지 않는다.
   */
  const student = req.auth?.student;
  if (student)
    return learnGateResponse(
      studentGateFor(student.mustChangePassword, req.method, pathname),
      req.nextUrl,
    );
  // 로그인 안 한 사람의 /learn — 원장님 /login 이 아니라 학생 로그인으로(D-125 ⑷). /learn 밖은 null.
  if (!req.auth?.user?.id) {
    const learn = anonymousLearnGate(req.method, pathname);
    if (learn) return learnGateResponse(learn, req.nextUrl);
  }
  // Public shared figures must also load in the cookie-free PDF renderer.
  // Personal materials stay behind their /api/library authorization.
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    (pathname === "/favicon.ico" ||
      pathname === "/icon.svg" ||
      pathname === "/apple-icon.png" ||
      pathname.startsWith("/brand/") ||
      pathname.startsWith("/figures/") ||
      pathname.startsWith("/figures-svg/") ||
      pathname.startsWith("/api/shared-figures/"))
  )
    return NextResponse.next();
  const isPublic =
    ((req.method === "GET" || req.method === "HEAD") && pathname === "/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/dev/") ||
    pathname === "/favicon.ico";

  if (!req.auth?.user?.id && !isPublic) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set(
      "callbackUrl",
      requestedCallbackUrl(pathname, req.nextUrl.search),
    );
    return NextResponse.redirect(login);
  }

  /**
   * 역할 게이트. 로그인 안 한 요청은 여기서 판정하지 않는다 —
   * 화면은 위에서 로그인으로 보냈고, API 는 각 라우트가 401 을 낸다.
   *
   * ⚠️ `role` 이 **없는** 세션은 원장으로 본다. DB 기본값이 director 이고,
   *    이 기능이 나가기 전에 발급된 토큰은 전부 원장 것이다.
   *    반대로 읽으면 배포 순간 **원장이 자기 서비스에서 잠긴다.**
   */
  if (req.auth?.user?.id) {
    const user = req.auth.user;
    const account: AccountAccess = {
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      role: user.role,
      isAdmin: user.isAdmin === true,
      approvalStatus: user.approvalStatus ?? "pending",
      menus: user.menus ?? [],
    };
    const allowed = accountRouteAllowed(account, req.method, pathname);
    const bypassLegacy =
      account.isAdmin ||
      pathname === "/approval-pending" ||
      pathname.startsWith("/api/account/") ||
      (pathname === "/" && !account.menus.includes("bank"));
    const role = user.role === "reviewer" ? "reviewer" : "director";
    const legacyDenied =
      !bypassLegacy && routeAccessFor(role, req.method, pathname) === "deny";
    // Record requested/denied operations without query strings, credentials or bodies.
    if (
      !pathname.startsWith("/api/auth/") &&
      !pathname.startsWith("/api/account/") &&
      (pathname.startsWith("/api/") || !pathname.includes("."))
    )
      await recordAudit({
        userId: user.id,
        actorId: user.id,
        action: "request",
        outcome: allowed && !legacyDenied ? "requested" : "denied",
        details: { method: req.method, path: pathname },
      });
    if (!allowed) {
      if (pathname.startsWith("/api/"))
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message:
                account.approvalStatus !== "approved"
                  ? "관리자의 가입 승인이 필요합니다."
                  : "사용 권한이 없는 메뉴입니다.",
            },
          },
          { status: 403 },
        );
      return NextResponse.redirect(
        new URL(
          account.approvalStatus !== "approved" ? "/approval-pending" : "/",
          req.nextUrl,
        ),
      );
    }
    if (legacyDenied) {
      if (pathname.startsWith("/api/")) {
        // 화면용 리다이렉트를 API 에 주면 fetch 가 HTML 을 파싱하다 죽는다.
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "검수 전용 계정은 이 기능을 쓸 수 없습니다.",
            },
          },
          { status: 403 },
        );
      }
      // 화면이면 검수 콘솔로 되돌린다 — 빈 「권한 없음」 화면보다 낫다.
      const url = req.nextUrl.clone();
      url.pathname = "/review";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
