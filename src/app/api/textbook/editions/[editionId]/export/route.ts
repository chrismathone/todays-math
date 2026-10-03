/**
 * GET …/export — 판본의 교환 형식(`TextbookExchange`). 발행본이면 다시 계산한 manifest 해시가 발행 때의 값과 같아야 낸다.
 * GET …/export?format=zip — 같은 교환 형식에 자산 바이트 · 대응표 · 검수 보고를 묶은 교환 패키지(다른 계정이 가져올 수 있는 파일).
 *   패키지는 요청마다 지금의 줄들에서 꾸린다. 응답은 조각으로 흘려 보낸다(한 응답 한도에 걸리지 않게).
 */
import { textbookExportResponseSchema } from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { packageArchive } from "@/lib/textbook/publish/deps.server";
import { textbookHeaders } from "@/lib/textbook/server/authorize";
import { invalid } from "@/lib/textbook/server/errors";
import {
  exportEdition,
  exportEditionArchive,
} from "@/lib/textbook/server/exportEdition";
import { textbookRoute, uuidParam } from "@/lib/textbook/server/http";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ editionId: string }> };

/** 조각으로 흘려 보낸다 — 조각마다 새로 복사하지 않는다 */
function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  const size = 1024 * 1024;
  let at = 0;
  return new ReadableStream({
    pull(controller) {
      if (at >= bytes.byteLength) return controller.close();
      controller.enqueue(bytes.subarray(at, at + size));
      at += size;
    },
  });
}

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/export",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const params = new URL(request.url).searchParams;
      const format = params.get("format") ?? "json";
      if (
        [...params.keys()].some((key) => key !== "format") ||
        (format !== "json" && format !== "zip")
      )
        throw invalid("내보내는 형식이 올바르지 않습니다.");
      const exportedAt = new Date().toISOString();
      if (format === "zip") {
        const archive = await exportEditionArchive(
          db,
          actor,
          editionId,
          exportedAt,
          packageArchive,
        );
        return new Response(streamOf(archive.bytes), {
          headers: {
            ...textbookHeaders,
            "Content-Type": "application/zip",
            "Content-Length": String(archive.bytes.byteLength),
            "Content-Disposition": `attachment; filename="${archive.fileName}"`,
          },
        });
      }
      return Response.json(
        textbookExportResponseSchema.parse({
          data: await exportEdition(db, actor, editionId, exportedAt),
        }),
        { headers: textbookHeaders },
      );
    }),
);
