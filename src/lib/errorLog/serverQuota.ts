/**
 * 서버 쪽 오류 기록의 양 제한 — 같은 «경로 · 상태 · 사람»이 1분에 남기는 줄 수에 상한을 둔다.
 *
 * 왜: API 는 로그인 없이도 두드릴 수 있다. 봇이 `/api/…` 를 1만 번 두드리면 401 한 번마다 한 줄 — 90일 보관 동안
 * 표가 부푼다. 넘친 것은 버리되 **몇 건을 버렸는지는 남긴다** — 그 창이 지난 뒤 같은 열쇠의 다음 줄
 * `context.suppressedBefore` 에 적는다(«전부 수집»의 셈은 잃지 않는다).
 *
 * ⚠️ 서버 프로세스마다 센다(브라우저 받기 `clientQuota.ts` · 작업실 AI 입장 제한과 같은 결) — 목적은 폭주를 묶는 것이다.
 */
export const SERVER_LOG_PER_KEY_PER_MINUTE = 20;
const WINDOW_MS = 60_000;
const MAX_KEYS = 5000;

type Bucket = { start: number; used: number; suppressed: number };
const buckets = new Map<string, Bucket>();

/** 이 줄을 남겨도 되나 — 남긴다면 앞 창에서 버린 수를 같이 돌려준다. */
export function admitServerLog(
  key: string,
  now = Date.now(),
): { record: boolean; suppressedBefore: number } {
  if (buckets.size > MAX_KEYS)
    for (const [k, b] of buckets)
      if (now - b.start >= WINDOW_MS && !b.suppressed) buckets.delete(k);
  let bucket = buckets.get(key);
  let carried = 0;
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    carried = bucket?.suppressed ?? 0;
    bucket = { start: now, used: 0, suppressed: 0 };
    buckets.set(key, bucket);
  }
  if (bucket.used >= SERVER_LOG_PER_KEY_PER_MINUTE) {
    bucket.suppressed++;
    return { record: false, suppressedBefore: 0 };
  }
  bucket.used++;
  return { record: true, suppressedBefore: carried };
}

/** 시험용 */
export function resetServerLogQuota() {
  buckets.clear();
}
