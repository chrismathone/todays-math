import { handleOntologyRead } from "@/lib/math-ontology/retrieval/read.server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleOntologyRead(request, (await context.params).id);
}
