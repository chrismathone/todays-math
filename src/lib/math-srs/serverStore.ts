import "server-only";
import { db } from "@/lib/db";
import { updateDailyJourney } from "./dailyJourney";
import { updateExpedition } from "@/lib/math-explorers/expedition";
import {
  emptySrsState,
  parseSrsState,
  SrsConflict,
  SrsUnavailable,
  type StoredSrsState,
} from "./serverState";

export interface SrsStateRow {
  studentId: string;
  revision: number;
  payload: unknown;
}
/** A narrow persistence port keeps the transitions testable without connecting to a database. */
export interface SrsStateTable {
  findUnique(args: {
    where: { studentId: string };
  }): Promise<SrsStateRow | null>;
  findMany(args: {
    where: { studentId: { in: string[] } };
  }): Promise<SrsStateRow[]>;
  create(args: {
    data: { studentId: string; revision: number; payload: unknown };
  }): Promise<unknown>;
  updateMany(args: {
    where: { studentId: string; revision: number };
    data: { payload: unknown; revision: { increment: number } };
  }): Promise<{ count: number }>;
}
export const srsStateTable = () =>
  (db as unknown as { studentSrsState: SrsStateTable }).studentSrsState;

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? error.code
    : null;
}
export function isMissingSrsStorage(error: unknown): boolean {
  return errorCode(error) === "P2021" || errorCode(error) === "P2022";
}
const unavailable = () =>
  new SrsUnavailable(
    "학생 학습 기록 저장소를 준비 중입니다. 선생님께 알려 주세요.",
  );

export async function readSrsState(studentId: string, table = srsStateTable()) {
  try {
    const row = await table.findUnique({ where: { studentId } });
    return {
      revision: row?.revision ?? 0,
      state: row ? parseSrsState(row.payload) : emptySrsState(),
    };
  } catch (error) {
    if (isMissingSrsStorage(error) || !table) throw unavailable();
    throw error;
  }
}

/** Atomic revision comparison prevents two tabs from overwriting an answer or its memory update. */
export async function changeSrsState(
  studentId: string,
  change: (state: StoredSrsState) => StoredSrsState,
  table = srsStateTable(),
  expectedRevision?: number,
): Promise<{ revision: number; state: StoredSrsState }> {
  for (let retry = 0; retry < 5; retry++) {
    const previous = await readSrsState(studentId, table);
    // Settings are an explicit edit of a snapshot, never replayed over new learning.
    if (
      expectedRevision !== undefined &&
      previous.revision !== expectedRevision
    )
      throw new SrsConflict(
        "학습 기록이 변경되었습니다. 설정을 다시 불러와 주세요.",
      );
    const state = change(previous.state);
    if (state === previous.state) return previous;
    const payload = parseSrsState(updateExpedition(previous.state, updateDailyJourney(previous.state, state), new Date()));
    try {
      if (previous.revision === 0) {
        await table.create({ data: { studentId, revision: 1, payload } });
        return { revision: 1, state: payload };
      }
      const saved = await table.updateMany({
        where: { studentId, revision: previous.revision },
        data: { payload, revision: { increment: 1 } },
      });
      if (saved.count === 1)
        return { revision: previous.revision + 1, state: payload };
    } catch (error) {
      if (isMissingSrsStorage(error)) throw unavailable();
      if (errorCode(error) !== "P2002") throw error;
      // Another request created this student's row. Re-read and apply/idempotently return.
    }
  }
  throw new SrsConflict(
    "다른 창에서 학습 기록을 저장했습니다. 다시 불러와 주세요.",
  );
}
