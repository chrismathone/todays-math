"use client";

import { useState, type CSSProperties } from "react";
import type {
  ExplorerAction,
  ExplorerState,
  WorkshopView,
} from "@/contracts/mathExplorers.contract";
import { ExplorerPracticeFrame } from "./ExplorerPractice";
import { EnterKey, NumberKey } from "@/components/math-srs/AnswerKeyCaps";
import pageTurn from "@/components/math-srs/question-page-turn.module.css";
import { answerKey } from "@/components/math-srs/useAnswerKeys";
import { ExplorerChoiceText, ExplorerMath } from "./ExplorerMath";
import s from "./math-explorers.module.css";

type Workshop = NonNullable<WorkshopView["session"]>;
const stageNames: Record<Workshop["stage"], string> = {
  predict: "먼저 예상하기",
  split: "조각 나누기",
  match: "조각 크기 맞추기",
  rule: "규칙 찾기",
  check: "새 분수로 확인",
  complete: "조작 활동 완료",
};

/**
 * 조각 활동의 세로 분수(처음 분수 · 나눈 분수 · 칠한 칸 수) — 카드 글과 같은 KaTeX `\frac` 로 그린다
 * (원장님 확정 2026-09-27 «작업실 세로 분수도 KaTeX», 05 §8.16 옆). 분수 글은 카드 글과 같은 변환 함수를 지난다
 * (`plainMathToTex` — `1/2` → `\frac{1}{2}`). 칸의 크기·자리는 옛 CSS 판과 같게 `.fraction` 이 잡는다.
 * 읽기용 이름표 «d분의 n» 은 그대로.
 */
function Fraction({
  numerator,
  denominator,
}: {
  numerator: number;
  denominator: number;
}) {
  return (
    <span className={s.fraction} aria-label={`${denominator}분의 ${numerator}`}>
      <ExplorerMath text={`${numerator}/${denominator}`} />
    </span>
  );
}

function FractionStrip({
  numerator,
  denominator,
}: {
  numerator: number;
  denominator: number;
}) {
  return (
    <div
      className={s.fractionStrip}
      aria-label={`전체 ${denominator}조각 중 ${numerator}조각 색칠`}
      style={{ "--parts": denominator } as CSSProperties}
    >
      {Array.from({ length: denominator }, (_, index) => (
        <span
          key={index}
          data-filled={index < numerator ? "true" : undefined}
        />
      ))}
    </div>
  );
}

export default function ExplorerWorkshop({
  workshop,
  session,
  busy,
  correct,
  eventKey,
  onAction,
  onHome,
}: {
  workshop: Workshop;
  session: NonNullable<ExplorerState["session"]>;
  busy: boolean;
  correct: boolean | null;
  eventKey: string;
  onAction: (action: ExplorerAction) => void;
  onHome: () => void;
}) {
  return (
    <ExplorerPracticeFrame
      session={session}
      busy={busy}
      correct={correct}
      eventKey={eventKey}
      onHome={onHome}
      feedbackMessage={correct === false ? "조각을 다시 살펴보세요" : undefined}
    >
      <WorkshopActivity
        key={workshop.questionId}
        workshop={workshop}
        busy={busy}
        correct={correct}
        onAction={onAction}
      />
    </ExplorerPracticeFrame>
  );
}

