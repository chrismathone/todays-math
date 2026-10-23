import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  workbookRoute,
  readWorkbookBody,
} from "@/lib/commercialWorkbooks/server/request";
import type { WorkbookReviseEdition } from "@/contracts/commercialWorkbook.contract";

export const POST = withErrorLog(
  "/api/commercial-workbooks/[id]/revisions",
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    return workbookRoute(request, async (s) =>
      s.reviseEdition(
        id,
        (await readWorkbookBody(request)) as WorkbookReviseEdition,
      ),
    );
  },
);
