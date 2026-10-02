import {
  readDocument,
  saveDocument,
  deleteDocument,
  renameDocument,
  copyDocument,
} from "@/lib/privateDocumentActions";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
type Context = { params: Promise<{ documentId: string }> };
export const POST = withErrorLog(
  "/api/library/documents/[documentId]",
  async (r: Request, c: Context) =>
    copyDocument(r, (await c.params).documentId),
);
export const GET = withErrorLog(
  "/api/library/documents/[documentId]",
  async (r: Request, c: Context) =>
    readDocument(r, (await c.params).documentId),
);
export const PUT = withErrorLog(
  "/api/library/documents/[documentId]",
  async (r: Request, c: Context) =>
    saveDocument(r, (await c.params).documentId),
);
export const DELETE = withErrorLog(
  "/api/library/documents/[documentId]",
  async (r: Request, c: Context) =>
    deleteDocument(r, (await c.params).documentId),
);
export const PATCH = withErrorLog(
  "/api/library/documents/[documentId]",
  async (r: Request, c: Context) =>
    renameDocument(r, (await c.params).documentId),
);
