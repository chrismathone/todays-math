import "server-only";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import { text, type QuickCreateAssembly } from "./context";

/** Learning guide, plan and question log, filed under their own outline unit. */
export function appendFrontMatter(ctx: QuickCreateAssembly): void {
  const { components, units, outline, addSection } = ctx;
  if (
    components.learningGuide ||
    components.learningPlan ||
    components.questionLog
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
      addSection("학습 안내", "learning-guide", [
        text(
          "### 나의 학습 순서\n\n1. 소단원 제목을 읽고 오늘 배울 내용을 말해 봅니다.\n2. 선택한 개념 대화와 설명을 읽으며 뜻과 조건을 확인합니다.\n3. 백지 활동은 답을 가리고 자신의 말로 씁니다.\n4. 문제를 푼 뒤 풀이 과정을 비교하고 질문을 남깁니다.\n5. 다음 학습 전에 잘 설명하지 못한 내용을 다시 확인합니다.\n\n빈칸의 개수나 정답 속도보다, 이유를 설명할 수 있는지 확인하세요.",
        ),
      ]);
    if (components.learningPlan)
      addSection("학습 계획", "learning-plan", [
        text(
          "| 차례 | 학습할 소단원 | 학습 예정일 | 학습한 날 | 스스로 설명 |\n|---|---|---|---|---|\n" +
            units
              .map(
                (unit, index) =>
                  `| ${index + 1} | ${sectionTitleTex(unit.section)} |　　　　 |　　　　 | □ |`,
              )
              .join("\n"),
        ),
      ]);
    if (components.questionLog)
      addSection("질문 기록", "question-log", [
        text(
          "### 질문을 구체적으로 남겨요\n\n| 소단원·문항 번호 | 막힌 부분과 시도한 방법 | 물어볼 질문 | 알게 된 이유 |\n|---|---|---|---|\n" +
            Array.from(
              { length: 8 },
              () => "|　　　　　 |　　　　　 |　　　　　 |　　　　　 |",
            ).join("\n") +
            "\n\n설명을 들은 뒤에는 답을 옮겨 쓰는 대신, 무엇을 바꾸어 생각했는지 기록하세요.",
        ),
      ]);
  }
}
