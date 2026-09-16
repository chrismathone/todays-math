/**
 * POST /api/classes/{id}/progress-plan/preview — **저장하지 않고** 계획을 이번 주 예정으로 편다 (D-129 ④ · D-131).
 *
 * 대응 계약: src/contracts/dailyAutoTest.contract.ts (`progressPlanPreviewResponseSchema`)
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-screen.md §0 — 「저장하기 전에 결과를 본다」(시안 B)
 *
 * 🔴 **아무것도 안 쓴다.** 본문은 PUT 과 같은 규칙 한 줄이고, 예정은 저장된 계획의 GET 과 **같은 함수**
 *    (`loadPlanSchedule` → `buildPlanSchedule`)로 편다 — 화면이 날짜를 따로 펴면 «미리보기와 저장 뒤가 다른»
 *    카드가 된다(22 §4 리드 결정 E). 반 진도가 있으면 그 지점부터 다시 편다(실제가 이긴다, D-129 ⑵).
 *
 * 소유 판정은 `ownership.ts` 의 404/403 헬퍼 — 관리자는 넘는다(D-130). 읽기 경로지만 남의 반 진도가 예정에
 * 실리므로 같은 울타리다.
 * 순서: 세션 401 → 경로 id 400 → 반 404/403 → `?day=`·본문 422 → 없는 차시 422.
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import {
  progressPlanPreviewResponseSchema,
  progressPlanQuerySchema,
  progressPlanWriteRequestSchema,
} from "@/contracts/dailyAutoTest.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import {
  checkStartUnit,
  loadPlanSchedule,
  parsePlanBody,
  planValidationError,
} from "@/lib/daily/progressPlanStore";
import { kstDateOf } from "@/lib/kstDate";
import { requireOwnedClass } from "@/lib/ownership";
import { getSessionUser } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedClass(id, session);
  if (!owned.ok) return owned.response;

  const query = progressPlanQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return planValidationError(query.error);
  const day = query.data.day ?? kstDateOf(new Date());

  const body = await parsePlanBody(request, progressPlanWriteRequestSchema);
  if (!body.ok) return body.response;
  const missingUnit = await checkStartUnit(body.data.startUnitId);
  if (missingUnit) return missingUnit;

  // 요일은 저장할 때와 같은 모양으로 — 겹침·차례가 달라도 같은 규칙이다.
  const weekdays = [...new Set(body.data.weekdays)].sort((a, b) => a - b);
  const schedule = await loadPlanSchedule({
    rule: { ...body.data, weekdays },
    classId: id,
    student: null,
    day,
  });

  return jsonOk(progressPlanPreviewResponseSchema, { data: { schedule } });
}
