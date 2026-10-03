/**
 * GET …/sections/{sectionId}/preview — 고른 구획 하나만 실은 교환 형식(발행과 같은 조판기가 받는 모양).
 * 읽기만 한다: QR 을 만들지 않고 개념을 굳혀 적지 않는다. 주인은 초안도, 동료는 지점에 공유된 발행본만.
 */
import { textbookSectionPreviewSchema } from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { freezeTextbookConcept } from "@/lib/textbook/concepts";
import { data, textbookRoute, uuidParam } from "@/lib/textbook/server/http";
import { sectionPreview } from "@/lib/textbook/server/sectionPreview";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string; sectionId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/sections/[sectionId]/preview",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      return data(
        textbookSectionPreviewSchema,
        await sectionPreview(
          db,
          actor,
          uuidParam(params.editionId, "판본"),
          uuidParam(params.sectionId, "구획"),
          (concept) => freezeTextbookConcept(concept),
          new Date().toISOString(),
        ),
      );
    }),
);
