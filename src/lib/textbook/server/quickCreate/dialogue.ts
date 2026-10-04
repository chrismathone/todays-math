import "server-only";
import { randomUUID } from "node:crypto";
import { invalid } from "../errors";
import {
  DEFAULT_QUICK_CREATE_CAST,
  keyOf,
  type QuickCreateAssembly,
  type QuickCreateLesson,
} from "./context";

/** The prepared concept dialogue opens the lesson, ahead of everything already appended. */
export async function prependDialogue(
  ctx: QuickCreateAssembly,
  lesson: QuickCreateLesson,
): Promise<void> {
  const { components, input, deps, visuals, assets } = ctx;
  const { unit, section } = lesson;
  if (components.dialogue) {
    const dialogue = visuals
      ? { turns: visuals.dialogueForSection(keyOf(unit)), assets: [] }
      : await deps.dialogueForSection?.(
          keyOf(unit),
          input.cast ?? DEFAULT_QUICK_CREATE_CAST,
        );
    if (!dialogue)
      throw invalid("준비된 개념 대화와 등장인물을 읽지 못했습니다.");
    if (!dialogue.turns.length)
      throw invalid(`${unit.section}: 준비된 개념 대화가 없습니다.`);
    for (const asset of dialogue.assets)
      assets.set(asset.assetId, { asset, kind: "portrait" });
    if (
      dialogue.turns.some(
        (turn) =>
          !assets.has(turn.portraitAssetId) &&
          !visuals?.assetIds.includes(turn.portraitAssetId),
      )
    )
      throw invalid("개념 대화의 인물 그림을 읽지 못했습니다.");
    section.blocks.unshift({
      blockId: randomUUID(),
      kind: "dialogue",
      turns: dialogue.turns,
      semantic: {
        activity: "dialogue",
        title: "단원을 여는 수업",
        subtitle: unit.section,
      },
    });
  }
}
