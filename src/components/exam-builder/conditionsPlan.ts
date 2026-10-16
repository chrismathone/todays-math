/**
 * «구성 조건»(W4 · Hi-fi 2 — 원장님 2026-10-16)의 계산. 창의 오른쪽 «적용하면 이렇게 나뉩니다»와
 * 적용을 막는 것 · 알리고 적용하는 것을 한 함수가 낸다(화면이 따로 셈하지 않는다).
 *
 *   총 문항   비우면 «지정 없음» — 행의 합으로 간다. 정하면 «고정»이 아닌 행에 고르게 나눈다.
 *   난이도    시험지 전체에 한 번. «–»(null)은 지정 없음, 0 은 그 난이도를 한 문항도 내지 않음.
 *   모자람    범위의 출제 가능 수보다 많이 달라면 그 수까지만 — **다른 범위에서 채우지 않는다.**
 *
 * 코드에 기본 수를 박지 않는다 — 처음 여는 시험지는 총 문항 · 난이도가 모두 지정 없음이고 표는 지금 그대로다.
 */

export type Ladder = Record<string, number | null>;

export interface AppliedConditions {
  /** null = 지정 없음(행의 합). */
  total: number | null;
  ladder: Ladder;
  /** 최근 출제 빼기(D-20) — 기본 켬. */
  recent: boolean;
}
export interface ComposeDraft extends AppliedConditions {
  /** 범위 id → 고정(손으로 고친 행 · 창에서 고정한 행). */
  fixed: Record<string, boolean>;
}
export interface PlanInputRow {
  scopeId: string;
  label: string;
  count: number;
  /** 이 조건(최근 출제 빼기 포함)의 출제 가능 수. 모르면 없다 — 모자람을 지어내지 않는다. */
  usable?: number;
}
export interface PlanRow extends PlanInputRow {
  /** 나누면 이 행이 받을 수. */
  want: number;
  /** 적용하면 표에 들어갈 수(출제 가능 수까지만). */
  next: number;
}
export interface Plan {
  rows: PlanRow[];
  total: number;
  /** 적용을 막는 것. */
  block: string[];
  /** 알리고 적용하는 것. */
  note: string[];
}

export const emptyLadder = (tiers: readonly string[]): Ladder =>
  Object.fromEntries(tiers.map((tier) => [tier, null]));

const specifiedTiers = (ladder: Ladder, tiers: readonly string[]) =>
  tiers.filter((tier) => ladder[tier] !== null && ladder[tier] !== undefined);
const ladderSum = (ladder: Ladder, tiers: readonly string[]) =>
  specifiedTiers(ladder, tiers).reduce((sum, tier) => sum + ladder[tier]!, 0);

/** 서버로 보내는 난이도 의도 — 정한 칸만. 정한 칸이 없으면 보내지 않는다. */
export function ladderIntent(
  ladder: Ladder,
  tiers: readonly string[],
): Record<string, number> | undefined {
  const set = specifiedTiers(ladder, tiers);
  return set.length
    ? Object.fromEntries(set.map((tier) => [tier, ladder[tier]!]))
    : undefined;
}

/**
 * 난이도와 총 문항이 맞는가 — 정한 칸의 합이 넘거나, 모든 칸을 정했는데 합이 다르면 그 까닭.
 * 창의 «확인할 것»과 표 위의 경고가 같은 말을 쓴다(표를 손으로 고친 뒤에도 구성 전에 걸린다).
 */
export function ladderIssue(
  ladder: Ladder,
  total: number,
  tiers: readonly string[],
): string | null {
  const set = specifiedTiers(ladder, tiers);
  if (!set.length) return null;
  const sum = ladderSum(ladder, tiers);
  if (sum > total)
    return `난이도 합(${sum})이 총 문항(${total})보다 큽니다. 난이도 수를 줄이거나 총 문항을 올리세요.`;
  if (set.length === tiers.length && sum !== total)
    return `난이도 합(${sum})이 총 문항(${total})과 다릅니다. 난이도 수를 맞추거나 한 칸을 «–»(지정 없음)로 비우세요.`;
  return null;
}

