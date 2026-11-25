import "server-only";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sameOriginMutation } from "@/lib/accountAccess";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import { ScanAccessError, type ScanIdentity } from "./issuance";

export const scanNoStore = { "Cache-Control": "private, no-store" };

export async function scanRequestActor(
  request: Request,
  teacherOnly = false,
): Promise<ScanIdentity> {
  const session = await auth();
  if (!["GET", "HEAD"].includes(request.method) && !sameOriginMutation(request))
    throw new ScanAccessError("같은 사이트에서 요청해 주세요.");
  if (session?.student) {
    if (teacherOnly)
      throw new ScanAccessError("교사만 이 작업을 할 수 있습니다.");
    if (session.student.mustChangePassword)
      throw new ScanAccessError(STUDENT_MUST_CHANGE_MESSAGE);
    return { kind: "student", id: session.student.studentId };
  }
  if (!session?.user?.id)
    throw new ScanAccessError("로그인 후 이용해 주세요.", 401);
  if (
    session.user.role !== "director" ||
    session.user.approvalStatus !== "approved" ||
    !session.user.menus?.includes("conceptBlank")
  )
    throw new ScanAccessError("개념 백지 메뉴를 사용할 권한이 없습니다.");
  return { kind: "teacher", id: session.user.id };
}

/** Streaming byte count also protects requests with missing/false Content-Length. */
export async function readScanJson(
  request: Request,
  limit = 4_499_999,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ScanAccessError("JSON 요청이 필요합니다.", 415);
  if (Number(request.headers.get("content-length")) > limit)
    throw new ScanAccessError(
      "요청이 너무 큽니다. 사진을 줄여 다시 올려 주세요.",
      413,
    );
  const reader = request.body?.getReader();
  if (!reader) throw new ScanAccessError("요청 내용이 없습니다.", 400);
  let bytes = 0,
    text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new ScanAccessError(
          "요청이 너무 큽니다. 사진을 줄여 다시 올려 주세요.",
          413,
        );
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    try {
      return JSON.parse(text + decoder.decode());
    } catch {
      throw new ScanAccessError("요청 내용을 읽을 수 없습니다.", 400);
    }
  } finally {
    reader.releaseLock();
  }
}

/** Only expected domain failures become messages. Unknown errors remain visible to withErrorLog. */
export async function scanHttp(
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    const status =
      error instanceof z.ZodError || error instanceof RangeError
        ? 400
        : error instanceof Error &&
            "status" in error &&
            typeof error.status === "number"
          ? error.status
          : 0;
    if (![400, 401, 403, 404, 409, 413, 415, 429, 503].includes(status))
      throw error;
    return Response.json(
      {
        error: {
          code:
            status === 503
              ? "SERVICE_UNAVAILABLE"
              : status === 400
                ? "VALIDATION_ERROR"
                : status === 401
                  ? "UNAUTHORIZED"
                  : status === 409
                    ? "CONFLICT"
                    : "FORBIDDEN",
          message:
            error instanceof z.ZodError
              ? "요청 값이 올바르지 않습니다."
              : (error as Error).message,
        },
      },
      { status, headers: scanNoStore },
    );
  }
}
