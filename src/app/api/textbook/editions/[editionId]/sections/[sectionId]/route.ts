/**
 * GET    …/sections/{sectionId} — 구획 읽기
 * PUT    …/sections/{sectionId} — 구획 저장. `expectedRevision` 은 구획의 revision 이다(0 = 주소의 id 로 새로 만든다)
 * DELETE …/sections/{sectionId} — 구획 지우기(배치는 구획 밖으로 나간다)
 *
 * 구획 하나의 원고는 256KB 까지다 — 본문 상한을 그보다 조금 넉넉히 둔다.
 */
import {
  textbookDeleteSectionSchema,
  textbookEditionDetailSchema,
  textbookSaveSectionResultSchema,
  textbookSaveSectionSchema,
  textbookSectionRecordSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import {
  deleteSection,
  getSection,
  saveSection,
} from "@/lib/textbook/server/sections";

type Context = { params: Promise<{ editionId: string; sectionId: string }> };

async function ids(context: Context) {
  const params = await context.params;
  return {
    editionId: uuidParam(params.editionId, "판본"),
    sectionId: uuidParam(params.sectionId, "구획"),
  };
}

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/sections/[sectionId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const { editionId, sectionId } = await ids(context);
      return data(
        textbookSectionRecordSchema,
        await getSection(db, actor, editionId, sectionId),
      );
    }),
);

export const PUT = withErrorLog(
  "/api/textbook/editions/[editionId]/sections/[sectionId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const scope = await ids(context);
      const body = await readBody(
        request,
        textbookSaveSectionSchema,
        1024 * 1024,
      );
      const saved = await saveSection(
        db,
        actor,
        scope.editionId,
        scope.sectionId,
        requestKeyOf(actor, "section-save", body, scope),
        body,
      );
      return data(
        textbookSaveSectionResultSchema,
        saved,
        body.expectedRevision === 0 && !saved.replayed ? 201 : 200,
      );
    }),
);

export const DELETE = withErrorLog(
  "/api/textbook/editions/[editionId]/sections/[sectionId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const scope = await ids(context);
      const body = await readBody(request, textbookDeleteSectionSchema);
      const { edition } = await deleteSection(
        db,
        actor,
        scope.editionId,
        scope.sectionId,
        requestKeyOf(actor, "section-delete", body, scope),
        body,
      );
      return data(textbookEditionDetailSchema, edition);
    }),
);
