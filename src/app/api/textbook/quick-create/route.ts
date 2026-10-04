import {
  quickCreateCatalogSchema,
  quickCreateInputSchema,
  quickCreateResultSchema,
  quickCreateScopeSchema,
} from "@/contracts/textbookQuickCreate.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { textbookHeaders } from "@/lib/textbook/server/authorize";
import { invalid } from "@/lib/textbook/server/errors";
import { createFigureLoader } from "@/lib/textbook/server/figureBytes";
import { readBody, textbookRoute } from "@/lib/textbook/server/http";
import {
  createQuickTextbook,
  listQuickCreateUnits,
  type QuickCreateDependencies,
} from "@/lib/textbook/server/quickCreate";

export const runtime = "nodejs";
export const maxDuration = 60;

const prepareVisuals: NonNullable<
  QuickCreateDependencies["prepareVisuals"]
> = async (tx, input) => {
  const [
    { freezeTextbookVisualLibrary },
    { chooseRestStory },
    { conceptScriptFor },
  ] = await Promise.all([
    import("@/lib/textbook/server/visualLibrary"),
    import("@/lib/textbook/restStories"),
    import("@/lib/textbook/conceptScripts"),
  ]);
  const selectedStories = input.rest
    ? input.units.map((unit) => chooseRestStory(unit))
    : [];
  const library = await freezeTextbookVisualLibrary(tx, {
    userId: input.userId,
    editionId: input.editionId,
    cast: input.cast,
    storyIds: [...new Set(selectedStories.map((story) => story.id))],
  });
  return {
    assetIds: library.assets.map((asset) => asset.assetId),
    dialogueForSection(sectionKey) {
      const script = conceptScriptFor(sectionKey);
      if (!script)
        throw invalid("선택한 소단원의 개념 대화를 찾을 수 없습니다.");
      return script.dialogue.map((turn) => {
        const character = library.cast[turn.role];
        return {
          speakerId: character.speakerId,
          portraitAssetId: character.portraitAssetId,
          side:
            turn.role === "teacher" ? ("left" as const) : ("right" as const),
          expression: turn.expression,
          mirrorPortrait: turn.role !== "teacher",
          markdown: turn.markdown,
        };
      });
    },
    restForUnit(unit) {
      const story = library.stories[chooseRestStory(unit).id];
      if (!story) throw invalid("쉬어가기 이야기와 그림을 찾을 수 없습니다.");
      return { ...story.story, imageAssetId: story.imageAssetId };
    },
  };
};

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
          await listQuickCreateUnits(db, parsed.data),
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
      const result = await createQuickTextbook(db, actor, input, {
        loadFigure: createFigureLoader(),
        prepareVisuals,
      });
      return Response.json(quickCreateResultSchema.parse(result), {
        status: 201,
        headers: textbookHeaders,
      });
    }),
);
