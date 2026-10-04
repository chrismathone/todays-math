import {
  quickCreateCatalogSchema,
  quickCreateInputSchema,
  quickCreateResultSchema,
  quickCreateScopeSchema,
} from "@/contracts/textbookQuickCreate.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { textbookHeaders } from "@/lib/textbook/server/authorize";
import { conflict, invalid } from "@/lib/textbook/server/errors";
import { createFigureLoader } from "@/lib/textbook/server/figureBytes";
import { readBody, textbookRoute } from "@/lib/textbook/server/http";
import {
  createQuickTextbook,
  listQuickCreateUnits,
} from "@/lib/textbook/server/quickCreate";
import { prepareQuickCreateVisuals } from "@/lib/textbook/server/quickCreate/visuals";

export const runtime = "nodejs";
export const maxDuration = 60;
const writerReady = () => process.env.TEXTBOOK_RECOVERY_WRITER_ENABLED === "true";

/** Scope uses the curriculum's semester mapping, never an invented Unit.semester column. */
export const GET = withErrorLog(
  "/api/textbook/quick-create",
  (request: Request) =>
    textbookRoute(request, async ({ db }) => {
      const query = new URL(request.url).searchParams;
      if (
        [...query.keys()].some(
          (key) => !["schoolLevel", "grade", "semester"].includes(key),
        ) ||
        ["schoolLevel", "grade", "semester"].some(
          (key) => query.getAll(key).length !== 1,
        ) ||
        !/^[1-6]$/.test(query.get("grade") ?? "") ||
        !/^[12]$/.test(query.get("semester") ?? "")
      )
        throw invalid("학교급·학년·학기를 올바르게 지정하세요.");
      const parsed = quickCreateScopeSchema.safeParse({
        schoolLevel: query.get("schoolLevel"),
        grade: Number(query.get("grade")),
        semester: Number(query.get("semester")),
      });
      if (!parsed.success)
        throw invalid("자동 교재는 초3~초6, 중1~중3을 지원합니다.");
      return Response.json(
        quickCreateCatalogSchema.parse(
          {
            ...await listQuickCreateUnits(db, parsed.data),
            writerReady: writerReady(),
          },
        ),
        { headers: textbookHeaders },
      );
    }),
);

export const POST = withErrorLog(
  "/api/textbook/quick-create",
  (request: Request) =>
    textbookRoute(request, async ({ actor, db }) => {
      const input = await readBody(request, quickCreateInputSchema);
      if (!writerReady())
        throw conflict("교재 제작 기능을 업데이트하고 있습니다. 잠시 후 다시 시도해 주세요.");
      const result = await createQuickTextbook(db, actor, input, {
        loadFigure: createFigureLoader(),
        prepareVisuals: prepareQuickCreateVisuals,
      });
      return Response.json(quickCreateResultSchema.parse(result), {
        status: 201,
        headers: textbookHeaders,
      });
    }),
);
