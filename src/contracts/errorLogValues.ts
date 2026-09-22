/**
 * 오류 기록의 값 — 브라우저 보고기(`src/lib/errorLog/clientReporter.ts`)가 **zod 없이** 읽어야 해서
 * 따로 뺐다(`difficulty.ts` 와 같은 까닭). zod 계약은 `errorLog.contract.ts` 가 이 값으로 만든다.
 *
 * 원장님 2026-09-22 — 새 표 · 전부 수집 · AI 도형 재작도 실패 때 크롭 이미지(2MB) · 90일 · 화면 없음(조회 스크립트).
 * 같은 날 더한 결정 — «요청대로 고치기» 실패 때도 크롭 이미지 · 학생 화면의 브라우저 오류도 받는다.
 * 브리프: docs/planning/tracks/briefs/error-log-collector.md
 */

export const ERROR_LOG_SOURCES = ["server", "client"] as const;
export type ErrorLogSource = (typeof ERROR_LOG_SOURCES)[number];

/**
 * 종류 — 표의 `kind` 칸.
 *  - `api-rejected` 서버가 4xx 로 거절했다(계약·권한·없는 대상·한도).
 *  - `api-error` 서버가 5xx 를 냈거나 처리기가 예외를 던졌다.
 *  - `ai-rejected` 작업실 AI 가 못 했다 — 모델·도형 엔진의 거절, 모델 응답을 못 읽음, 상류 API 실패.
 *  - `client-exception` 브라우저의 잡히지 않은 오류(`error` · `unhandledrejection`).
 *  - `client-request-failed` 브라우저가 본 요청 실패 중 **서버가 기록하지 못한 것** — 네트워크 끊김,
 *    플랫폼이 먼저 자른 413·504, JSON 이 아닌 200(로그인 화면 따위).
 */
export const ERROR_LOG_KINDS = [
  "api-rejected",
  "api-error",
  "ai-rejected",
  "client-exception",
  "client-request-failed",
] as const;
export type ErrorLogKind = (typeof ERROR_LOG_KINDS)[number];

export const CLIENT_ERROR_KINDS = [
  "client-exception",
  "client-request-failed",
] as const;
export type ClientErrorKind = (typeof CLIENT_ERROR_KINDS)[number];

/**
 * 서버가 이 실패를 기록했다는 응답 머리 — 값은 그 줄의 id.
 * 브라우저는 이 머리가 붙은 실패를 **다시 보내지 않는다**(같은 실패가 두 줄이 되지 않게).
 */
export const ERROR_LOG_HEADER = "x-error-log-id";

/** 브라우저 오류를 받는 곳 — 이 경로 자체는 기록하지 않는다(되먹임 고리 금지). */
export const CLIENT_LOG_ENDPOINT = "/api/logs/client";
/** 한 요청 본문 상한 — `keepalive`·`sendBeacon` 의 64KB 보다 넉넉히 작게. */
export const CLIENT_LOG_MAX_BODY_BYTES = 32 * 1024;
/** 한 요청에 싣는 사건 수 상한 */
export const CLIENT_LOG_MAX_EVENTS = 10;
export const CLIENT_LOG_MESSAGE_MAX = 500;
export const CLIENT_LOG_DETAIL_MAX = 2000;
export const CLIENT_LOG_PATH_MAX = 300;

/** 보관 — 이보다 오래된 줄은 매일 지운다(`/api/logs/purge/cron`). */
export const ERROR_LOG_RETENTION_DAYS = 90;
/** AI 도형 재작도 · «요청대로 고치기» 실패 때 남기는 크롭 이미지의 상한(바이트) */
export const ERROR_LOG_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
