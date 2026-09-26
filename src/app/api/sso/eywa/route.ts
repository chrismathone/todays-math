/**
 * GET /api/sso/eywa?token=<표> — eywa 에서 넘어오는 자동 로그인 (원장님 2026-09-26).
 *
 * 판정은 Auth.js 의 `eywa-sso` 공급자(`src/lib/auth.ts` → `src/lib/eywaSso.ts`)가 한다. 여기는 표를 넘기고
 * 결과에 따라 보낸다 — 들어왔으면 `/`(역할·승인 대기 갈래는 관문과 첫 화면이 원장 로그인과 같게 정한다),
 * 못 들어왔으면 평소 로그인 화면 `/login`. 실패 문구 화면은 새로 만들지 않는다(D-07).
 *
 * 이미 다른 계정으로 로그인돼 있으면 **표의 계정으로 바꾼다** — eywa 에서 누른 사람이 곧 그 사람이다.
 * 학생 세션도 마찬가지라 관문(`src/proxy.ts`)이 이 경로를 로그인 여부와 상관없이 통과시킨다.
 * 🔴 표는 주소에 실려 온다 — 오류 기록기는 `token` 칸을 가린다(`src/lib/errorLog/sanitize.ts`).
 */
import { CredentialsSignin } from "@auth/core/errors";
import { NextResponse, type NextRequest } from "next/server";

import { signIn } from "@/lib/auth";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { EYWA_SSO_PATH, EYWA_SSO_PROVIDER_ID } from "@/lib/eywaSso";

async function handleGet(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const login = new URL("/login", request.nextUrl);
  if (!token) return NextResponse.redirect(login, 303);
  try {
    await signIn(EYWA_SSO_PROVIDER_ID, { token, redirect: false });
  } catch (error) {
    if (!(error instanceof CredentialsSignin)) throw error;
    return NextResponse.redirect(login, 303);
  }
  return NextResponse.redirect(new URL("/", request.nextUrl), 303);
}

export const GET = withErrorLog(EYWA_SSO_PATH, handleGet);
