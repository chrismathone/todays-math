/**
 * GET /api/textbook/concept-lectures?unitId= — 원고의 목차가 가리킬 수 있는 개념 강의(그 단원의 **게시된** 강의만).
 * 강의는 «오늘의 개념»의 것이다 — 여기서는 고를 수 있는 것만 읽는다. 초안 · 내린 강의는 내지 않는다
 * (목차 저장 · 발행 사전 검사가 같은 조건으로 참조를 확인한다).
 */
import { z } from "zod";

import { textbookConceptLectureListSchema } from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { invalid } from "@/lib/textbook/server/errors";
import { data, textbookRoute } from "@/lib/textbook/server/http";
import { referableLectures } from "@/lib/textbook/server/lectureRefs";

export const runtime = "nodejs";

const querySchema = z.strictObject({ unitId: z.uuid() });

export const GET = withErrorLog(
  "/api/textbook/concept-lectures",
  (request: Request) =>
    textbookRoute(request, async ({ db }) => {
      const params = new URL(request.url).searchParams;
      const query = querySchema.safeParse(Object.fromEntries(params));
      if (!query.success || params.getAll("unitId").length !== 1)
        throw invalid("단원이 올바르지 않습니다.");
      return data(textbookConceptLectureListSchema, {
        unitId: query.data.unitId,
        lectures: await referableLectures(db, query.data.unitId),
      });
    }),
);
