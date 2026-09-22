/**
 * GET /api/progress/suggest?classId= — 반 진도가 **없을 때** 시작점 제안.
 *
 * 원장님 지적 2026-08-25: *「차시이동이 작동하지 않음.」* 반 진도가 없으면
 * `adjacentUnitIds` 가 앞·뒤를 둘 다 null 로 돌려주어 화살표가 죽는다. 학년 첫
 * 단원에서 시작하면 원하는 자리까지 백 번을 눌러야 하므로, **그 반 학생들이 실제로
 * 서 있는 자리**를 제안한다.
 *
 * 🔴 **제안은 진도가 아니다.** 이 라우트는 아무것도 쓰지 않는다. 원장님이
 *    「이 차시로 진도 기록」을 눌러야 반 진도가 된다 — 그래야
 *    `deriveClassProgress` 가 «갈렸다»고 일부러 안 만든 것을 옆문으로 만들지 않는다.
 *
 * 판정 자체는 순수 함수(`suggestStartUnit`)에 있다. 여기서는 **조회 순서만** 맞춘다:
 * 최신순 정렬이 `/api/progress` 와 **글자 그대로 같아야** 「최신」이 같은 뜻이 된다.
 */
import type { NextRequest } from "next/server";

import {
  progressQuerySchema,
  progressSuggestResponseSchema,
} from "@/contracts/class.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { requireOwnedClass } from "@/lib/ownership";
import { suggestStartUnit } from "@/lib/progress/suggestStartUnit";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const url = new URL(request.url);
  const parsed = progressQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { classId } = parsed.data;
  const owned = await requireOwnedClass(classId, session);
  if (!owned.ok) return owned.response;

  const [rows, units] = await Promise.all([
    db.progress.findMany({
      where: { classId, studentId: { not: null } },
      select: { studentId: true, unitId: true },
      // ⚠️ `/api/progress` 와 같은 정렬 — 다르면 「최신」이 두 뜻이 된다.
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.unit.findMany({ select: { id: true, orderIndex: true } }),
  ]);

  return jsonOk(progressSuggestResponseSchema, {
    data: suggestStartUnit(rows, units),
  });
}

export const GET = withErrorLog("/api/progress/suggest", handleGet);
