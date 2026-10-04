import "server-only";
import { randomUUID } from "node:crypto";
import { invalid } from "../errors";
import { text, type QuickCreateAssembly } from "./context";

/** The illustrated story that closes the chapter the cursor is leaving. */
export function appendRest(ctx: QuickCreateAssembly): void {
  const { components, units, chapter, visuals, addSection } = ctx;
  if (components.rest) {
    const unit = units.find((u) => u.chapter === chapter)!;
    const story = visuals?.restForUnit(unit);
    if (!story) throw invalid("쉬어가기 이야기와 그림을 준비하지 못했습니다.");
    const restSection = addSection(`쉬어가기 · ${story.title}`, "rest", [
      {
        blockId: randomUUID(),
        kind: "image",
        assetId: story.imageAssetId,
        caption: story.title,
      },
      text(story.markdown),
      text(
        `### 함께 생각해요\n\n${story.reflectionQuestions.map((question) => `- ${question}`).join("\n")}`,
      ),
    ]);
    restSection.startPolicy = "continue";
  }
}
