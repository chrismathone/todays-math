import { listDocuments } from "@/lib/privateDocumentList";
export const GET = async (r: Request, c: { params: Promise<{ id: string }> }) =>
  listDocuments(r, (await c.params).id);
