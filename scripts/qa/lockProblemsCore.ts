/**
 * 출제에서 빼기(잠금)의 **판단** — 순수 함수. DB 는 `lock-problems.ts` 가 만진다.
 *
 * 잠금은 `directUseAllowed` 한 칸을 내리는 것이다(2026-08-18 «되찾지 못한 43건은 출제에서 뺀다»와 같은 방식).
 * 지우지 않으므로 문항 코드 · 출처 · 원본 링크가 남고, 한 칸만 올리면 되살아난다.
 */

export interface LockableRow {
  id: string;
  externalId: string | null;
  directUseAllowed: boolean;
}

export interface LockLedgerRow {
  problemId: string;
  externalId: string;
  /** 내리기 전 값 — 늘 `true` 다(이미 내려간 행은 원장에 안 넣는다). */
  before: boolean;
  reason: string;
}

export interface LockPlan {
  lock: LockLedgerRow[];
  /** 이미 내려가 있던 행 — 남이(또는 앞 회차가) 내린 것이라 내 원장에 안 넣는다. */
  already: string[];
  /** DB 에 없는 행. */
  missing: string[];
}

export function planLock(
  externalIds: readonly string[],
  rows: readonly LockableRow[],
  reason: string,
): LockPlan {
  if (reason.trim() === "")
    throw new Error("잠그는 사유가 비었다 — 사유 없이는 잠그지 않는다");
  const byExt = new Map(rows.map((r) => [r.externalId, r]));
  const plan: LockPlan = { lock: [], already: [], missing: [] };
  for (const externalId of new Set(externalIds)) {
    const row = byExt.get(externalId);
    if (!row) plan.missing.push(externalId);
    else if (!row.directUseAllowed) plan.already.push(externalId);
    else
      plan.lock.push({
        problemId: row.id,
        externalId,
        before: true,
        reason: reason.trim(),
      });
  }
  return plan;
}

export interface UnlockPlan {
  unlock: LockLedgerRow[];
  /** 그 사이 누가 올렸거나 행이 사라져 건드리지 않는 것. */
  skipped: string[];
}

export function planUnlock(
  ledger: readonly LockLedgerRow[],
  rows: readonly LockableRow[],
): UnlockPlan {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const plan: UnlockPlan = { unlock: [], skipped: [] };
  for (const entry of ledger) {
    const now = byId.get(entry.problemId);
    // 지금 값이 «내가 쓴 값(false)»일 때만 올린다 — 남의 변경을 덮지 않는다.
    if (now && !now.directUseAllowed) plan.unlock.push(entry);
    else plan.skipped.push(entry.externalId);
  }
  return plan;
}
