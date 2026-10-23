import "server-only";
import { getSessionUser } from "@/lib/session";
import { sameOriginMutation } from "@/lib/accountAccess";
import { CommercialWorkbookError, fail } from "../errors";
import { createServerCommercialWorkbookSource } from "./source";
import type { CommercialWorkbookSource } from "../source";

export async function readWorkbookBody(request: Request): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    fail("VALIDATION_ERROR", "JSON 형식으로 요청해 주세요.");
  const reader = request.body?.getReader();
  if (!reader) fail("VALIDATION_ERROR", "요청 내용이 없습니다.");
  const decoder = new TextDecoder();
  let length = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 8 * 1024 * 1024) {
        await reader.cancel();
        fail("VALIDATION_ERROR", "요청 크기가 너무 큽니다.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof CommercialWorkbookError) throw error;
    fail("VALIDATION_ERROR", "JSON 내용을 확인해 주세요.");
  } finally {
    reader.releaseLock();
  }
}
export async function workbookRoute(
  request: Request,
  operation: (source: CommercialWorkbookSource) => Promise<unknown>,
  status = 200,
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  try {
    const actor = await getSessionUser();
    if (!actor) fail("UNAUTHORIZED", "교사 로그인이 필요합니다.");
    if (!actor.menus?.includes("teaching"))
      fail("FORBIDDEN", "수업 · 학생 관리 권한이 필요합니다.");
    if (
      request.headers.has("x-workspace-owner") &&
      request.headers.get("x-workspace-owner") !== actor.id
    )
      fail("FORBIDDEN", "로그인 계정이 바뀌었습니다. 화면을 다시 열어 주세요.");
    if (
      !["GET", "HEAD"].includes(request.method) &&
      !sameOriginMutation(request)
    )
      fail("FORBIDDEN", "같은 사이트에서 요청해 주세요.");
    return Response.json(
      { data: await operation(createServerCommercialWorkbookSource(actor.id)) },
      { status, headers },
    );
  } catch (error) {
    if (error instanceof CommercialWorkbookError)
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details === undefined ? {} : { details: error.details }),
          },
        },
        { status: error.status, headers },
      );
    // Keep internal SQL, keys and student data out of error responses. withErrorLog records the 503.
    return Response.json(
      {
        error: {
          code: "UNAVAILABLE",
          message:
            "교재 저장소를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        },
      },
      { status: 503, headers },
    );
  }
}
