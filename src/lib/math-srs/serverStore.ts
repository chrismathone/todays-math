import "server-only";
import { db } from "@/lib/db";
import { updateDailyJourney } from "./dailyJourney";
import {
  updateExpedition,
  type ExpeditionWriter,
} from "@/lib/math-explorers/expedition";
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
/**
 * The same table inside a caller's transaction — for teacher routes that re-check
 * authorization in that transaction before writing. Naming the table stays in this
 * module (`mathSrsRecordIsolation.test.ts` pins that).
 */
export const srsStateTableIn = (tx: { studentSrsState: unknown }) =>
  tx.studentSrsState as SrsStateTable;

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
  writer: ExpeditionWriter = {},
  /** 학생 요청의 «지금» — 테스트 도구판의 시간 이동이 여기까지 닿아야 원정·하루 여정이 같은 날을 본다. */
  now: Date = new Date(),
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
        "REVISION_MISMATCH",
      );
    const state = change(previous.state);
    if (state === previous.state) return previous;
    const payload = parseSrsState(
      updateExpedition(
        previous.state,
        updateDailyJourney(previous.state, state),
        now,
        writer,
      ),
    );
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
    "REVISION_MISMATCH",
  );
}

/**
 * 테스트 도구판 전용(원장님 2026-09-28) — 학습 경로에는 없는 두 일. 표를 만지는 곳을 이 모듈 하나로 두려고
 * 여기 있다(`mathSrsRecordIsolation.test.ts`). 부르는 곳은 `testConsoleRoutes.ts` 하나다.
 */
export async function deleteSrsState(studentId: string): Promise<void> {
  await (
    db as unknown as {
      studentSrsState: {
        deleteMany(args: { where: { studentId: string } }): Promise<unknown>;
      };
    }
  ).studentSrsState.deleteMany({ where: { studentId } });
}

/** 스냅샷 되돌리기 — 계약(`parseSrsState`)을 지난 원본만 받는다. 다른 창이 먼저 저장했으면 거절한다. */
export async function replaceSrsState(
  studentId: string,
  payload: StoredSrsState,
  table = srsStateTable(),
): Promise<void> {
  const current = await readSrsState(studentId, table);
  const checked = parseSrsState(payload);
  if (current.revision === 0) {
    await table.create({ data: { studentId, revision: 1, payload: checked } });
    return;
  }
  const saved = await table.updateMany({
    where: { studentId, revision: current.revision },
    data: { payload: checked, revision: { increment: 1 } },
  });
  if (saved.count !== 1)
    throw new SrsConflict(
      "다른 창에서 학습 기록을 저장했습니다. 다시 시도해 주세요.",
    );
}
