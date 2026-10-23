import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  workbookRoute,
  readWorkbookBody,
} from "@/lib/commercialWorkbooks/server/request";
import type { WorkbookUpdateWrongNote } from "@/contracts/commercialWorkbook.contract";

export const PATCH = withErrorLog(
  "/api/commercial-workbooks/wrong-notes/[id]",
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    return workbookRoute(request, async (s) =>
      s.updateWrongNote(
        id,
        (await readWorkbookBody(request)) as WorkbookUpdateWrongNote,
      ),
    );
  },
);
