/**
 * 교과서 이관 — 실린 문항을 지금의 계획에 맞출 때 «무엇을 고치고 무엇을 건드리지 않나» (D-161).
 *
 * 적재기의 `--refresh` 가 고치는 칸은 다섯이다: 본문 · 정답 · 해설 · 해설의 출처 · 잠금.
 *
 * 🔴 **사람이 고친 문항은 덮어쓰지 않는다.** 원장님이 잠긴 문항을 문제은행에서 직접 검수하신다(2026-10-08).
 *    문항 수정 API(`PATCH /api/problems/{id}`)는 «누가 언제 고쳤나»를 남기지 않는다 — 그래서 적재기가
 *    **자기가 마지막으로 쓴 다섯 칸의 지문**을 쥐고 있다가(`load/written.json`), DB 의 값이 그 지문이 아니면
 *    «다른 손이 만졌다»로 보고 손대지 않는다. 잠금만 푼 것도 만진 것이다.
 *    지문이 아예 없는 문항도 건드리지 않는다 — 누가 썼는지 모르는 값을 «내 것»으로 치지 않는다.
 */
import { createHash } from "node:crypto";

export interface RefreshColumns {
  content: string;
  answer: string;
  solution: string | null;
  solutionSource: "original" | "ai" | "none";
  directUseAllowed: boolean;
  /** 그림 문항의 칸 다섯 — 그림이 없는 문항은 비어 있다(지문도 이 칸이 생기기 전과 같은 값이다) */
  figureUrls?: string[];
  figureDims?: number[];
  figureSourceMm?: number[];
  choiceFigureIndex?: number[];
  figureSource?: string | null;
}

export interface SavedRow extends RefreshColumns {
  id: string;
  externalId: string | null;
}

/** 계획의 한 줄 — 다섯 칸과 잠그는 까닭 */
export interface WantedRow extends RefreshColumns {
  hold: string[];
}

export interface RefreshChange {
  id: string;
  externalId: string;
  before: RefreshColumns;
  after: RefreshColumns;
  hold: string[];
}

const columnsOf = (row: RefreshColumns): RefreshColumns => ({
  content: row.content,
  answer: row.answer,
  solution: row.solution,
  solutionSource: row.solutionSource,
  directUseAllowed: row.directUseAllowed,
  figureUrls: row.figureUrls ?? [],
  figureDims: row.figureDims ?? [],
  figureSourceMm: row.figureSourceMm ?? [],
  choiceFigureIndex: row.choiceFigureIndex ?? [],
  figureSource: row.figureSource ?? null,
});

/** 다섯 칸의 지문 — 글자 하나 · 빈칸 하나가 달라도 다른 값이다(사람이 빈칸만 고쳐도 만진 것이다) */
export function fingerprintOf(row: RefreshColumns): string {
  const columns = columnsOf(row);
  const parts: unknown[] = [
    columns.content,
    columns.answer,
    columns.solution,
    columns.solutionSource,
    columns.directUseAllowed,
  ];
  // 그림이 있을 때만 그림의 칸을 넣는다 — 글 문항의 지문은 전과 같다(이미 쥐고 있는 지문 원장이 그대로 맞는다)
  if ((columns.figureUrls ?? []).length > 0)
    parts.push([
      columns.figureUrls,
      columns.figureDims,
      columns.figureSourceMm,
      columns.choiceFigureIndex,
      columns.figureSource,
    ]);
  return createHash("sha1")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 16);
}

/**
 * 실린 문항 · 계획 · 적재기가 마지막으로 쓴 지문 → 고칠 줄과 건드리지 않을 줄.
 * 계획에서 빠진 문항(검토가 뒤집혔다)은 지우지 않고 잠근다.
 */
export function planRefresh(
  saved: SavedRow[],
  plan: Map<string, WantedRow>,
  written: Map<string, string>,
): { changes: RefreshChange[]; foreign: string[] } {
  const changes: RefreshChange[] = [];
  const foreign: string[] = [];
  for (const row of saved) {
    const externalId = row.externalId ?? "";
    const before = columnsOf(row);
    const wanted = plan.get(externalId);
    const after = wanted
      ? columnsOf(wanted)
      : { ...before, directUseAllowed: false };
    if (fingerprintOf(before) === fingerprintOf(after)) continue;
    if (written.get(externalId) !== fingerprintOf(before)) {
      foreign.push(externalId);
      continue;
    }
    changes.push({
      id: row.id,
      externalId,
      before,
      after,
      hold: wanted ? wanted.hold : ["지금의 계획에 없다 — 검토가 뒤집혔다"],
    });
  }
  return { changes, foreign };
}
