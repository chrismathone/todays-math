import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

export async function GET() {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  const require = createRequire(`${process.cwd()}/package.json`);
  const worker = await readFile(
    require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"),
    "utf8",
  );
  return new Response(worker, {
    headers: {
      "Content-Type": "text/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
