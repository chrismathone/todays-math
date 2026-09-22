/**
 * `GET /api/students/{id}/achievement?from=&to=&compare=` — **성취 팩터** (D-134 트랙 2).
 *
 * 대응 계약: src/contracts/achievement.contract.ts
 * 산출 규칙: src/lib/achievement/collect.ts (순수 함수) · 조회: src/lib/achievement/load.ts
 * 브리프: docs/planning/tracks/briefs/achievement-factors.md · SSOT: docs/planning/23-achievement-report.md
 *
 * 🔴 **읽기만 한다.** 이 트랙은 공유 DB 에 아무것도 쓰지 않는다.
 *
 * 소유 판정은 `ownership.ts` 의 404/403 헬퍼 하나만 묻는다 — 관리자가 넘는지는
 * `ownerScope.ts` 한 곳이 정한다(D-130). **라우트에서 `isAdmin` 을 새로 읽지 않는다.**
 *
 * 순서: 세션 401 → 경로 id 400 → 학생 404/403 → 질의 400(기간 뒤집힘 포함).
 */
import type { NextRequest } from "next/server";

import {
  achievementQuerySchema,
  achievementResponseSchema,
} from "@/contracts/achievement.contract";
import { idParamSchema } from "@/contracts/common.contract";
import { collectAchievement } from "@/lib/achievement/collect";
import { loadAchievementInput } from "@/lib/achievement/load";
import {
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { requireOwnedStudent } from "@/lib/ownership";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedStudent(id, session);
  if (!owned.ok) return owned.response;

  const query = achievementQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return validationError(query.error);

  const input = await loadAchievementInput({
    studentId: id,
    period: { from: query.data.from, to: query.data.to },
    compare: query.data.compare,
  });
  // 소유 판정을 통과한 뒤 행이 사라진 경우 — 「없다」로 답한다.
  if (input === null) return notFoundError("학생");

  return jsonOk(achievementResponseSchema, {
    data: collectAchievement(input),
  });
}

export const GET = withErrorLog("/api/students/[id]/achievement", handleGet);
