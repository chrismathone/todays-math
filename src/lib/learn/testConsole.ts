/**
 * 테스트 도구판 — 시험용 학생 계정(`test_s`)이 학생 화면의 모든 상태를 직접 만져 보는 도구(원장님 2026-09-28).
 *
 * 🔴 열리는 계정은 이 목록 하나로 정한다. 판정은 **서버가 DB 의 로그인 아이디로** 한다 — 세션에는 아이디가
 *    없고(`studentSession.ts`), 쿠키·화면 값은 믿지 않는다. 목록 밖의 학생에게는 버튼도, API 도 없다(404).
 *
 * 시간 이동은 쿠키 하나(날 수)다. 서버가 «지금»을 정하는 자리들이 `learnNow` 를 거치고, 쿠키는
 * **도구판 계정일 때만** 읽힌다(`testConsoleServer.ts`). 다른 학생이 쿠키를 지어 보내도 시계는 안 움직인다.
 */
import { normalizeLoginId } from "@/contracts/studentAccount.contract";

export const TEST_CONSOLE_LOGIN_IDS: readonly string[] = ["test_s"];

export const TEST_CLOCK_COOKIE = "learn-test-clock";
export const TEST_CLOCK_MIN_DAYS = -30;
export const TEST_CLOCK_MAX_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isTestConsoleLoginId(
  loginId: string | null | undefined,
): boolean {
  if (!loginId) return false;
  return TEST_CONSOLE_LOGIN_IDS.includes(normalizeLoginId(loginId));
}

/** 정수 날 수만 받는다. 범위 밖이거나 이상한 값은 0(지금) — 시계가 엉뚱한 해로 튀지 않게. */
export function parseClockOffset(raw: string | null | undefined): number {
  if (!raw || !/^-?\d{1,3}$/.test(raw)) return 0;
  const days = Number(raw);
  return days >= TEST_CLOCK_MIN_DAYS && days <= TEST_CLOCK_MAX_DAYS ? days : 0;
}

export function clockOffsetFromRequest(request: Request): number {
  const header = request.headers.get("cookie");
  if (!header) return 0;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === TEST_CLOCK_COOKIE) {
      try {
        return parseClockOffset(decodeURIComponent(part.slice(eq + 1).trim()));
      } catch {
        return 0;
      }
    }
  }
  return 0;
}

export function shiftedNow(real: Date, offsetDays: number): Date {
  return offsetDays === 0
    ? real
    : new Date(real.getTime() + offsetDays * DAY_MS);
}
