import {
  readDocument,
  saveDocument,
  deleteDocument,
  renameDocument,
} from "@/lib/privateDocumentActions";
type Context = { params: Promise<{ documentId: string }> };
export const GET = async (r: Request, c: Context) =>
  readDocument(r, (await c.params).documentId);
export const PUT = async (r: Request, c: Context) =>
  saveDocument(r, (await c.params).documentId);
export const DELETE = async (r: Request, c: Context) =>
  deleteDocument(r, (await c.params).documentId);
export const PATCH = async (r: Request, c: Context) =>
  renameDocument(r, (await c.params).documentId);
