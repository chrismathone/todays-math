/**
 * MSW 핸들러 — 단원 목록 (S-04 확인테스트 범위).
 */
import { http, type HttpHandler } from "msw";

import { unitIdsParamSchema, unitListResponseSchema } from "@/contracts/unit.contract";

import { MOCK_UNITS } from "../data";
import { jsonOk, validationError } from "./_helpers";

export const unitHandlers: HttpHandler[] = [
  // 계약(strictObject)에 있는 것만 내보낸다 — 실제 라우트도 `select` 로 같은 다섯 개만
  // 읽는다. MOCK_UNITS 에는 DB 컬럼인 `problemCodePrefix`(D-53)가 더 있다.
  http.get("/api/units", ({ request }) => {
    const raw = new URL(request.url).searchParams.get("ids");
    const ids = raw === null ? undefined : unitIdsParamSchema.safeParse(raw);
    if (ids && !ids.success) return validationError(ids.error);
    return jsonOk(unitListResponseSchema, {
      data: MOCK_UNITS.filter((unit) => !ids?.success || ids.data.includes(unit.id)).map(({ id, grade, chapter, section, orderIndex }) => ({
        id,
        grade,
        chapter,
        section,
        orderIndex,
      })),
    });
  }),
];
