import "server-only";
import { conceptScriptForCast } from "../../conceptScripts";
import { planRestStories } from "../../restStories";
import { freezeTextbookVisualLibrary } from "../visualLibrary";
import { invalid } from "../errors";
import type { QuickCreateDependencies } from "./context";

/** Static scripts and validated bundled assets; new creation is the only casting boundary. */
export const prepareQuickCreateVisuals: NonNullable<
  QuickCreateDependencies["prepareVisuals"]
> = async (tx, input) => {
  const plan = input.rest
    ? planRestStories({
        grade: input.units[0].grade,
        semester: input.semester,
        units: input.units,
      })
    : null;
  const assignments = new Map(
    plan?.assignments.map((entry) => [entry.chapter, entry.story]) ?? [],
  );
  const library = await freezeTextbookVisualLibrary(tx, {
    userId: input.userId,
    editionId: input.editionId,
    cast: input.cast,
    storyIds: [...assignments.values()].flatMap((story) =>
      story ? [story.id] : [],
    ),
  });
  return {
    assetIds: library.assets.map((asset) => asset.assetId),
    dialogueForSection(sectionKey) {
      const script = conceptScriptForCast(sectionKey, {
        student1: library.cast.student1.name,
        student2: library.cast.student2.name,
      });
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
          ...(turn.presentation ? { presentation: turn.presentation } : {}),
        };
      });
    },
    restForUnit(unit) {
      const selected = assignments.get(unit.chapter);
      if (!selected) return null;
      const frozen = library.stories[selected.id];
      if (!frozen) throw invalid("쉬어가기 이야기의 그림을 읽지 못했습니다.");
      return { ...frozen.story, imageAssetId: frozen.imageAssetId };
    },
  };
};