/** 나뉠 모습 — 고정 행은 그대로, 나머지에 고르게. 모자라도 다른 범위에서 채우지 않는다. */
export function planComposition(
  draft: ComposeDraft,
  rows: readonly PlanInputRow[],
  {
    ladder: tiers,
    max,
    unit = "문항",
  }: { ladder: readonly string[]; max: number; unit?: string },
): Plan {
  const block: string[] = [];
  const note: string[] = [];
  let wants = rows.map((row) => row.count);
  if (draft.total !== null) {
    const fixedSum = rows.reduce(
      (sum, row) => sum + (draft.fixed[row.scopeId] ? row.count : 0),
      0,
    );
    const free = rows.filter((row) => !draft.fixed[row.scopeId]);
    if (draft.total < 1)
      block.push(
        "총 문항은 1 이상이어야 합니다. 비우면 범위 행의 합으로 갑니다.",
      );
    else if (draft.total > max) block.push(`총 문항은 최대 ${max}문항입니다.`);
    else if (draft.total < fixedSum)
      block.push(
        `고정한 행의 합(${fixedSum})이 총 문항(${draft.total})보다 큽니다. 총 문항을 올리거나 고정을 푸세요.`,
      );
    else if (!free.length && draft.total !== fixedSum)
      block.push(
        `모든 행이 고정이라 총 문항(${draft.total})에 맞춰 나눌 행이 없습니다. 고정을 하나 푸세요.`,
      );
    else {
      const rest = draft.total - fixedSum;
      const base = free.length ? Math.floor(rest / free.length) : 0;
      let extra = free.length ? rest % free.length : 0;
      wants = rows.map((row) => {
        if (draft.fixed[row.scopeId]) return row.count;
        const want = base + (extra > 0 ? 1 : 0);
        extra -= 1;
        return want;
      });
    }
  }
  const out = rows.map((row, index) => ({
    ...row,
    want: wants[index],
    next:
      row.usable === undefined
        ? wants[index]
        : Math.min(wants[index], row.usable),
  }));
  for (const row of out)
    if (row.usable !== undefined && row.want > row.usable)
      note.push(
        `${row.label} — ${draft.recent ? "최근 출제를 빼면 " : ""}${row.usable}${unit}뿐이라 ${row.want - row.usable}문항 모자랍니다. 다른 범위에서 채우지 않습니다.`,
      );
  const total = out.reduce((sum, row) => sum + row.next, 0);
  // 난이도는 «적용하면 구성할 수»와 견준다 — 서버도 그 수 안에서 난이도를 맞춘다.
  const issue = ladderIssue(draft.ladder, total, tiers);
  if (issue) block.push(issue);
  else if (specifiedTiers(draft.ladder, tiers).length) {
    const rest = total - ladderSum(draft.ladder, tiers);
    if (rest > 0)
      note.push(
        `난이도를 정하지 않은 ${rest}문항은 «–»(지정 없음) 칸의 난이도에서 고릅니다.`,
      );
  }
  return { rows: out, total, block, note };
}

export function ladderText(ladder: Ladder, tiers: readonly string[]): string {
  const set = specifiedTiers(ladder, tiers);
  return set.length
    ? set.map((tier) => `${tier} ${ladder[tier]}`).join(" · ")
    : "난이도 지정 없음";
}

/** 구성표 위 낱칸 넷 — 총 문항 · 난이도 · 최근 출제 · 고정 행. */
export function summarizeConditions(
  applied: AppliedConditions,
  {
    requested,
    fixedRows,
    recentDays,
    ladder: tiers,
  }: {
    requested: number;
    fixedRows: number;
    recentDays: number;
    ladder: readonly string[];
  },
) {
  return {
    total:
      applied.total !== null && applied.total === requested
        ? `${requested}문항`
        : `행의 합 ${requested}문항`,
    ladder: ladderText(applied.ladder, tiers),
    recent: applied.recent ? `최근 ${recentDays}일 출제 뺌` : "최근 출제 포함",
    fixed: `${fixedRows}행`,
  };
}
