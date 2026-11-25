import { authorizeStudio } from "@/lib/studio-ai/guard";
import { readFile, realpath } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const runtime = "nodejs";

const assetPatterns = {
  cmaps: /^[A-Za-z0-9_-]+\.bcmap$/,
  standard_fonts: /^[A-Za-z0-9_-]+\.(?:pfb|ttf)$/,
  wasm: /^[A-Za-z0-9_-]+\.(?:wasm|js)$/,
};

const contentTypes: Record<string, string> = {
  ".bcmap": "application/octet-stream",
  ".pfb": "application/octet-stream",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".js": "text/javascript; charset=utf-8",
};

const headers = {
  // URLs are stable across package upgrades: never reuse an older decoder/font.
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function notFound() {
  return new Response(null, { status: 404, headers });
}

async function handleGet(
  request: Request,
  context: { params: Promise<{ kind: string; filename: string }> },
) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;

  const { kind, filename } = await context.params;
  if (!Object.hasOwn(assetPatterns, kind)) return notFound();
  const pattern = assetPatterns[kind as keyof typeof assetPatterns];
  // Next has decoded the route segments. Reject separators, dots in the stem,
  // percent escapes, Windows drive/stream syntax, and control characters.
  if (filename.length > 128 || pattern.exec(filename)?.[0] !== filename) {
    return notFound();
  }

  const packageRoot = await realpath(
    join(process.cwd(), "node_modules/pdfjs-dist"),
  );
  const assetDirectory = join(packageRoot, kind);

  try {
    const assetPath = await realpath(join(assetDirectory, filename));
    // Also reject symlinks that leave this installed package's asset directory.
    if (dirname(assetPath) !== assetDirectory) return notFound();
    const bytes = await readFile(assetPath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": contentTypes[extname(filename)],
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      ["ENOENT", "ENOTDIR", "EISDIR"].includes(String(error.code))
    ) {
      return notFound();
    }
    throw error;
  }
}

export const GET = withErrorLog(
  "/api/studio/pdf-assets/[kind]/[filename]",
  handleGet,
);
