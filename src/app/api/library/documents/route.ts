import { listDocuments } from "@/lib/privateDocumentList";
export const GET = (request: Request) => listDocuments(request);
