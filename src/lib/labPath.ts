/**
 * 수학 랩실 경로 — `/lab` 과 그 아래. 판정은 **이 함수 하나**다.
 *
 * 원장님 결정(2026-09-21, D-135 ⑼): 랩실은 누구나 열고 **기록을 남기지 않는다**. 부르는 곳이 둘이다 —
 * 관문(src/proxy.ts `isLabRead`, 여기에 GET·HEAD 조건을 더한다)과 활동 기록기
 * (src/components/account/ActivityReporter.tsx). 두 벌로 쓰지 말 것(labPathSharedSource.test.tsx).
 *
 * `startsWith("/lab")` 는 `/label` · `/labx` 까지 열어서 `/lab` 과 그 아래로 좁혔다(proxyLabGate.test.ts).
 */
export function isLabPath(pathname: string): boolean {
  return pathname === "/lab" || pathname.startsWith("/lab/");
}
