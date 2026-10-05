import "server-only";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import { invalid } from "../errors";
import { activityText } from "../quickCreateRecovery";
import {
  type QuickCreateAssembly,
  type QuickCreateLesson,
} from "./context";

export function appendPreparation(
  ctx: QuickCreateAssembly,
  lesson: QuickCreateLesson,
): void {
  const { components } = ctx;
  const { unit, section, entries } = lesson;
  if (components.preparation) {
    if (!entries.length)
      throw invalid(`${unit.section}: 준비 학습에 사용할 개념이 없습니다.`);
    section.blocks.push(
      activityText("preparation", "준비 학습",
        `### 준비 학습\n\n오늘의 목표: ${sectionTitleTex(unit.section)}의 뜻과 적용 방법을 설명하기.\n\n${entries.map((entry) => `- **${entry.term}**에 대해 이미 알고 있는 뜻이나 조건을 적어 보세요.`).join("\n")}\n\n${entries.flatMap((entry) => (entry.example ? [`- ${entry.example.prompt}`] : [])).join("\n")}`,
      ),
    );
  }
}
