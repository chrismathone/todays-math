/**
 * GET   /api/textbook/editions/{editionId} — 판본 요약 · 설정 · 목차 (주인, 또는 지점에 공유된 발행본)
 * PATCH /api/textbook/editions/{editionId} — 설정 · 목차 저장. `expectedRevision` 은 structureRevision 이다
 */
import {
  textbookEditionDetailSchema,
  textbookSaveStructureSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ editionId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      return data(
        textbookEditionDetailSchema,
        await getEditionDetail(db, actor, editionId),
      );
    }),
);

export const PATCH = withErrorLog(
  "/api/textbook/editions/[editionId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookSaveStructureSchema);
      const { edition } = await saveStructure(
        db,
        actor,
        editionId,
        requestKeyOf(actor, "structure-save", body, { editionId }),
        body,
      );
      return data(textbookEditionDetailSchema, edition);
    }),
);
