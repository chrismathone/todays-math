/**
 * 교과서 원문이 **바뀌거나 잠기면** 그 원문의 지정 두 슬롯(`tb-retry-v1:{원문}:{1|2}` 복습 변형)도 잠근다
 * (문제은행 P0 · 2026-10-14 · goal-bank-arithmetic-brand §교과서 두 슬롯 · 수용 시나리오 4).
 *
 * ## 왜 도구의 일인가
 *
 * 변형은 **그때의 원문**에 맞춰 검산 · 지면 검사를 지나 열렸다(`qualify-reviewed.ts` 가 원문 지문을 대조한다).
 * 그 뒤 원문이 `--refresh` 로 고쳐지거나 재검토로 잠겨도 변형은 그대로 열려 있었다 — 복습(`planRetry`)은
 * 원문의 지금 상태를 보지 않고(이미 낸 시험지의 오답이 원문이다), `Problem` 에는 원문 fingerprint 를 저장할 칸이 없다.
 * 런타임(준비 화면 · 복습)에 fingerprint 비교를 새로 넣지 않기로 했으므로(합의 기록), **원문을 바꾸는 도구가**
 * 같은 자리에서 변형을 잠근다. 다시 여는 것은 대응을 다시 검증한 뒤다 — 이 모듈은 열지 않는다.
 *
 * ## 무엇이 «대응을 깬다»인가
 *
 * - 글 · 정답 · 해설 · 그림 칸이 바뀌었다(해설의 출처 표지만 바뀐 것은 아니다)
 * - 원문이 출제에서 잠겼다(`directUseAllowed` true → false) — 재검토 · 그림 유실 · 계획에서 빠짐
 *
 * 잠금은 `directUseAllowed = false` 하나다(교과서 도구들이 쓰는 잠금과 같다). 검수 상태 · 사람의 기록은 건드리지 않는다.
 */
import type { Prisma } from "@prisma/client";

import {
  parseTextbookSlotExternalId,
  textbookSlotCandidateWhere,
} from "@/lib/generator/textbookSlots";

/** 대응을 재는 원문의 칸 — 적재기 `--refresh` 가 고치는 칸(`refreshPlan.ts` `RefreshColumns`)과 겹친다. */
export interface SlotSourceColumns {
  content: string;
  answer: string;
  solution: string | null;
  directUseAllowed: boolean;
  figureUrls?: string[];
  figureDims?: number[];
  figureSourceMm?: number[];
  choiceFigureIndex?: number[];
  figureSource?: string | null;
  figureSvg?: string | null;
}

/** 대응을 재는 칸과 «비었다»의 값 — 생략한 그림 칸은 빈 배열 · null 과 같다(그림 없는 문항). */
const CORRESPONDENCE_EMPTY = {
  content: "",
  answer: "",
  solution: null,
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  choiceFigureIndex: [],
  figureSource: null,
  figureSvg: null,
} as const satisfies Partial<Record<keyof SlotSourceColumns, unknown>>;
const CORRESPONDENCE_FIELDS = Object.keys(
  CORRESPONDENCE_EMPTY,
) as (keyof typeof CORRESPONDENCE_EMPTY)[];

export const SLOT_LOCK_REASON = {
  changed:
    "원문의 글 · 정답 · 해설 · 그림이 바뀌었다 — 지정 변형의 대응을 다시 검증한 뒤 연다",
  locked: "원문이 출제에서 잠겼다 — 지정 변형도 함께 잠근다",
} as const;

/** 원문의 바뀜이 지정 슬롯의 대응을 깨는가 — 깨면 까닭, 아니면 `null`. */
export function slotBreakingReason(
  before: SlotSourceColumns,
  after: SlotSourceColumns,
): string | null {
  const value = (
    row: SlotSourceColumns,
    field: (typeof CORRESPONDENCE_FIELDS)[number],
  ) => JSON.stringify(row[field] ?? CORRESPONDENCE_EMPTY[field]);
  if (
    CORRESPONDENCE_FIELDS.some(
      (field) => value(before, field) !== value(after, field),
    )
  )
    return SLOT_LOCK_REASON.changed;
  if (before.directUseAllowed && !after.directUseAllowed)
    return SLOT_LOCK_REASON.locked;
  return null;
}

