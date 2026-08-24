/**
 * MSW 핸들러 — 인증 (T0.5.2).
 * 대응 계약: src/contracts/auth.contract.ts
 * 대응 API 경로: POST /api/auth/signup · GET /api/auth/session
 */
import { http, HttpResponse, type HttpHandler } from "msw";

import {
  authSignupRequestSchema,
  authSignupResponseSchema,
} from "@/contracts/auth.contract";

import { MOCK_EXISTING_SIGNUP_EMAIL, MOCK_TEACHER } from "../data";
import { jsonError, jsonOk, validationError } from "./_helpers";

export const authHandlers: HttpHandler[] = [
  /**
   * GET /api/auth/session — Auth.js(NextAuth v5) 표준 세션 조회.
   *
   * 헤더 계정 구역(AccountBadge, D-76)이 «지금 누구인가»를 이 경로로 묻는다.
   * 계약 파일이 아니라 **Auth.js 가 정하는 모양**이라 여기서 그 모양 그대로 흉내낸다
   * (`{ user: { id, email, name }, expires }`).
   */
  http.get("/api/auth/session", () =>
    HttpResponse.json({
      user: {
        id: MOCK_TEACHER.id,
        email: MOCK_TEACHER.email,
        name: MOCK_TEACHER.name,
      },
      expires: "2099-01-01T00:00:00.000Z",
    }),
  ),

  // POST /api/auth/signup — 이메일 회원가입
  http.post("/api/auth/signup", async ({ request }) => {
    const body = await request.json();
    const parsed = authSignupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    // 대표 실패 경로 — 이미 가입된 이메일(CONFLICT).
    if (parsed.data.email === MOCK_EXISTING_SIGNUP_EMAIL) {
      return jsonError("CONFLICT", "이미 가입된 이메일입니다.", 409);
    }

    return jsonOk(
      authSignupResponseSchema,
      {
        data: {
          id: crypto.randomUUID(),
          email: parsed.data.email,
          name: parsed.data.name,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }),
];
