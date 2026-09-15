/**
 * POST /api/learn/login — 학생 로그인 (D-124 ⑶ · D-125 ⑶⑷, 원장님 `/api/auth/callback/credentials` 와 따로).
 *
 * 진짜 판정은 Auth.js 의 학생 공급자(`src/lib/auth.ts` → `src/lib/learn/studentLogin.ts`)가 한다 — 여기는
 * 본문을 검사하고 `signIn("student")` 을 부른 뒤, 공급자가 던진 코드(`invalid`·`locked`)를 문구로 옮긴다.
 * 🔴 실패 문구는 **하나**다(아이디 존재를 흘리지 않는다). 잠금 문구도 없는 아이디에 똑같이 나간다.
 * 형식이 틀린 본문(400)·다른 사이트(403)는 번호를 대 보기 **전에** 돌려보낸다 — 잠금 수에 안 든다.
 * 대응 계약: src/contracts/studentAccount.contract.ts
 */
import { CredentialsSignin } from "@auth/core/errors";
import type { NextRequest } from "next/server";

import {
  STUDENT_LOGIN_MESSAGES,
  studentLoginRequestSchema,
  studentLoginResponseSchema,
} from "@/contracts/studentAccount.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { jsonError, jsonOk, validationError } from "@/lib/apiResponse";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { crossSiteError } from "@/lib/learn/accountRoutes";
import { STUDENT_PROVIDER_ID } from "@/lib/learn/studentSession";

export async function POST(request: NextRequest) {
  if (!sameOriginMutation(request)) return crossSiteError();

  const body = await request.json().catch(() => undefined);
  const parsed = studentLoginRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await signIn(STUDENT_PROVIDER_ID, {
      loginId: parsed.data.loginId,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (!(error instanceof CredentialsSignin)) throw error;
    return error.code === "locked"
      ? jsonError("TOO_MANY_ATTEMPTS", STUDENT_LOGIN_MESSAGES.locked, 429)
      : jsonError("UNAUTHORIZED", STUDENT_LOGIN_MESSAGES.invalid, 401);
  }

  // 화면이 곧장 비밀번호 바꾸기로 갈지 정하게 — 관문도 요청마다 같은 칸을 본다
  const account = await db.studentAccount.findUnique({
    where: { loginId: parsed.data.loginId },
    select: { mustChangePassword: true },
  });
  return jsonOk(studentLoginResponseSchema, {
    data: { mustChangePassword: account?.mustChangePassword ?? true },
  });
}
