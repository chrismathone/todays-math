import { buildPdf, PdfPayloadSchema } from "@/lib/export/pdfServer";
import {
  authorizeExport,
  exportHeaders,
  readExportBody,
} from "@/lib/export/request";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { PDF_RESPONSE_MAX_BYTES } from "@/lib/export/pdfLimits";

export const runtime = "nodejs";
export const maxDuration = 60;
async function handlePost(request: Request) {
  const rejected = await authorizeExport(request);
  if (rejected) return rejected;
  try {
    const parsed = PdfPayloadSchema.safeParse(
      await readExportBody(request, 12_000_000),
    );
    if (!parsed.success)
      return Response.json(
        { error: "내보낼 문서의 내용이나 크기를 확인해 주세요." },
        { status: 400, headers: exportHeaders },
      );
    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${request.headers.get("host") ?? requestUrl.host}`;
    const pdf = await buildPdf(parsed.data, origin, request.signal);
    if (pdf.byteLength > PDF_RESPONSE_MAX_BYTES)
      return Response.json(
        { error: "PDF 용량이 큽니다. 인쇄에서 PDF로 저장해 주세요." },
        { status: 413, headers: exportHeaders },
      );
    const filename = encodeURIComponent(
      `${parsed.data.title || "시험지"}.pdf`,
    ).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...exportHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="worksheet.pdf"; filename*=UTF-8''${filename}`,
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "PDF 파일을 만들지 못했습니다. 잠시 후 다시 시도하거나 인쇄에서 PDF로 저장해 주세요.",
      },
      { status: request.signal.aborted ? 499 : 502, headers: exportHeaders },
    );
  }
}

export const POST = withErrorLog("/api/exports/pdf", handlePost);