/** 잠금 판정에 읽는 칸 — 신분(출처 · 부모 · 열쇠)과 지금의 잠금. */
export const DESIGNATED_SLOT_SELECT = {
  id: true,
  externalId: true,
  originProblemId: true,
  source: true,
  directUseAllowed: true,
} as const satisfies Prisma.ProblemSelect;

export interface DesignatedSlotRow {
  id: string;
  externalId: string | null;
  originProblemId: string | null;
  source: string;
  directUseAllowed: boolean;
}

export interface DesignatedSlotLock {
  id: string;
  externalId: string;
  originProblemId: string;
  reason: string;
}

/** 원문들의 지정 슬롯 행을 찾는 조건 — 복습 · 준비 상태와 같은 신분 조건(`textbookSlotCandidateWhere`). */
export function designatedSlotWhere(
  originIds: readonly string[],
): Prisma.ProblemWhereInput {
  return textbookSlotCandidateWhere(originIds);
}

/**
 * 잠글 지정 슬롯 — `reasons` 는 원문 id → 까닭. 지금 **열린** 슬롯만(이미 잠긴 것은 그대로 둔다 — 잠금을 두 번 세지 않는다).
 * 신분이 슬롯이 아닌 행(과거 복구 자식 · 다른 원문의 열쇠)은 건드리지 않는다.
 */
export function planDesignatedSlotLocks(
  reasons: ReadonlyMap<string, string>,
  rows: readonly DesignatedSlotRow[],
): DesignatedSlotLock[] {
  const seen = new Set<string>();
  const locks: DesignatedSlotLock[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const key = parseTextbookSlotExternalId(row.externalId);
    if (
      row.source !== "transformed" ||
      !row.directUseAllowed ||
      !key ||
      key.originId !== row.originProblemId
    )
      continue;
    const reason = reasons.get(key.originId);
    if (!reason) continue;
    locks.push({
      id: row.id,
      externalId: row.externalId!,
      originProblemId: key.originId,
      reason,
    });
  }
  return locks.sort((a, b) => a.externalId.localeCompare(b.externalId));
}

/** 한 번에 묻는 원문 수 — 원문 하나에 바인드 셋(부모 · 열쇠 둘). PostgreSQL 바인드 상한(32,767) 아래로. */
export const SLOT_QUERY_CHUNK = 1000;

/** 원문 id 를 나눠 지정 슬롯 행을 읽는다(읽기만). */
export async function findDesignatedSlotRows(
  client: {
    problem: {
      findMany(args: {
        where: Prisma.ProblemWhereInput;
        select: typeof DESIGNATED_SLOT_SELECT;
      }): Promise<DesignatedSlotRow[]>;
    };
  },
  originIds: readonly string[],
): Promise<DesignatedSlotRow[]> {
  const rows: DesignatedSlotRow[] = [];
  for (let start = 0; start < originIds.length; start += SLOT_QUERY_CHUNK)
    rows.push(
      ...(await client.problem.findMany({
        where: designatedSlotWhere(
          originIds.slice(start, start + SLOT_QUERY_CHUNK),
        ),
        select: DESIGNATED_SLOT_SELECT,
      })),
    );
  return rows;
}

/**
 * 잠그는 쓰기 — 열린 지정 슬롯만 `directUseAllowed = false`. 부르는 쪽의 트랜잭션 안에서 쓴다.
 * 조건에 출처 · 잠금을 다시 걸어 계획 뒤에 바뀐 행(이미 잠김 · 출처가 바뀜)은 건드리지 않는다.
 */
export function lockDesignatedSlotsArgs(
  locks: readonly DesignatedSlotLock[],
): Prisma.ProblemUpdateManyArgs {
  return {
    where: {
      id: { in: locks.map((lock) => lock.id) },
      source: "transformed",
      directUseAllowed: true,
    },
    data: { directUseAllowed: false },
  };
}
