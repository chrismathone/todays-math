import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet() {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  const worker = await readFile(
    join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
    "utf8",
  );
  return new Response(worker, {
    headers: {
      "Content-Type": "text/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const GET = withErrorLog("/api/dev/unified/pdf-worker", handleGet);
