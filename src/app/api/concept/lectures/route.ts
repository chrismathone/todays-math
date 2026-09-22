/**
 * GET  /api/concept/lectures?unitId= — 한 차시의 강의 목록(오른쪽 차시 판)
 * POST /api/concept/lectures         — meta.json 붙여넣기로 **초안** 등록 (관리자만, D-124 ⑼)
 * 대응 계약: src/contracts/conceptAdmin.contract.ts
 *
 * 🔴 쓰기는 `authorizeAccount(request, true)` — 관리자가 아니면 본문을 읽기도 전에 403 이다.
 *    화면이 단추를 숨기는 것만으로는 막은 것이 아니다(라우트로 우회된다).
 */
import {
  conceptLectureResponseSchema,
  conceptRegisterRequestSchema,
  conceptUnitLecturesQuerySchema,
  conceptUnitLecturesResponseSchema,
} from "@/contracts/conceptAdmin.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { jsonError, jsonOk, validationError } from "@/lib/apiResponse";
import {
  loadUnitLectures,
  registerLectureFromMeta,
} from "@/lib/concept/adminService";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  const query = conceptUnitLecturesQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return validationError(query.error);
  const result = await loadUnitLectures(query.data.unitId);
  if (!result.ok)
    return jsonError(
      result.code,
      result.message,
      result.status,
      result.details,
    );
  const res = jsonOk(conceptUnitLecturesResponseSchema, { data: result.data });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

async function handlePost(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  const parsed = conceptRegisterRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) return validationError(parsed.error);
  const result = await registerLectureFromMeta({
    ...parsed.data,
    actorId: access.account!.id,
  });
  if (!result.ok)
    return jsonError(
      result.code,
      result.message,
      result.status,
      result.details,
    );
  return jsonOk(
    conceptLectureResponseSchema,
    { data: result.data },
    { status: 201 },
  );
}

export const GET = withErrorLog("/api/concept/lectures", handleGet);
export const POST = withErrorLog("/api/concept/lectures", handlePost);
