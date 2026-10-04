import "server-only";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import { text, type QuickCreateAssembly } from "./context";

/** The chapter's goals and order, at the head of the chapter the cursor just entered. */
export function appendUnitIntro(ctx: QuickCreateAssembly): void {
  const { components, units, chapter, addSection } = ctx;
  if (components.unitIntro)
    addSection("단원 소개", "auto-unit-intro", [
      text(
        `### ${chapter}의 학습 목표와 순서\n\n${units
          .filter((row) => row.chapter === chapter)
          .map((row, index) => `${index + 1}. ${sectionTitleTex(row.section)}`)
          .join(
            "\n",
          )}\n\n학습 전에 각 소단원에서 이미 알고 있는 내용과 궁금한 점을 적어 보세요. 학습을 마친 뒤에는 처음의 질문으로 돌아와, 뜻과 조건을 자신의 말로 설명할 수 있는지 확인하세요.`,
      ),
    ]);
}
