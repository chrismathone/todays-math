import "server-only";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import {
  activityText,
  selectedLearningGuide,
  writingActivity,
} from "../quickCreateRecovery";
import type { QuickCreateAssembly } from "./context";

/** Learning guide, plan and question log, filed under their own outline unit. */
export function appendFrontMatter(ctx: QuickCreateAssembly): void {
  const { components, units, outline, addSection } = ctx;
  if (
    components.learningGuide ||
    components.learningPlan ||
    components.questionLog ||
    components.tableOfContents
  ) {
    const unitKey = (ctx.unitKey = "front-matter");
    outline.push({
      unitKey,
      title: "교재 사용 안내",
      sourceUnitIds: [],
      prerequisites: [],
      goals: [],
      conceptLectureRefs: [],
    });
    if (components.learningGuide)
      addSection(
        "학습 안내",
        "auto-learning-guide",
        selectedLearningGuide(components),
      );
    if (components.learningPlan) {
      const blocks = [];
      for (let offset = 0; offset < units.length; offset += 10)
        blocks.push(
          activityText(
            "learningPlan",
            "학습 계획",
            "| 차례 | 학습할 소단원 | 학습 예정일 | 학습한 날 | 스스로 설명 |\n|---|---|---|---|---|\n" +
              units
                .slice(offset, offset + 10)
                .map(
                  (unit, index) =>
                    `| ${offset + index + 1} | ${sectionTitleTex(unit.section)} |　　　　 |　　　　 | □ |`,
                )
                .join("\n"),
          ),
        );
      addSection("학습 계획", "auto-learning-plan", blocks);
    }
    if (components.questionLog)
      addSection("질문 기록", "auto-question-log", [
        writingActivity(
          "questionLog",
          "질문 기록",
          [
            "소단원·문항 번호와 막힌 부분을 적으세요.",
            "시도한 방법과 물어볼 질문을 구체적으로 적으세요.",
            "설명을 들은 뒤 새로 알게 된 이유를 자신의 말로 적으세요.",
          ],
          4,
        ),
      ]);
  }
}
