import "server-only";

/** Public bank reads only. Never put recent/owner/branch-dependent reads here. */
export const BANK_COUNTS_CACHE_KEY = "question-bank-counts-v1";
export const BANK_COUNTS_TTL_MS = 15_000;
const MAX_ENTRIES = 64;
const entries = new Map<
  string,
  { expires: number; pending: Promise<unknown> }
>();

// Keep only grouped representative IDs, never candidate rows or problem bodies.
// UUID strings and their array slots are bounded independently of the count cache.
export const BANK_LIST_CACHE_MAX_ENTRIES = 3;
export const BANK_LIST_CACHE_MAX_IDS = 250_000;
export interface BankQuestionList {
  total: number;
  ids: readonly string[];
}
const lists = new Map<
  string,
  { expires: number; pending: Promise<BankQuestionList>; size: number }
>();

/** In-process imports invalidate immediately; direct SQL imports rotate BANK_COUNTS_EPOCH.
 * Other server processes converge within the short TTL. No authorization result is cached.
 */
export function invalidateBankReadCache() {
  entries.clear();
  lists.clear();
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

/** Same TTL/epoch/write invalidation as counts, with a separate small list budget. */
export function cachedBankQuestionList(
  key: string | null,
  read: () => Promise<BankQuestionList>,
): Promise<BankQuestionList> {
  if (key === null) return read();
  const cacheKey = `${process.env.BANK_COUNTS_EPOCH ?? "0"}:${key}`;
  const current = lists.get(cacheKey);
  if (current && current.expires > Date.now()) return current.pending;
  // Drop expired values before enforcing both limits. Pending reads coalesce,
  // but an evicted/invalidated read can never reinsert itself on completion.
  for (const [storedKey, entry] of lists)
    if (entry.expires <= Date.now()) lists.delete(storedKey);
  if (lists.size >= BANK_LIST_CACHE_MAX_ENTRIES)
    lists.delete(lists.keys().next().value!);
  const entry = {
    expires: Infinity,
    pending: Promise.resolve().then(read),
    size: 0,
  };
  lists.set(cacheKey, entry);
  entry.pending.then(
    (value) => {
      if (lists.get(cacheKey) !== entry) return;
      entry.expires = Date.now() + BANK_COUNTS_TTL_MS;
      entry.size = value.ids.length;
      if (entry.size > BANK_LIST_CACHE_MAX_IDS) {
        lists.delete(cacheKey);
        return;
      }
      let size = [...lists.values()].reduce((sum, list) => sum + list.size, 0);
      while (size > BANK_LIST_CACHE_MAX_IDS) {
        const oldest = lists.keys().next().value!;
        size -= lists.get(oldest)!.size;
        lists.delete(oldest);
      }
    },
    () => {
      if (lists.get(cacheKey) === entry) lists.delete(cacheKey);
    },
  );
  return entry.pending;
}

/** Pagination changes only slicing, never the grouped list or its ordering. */
export function publicBankListQueryKey(params: URLSearchParams) {
  const query = new URLSearchParams(params);
  query.delete("page");
  query.delete("pageSize");
  return publicBankQueryKey(query);
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
