import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { workbookRoute } from "@/lib/commercialWorkbooks/server/request";

export const GET = withErrorLog(
  "/api/commercial-workbooks/[id]",
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    return workbookRoute(request, async (s) => s.getEdition(id));
  },
);
