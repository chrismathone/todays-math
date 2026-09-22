/**
 * 오류 기록 계약 — 브라우저 보고 본문(`POST /api/logs/client`) · 보관 정리 응답(`GET /api/logs/purge/cron`).
 *
 * 값(종류·상한·머리 이름)의 SSOT 는 `errorLogValues.ts` — 브라우저가 zod 없이 읽는다.
 * 표: prisma/schema.prisma `ErrorLog` · 쓰는 곳: src/lib/errorLog/record.ts
 */
import { z } from "zod";

import {
  CLIENT_ERROR_KINDS,
  CLIENT_LOG_DETAIL_MAX,
  CLIENT_LOG_MAX_EVENTS,
  CLIENT_LOG_MESSAGE_MAX,
  CLIENT_LOG_PATH_MAX,
  ERROR_LOG_KINDS,
} from "./errorLogValues";

export const errorLogKindSchema = z.enum(ERROR_LOG_KINDS);

/** 브라우저가 본 사건 하나 — 보내는 쪽이 길이를 먼저 자른다(넘치면 묶음째 거절). */
export const clientErrorEventSchema = z.strictObject({
  kind: z.enum(CLIENT_ERROR_KINDS),
  message: z.string().max(CLIENT_LOG_MESSAGE_MAX),
  /** 스택 · 응답 본문 앞부분 */
  detail: z.string().max(CLIENT_LOG_DETAIL_MAX).optional(),
  /** 그 화면의 경로(질의 문자열은 뺀다 — 토큰이 실릴 수 있다) */
  page: z.string().max(CLIENT_LOG_PATH_MAX),
  /** 요청 실패일 때 — 무엇을 불렀고 무엇이 왔나(0 은 응답이 아예 없음) */
  request: z
    .strictObject({
      method: z.string().max(10).optional(),
      path: z.string().max(CLIENT_LOG_PATH_MAX),
      status: z.number().int().min(0).max(999),
    })
    .optional(),
  /** 같은 사건이 묶여 온 수 */
  count: z.number().int().min(1).max(100_000).default(1),
  /** 처음 본 시각(브라우저 시계, ISO) */
  firstAt: z.string().max(40).optional(),
  /** 그 화면을 만든 배포(브라우저에 실린 커밋 — 오래 켜 둔 탭이면 서버와 다르다) */
  release: z.string().max(64).optional(),
});
export type ClientErrorEvent = z.infer<typeof clientErrorEventSchema>;

export const clientErrorBatchSchema = z.strictObject({
  events: z.array(clientErrorEventSchema).min(1).max(CLIENT_LOG_MAX_EVENTS),
});

export const errorLogPurgeResponseSchema = z.strictObject({
  data: z.strictObject({
    deleted: z.number().int().min(0),
    /** 이 시각보다 앞선 줄을 지웠다(ISO) */
    cutoff: z.string(),
  }),
});
