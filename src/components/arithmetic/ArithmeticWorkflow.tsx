"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import StudioStepBar, {
  type StudioStepNavigation,
} from "@/components/unified/StudioStepBar";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import { MathText } from "@/components/math/MathText";
import NativeProblem from "@/components/unified/NativeProblem";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import {
  arithmeticToStudioProblems,
  type ArithmeticOutputSheet,
} from "@/lib/arithmeticOutput";
import s from "./ArithmeticWorkbench.module.css";

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

export function ArithmeticWorkflow({
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
}: {
  step: ArithmeticStep;
  setStep: (step: ArithmeticStep) => void;
  sheet?: ArithmeticOutputSheet;
  title: string;
  setTitle: (title: string) => void;
  academyName?: string;
  busy: boolean;
  canOutput: boolean;
  canSave: boolean;
  canRegenerate: boolean;
  dirty: boolean;
  onSave: () => void;
  onRegenerate: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>(() => ({
    ...DEFAULT_PRINT_OPTIONS,
    template: "yuhyung",
    columns: 2,
    quickAnswerOnly: true,
    showDifficulty: false,
  }));
  const [printMeta, setPrintMeta] = useState<PrintMeta>(() => ({
    ...DEFAULT_PRINT_META,
    academyName,
  }));
  const problems = useMemo(
    () => (sheet ? arithmeticToStudioProblems(sheet) : []),
    [sheet],
  );
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
    <div ref={root} className={s.workflow}>
      {step !== "output" && (
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
              onClick={() => setShowAnswers((value) => !value)}
            >
              {showAnswers ? "정답 숨기기" : "정답 보기"}
            </button>
            <button
              type="button"
              disabled={busy || !canRegenerate}
              onClick={onRegenerate}
            >
              숫자 바꿔 새로 만들기
            </button>
            {saveButton}
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
            현재 문항의 회차별 유형과 수량으로 숫자를 바꿉니다. 가능한 식이 적은
            유형은 이전 식이 다시 나올 수 있습니다.
          </p>
          {!canOutput && (
            <p className={s.notice}>출력하려면 출력 메뉴 권한이 필요합니다.</p>
          )}
          <ol className={s.reviewGrid}>
            {problems.map((problem) => (
              <li key={problem.id} className={s.reviewCard}>
                <NativeProblem problem={problem} print={false} />
                {showAnswers && (
                  <div className={s.reviewAnswer} aria-label="정답">
                    <strong>정답</strong>{" "}
                    <MathText text={fractionViewFor(problem)(problem.answer)} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : step === "output" && sheet ? (
        <WorksheetEditor
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
          setPrintOptions={(patch) =>
            setPrintOptions((current) => ({
              ...current,
              ...patch,
              quickAnswerOnly: true,
            }))
          }
          setPrintMeta={(patch) =>
            setPrintMeta((current) => ({ ...current, ...patch }))
          }
          setColumns={(columns) =>
            setPrintOptions((current) => ({
              ...current,
              columns: columns === 1 ? 1 : 2,
            }))
          }
          setAnswers={(showAnswers) =>
            setPrintOptions((current) => ({ ...current, showAnswers }))
          }
          beforeOutput={async () => {
            if (!canOutput || busy)
              throw new Error(
                "현재 출력할 수 없습니다. 권한과 작업 상태를 확인해 주세요.",
              );
          }}
          outputNotice={
            <div className={s.reviewToolbar}>
              {saveButton}
              <span>
                정답지는 답만 포함합니다. 생성한 문항의 회차와 순서를
                유지합니다.
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
