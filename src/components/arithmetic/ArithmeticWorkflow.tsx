"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import StudioStepBar, {
  type StudioStepNavigation,
} from "@/components/unified/StudioStepBar";
import {
  defaultArithmeticPresentation,
  type ArithmeticPresentation,
} from "@/contracts/arithmeticPresentation.contract";
import type { PrintMeta, PrintOptions } from "@/components/unified/print/types";
import ArithmeticReview, {
  type ArithmeticRegenerationFeedback,
} from "./ArithmeticReview";
import type { ArithmeticOutputSheet } from "@/lib/arithmeticOutput";
import type { StudioProblem } from "@/components/unified/types";
import s from "./ArithmeticWorkbench.module.css";
import { arithmeticOutputGroups } from "@/lib/arithmeticOutputLayout";
import SheetTagPicker from "@/components/unified/print/SheetTagPicker";

const WorksheetEditor = dynamic(
  () => import("@/components/unified/WorksheetEditor"),
);
export type ArithmeticStep = "scope" | "review" | "output";
const steps = [
  { id: "scope", label: "1 범위 설정" },
  { id: "review", label: "2 문항 검토" },
  { id: "output", label: "3 양식 구성·출력" },
] as const;
const noop = () => {};
const GeneratedWorkflow = dynamic(
  () => import("./ArithmeticGeneratedWorkflow"),
);

export type ArithmeticWorkflowProps = {
  step: ArithmeticStep;
  setStep: (step: ArithmeticStep) => void;
  sheet?: ArithmeticOutputSheet;
  title: string;
  setTitle: (title: string) => void;
  academyName?: string;
  busy: boolean;
  preview?: boolean;
  canOutput: boolean;
  canSave: boolean;
  canRegenerate: boolean;
  dirty: boolean;
  onSave: () => void;
  onRegenerate: (target?: { round: number; orders: number[] }) => void;
  children: ReactNode;
  actions?: ReactNode;
  presentation?: ArithmeticPresentation;
  onPresentationChange: (presentation: ArithmeticPresentation) => void;
  regeneration?: ArithmeticRegenerationFeedback;
};

export type ArithmeticWorkflowViewProps = ArithmeticWorkflowProps & {
  showAnswers: boolean;
  onToggleAnswers: () => void;
};

export function ArithmeticWorkflow(props: ArithmeticWorkflowProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const view = {
    ...props,
    showAnswers,
    onToggleAnswers: () => setShowAnswers((value) => !value),
  };
  // Scope selection does not need the saved-item renderer or engine registry.
  return props.sheet ? (
    <GeneratedWorkflow {...view} sheet={props.sheet} />
  ) : (
    <ArithmeticWorkflowView {...view} problems={[]} />
  );
}

