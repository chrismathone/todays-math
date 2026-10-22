/** Best-effort per-process limits; not a distributed quota or accounting ledger. */
export function createInsightAdmission() {
  const entries = new Map<
    string,
    { started: number; count: number; active: boolean }
  >();
  let active = 0;
  return (key: string, now = Date.now()) => {
    for (const [id, e] of entries)
      if (!e.active && now - e.started >= 60_000) entries.delete(id);
    const e = entries.get(key) ?? { started: now, count: 0, active: false };
    if (
      e.active ||
      active >= 8 ||
      e.count >= 6 ||
      (!entries.has(key) && entries.size >= 2048)
    )
      return null;
    e.count++;
    e.active = true;
    active++;
    entries.set(key, e);
    let released = false;
    return () => {
      if (!released) {
        released = true;
        e.active = false;
        active--;
      }
    };
  };
}
export const admitInsight = createInsightAdmission();
