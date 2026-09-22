import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { listDocuments } from "@/lib/privateDocumentList";
export const GET = withErrorLog("/api/library/documents", (request: Request) =>
  listDocuments(request),
);
