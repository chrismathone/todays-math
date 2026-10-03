/**
 * POST /api/textbook/snapshots/{snapshotId}/bindings — 확정본에 영상을 건다(초안 또는 검수 대기로).
 * 게시는 여기서 못 한다 — 검수 대기를 거쳐 `PATCH /api/textbook/bindings/{bindingId}` 로 한다.
 */
import { textbookBindingWriteSchema } from "@/contracts/textbook.contract";
import { textbookVideoBindingSchema } from "@/contracts/textbookExchange.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import { createBinding } from "@/lib/textbook/server/videos";

type Context = { params: Promise<{ snapshotId: string }> };

export const POST = withErrorLog(
  "/api/textbook/snapshots/[snapshotId]/bindings",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const snapshotId = uuidParam((await context.params).snapshotId, "문항");
      const body = await readBody(request, textbookBindingWriteSchema);
      const { binding, replayed } = await createBinding(
        db,
        actor,
        snapshotId,
        requestKeyOf(actor, "binding-create", body, { snapshotId }),
        body,
      );
      return data(textbookVideoBindingSchema, binding, replayed ? 200 : 201);
    }),
);
