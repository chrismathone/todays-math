import "server-only";

/** Public bank counts only. Never put recent/owner/branch-dependent reads here. */
export const BANK_COUNTS_CACHE_KEY = "question-bank-counts-v1";
export const BANK_COUNTS_TTL_MS = 15_000;
const MAX_ENTRIES = 64;
const entries = new Map<
  string,
  { expires: number; pending: Promise<unknown> }
>();

/** In-process imports invalidate immediately; direct SQL imports rotate BANK_COUNTS_EPOCH.
 * Other server processes converge within the short TTL. No authorization result is cached.
 */
export function invalidateBankReadCache() {
  entries.clear();
}
export function cachedBankRead<T>(
  key: string,
  read: () => Promise<T>,
): Promise<T> {
  const cacheKey = `${BANK_COUNTS_CACHE_KEY}:${process.env.BANK_COUNTS_EPOCH ?? "0"}:${key}`;
  const current = entries.get(cacheKey);
  if (current && current.expires > Date.now())
    return current.pending as Promise<T>;
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  const entry = { expires: Infinity, pending: Promise.resolve().then(read) };
  entries.set(cacheKey, entry);
  entry.pending.then(
    () => {
      entry.expires = Date.now() + BANK_COUNTS_TTL_MS;
    },
    () => {
      if (entries.get(cacheKey) === entry) entries.delete(cacheKey);
    },
  );
  return entry.pending;
}

export function publicBankQueryKey(params: URLSearchParams) {
  if (
    ["recent", "excludeIds", "excludeFamiliesOf", "familyOf", "ids"].some(
      (key) => params.has(key),
    )
  )
    return null;
  return JSON.stringify([...params].sort(([a], [b]) => a.localeCompare(b)));
}
