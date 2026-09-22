/**
 * 오류 기록 한 줄을 쓴다 — **best effort**. 표가 없거나(마이그레이션 전) DB 가 느리거나 막혀도 던지지 않는다.
 * `recordAudit`(src/lib/audit.ts)과 같은 결이다: 기록이 요청을 깨면 기록하려던 것보다 큰 사고가 된다.
 *
 * 거르기: 모든 글 칸은 `scrubText`, 요약은 `redactSecrets` 뒤 바이트 상한(`clampJson`).
 * 이미지: data URL 을 풀어 `error_log_image` 에 바이트로 — 2MB 를 넘으면 버리고 그 사실을 요약에 적는다.
 *
 * ⚠️ `server-only` 를 걸지 않는다 — 모든 라우트가 `withErrorLog` 를 거쳐 이 파일을 불러오므로,
 *    걸면 `server-only` 를 모킹하지 않은 라우트 시험이 적재 단계에서 전부 죽는다. DB 에 닿는 파일이라
 *    브라우저 번들에는 어차피 못 들어간다(`@/lib/db`).
 */
import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import {
  ERROR_LOG_IMAGE_MAX_BYTES,
  type ErrorLogKind,
  type ErrorLogSource,
} from "@/contracts/errorLogValues";
import { db } from "@/lib/db";

import { clampJson, redactSecrets, scrubText, truncate } from "./sanitize";

export const ERROR_LOG_MESSAGE_MAX = 1000;
export const ERROR_LOG_DETAIL_MAX = 8000;
export const ERROR_LOG_CONTEXT_MAX_BYTES = 64 * 1024;
/** 기록 한 번의 상한 시간 — 이만큼 넘으면 포기한다(`after()` 로 함수 수명을 붙잡지 않게). */
export const ERROR_LOG_WRITE_TIMEOUT_MS = 5000;

export type ErrorLogEntry = {
  /** 미리 정한 줄 id(응답 머리 `x-error-log-id` 와 같은 값). 없으면 새로 만든다 */
  id?: string;
  source: ErrorLogSource;
  kind: ErrorLogKind;
  route?: string | null;
  method?: string | null;
  status?: number | null;
  action?: string | null;
  message?: string | null;
  detail?: string | null;
  context?: Record<string, unknown>;
  userId?: string | null;
  requestId?: string | null;
  durationMs?: number | null;
  /** 없으면 서버의 배포 커밋(`VERCEL_GIT_COMMIT_SHA`) */
  release?: string | null;
  /** 원본 이미지(data URL) — `error_log_image` 로 간다 */
  image?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([\s\S]*)$/;

const text = (value: string | null | undefined, max: number) =>
  value ? truncate(scrubText(value), max) : null;

function decodeImage(
  dataUrl: string,
):
  | { ok: true; mimeType: string; data: Buffer }
  | { ok: false; skipped: Record<string, unknown> } {
  const match = IMAGE_DATA_URL.exec(dataUrl);
  if (!match) return { ok: false, skipped: { reason: "not-image" } };
  // base64 길이로 먼저 어림한다 — 상한을 한참 넘는 것을 굳이 풀지 않는다
  const approx = Math.floor((match[2].length * 3) / 4);
  if (approx > ERROR_LOG_IMAGE_MAX_BYTES + 4)
    return { ok: false, skipped: { reason: "too-large", bytes: approx } };
  const data = Buffer.from(match[2], "base64");
  if (data.length > ERROR_LOG_IMAGE_MAX_BYTES)
    return { ok: false, skipped: { reason: "too-large", bytes: data.length } };
  return { ok: true, mimeType: match[1], data };
}

/** 한 줄을 표의 모양으로 — 여기서 거르고 자른다. */
export function errorLogRow(entry: ErrorLogEntry): {
  row: Prisma.ErrorLogUncheckedCreateInput;
  image?: { mimeType: string; byteSize: number; data: Buffer };
} {
  const context: Record<string, unknown> = { ...(entry.context ?? {}) };
  let userId = entry.userId ?? null;
  if (userId && !UUID.test(userId)) {
    context.actor = userId;
    userId = null;
  }
  let image: { mimeType: string; byteSize: number; data: Buffer } | undefined;
  if (entry.image) {
    const decoded = decodeImage(entry.image);
    if (decoded.ok)
      image = {
        mimeType: decoded.mimeType,
        byteSize: decoded.data.length,
        data: decoded.data,
      };
    else context.imageSkipped = decoded.skipped;
  }
  const release = entry.release ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  return {
    row: {
      id: entry.id && UUID.test(entry.id) ? entry.id : randomUUID(),
      source: entry.source,
      kind: entry.kind,
      route: text(entry.route, 300),
      method: entry.method ? entry.method.slice(0, 10).toUpperCase() : null,
      status:
        typeof entry.status === "number" && Number.isFinite(entry.status)
          ? Math.trunc(entry.status)
          : null,
      action: text(entry.action, 60),
      message: text(entry.message, ERROR_LOG_MESSAGE_MAX),
      detail: text(entry.detail, ERROR_LOG_DETAIL_MAX),
      context: clampJson(
        redactSecrets(context),
        ERROR_LOG_CONTEXT_MAX_BYTES,
      ) as Prisma.InputJsonValue,
      userId,
      release: release ? release.slice(0, 64) : null,
      requestId: text(entry.requestId, 200),
      durationMs:
        typeof entry.durationMs === "number" &&
        Number.isFinite(entry.durationMs)
          ? Math.max(0, Math.round(entry.durationMs))
          : null,
    },
    image,
  };
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(new Error("timeout"), { code: "TIMEOUT" })),
      ms,
    );
    (timer as { unref?: () => void }).unref?.();
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

