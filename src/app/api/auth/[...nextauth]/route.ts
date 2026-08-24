/**
 * Auth.js(NextAuth v5) 표준 라우트 — 이메일 로그인(Credentials) 콜백과 세션 조회를
 * 내부적으로 처리한다 (`/api/auth/callback/credentials`, `/api/auth/session` 등).
 *
 * ⚠️ 구글(OAuth) 로그인은 원장님 지시로 완전히 제거됐다(2026-08-14, 절대 규칙 7).
 *    예전 주석이 「구글 OAuth 콜백」을 처리한다고 적어 두어 **다시 넣어도 되는 것처럼
 *    읽혔다** — 로그인 수단은 이메일/비밀번호 하나뿐이다. `src/lib/auth.ts` 머리주석 참조.
 *
 * `/api/auth/session` 은 헤더 계정 구역(AccountBadge, D-77)이 «지금 누구인가»를 묻는
 * 경로이기도 하다.
 *
 * 실제 Provider/세션 설정은 `src/lib/auth.ts`가 SSOT — 이 파일은 핸들러만 그대로 노출한다.
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
