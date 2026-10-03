/**
 * POST /api/textbook/uploads/{sha256}/complete — 올리기를 끝맺는다.
 * DB 가 조각을 이어 붙여 **해시를 다시 계산**하고, 주소의 해시 · 적어 보낸 크기와 같을 때만 받아들인다.
 * `asset` 을 주면 그 바이트를 원고의 자산(그림 · 캐릭터 · 글꼴)으로 올린다 — 형식은 바이트에서 읽는다.
 */
import {
  textbookUploadCompleteResultSchema,
  textbookUploadCompleteSchema,
} from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  completeUpload,
  registerUploadedAsset,
} from "@/lib/textbook/server/blobs";
import { data, readBody, textbookRoute } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ sha256: string }> };

export const POST = withErrorLog(
  "/api/textbook/uploads/[sha256]/complete",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const { sha256 } = await context.params;
      const body = await readBody(request, textbookUploadCompleteSchema);
      const completed = await completeUpload(db, actor, sha256, {
        byteLength: body.byteLength,
        fileName: body.fileName ?? body.asset?.name ?? null,
      });
      return data(textbookUploadCompleteResultSchema, {
        ...completed,
        asset: body.asset
          ? await registerUploadedAsset(
              db,
              actor,
              completed.uploadId,
              body.asset,
            )
          : null,
      });
    }),
);
