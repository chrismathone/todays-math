/**
 * 원장님 발급 칸의 «잠김 — N분 뒤 풀림» — N 을 센다 (D-127 Q5 · learn-screens 브리프 §6).
 *
 * 부르는 곳: src/components/class/StudentAccountPanel.tsx
 * 🔴 «지금보다 뒤인가»만 본다 — 잠금 규칙(5회 · 10분, `STUDENT_LOGIN_LOCK`)을 여기서 다시 적지 않는다.
 *    끝나는 시각은 서버가 준 `lockedUntil` 이 정한다. N 은 **올림한 분** — 1초 남아도 «1분», 끝나면 null(줄 없음).
 */
const MINUTE_MS = 60_000;

/** 잠금이 끝나기까지 남은 ms — 잠금이 없거나 · 끝났거나 · 읽을 수 없으면 null */
function msLeft(lockedUntil: string | null, now: Date): number | null {
  if (lockedUntil === null) return null;
  const left = Date.parse(lockedUntil) - now.getTime();
  if (Number.isNaN(left) || left <= 0) return null;
  return left;
}

export function lockMinutesLeft(
  lockedUntil: string | null,
  now: Date,
): number | null {
  const left = msLeft(lockedUntil, now);
  if (left === null) return null;
  return Math.ceil(left / MINUTE_MS);
}

/**
 * 칸을 열어 둔 채 다시 셀 때 — **N 이 바뀌는(끝 분이면 줄이 사라지는) 순간까지 남은 ms** (D-128 ⑶ · 리드).
 * N 은 올림한 분이라 남은 시간이 60초의 배수에 **닿는** 순간 하나 준다: 5분 30초 남음 → 30초 뒤, 딱 5분 → 1분 뒤.
 * 1분마다 세면 칸을 연 때가 분 가운데일 때 최대 1분 늦는다(잠금이 끝난 뒤에도 줄이 남는다). 잠금이 없으면 null.
 */
export function lockLineNextChangeMs(
  lockedUntil: string | null,
  now: Date,
): number | null {
  const left = msLeft(lockedUntil, now);
  if (left === null) return null;
  return left % MINUTE_MS || MINUTE_MS;
}
