import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  workbookRoute,
  readWorkbookBody,
} from "@/lib/commercialWorkbooks/server/request";
import type { WorkbookSaveMarks } from "@/contracts/commercialWorkbook.contract";

export const POST = withErrorLog(
  "/api/commercial-workbooks/assignments/[id]/marks",
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    return workbookRoute(request, async (s) =>
      s.saveMarks(id, (await readWorkbookBody(request)) as WorkbookSaveMarks),
    );
  },
);
