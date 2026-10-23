import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { workbookRoute } from "@/lib/commercialWorkbooks/server/request";

export const GET = withErrorLog(
  "/api/commercial-workbooks/roster",
  async (request: Request) => {
    return workbookRoute(request, async (s) => s.listRoster());
  },
);
