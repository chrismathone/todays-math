import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  workbookRoute,
  readWorkbookBody,
} from "@/lib/commercialWorkbooks/server/request";
import type { WorkbookCreateAssignment } from "@/contracts/commercialWorkbook.contract";

export const GET = withErrorLog(
  "/api/commercial-workbooks/assignments",
  async (request: Request) => {
    return workbookRoute(request, async (s) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      return s.listAssignmentPage({
        ...query,
        ...(query.limit === undefined ? {} : { limit: Number(query.limit) }),
      });
    });
  },
);

export const POST = withErrorLog(
  "/api/commercial-workbooks/assignments",
  async (request: Request) => {
    return workbookRoute(
      request,
      async (s) =>
        s.createAssignment(
          (await readWorkbookBody(request)) as WorkbookCreateAssignment,
        ),
      201,
    );
  },
);
