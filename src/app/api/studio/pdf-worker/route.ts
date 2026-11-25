import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";
async function handleGet(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  const worker = await readFile(
    join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  );
  return new Response(worker, {
    headers: { ...headers, "Content-Type": "text/javascript; charset=utf-8" },
  });
}

export const GET = withErrorLog("/api/studio/pdf-worker", handleGet);