const codeOf = (error: unknown) =>
  error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;

function warn(error: unknown) {
  const code = codeOf(error);
  const message = error instanceof Error ? error.message.slice(0, 160) : "";
  console.warn(
    `[오류 기록] 남기지 못했습니다: ${code ?? ""} ${message}`.trim(),
  );
}

async function create(
  row: Prisma.ErrorLogUncheckedCreateInput,
  image: ReturnType<typeof errorLogRow>["image"],
) {
  await withTimeout(
    db.errorLog.create({
      data: { ...row, ...(image ? { image: { create: image } } : {}) },
      select: { id: true },
    }),
    ERROR_LOG_WRITE_TIMEOUT_MS,
  );
}

/** 한 줄 — 남겼으면 true. 던지지 않는다. */
export async function recordErrorLog(entry: ErrorLogEntry): Promise<boolean> {
  try {
    const { row, image } = errorLogRow(entry);
    try {
      await create(row, image);
    } catch (error) {
      // 세션의 계정이 그새 지워졌다(FK) — 사용자 칸만 비우고 한 번 더. 기록 자체를 잃지 않는다
      if (codeOf(error) !== "P2003" || !row.userId) throw error;
      const context = {
        ...(row.context as Record<string, unknown>),
        actor: row.userId,
      };
      await create({ ...row, userId: null, context }, image);
    }
    return true;
  } catch (error) {
    warn(error);
    return false;
  }
}

/** 브라우저 묶음 — 이미지 없이 한 번에 넣는다. 넣은 줄 수(실패면 0). 던지지 않는다. */
export async function recordErrorLogs(
  entries: ErrorLogEntry[],
): Promise<number> {
  if (!entries.length) return 0;
  try {
    const rows = entries.map((entry) => {
      const { row } = errorLogRow({ ...entry, image: null });
      return row;
    });
    try {
      const { count } = await withTimeout(
        db.errorLog.createMany({ data: rows }),
        ERROR_LOG_WRITE_TIMEOUT_MS,
      );
      return count;
    } catch (error) {
      if (codeOf(error) !== "P2003") throw error;
      const { count } = await withTimeout(
        db.errorLog.createMany({
          data: rows.map((row) => ({
            ...row,
            userId: null,
            context: {
              ...(row.context as Record<string, unknown>),
              actor: row.userId,
            },
          })),
        }),
        ERROR_LOG_WRITE_TIMEOUT_MS,
      );
      return count;
    }
  } catch (error) {
    warn(error);
    return 0;
  }
}
