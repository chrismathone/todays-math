/**
 * PATCH /api/textbook/bindings/{bindingId} — 영상 연결의 상태를 옮긴다(초안 ↔ 검수 대기 → 게시 → 중지).
 * 게시하려면 검수 대기여야 하고 `expectedContentHash` 가 지금 확정본의 내용 해시와 같아야 한다.
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
import { updateBinding } from "@/lib/textbook/server/videos";

type Context = { params: Promise<{ bindingId: string }> };

export const PATCH = withErrorLog(
  "/api/textbook/bindings/[bindingId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const bindingId = uuidParam(
        (await context.params).bindingId,
        "영상 연결",
      );
      const body = await readBody(request, textbookBindingWriteSchema);
      const { binding } = await updateBinding(
        db,
        actor,
        bindingId,
        requestKeyOf(actor, "binding-update", body, { bindingId }),
        body,
      );
      return data(textbookVideoBindingSchema, binding);
    }),
);
