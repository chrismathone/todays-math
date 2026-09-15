/**
 * 시청 보고 한 번 → 새 시청 기록 (브리프 §2.4 · §7).
 *
 * 🔴 **시청 %는 서버가 다시 센다**(리드 결정 2026-09-15) — 재생기가 보낸 %는 버리고
 *    `본 최대 지점 ÷ 강의 길이`로 계산해 `mergeWatchRecord` 에 넣는다. 한 곳에서 세야 원장님 화면의
 *    n/m 과 학생 목록의 «64% 봄»이 갈라지지 않는다. 우회 방지가 목적은 아니다(D-124 ⑸).
 *
 * 규칙은 `src/lib/concept/watchRules.ts` 를 **부른다**(뒤로 안 감 · 한 번 완료면 완료) — 다시 적지 않는다.
 * 여기서 더하는 것은 둘뿐이다: 보고된 지점을 강의 길이 안으로 접는다(9999초를 보내도 길이까지),
 * 그리고 %를 서버가 센다.
 */
import {
  mergeWatchRecord,
  watchPercent,
  type WatchRecord,
} from "@/lib/concept/watchRules";

export function recordWatchReport(
  prev: WatchRecord | null,
  lectureSeconds: number,
  reportedSeconds: number,
  now: Date,
): WatchRecord {
  const seen = Math.max(0, reportedSeconds);
  const within = lectureSeconds > 0 ? Math.min(seen, lectureSeconds) : seen;
  const maxSeconds = Math.max(prev?.maxSeconds ?? 0, within);
  return mergeWatchRecord(
    prev,
    { seconds: within, percent: watchPercent(maxSeconds, lectureSeconds) },
    now,
  );
}
