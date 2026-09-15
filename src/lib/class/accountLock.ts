/**
 * 원장님 발급 칸의 «잠김 — N분 뒤 풀림» — N 을 센다 (D-127 Q5 · learn-screens 브리프 §6).
 *
 * 부르는 곳: src/components/class/StudentAccountPanel.tsx
 * 🔴 «지금보다 뒤인가»만 본다 — 잠금 규칙(5회 · 10분, `STUDENT_LOGIN_LOCK`)을 여기서 다시 적지 않는다.
 *    끝나는 시각은 서버가 준 `lockedUntil` 이 정한다. N 은 **올림한 분** — 1초 남아도 «1분», 끝나면 null(줄 없음).
 */
const MINUTE_MS = 60_000;

export function lockMinutesLeft(
  lockedUntil: string | null,
  now: Date,
): number | null {
  if (lockedUntil === null) return null;
  const left = Date.parse(lockedUntil) - now.getTime();
  if (Number.isNaN(left) || left <= 0) return null;
  return Math.ceil(left / MINUTE_MS);
}
