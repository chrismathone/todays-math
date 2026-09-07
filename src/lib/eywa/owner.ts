/**
 * eywa 연계의 **소유자** — 계정 하나다.
 *
 * eywa 는 원장님 학원(한 곳)의 수업 보고서를 가져오는 배선이고, 그 소유자는
 * `EYWA_SYNC_OWNER_EMAIL` 하나로 정해진다(`runSync.ts` 가 그 계정에 반을 붙인다).
 * 그런데 2026-09-07 에 새 계정으로 걸어 보니 메인에 **남의 학원 동기화 상태**와
 * 「지금 가져오기」가 그대로 떴고, `POST /api/eywa-sync` 는 로그인만 돼 있으면 누구나
 * 부를 수 있었다. 「누구라도 처음부터 끝까지, eywa 배선 없이」(원장님 지시)가 그 자리에서
 * 막힌다.
 *
 * 판정은 **이 함수 하나**에서 나온다 — 라우트마다 이메일을 견주면 두 벌이 된다.
 * 소유자가 정해져 있지 않으면(환경변수 없음·빈 값) **아무도** 소유자가 아니다:
 * 빈 값끼리 같다고 통과시키면 배포 환경에 변수 하나 빠진 날 전원이 소유자가 된다.
 */
export function isEywaOwner(email: string): boolean {
  const owner = (process.env.EYWA_SYNC_OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!owner) return false;
  return email.trim().toLowerCase() === owner;
}
