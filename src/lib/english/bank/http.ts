import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, jsonOk, validationError } from "@/lib/apiResponse";
import { requireEnglishSession } from "../routeSupport";
import { type SessionUser } from "@/lib/session";
import { englishRouteAllowed } from "@/lib/accountRouteAccess";
import {
  englishPassageCreateSchema,
  englishPassageListResponseSchema,
  englishPassagePrepareResponseSchema,
  englishPassageResponseSchema,
  englishPassageUsesResponseSchema,
  englishPassageWriteResponseSchema,
} from "@/contracts/englishBank.contract";
import { createEnglishBank } from "./service";
import { decodeBankUtf8, EnglishBankError } from "./policy";

const bank = createEnglishBank(db);
export function bankMenuDenied(viewer: SessionUser, maker = false) {
  return !viewer.isAdmin &&
    (!(viewer.menus ?? []).some((menu) => String(menu) === "english-bank") ||
      (maker &&
        !englishRouteAllowed(
          viewer.menus ?? [],
          "POST",
          "/api/english/generate",
        )))
    ? jsonError("FORBIDDEN", "자료은행을 사용할 권한이 없습니다.", 403)
    : null;
}
const messages: Record<string, string> = {
  PASSAGE_UNAVAILABLE: "사용할 수 없는 지문입니다. 다시 선택해 주세요.",
  PASSAGE_TEXT_MISMATCH:
    "선택한 은행 원문과 입력한 글이 다릅니다. 연결을 해제하거나 원문을 다시 불러와 주세요.",
  RIGHTS_REQUIRED: "이 제작 방식에 필요한 원문 이용 근거를 확인해 주세요.",
  PASSAGE_TOO_LONG:
    "이 제작 방식의 원문 길이 한도를 넘었습니다. 원문은 자르지 않았습니다.",
  REVISION_MISMATCH: "다른 곳에서 먼저 변경했습니다. 다시 불러와 주세요.",
  CLIENT_KEY_CONFLICT: "같은 저장 키인데 내용이 다릅니다. 새로 저장해 주세요.",
  IMPORT_TEXT_UNAVAILABLE:
    "가져올 원문 정보가 없습니다. 텍스트 자료나 가져올 지문을 선택해 주세요.",
  IMPORT_TEXT_TRUNCATED:
    "저장된 텍스트와 원본 파일이 다르거나 일부가 잘렸습니다. 원본을 확인해 주세요.",
  IMPORT_INVALID_UTF8:
    "UTF-8 텍스트 파일이 아닙니다. UTF-8로 저장한 TXT를 올려 주세요.",
};
export function bankErrorResponse(error: EnglishBankError) {
  if (error.reason === "SOURCE_ACCESS_DENIED")
    return jsonError(
      "FORBIDDEN",
      "원본 자료 메뉴를 사용할 권한이 없습니다.",
      403,
      { reason: error.reason },
    );
  return jsonError(
    "CONFLICT",
    messages[error.reason] ?? "지문을 사용할 수 없습니다.",
    409,
    { reason: error.reason, ...error.details },
  );
}
async function readBody(request: Request): Promise<unknown> {
  const max = 256 * 1024;
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new EnglishBankError("PASSAGE_TOO_LONG", { maxBytes: max });
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > max) {
        await reader.cancel();
        throw new EnglishBankError("PASSAGE_TOO_LONG", { maxBytes: max });
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks);
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type")! },
    })
      .formData()
      .catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string" || !/\.txt$/i.test(file.name))
      return undefined;
    let input: unknown;
    try {
      input = JSON.parse(String(form?.get("input")));
    } catch {
      return undefined;
    }
    const metadata = englishPassageCreateSchema
      .omit({ text: true })
      .parse(input);
    return {
      ...metadata,
      text: decodeBankUtf8(new Uint8Array(await file.arrayBuffer())),
    };
  }
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return undefined;
  }
}
export async function handleBankHttp(
  request: Request,
  id?: string,
  action?: string,
) {
  const gate = await requireEnglishSession(request, {
    mutation: request.method !== "GET",
  });
  if (gate.response) return gate.response;
  const denied = bankMenuDenied(gate.session);
  if (denied) return denied;
  try {
    const viewer = gate.session;
    const method = request.method;
    let response: Response;
    if (id) z.uuid().parse(id);
    if (id && action === "rights" && method === "POST")
      response = jsonOk(englishPassageResponseSchema, {
        data: await bank.rights(viewer, id, await readBody(request)),
      });
    else if (id && action === "prepare" && method === "POST")
      response = jsonOk(englishPassagePrepareResponseSchema, {
        data: await bank.prepare(viewer, id, await readBody(request)),
      });
    else if (id && action === "sets" && method === "GET")
      response = jsonOk(englishPassageUsesResponseSchema, {
        data: await bank.uses(viewer, id),
      });
    else if (id && method === "GET")
      response = jsonOk(englishPassageResponseSchema, {
        data: await bank.get(viewer, id),
      });
    else if (id && method === "PATCH")
      response = jsonOk(englishPassageResponseSchema, {
        data: await bank.update(viewer, id, await readBody(request)),
      });
    else if (id && method === "DELETE")
      response = jsonOk(englishPassageResponseSchema, {
        data: await bank.archive(viewer, id, await readBody(request)),
      });
    else if (!id && method === "GET")
      response = jsonOk(
        englishPassageListResponseSchema,
        await bank.list(
          viewer,
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      );
    else if (!id && method === "POST") {
      const body = await readBody(request);
      const result =
        action === "import"
          ? await bank.import(viewer, body)
          : await bank.create(viewer, body);
      response = jsonOk(englishPassageWriteResponseSchema, result, {
        status: result.meta.replayed ? 200 : 201,
      });
    } else return jsonError("NOT_FOUND", "요청 경로가 없습니다.", 404);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    if (error instanceof EnglishBankError) return bankErrorResponse(error);
    throw error;
  }
}
