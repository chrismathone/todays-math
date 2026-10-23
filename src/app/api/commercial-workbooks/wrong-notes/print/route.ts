import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  workbookRoute,
  readWorkbookBody,
} from "@/lib/commercialWorkbooks/server/request";
import type { WorkbookWrongNotePrintRequest } from "@/contracts/commercialWorkbook.contract";

export const POST = withErrorLog(
  "/api/commercial-workbooks/wrong-notes/print",
  async (request: Request) => {
    return workbookRoute(request, async (s) =>
      s.getWrongNotePrint(
        (await readWorkbookBody(request)) as WorkbookWrongNotePrintRequest,
      ),
    );
  },
);
