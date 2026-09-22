/**
 * 요청 하나의 «로그용 메모» — 깊은 곳(계약 검사·도형 엔진·상류 AI 호출)이 남기고, 라우트 틀
 * (`withErrorLog.ts`)이 요청이 **실패했을 때만** 그 줄에 싣는다. 성공한 요청의 메모는 버린다.
 *
 * 왜 메모인가: 화면에 나가는 문구는 바꾸지 않는다(D-08 · D-135 ⑻) — 응답 본문에 원문을 더 실을 수 없다.
 * 2026-09-22 도형 재작도 422·«요청대로 고치기» 400 의 사유가 우리 쪽 어디에도 안 남았던 까닭이 그것이다
 * (처리기의 catch 가 문구 하나만 돌려주고, 원문은 Vercel 실행 기록에만 있었다).
 *
 * 범위 밖(시험·스크립트가 엔진을 직접 부를 때)에서 부르면 아무 일도 안 한다.
 */
import { AsyncLocalStorage } from "node:async_hooks";

import type { ErrorLogKind } from "@/contracts/errorLogValues";

export type ErrorLogNote = {
  /** 작업 이름 — 작업실 AI 의 `figure-redraw` 같은 것 */
  action?: string;
  /** 종류를 덮어쓴다 — AI 쪽 실패는 `ai-rejected` */
  kind?: ErrorLogKind;
  userId?: string;
  /** 개발자용 원문 — 이어 붙는다 */
  detail?: string;
  /** 요약 — 얕게 합친다. 값은 쓰는 때(실패한 뒤)에 직렬화되므로 배열을 넘기고 나중에 채워도 된다 */
  context?: Record<string, unknown>;
  /** 원본 이미지(data URL) — AI 도형 재작도 실패 때 */
  image?: string;
};

export type ErrorLogNotes = {
  action?: string;
  kind?: ErrorLogKind;
  userId?: string;
  details: string[];
  context: Record<string, unknown>;
  image?: string;
};

const MAX_DETAILS = 20;
const storage = new AsyncLocalStorage<ErrorLogNotes>();

export function createErrorLogNotes(): ErrorLogNotes {
  return { details: [], context: {} };
}

export function runWithErrorLogNotes<T>(notes: ErrorLogNotes, fn: () => T): T {
  return storage.run(notes, fn);
}

export function noteErrorLog(note: ErrorLogNote): void {
  const notes = storage.getStore();
  if (!notes) return;
  if (note.action) notes.action = note.action;
  if (note.kind) notes.kind = note.kind;
  if (note.userId) notes.userId = note.userId;
  if (note.detail?.trim() && notes.details.length < MAX_DETAILS)
    notes.details.push(note.detail);
  if (note.context) Object.assign(notes.context, note.context);
  if (note.image) notes.image = note.image;
}

/**
 * 요약의 목록 칸에 하나를 덧붙인다 — 재시도마다 남는 것(상류 API 실패 등). 목록은 `max` 개까지.
 * 범위 밖이면 아무 일도 안 한다.
 */
export function pushErrorLogContext(
  key: string,
  item: unknown,
  max = 10,
): void {
  const notes = storage.getStore();
  if (!notes) return;
  const list = Array.isArray(notes.context[key])
    ? (notes.context[key] as unknown[])
    : [];
  if (list.length < max) list.push(item);
  notes.context[key] = list;
}
