/**
 * 테스트 도구판의 서버 쪽 판정 — «이 학생이 도구판 계정인가»와 «이 요청의 지금».
 * 규칙은 `testConsole.ts` 에 있고, 여기는 DB 를 보는 자리만.
 */
import "server-only";

import { db } from "@/lib/db";

import {
  clockOffsetFromRequest,
  isTestConsoleLoginId,
  shiftedNow,
} from "./testConsole";

/** 도구판 계정이면 로그인 아이디, 아니면(끈 계정 포함) null. */
export async function testConsoleLoginId(
  studentId: string,
): Promise<string | null> {
  const account = await db.studentAccount.findUnique({
    where: { studentId },
    select: { loginId: true, disabledAt: true },
  });
  if (!account || account.disabledAt) return null;
  return isTestConsoleLoginId(account.loginId) ? account.loginId : null;
}

/**
 * 학생 API 가 «지금»을 정하는 자리. 시간 이동 쿠키가 없으면 DB 를 보지 않고 곧장 실제 시각이다 —
 * 쿠키가 있어도 도구판 계정이 아니면 실제 시각이다(다른 학생이 쿠키를 지어 보내도 안 움직인다).
 */
export async function learnNow(
  studentId: string,
  request: Request,
  real: Date = new Date(),
): Promise<Date> {
  const offset = clockOffsetFromRequest(request);
  if (offset === 0) return real;
  return (await testConsoleLoginId(studentId))
    ? shiftedNow(real, offset)
    : real;
}
