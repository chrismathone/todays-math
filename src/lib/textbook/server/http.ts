import "server-only";

import type { z } from "zod";

import { toFieldErrorDetails } from "@/lib/apiResponse";

import type { TextbookActor } from "../access";
import { canonicalHash } from "../hash.server";
import { StrictJsonError, readStrictJson } from "../strictJson";
import { authorizeTextbook, textbookHeaders } from "./authorize";
import { TextbookError, notFound } from "./errors";
import { textbookDb } from "./prismaSql";
import type { RequestKey } from "./requests";
import { type TextbookDb, isTextbookGuardError, sqlState } from "./sql";

export interface TextbookRouteContext {
  actor: TextbookActor;
  db: TextbookDb;
}

const errorBody = (
  status: number,
  code: string,
  message: string,
  details?: unknown,
) =>
  Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers: textbookHeaders },
  );

/** `{ data }` 로 싸서 낸다 — 계약 스키마로 한 번 걸러, 구현이 계약에서 벗어나면 여기서 드러난다 */
export function data<T extends z.ZodType>(
  schema: T,
  payload: z.input<T>,
  status = 200,
): Response {
  return Response.json(
    { data: schema.parse(payload) },
    { status, headers: textbookHeaders },
  );
}

/** 계약에 응답 스키마가 아직 없는 경로용 — 모양은 그 경로의 서버 함수가 정한다 */
export function plain(payload: unknown, status = 200): Response {
  return Response.json({ data: payload }, { status, headers: textbookHeaders });
}

/**
 * 교사 교재 라우트의 공통 틀 — 권한(로그인 · 승인 · 메뉴 · 같은 출처)을 먼저 보고, 서버 코드가 던진 거절을
 * 저장소의 오류 모양(`{ error: { code, message, details } }`)으로 바꾼다. 응답은 전부 `private, no-store` 다.
 * 모르는 오류는 다시 던진다 — `withErrorLog` 가 기록하고 Next 가 500 을 낸다(삼키지 않는다).
 */
export async function textbookRoute(
  request: Request,
  run: (context: TextbookRouteContext) => Promise<Response>,
): Promise<Response> {
  const access = await authorizeTextbook(request);
  if (access.response) return access.response;
  try {
    return await run({ actor: access.actor, db: textbookDb });
  } catch (error) {
    if (error instanceof TextbookError)
      return errorBody(error.status, error.code, error.message, error.details);
    if (error instanceof StrictJsonError)
      return errorBody(
        /limit exceeded/i.test(error.message) ? 413 : 400,
        /limit exceeded/i.test(error.message)
          ? "PAYLOAD_TOO_LARGE"
          : "VALIDATION_ERROR",
        "요청 본문을 읽을 수 없습니다.",
      );
    const state = sqlState(error);
    // DB 가 막았다 — 앱의 사전 검사와 저장 사이에 판본이 바뀐 것이다(발행 확정 · 다른 기기의 저장)
    if (isTextbookGuardError(error) || state === "23505" || state === "23503")
      return errorBody(
        409,
        "CONFLICT",
        "그사이 판본이 바뀌어 저장하지 못했습니다. 다시 불러온 뒤 시도해 주세요.",
      );
    if (state === "40001" || state === "40P01" || state === "55P03")
      return errorBody(
        409,
        "CONFLICT",
        "다른 저장과 겹쳤습니다. 잠시 뒤 다시 시도해 주세요.",
      );
    throw error;
  }
}

/**
 * 본문 읽기 — 겹친 키 · 깨진 UTF-8 을 `JSON.parse` 전에 걸러 내는 엄격한 파서로 읽고, 계약 스키마로 검증한다.
 * 모르는 칸은 버리지 않고 거절한다(계약이 `strictObject` 다).
 */
export async function readBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes = 2 * 1024 * 1024,
): Promise<z.output<T>> {
  const parsed = schema.safeParse(await readStrictJson(request, { maxBytes }));
  if (!parsed.success)
    throw new TextbookError(
      400,
      "VALIDATION_ERROR",
      "요청 값이 올바르지 않습니다.",
      { fields: toFieldErrorDetails(parsed.error) },
    );
  return parsed.data;
}

/**
 * 요청 열쇠 — 본문 해시에 **주소의 대상**을 같이 넣는다. 같은 requestId · 같은 본문을 다른 판본 · 다른 구획에
 * 다시 쓰면 다른 요청이다(409).
 */
export function requestKeyOf(
  actor: TextbookActor,
  operation: string,
  body: { requestId: string },
  scope: Record<string, string>,
): RequestKey {
  return {
    userId: actor.id,
    requestId: body.requestId,
    operation,
    bodyHash: canonicalHash({ body, scope }),
    editionId: scope.editionId ?? null,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 주소의 id — 모양이 아니면 없는 것이다(DB 에 묻지 않는다) */
export function uuidParam(value: string, what: string): string {
  if (!UUID.test(value)) throw notFound(what);
  return value.toLowerCase();
}