function WorkshopActivity({
  workshop,
  busy,
  correct,
  onAction,
}: {
  workshop: Workshop;
  busy: boolean;
  correct: boolean | null;
  onAction: (action: ExplorerAction) => void;
}) {
  const [factors, setFactors] = useState<[number, number]>([
    ...workshop.factors,
  ]);
  const [parts, setParts] = useState<number[][]>(
    workshop.fractions.map(() => []),
  );
  const [chosen, setChosen] = useState<number | null>(null);
  // «선택됨» 움직임 표지(05 §8.16) — 누른 순간에만. 다른 보기로 바꾸면 앞 보기는 빠진다.
  const [motion, setMotion] = useState<Record<number, "in" | "out">>({});
  const disabled = busy || correct !== null;
  const { stage, questionId } = workshop;
  const denominator = workshop.targetDenominator ?? 1;
  const columns =
    denominator % 5 === 0
      ? 5
      : denominator % 4 === 0
        ? 4
        : denominator % 3 === 0
          ? 3
          : Math.min(4, denominator);
  function confirm() {
    if (stage === "split")
      onAction({ type: "lab-split", questionId, factor: factors[0] });
    else if (stage === "match")
      onAction({ type: "lab-match", questionId, factors });
    else if (stage === "check")
      onAction({
        type: "lab-check",
        questionId,
        parts: parts.map((selection) => selection.length),
      });
  }
  function choose(choiceId: number) {
    if (disabled) return;
    setMotion({
      ...(chosen !== null && chosen !== choiceId ? { [chosen]: "out" } : {}),
      [choiceId]: "in",
    });
    setChosen(choiceId);
    if (stage === "predict")
      onAction({ type: "lab-predict", questionId, choiceId });
    else if (stage === "rule")
      onAction({ type: "lab-rule", questionId, choiceId });
  }
  return (
    <>
      <div
        className={`${s.problemPane} ${pageTurn.page}`}
        data-page-turn="true"
        data-workshop-stage={stage}
        tabIndex={0}
        aria-label="분수 조작 활동"
      >
        <div className={s.activityMeta}>
          <span>통분 · 조각으로 이해하기</span>
          <span>{stageNames[stage]}</span>
        </div>
        <h2 className={s.questionTitle}>
          <ExplorerMath text={workshop.prompt} />
        </h2>
        {workshop.predictionLabel && stage === "split" ? (
          // `MathText` 는 div 를 내므로 p 가 아니라 div 에 담는다(모양은 클래스가 정한다).
          <div className={s.instruction}>
            내 예상: <ExplorerMath text={workshop.predictionLabel} />
          </div>
        ) : null}
        <div className={s.fractionModels}>
          {workshop.fractions.map((fraction, index) => (
            <section
              key={index}
              className={s.fractionModel}
              aria-label={`${index + 1}번째 분수`}
            >
              <div className={s.fractionLabel}>
                <span>
                  {workshop.fractions.length > 1
                    ? `${index + 1}번 분수`
                    : "처음 분수"}
                </span>
                <Fraction {...fraction} />
                {stage === "split" || stage === "match" || stage === "rule" ? (
                  <>
                    <span aria-hidden="true">=</span>
                    <Fraction
                      numerator={fraction.numerator * factors[index]}
                      denominator={fraction.denominator * factors[index]}
                    />
                  </>
                ) : null}
              </div>
              {stage !== "check" ? (
                <FractionStrip
                  numerator={
                    fraction.numerator *
                    (stage === "split" || stage === "match" || stage === "rule"
                      ? factors[index]
                      : 1)
                  }
                  denominator={
                    fraction.denominator *
                    (stage === "split" || stage === "match" || stage === "rule"
                      ? factors[index]
                      : 1)
                  }
                />
              ) : null}
              {stage === "check" ? (
                <>
                  <p className={s.paintInstruction}>
                    아래 도형 전체가 1이에요. 같은 크기만큼 칠해 주세요.
                  </p>
                  <div
                    className={s.paintGrid}
                    style={{ "--paint-columns": columns } as CSSProperties}
                    role="group"
                    aria-label={`${index + 1}번째 분수 ${denominator}개 조각`}
                  >
                    {/* 칠한 칸은 색(`#628fde`)으로만 보인다 — ✓ 글자는 뺐다(05 §8.16 «체크 말고»). */}
                    {Array.from({ length: denominator }, (_, part) => (
                      <button
                        type="button"
                        key={part}
                        disabled={disabled}
                        aria-label={`${index + 1}번째 분수 ${part + 1}번째 조각`}
                        aria-pressed={parts[index].includes(part)}
                        onClick={() =>
                          setParts((current) =>
                            current.map((selection, item) =>
                              item === index
                                ? selection.includes(part)
                                  ? selection.filter((value) => value !== part)
                                  : [...selection, part]
                                : selection,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          ))}
        </div>
        {stage === "split" || stage === "match" ? (
          <p className={s.quietNote}>
            아래에서 나누는 수를 바꾸며 조각의 크기를 살펴보세요.
          </p>
        ) : null}
      </div>
      <div className={s.answerDock} data-explorer-dock="true">
        {workshop.choices.length > 0 ? (
          <>
            <div className={s.answerInstruction}>
              <span>하나를 고르면 바로 확인해요</span>
            </div>
            <div
              className={`${s.answers} ${s.workshopChoices}`}
              role="group"
              aria-label="답 고르기"
            >
              {workshop.choices.map((choice, index) => (
                <button
                  type="button"
                  key={choice.id}
                  aria-label={`${index + 1} ${choice.label}`}
                  aria-keyshortcuts={answerKey(index)}
                  aria-pressed={chosen === choice.id}
                  disabled={disabled}
                  data-anim={motion[choice.id]}
                  onClick={() => choose(choice.id)}
                >
                  <NumberKey index={index} className={s.answerNumber} />
                  <ExplorerChoiceText
                    className={s.answerText}
                    text={choice.label}
                  />
                </button>
              ))}
            </div>
            <div className={s.answerControls} />
          </>
        ) : (
          <>
            {stage === "check" ? (
              <div className={s.paintedCounts}>
                {parts.map((selection, index) => (
                  <span key={index}>
                    {index + 1}번{" "}
                    <Fraction
                      numerator={selection.length}
                      denominator={denominator}
                    />
                  </span>
                ))}
              </div>
            ) : (
              <div className={s.factorControls}>
                {workshop.fractions.map((_, index) => (
                  <div key={index}>
                    <span>
                      {workshop.fractions.length > 1
                        ? `${index + 1}번 분수`
                        : "한 조각을"}
                    </span>
                    <div>
                      <button
                        type="button"
                        disabled={disabled || factors[index] <= 1}
                        aria-label={`${index + 1}번째 분수 나누는 수 줄이기`}
                        onClick={() =>
                          setFactors(
                            (current) =>
                              current.map((value, item) =>
                                item === index ? value - 1 : value,
                              ) as [number, number],
                          )
                        }
                      >
                        −
                      </button>
                      <strong>
                        {factors[index]}
                        <small>개로</small>
                      </strong>
                      <button
                        type="button"
                        disabled={
                          disabled ||
                          factors[index] >= (stage === "split" ? 4 : 6)
                        }
                        aria-label={`${index + 1}번째 분수 나누는 수 늘리기`}
                        onClick={() =>
                          setFactors(
                            (current) =>
                              current.map((value, item) =>
                                item === index ? value + 1 : value,
                              ) as [number, number],
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={s.manipulationNote}>
              {stage === "check"
                ? "조각을 다시 누르면 색칠을 지울 수 있어요."
                : "색칠한 부분의 전체 크기는 그대로예요."}
            </div>
            <div className={s.answerControls}>
              <button
                type="button"
                className={s.confirm}
                aria-keyshortcuts="Enter"
                disabled={disabled}
                onClick={confirm}
              >
                {stage === "check"
                  ? "칠한 조각 확인하기"
                  : "나눈 조각 확인하기"}
                <EnterKey />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