export function ArithmeticWorkflowView({
  step,
  setStep,
  sheet,
  title,
  setTitle,
  academyName,
  busy,
  canOutput,
  canSave,
  canRegenerate,
  dirty,
  onSave,
  onRegenerate,
  children,
  actions,
  presentation,
  onPresentationChange,
  regeneration,
  problems,
  showAnswers,
  onToggleAnswers,
  preparation,
}: ArithmeticWorkflowViewProps & {
  problems: StudioProblem[];
  preparation?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const defaults = useMemo(
    () => defaultArithmeticPresentation(academyName),
    [academyName],
  );
  const currentPresentation = presentation ?? defaults;
  const { printOptions, printMeta } = currentPresentation;
  function updateOptions(patch: Partial<PrintOptions>) {
    onPresentationChange({
      ...currentPresentation,
      step,
      printOptions: { ...printOptions, ...patch, quickAnswerOnly: true },
    });
  }
  function updateMeta(patch: Partial<PrintMeta>) {
    onPresentationChange({
      ...currentPresentation,
      step,
      printMeta: { ...printMeta, ...patch },
    });
  }
  const rounds = useMemo(() => arithmeticOutputGroups(problems), [problems]);
  useEffect(() => {
    root.current?.scrollIntoView?.({ block: "start" });
  }, [step]);
  function go(next: ArithmeticStep) {
    setStep(next);
  }
  const navigation: StudioStepNavigation = {
    label: "연산 제작 단계",
    items: steps.map(({ id, label }) => ({
      id,
      label,
      current: step === id,
      disabled:
        busy || (id !== "scope" && !sheet) || (id === "output" && !canOutput),
      onSelect: () => go(id),
    })),
  };
  const saveButton = (
    <button
      type="button"
      disabled={busy || !canSave || !title.trim()}
      onClick={onSave}
    >
      내 시험지에 저장
    </button>
  );
  return (
    <div ref={root} className={s.workflow} data-arithmetic-step={step}>
      {(step !== "output" || preparation) && (
        <StudioStepBar
          headerTitle="연산대장"
          step={step === "scope" ? "upload" : "review"}
          pickedCount={problems.length}
          canCrop={false}
          canReview={Boolean(sheet)}
          onStep={noop}
          stepNavigation={navigation}
        >
          {actions}
        </StudioStepBar>
      )}
      {step === "scope" ? (
        children
      ) : preparation ? (
        preparation
      ) : step === "review" && sheet ? (
        <section className={s.review} aria-label="생성한 문항 검토">
          <div className={s.reviewToolbar}>
            <label>
              학습지 제목
              <input
                maxLength={200}
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <span>
              {problems.length}문항 · {sheet.rounds.length}회차 ·{" "}
              {dirty ? "저장 전" : "저장됨"}
            </span>
            <button
              type="button"
              aria-pressed={showAnswers}
              onClick={onToggleAnswers}
            >
              {showAnswers ? "정답 숨기기" : "정답 보기"}
            </button>
            <button
              type="button"
              disabled={busy || !canRegenerate}
              onClick={() => onRegenerate()}
            >
              모든 회차 숫자 바꾸기
            </button>
            <button
              type="button"
              className={s.primary}
              disabled={busy || !canOutput}
              onClick={() => go("output")}
            >
              양식 구성·출력으로
            </button>
          </div>
          <p className={s.catalogCount}>
            회차를 선택한 뒤 문항을 체크하거나 유형 옆 버튼으로 숫자를 바꿀 수
            있습니다.
          </p>
          <p className={s.catalogCount}>
            완성한 연습지는 양식 구성·출력에서 ‘내 시험지에 저장’을 눌러
            보관하세요.
          </p>
          {!canOutput && (
            <p className={s.notice}>출력하려면 출력 메뉴 권한이 필요합니다.</p>
          )}
          <ArithmeticReview
            rounds={rounds}
            showAnswers={showAnswers}
            disabled={busy || !canRegenerate}
            onRegenerate={onRegenerate}
            regeneration={regeneration}
          />
        </section>
      ) : step === "output" && sheet ? (
        <WorksheetEditor
          sheetTag={currentPresentation.tag ?? null}
          settingsSlots={{
            // W8 «시험 종류» — 기존 presentation.tag를 문제지 머리에 전달한다.
            metaTop: (
              <SheetTagPicker
                value={currentPresentation.tag ?? null}
                onChange={(tag) => {
                  const { tag: _previous, ...rest } = currentPresentation;
                  void _previous;
                  onPresentationChange({
                    ...rest,
                    step,
                    ...(tag ? { tag } : {}),
                  });
                }}
              />
            ),
          }}
          answersOnly
          headerTitle="연산대장"
          stepNavigation={navigation}
          fixedComposition
          draftActions={false}
          allowedMenus={[]}
          selected={problems}
          title={title}
          setTitle={setTitle}
          columns={printOptions.columns}
          answers={printOptions.showAnswers}
          savedAt=""
          printOptions={printOptions}
          printMeta={printMeta}
          setPrintOptions={updateOptions}
          setPrintMeta={updateMeta}
          setColumns={(columns) =>
            updateOptions({ columns: columns === 1 ? 1 : 2 })
          }
          setAnswers={(showAnswers) => updateOptions({ showAnswers })}
          beforeOutput={async () => {
            if (!canOutput || busy)
              throw new Error(
                "현재 출력할 수 없습니다. 권한과 작업 상태를 확인해 주세요.",
              );
          }}
          outputNotice={
            <div className={s.reviewToolbar}>
              {saveButton}
              <span role="status">{dirty ? "저장 전" : "저장됨"}</span>
              <span>
                {canSave
                  ? "문항과 양식을 직접 저장하면 내 시험지에서 다시 열 수 있습니다."
                  : "현재 연산 시험지를 저장할 수 없습니다. 문항 확인과 출력은 가능합니다."}{" "}
                정답지는 답만 포함합니다.
              </span>
            </div>
          }
          save={onSave}
          restore={noop}
          download={noop}
          toggle={noop}
          move={noop}
          reorder={noop}
          navigate={() => go("scope")}
        />
      ) : null}
    </div>
  );
}
