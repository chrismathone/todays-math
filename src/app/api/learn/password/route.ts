/**
 * POST /api/learn/password — 학생이 스스로 비밀번호를 바꾼다 (첫 로그인 — 브리프 §2.3 · D-125 ⑶).
 *
 * - 새 번호는 발급과 **같은 제외 규칙**(숫자 4자리 · 쉬운 번호 제외 — `studentNewPinSchema`).
 * - 지금 번호를 대 본다 — 로그인과 **같은 잠금**(`verifyStudentPin`)을 탄다. 틀리면 잠금 수에 들고,
 *   다섯 번이면 로그인도 잠긴다(세션을 가진 사람이 지금 번호를 알아내는 길을 막는다).
 * - 바꾸면 첫 로그인 표시를 내리고 `passwordChangedAt` 을 찍는다. 저장은 해시만.
 * 첫 로그인 학생도 여기는 온다(관문 허용 목록의 한 갈래). 대응 계약: src/contracts/studentAccount.contract.ts
 */
import type { NextRequest } from "next/server";

import {
  STUDENT_LOGIN_MESSAGES,
  studentPasswordChangeRequestSchema,
  studentPasswordChangeResponseSchema,
} from "@/contracts/studentAccount.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { crossSiteError } from "@/lib/learn/accountRoutes";
import { studentLoginDeps } from "@/lib/learn/loginDeps";
import { hashStudentPin } from "@/lib/learn/pinHash";
import { ACCOUNT_LOGIN_SELECT } from "@/lib/learn/prismaLoginStore";
import { verifyStudentPin } from "@/lib/learn/studentLogin";
import { requireStudent } from "@/lib/learn/studentRequest";

export async function POST(request: NextRequest) {
  const gate = await requireStudent({ active: false });
  if (gate.response) return gate.response;
  if (!sameOriginMutation(request)) return crossSiteError();

  const body = await request.json().catch(() => undefined);
  const parsed = studentPasswordChangeRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const account = await db.studentAccount.findUnique({
    where: { id: gate.student.accountId },
    select: ACCOUNT_LOGIN_SELECT,
  });
  if (!account || account.disabledAt !== null) return unauthorizedError();

  const who = { studentAccountId: account.id, studentId: account.studentId };
  const check = await verifyStudentPin(
    account,
    parsed.data.currentPassword,
    studentLoginDeps(),
  );
  if (check !== "ok") {
    await recordAudit({
      action: "student_auth.password",
      outcome: "failed",
      details: { ...who, reason: check },
    });
    return check === "locked"
      ? jsonError("TOO_MANY_ATTEMPTS", STUDENT_LOGIN_MESSAGES.locked, 429)
      : jsonError("UNAUTHORIZED", STUDENT_LOGIN_MESSAGES.wrongCurrentPin, 401);
  }

  await db.studentAccount.update({
    where: { id: account.id },
    data: {
      passwordHash: await hashStudentPin(parsed.data.newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });
  await recordAudit({
    action: "student_auth.password",
    outcome: "success",
    details: who,
  });
  return jsonOk(studentPasswordChangeResponseSchema, {
    data: { mustChangePassword: false },
  });
}
