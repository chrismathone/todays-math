import { readDocument } from "@/lib/privateDocumentActions";
export async function GET(
  r: Request,
  c: { params: Promise<{ id: string; documentId: string }> },
) {
  const p = await c.params;
  return readDocument(r, p.documentId, p.id);
}
