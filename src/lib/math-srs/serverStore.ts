import "server-only";
import type { Prisma } from "@prisma/client";
import type { StoredFading } from "@/contracts/fading.contract";
import { db } from "@/lib/db";
import { emptyFading } from "@/lib/fading/state";
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
 * 쓰기 직전에 **같은 트랜잭션 안에서** 확인(`guard`)을 돌리는 표 — 교사가 학생의 기록을 고칠 때
 * «지금도 그 반을 고칠 수 있는가»를 쓰기와 한 묶음으로 본다. 읽기는 바깥 표 그대로다.
 * 이 표를 직접 만지는 자리를 이 모듈 하나로 두려고 여기 있다(`mathSrsRecordIsolation.test.ts`).
 */
export function guardedSrsStateTable(
  guard: (tx: Prisma.TransactionClient) => Promise<void>,
): SrsStateTable {
  const within = (tx: Prisma.TransactionClient) =>
    (tx as unknown as { studentSrsState: SrsStateTable }).studentSrsState;
  return {
    ...srsStateTable(),
    create: (args) =>
      db.$transaction(async (tx) => {
        await guard(tx);
        return within(tx).create(args);
      }),
    updateMany: (args) =>
      db.$transaction(async (tx) => {
        await guard(tx);
        return within(tx).updateMany(args);
      }),
  };
}

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
 * «오늘의 기억» 새 앱의 칸(`fading`)만 바꾼다 (`docs/planning/srs-overhaul-20261006.md` §14).
 * 🔴 `changeSrsState` 와 달리 **하루 여정 · 통합 탐험의 갱신을 지나지 않는다** — 새 기억의 저장에 옛 탐험의 장부 · 별이 따라 움직이면 안 된다.
 * 다른 칸은 읽은 그대로 되쓴다. revision 을 견주어 쓰고, 그사이 다른 쓰기가 끼면 새 기록을 다시 읽어 그 위에 다시 적용한다.
 * 바뀐 것이 없으면(받은 칸을 그대로 돌려주면) 쓰지 않는다 — 같은 요청의 되풀이가 그래서 안전하다.
 */
export async function changeFadingState(
  studentId: string,
  change: (fading: StoredFading) => StoredFading,
  table = srsStateTable(),
): Promise<{ revision: number; state: StoredSrsState }> {
  for (let retry = 0; retry < 5; retry++) {
    const previous = await readSrsState(studentId, table);
    const fading = previous.state.fading ?? emptyFading();
    const next = change(fading);
    if (next === fading) return previous;
    const payload = parseSrsState({ ...previous.state, fading: next });
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
      // 다른 요청이 이 학생의 줄을 먼저 만들었다 — 다시 읽어 그 위에 적용한다.
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
