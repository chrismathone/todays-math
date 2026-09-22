/**
 * 브라우저 오류 받기의 양 제한 — 한 사람(계정, 없으면 IP)당 분당 사건 수 + 서버 한 대의 분당 총량.
 *
 * ⚠️ **서버 프로세스마다** 센다(작업실 AI 입장 제한 `studio-ai/handler.ts` 와 같은 결). 서버리스는 인스턴스가
 *    여럿이라 전역 상한이 아니다 — 목적은 «한 화면이 오류를 쏟아 DB 를 채우는 것»을 막는 것이지 정확한 계량이 아니다.
 */
export const CLIENT_LOG_EVENTS_PER_MINUTE = 30;
/** 서버 한 대가 1분에 받는 총량 — 여러 사람이 한꺼번에 쏟아도 DB 쓰기를 묶는다 */
export const CLIENT_LOG_EVENTS_PER_MINUTE_TOTAL = 600;
const WINDOW_MS = 60_000;
const MAX_KEYS = 5000;

type Bucket = { start: number; used: number };
const buckets = new Map<string, Bucket>();
let total: Bucket = { start: 0, used: 0 };

function fresh(bucket: Bucket | undefined, now: number): Bucket {
  return bucket && now - bucket.start < WINDOW_MS
    ? bucket
    : { start: now, used: 0 };
}

/** `wanted` 건 중 받아도 되는 수(0 이면 전부 버린다). */
export function takeClientLogQuota(
  key: string,
  wanted: number,
  now = Date.now(),
): number {
  if (buckets.size > MAX_KEYS)
    for (const [k, b] of buckets)
      if (now - b.start >= WINDOW_MS) buckets.delete(k);
  const bucket = fresh(buckets.get(key), now);
  total = fresh(total, now);
  const allowed = Math.max(
    0,
    Math.min(
      wanted,
      CLIENT_LOG_EVENTS_PER_MINUTE - bucket.used,
      CLIENT_LOG_EVENTS_PER_MINUTE_TOTAL - total.used,
    ),
  );
  bucket.used += allowed;
  total.used += allowed;
  buckets.set(key, bucket);
  return allowed;
}

/** 시험용 */
export function resetClientLogQuota() {
  buckets.clear();
  total = { start: 0, used: 0 };
}
