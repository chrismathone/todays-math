import {
  textbookConceptTargetCatalogSchema,
  textbookConceptTargetQuerySchema,
} from "@/contracts/textbookConceptCatalog.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { listConceptTargetCatalog } from "@/lib/textbook/conceptTargetCatalog";
import { invalid } from "@/lib/textbook/server/errors";
import { data, textbookRoute } from "@/lib/textbook/server/http";

export const GET = withErrorLog(
  "/api/textbook/concepts/targets",
  (request: Request) =>
    textbookRoute(request, async () => {
      const params = new URL(request.url).searchParams;
      if ([...params.keys()].some((key) => params.getAll(key).length !== 1))
        throw invalid("검색 조건을 중복 지정할 수 없습니다.");
      const parsed = textbookConceptTargetQuerySchema.safeParse(
        Object.fromEntries(params),
      );
      if (!parsed.success)
        throw invalid("개념 연결 검색 조건을 확인해 주세요.");
      return data(
        textbookConceptTargetCatalogSchema,
        listConceptTargetCatalog(parsed.data),
      );
    }),
);
