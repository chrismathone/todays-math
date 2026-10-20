/**
 * **행 고침 묶음** — 문항 행의 정해진 칸을 «앞 → 뒤»로 바꾸는 판정 · 쓰기 (`apply-row-repairs.ts` 가 부른다 · D-164 §4 · Codex 2회차 H).
 *
 * 묶음은 행마다 `{ id, code, reasons, before, after }` — `before` · `after` 는 **같은 칸들**만 갖는다(바꾸는 칸 전부).
 * 🔴 쓰는 순간 그 칸 전부가 «앞»과 같을 때만 쓴다(compare-and-set). 한 행이라도 어긋나면 그 거래 전체를 되돌린다.
 * 되돌림은 같은 함수로 «앞 = 쓴 값 · 뒤 = 처음 값»을 쓴다.
 */
export const REPAIR_FIELDS = ["content", "answer", "solution", "figureUrls", "directUseAllowed"] as const;
export type RepairField = (typeof REPAIR_FIELDS)[number];
export type Fields = {
  content?: string;
  answer?: string;
  solution?: string | null;
  figureUrls?: string[];
  directUseAllowed?: boolean;
};
export type RepairRow = { id: string; code: string; reasons: string[]; before: Fields; after: Fields };
export type Direction = "apply" | "revert";

/** 칸마다 받는 값 — 이 꼴이 아니면 Prisma 가 연산자(`{ set: … }`)로 읽을 수 있다. */
const FIELD_TYPE: Record<RepairField, (v: unknown) => boolean> = {
  content: (v) => typeof v === "string",
  answer: (v) => typeof v === "string",
  solution: (v) => v === null || typeof v === "string",
  figureUrls: (v) => Array.isArray(v) && v.every((x) => typeof x === "string"),
  directUseAllowed: (v) => typeof v === "boolean",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const keysOf = (f: Fields) => Object.keys(f).sort();

/** 묶음이 쓸 수 있는 꼴인가 — 어긋나면 무엇이 어긋났는지 모두 모아 던진다(쓰기 전에). */
export function validateRepairRows(rows: unknown): RepairRow[] {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("행 고침 묶음이 비었거나 배열이 아니다");
  const errors: string[] = [];
  const ids = new Set<string>();
  rows.forEach((raw, i) => {
    const r = raw as RepairRow;
    const at = `${i}(${r?.code ?? r?.id ?? "?"})`;
    if (typeof r?.id !== "string" || !/^[0-9a-f-]{36}$/.test(r.id)) errors.push(`${at}: id 가 uuid 가 아니다`);
    else if (ids.has(r.id)) errors.push(`${at}: 같은 id 가 두 번`);
    else ids.add(r.id);
    if (!r?.before || !r?.after) { errors.push(`${at}: before · after 가 없다`); return; }
    const kb = keysOf(r.before), ka = keysOf(r.after);
    if (kb.length === 0) errors.push(`${at}: 바꾸는 칸이 없다`);
    if (JSON.stringify(kb) !== JSON.stringify(ka)) errors.push(`${at}: before · after 의 칸이 다르다(${kb} / ${ka})`);
    for (const k of [...kb, ...ka]) if (!(REPAIR_FIELDS as readonly string[]).includes(k)) errors.push(`${at}: 모르는 칸 ${k}`);
    if (kb.every((k) => same(r.before[k as RepairField], r.after[k as RepairField]))) errors.push(`${at}: 앞과 뒤가 같다`);
    for (const side of ["before", "after"] as const)
      for (const [k, v] of Object.entries(r[side])) if (!FIELD_TYPE[k as RepairField]?.(v)) errors.push(`${at}: ${side}.${k} 의 자료형이 칸과 다르다`);
    // 그림 주소는 그림 치수 · 원본 mm · 보기 그림 번호(figureDims · figureSourceMm · choiceFigureIndex)가 번호로 붙어 있다 —
    // 이 도구는 그 칸을 같이 못 옮기므로 주소 바꾸기는 막는다(대조용으로 앞뒤 같은 값만 둘 수 있다).
    if ("figureUrls" in r.before && !same(r.before.figureUrls, r.after.figureUrls)) errors.push(`${at}: 그림 주소는 이 도구로 바꾸지 않는다(딸린 그림 칸이 어긋난다)`);
  });
  if (errors.length) throw new Error(`행 고침 묶음이 어긋난다 — ${errors.length}건\n${errors.slice(0, 20).join("\n")}`);
  return rows as RepairRow[];
}

export const fromOf = (r: RepairRow, d: Direction) => (d === "apply" ? r.before : r.after);
export const toOf = (r: RepairRow, d: Direction) => (d === "apply" ? r.after : r.before);

/** 지금 DB 값이 묶음의 어느 쪽인가 — 쓸 수 있음(«앞»과 같음) · 이미 그 값(«뒤»와 같음) · 어긋남 · 행 없음. */
export function classifyRow(now: Fields | undefined, r: RepairRow, d: Direction): "ready" | "done" | "drift" | "missing" {
  if (!now) return "missing";
  const match = (want: Fields) => keysOf(want).every((k) => same(now[k as RepairField], want[k as RepairField]));
  if (match(fromOf(r, d))) return "ready";
  if (match(toOf(r, d))) return "done";
  return "drift";
}

/** 바꾸는 칸 전부가 «앞»과 같은 행만 고르는 조건. 배열 칸은 `equals`. */
export function casWhere(id: string, from: Fields): Record<string, unknown> {
  const where: Record<string, unknown> = { id };
  for (const k of keysOf(from)) {
    const v = from[k as RepairField];
    where[k] = Array.isArray(v) ? { equals: v } : v ?? null;
  }
  return where;
}

export type RowCasClient = {
  problem: { updateMany(args: { where: Record<string, unknown>; data: Fields }): Promise<{ count: number }> };
};

/** 🔴 한 거래 안에서 부른다 — 행마다 갱신 1행이 아니면 던져서 거래 전체를 되돌린다. */
export async function writeRowsCas(tx: RowCasClient, rows: readonly RepairRow[], d: Direction): Promise<number> {
  let n = 0;
  for (const r of rows) {
    const { count } = await tx.problem.updateMany({ where: casWhere(r.id, fromOf(r, d)), data: toOf(r, d) });
    if (count !== 1) throw new Error(`CAS_MISMATCH ${r.code} (${r.id}) — 쓰는 순간 칸이 «${d === "apply" ? "앞" : "뒤"}» 값과 다르다(갱신 ${count}행) · 이 거래를 되돌린다`);
    n += count;
  }
  if (n !== rows.length) throw new Error(`CAS_COUNT ${n}/${rows.length} — 기대 갱신 수와 다르다`);
  return n;
}

/** 다시 읽은 값이 묶음의 «뒤»와 같지 않은 행 — 거래 안(쓰기 직후)과 커밋 뒤 두 번 쓴다. */
export function unwrittenRows(back: ReadonlyMap<string, Fields>, rows: readonly RepairRow[], d: Direction): RepairRow[] {
  return rows.filter((r) => {
    const want = toOf(r, d);
    const got = back.get(r.id);
    return !got || keysOf(want).some((k) => !same(got[k as RepairField], want[k as RepairField]));
  });
}
