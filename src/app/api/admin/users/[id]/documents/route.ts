import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { listDocuments } from "@/lib/privateDocumentList";
export const GET = withErrorLog(
  "/api/admin/users/[id]/documents",
  async (r: Request, c: { params: Promise<{ id: string }> }) =>
    listDocuments(r, (await c.params).id),
);
