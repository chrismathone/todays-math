import { gzipSync } from "node:zlib";
import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";
import {
  authorizeExport,
  exportHeaders,
  readExportBody,
} from "@/lib/export/request";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const runtime = "nodejs";
export const maxDuration = 60;
async function handlePost(request: Request) {
  const rejected = await authorizeExport(request);
  if (rejected) return rejected;
  try {
    const parsed = HwpxPayloadSchema.safeParse(await readExportBody(request));
    if (!parsed.success)
      return Response.json(
        { error: "내보낼 문서의 내용이나 크기를 확인해 주세요." },
        { status: 400, headers: exportHeaders },
      );
    const parts = await buildHwpxParts(parsed.data, request.signal);
    return Response.json(
      { partsGzip: gzipSync(JSON.stringify(parts)).toString("base64") },
      { headers: exportHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "HWPX 생성에 실패했습니다.",
      },
      { status: request.signal.aborted ? 499 : 422, headers: exportHeaders },
    );
  }
}

export const POST = withErrorLog("/api/exports/hwpx", handlePost);
