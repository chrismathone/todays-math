import { readDocument } from "@/lib/privateDocumentActions";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function handleGet(
  r: Request,
  c: { params: Promise<{ id: string; documentId: string }> },
) {
  const p = await c.params;
  return readDocument(r, p.documentId, p.id);
}

export const GET = withErrorLog(
  "/api/admin/users/[id]/documents/[documentId]",
  handleGet,
);
