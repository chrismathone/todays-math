"use client";

import { useMemo, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import type WorksheetEditorComponent from "@/components/unified/WorksheetEditor";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import type { BankData, StudioProblem } from "@/components/unified/types";
import WorkProgress from "@/components/unified/WorkProgress";
import ExamBuilder from "./ExamBuilder";
import {
  createMathExamBuilderSource,
  MATH_EXAM_DIFFICULTIES,
  MATH_EXAM_MAX_QUESTIONS,
} from "./mathSource";

const loadWorksheetEditor = () =>
  import("@/components/unified/WorksheetEditor");
const WorksheetEditor = dynamic(loadWorksheetEditor, {
  loading: () => <WorkProgress label="시험지 양식을 준비하는 중입니다…" />,
});
export default function MathExamBuilder({
  initialData,
  initialGroup,
  editor,
  onQuestionsChange,
  canOutput,
}: {
  initialData: BankData;
  initialGroup?: string;
  editor: ComponentProps<typeof WorksheetEditorComponent>;
  onQuestionsChange: (items: StudioProblem[]) => void;
  canOutput: boolean;
}) {
  const source = useMemo(
    () =>
      createMathExamBuilderSource({
        initialUnits: initialData.units,
        initialUnitCounts: initialData.unitCounts,
      }),
    [initialData.units, initialData.unitCounts],
  );
  return (
    <ExamBuilder
      source={source}
      questions={editor.selected}
      onQuestionsChange={onQuestionsChange}
      title={editor.title}
      onTitleChange={editor.setTitle}
      initialGroup={initialGroup}
      difficulties={MATH_EXAM_DIFFICULTIES}
      maxQuestions={MATH_EXAM_MAX_QUESTIONS}
      canOutput={canOutput}
      onOutputIntent={() => {
        void loadWorksheetEditor().catch(() => {});
      }}
      renderQuestion={(problem) => (
        <UnifiedProblem problem={problem} hideScores />
      )}
      renderOutput={({
        questions,
        title,
        onQuestionsChange: change,
        onTitleChange,
        onStep,
      }) => (
        <WorksheetEditor
          {...editor}
          selected={questions}
          title={title}
          setTitle={onTitleChange}
          headerTitle="시험지 만들기"
          stepNavigation={{
            label: "시험지 만들기 단계 이동",
            items: [
              {
                id: "scope",
                label: "1 범위 설정",
                current: false,
                onSelect: () => onStep("scope"),
              },
              {
                id: "review",
                label: "2 문항 검토",
                current: false,
                onSelect: () => onStep("review"),
              },
              {
                id: "output",
                label: "3 양식 구성·출력",
                current: true,
                onSelect: () => {},
              },
            ],
          }}
          reorder={change}
          toggle={(problem) =>
            change(questions.filter((item) => item.id !== problem.id))
          }
          navigate={(view) =>
            view === "bank" ? onStep("review") : editor.navigate(view)
          }
        />
      )}
    />
  );
}
