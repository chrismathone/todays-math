/**
 * POST /api/textbook/uploads/{sha256}/complete — 올리기를 끝맺는다.
 * DB 가 조각을 이어 붙여 **해시를 다시 계산**하고, 주소의 해시 · 적어 보낸 크기와 같을 때만 받아들인다.
 * `asset` 을 주면 그 바이트를 원고의 자산(그림 · 캐릭터 · 글꼴)으로 올린다 — 형식은 바이트에서 읽는다.
 */
import { z } from "zod";

import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  BLOB_MAX_BYTES,
  completeUpload,
  registerUploadedAsset,
} from "@/lib/textbook/server/blobs";
import { plain, readBody, textbookRoute } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ sha256: string }> };

/** 공유 계약에 아직 없는 본문 — 계약으로 옮기면 여기서 걷는다 */
const completeSchema = z.strictObject({
  byteLength: z.number().int().min(1).max(BLOB_MAX_BYTES),
  fileName: z.string().min(1).max(255).optional(),
  asset: z
    .strictObject({
      kind: z.enum(["figure", "image", "portrait", "font"]),
      name: z.string().min(1).max(255),
    })
    .optional(),
});

export const POST = withErrorLog(
  "/api/textbook/uploads/[sha256]/complete",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const { sha256 } = await context.params;
      const body = await readBody(request, completeSchema);
      const completed = await completeUpload(db, actor, sha256, {
        byteLength: body.byteLength,
        fileName: body.fileName ?? body.asset?.name ?? null,
      });
      return plain({
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
