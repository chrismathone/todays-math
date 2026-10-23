import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  workbookRoute,
  readWorkbookBody,
} from "@/lib/commercialWorkbooks/server/request";
import type { WorkbookCreateEdition } from "@/contracts/commercialWorkbook.contract";

export const GET = withErrorLog(
  "/api/commercial-workbooks",
  async (request: Request) => {
    return workbookRoute(request, async (s) => s.listCatalog());
  },
);

export const POST = withErrorLog(
  "/api/commercial-workbooks",
  async (request: Request) => {
    return workbookRoute(
      request,
      async (s) =>
        s.createEdition(
          (await readWorkbookBody(request)) as WorkbookCreateEdition,
        ),
      201,
    );
  },
);
