import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { workbookRoute } from "@/lib/commercialWorkbooks/server/request";

export const GET = withErrorLog(
  "/api/commercial-workbooks/wrong-notes",
  async (request: Request) => {
    return workbookRoute(request, async (s) =>
      s.listWrongNotes(Object.fromEntries(new URL(request.url).searchParams)),
    );
  },
);
