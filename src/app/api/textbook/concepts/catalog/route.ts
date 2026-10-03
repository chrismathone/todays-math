/**
 * GET /api/textbook/concepts/catalog — 실제 개념 백지 은행의 항목 찾기(학년 · 소단원 · 검색어 · 이어 읽기).
 * 은행은 코드 데이터다 — DB 를 읽지 않는다.
 */
import { textbookConceptCatalogSchema } from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { listConceptCatalog } from "@/lib/textbook/concepts";
import { invalid } from "@/lib/textbook/server/errors";
import { data, textbookRoute } from "@/lib/textbook/server/http";

export const GET = withErrorLog(
  "/api/textbook/concepts/catalog",
  (request: Request) =>
    textbookRoute(request, async () => {
      const query = new URL(request.url).searchParams;
      const limit = query.get("limit");
      try {
        return data(
          textbookConceptCatalogSchema,
          listConceptCatalog({
            grade: query.get("grade") ?? undefined,
            blankSectionKey: query.get("blankSectionKey") ?? undefined,
            query: (query.get("q") ?? "").slice(0, 200),
            cursor: query.get("cursor") ?? undefined,
            limit: limit === null ? undefined : Number(limit) || undefined,
          }),
        );
      } catch (error) {
        if (error instanceof RangeError) throw invalid(error.message);
        throw error;
      }
    }),
);
