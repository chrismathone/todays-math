/**
 * GET /api/textbook/concepts/lookup?blankSectionKey=학년::대단원::소단원
 * 개념 백지의 소단원 하나를 가리키는 교재 개념들 — 내 초안 · 발행본과 지점에 공유된 동료의 발행본에서만 찾는다.
 * 맞추는 것은 열쇠 글자 그대로다. 이름이 비슷한 소단원이나 다른 이름공간으로 바꿔 찾지 않는다.
 */
import {
  textbookConceptLookupQuerySchema,
  textbookConceptLookupSchema,
} from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { lookupConceptsByBlankSection } from "@/lib/textbook/server/conceptRows";
import { invalid } from "@/lib/textbook/server/errors";
import { data, textbookRoute } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

export const GET = withErrorLog(
  "/api/textbook/concepts/lookup",
  (request: Request) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = new URL(request.url).searchParams;
      // 모르는 질의 칸은 버리지 않고 거절한다
      const query = textbookConceptLookupQuerySchema.safeParse(
        Object.fromEntries(params),
      );
      if (!query.success || params.getAll("blankSectionKey").length !== 1)
        throw invalid("소단원 열쇠가 올바르지 않습니다.");
      return data(textbookConceptLookupSchema, {
        blankSectionKey: query.data.blankSectionKey,
        matches: await lookupConceptsByBlankSection(
          db,
          actor,
          query.data.blankSectionKey,
        ),
      });
    }),
);
