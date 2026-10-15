"use client";

import { useId, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import NativeProblem from "@/components/unified/NativeProblem";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import type { StudioProblem } from "@/components/unified/types";
import type { ArithmeticOutputRound } from "@/lib/arithmeticOutputLayout";
import s from "./ArithmeticWorkbench.module.css";
import layout from "./ArithmeticWorkflow.module.css";

type Regenerate = (target: { round: number; orders: number[] }) => void;

function itemOrder(problem: StudioProblem) {
  const source = problem.source;
  if (
    source &&
    typeof source === "object" &&
    "kind" in source &&
    source.kind === "arithmeticSheet" &&
    "item" in source &&
    source.item &&
    typeof source.item === "object" &&
    "order" in source.item &&
    typeof source.item.order === "number"
  )
    return source.item.order;
  throw new Error("연산 문항의 저장된 번호를 확인할 수 없습니다.");
}

export default function ArithmeticReview({
  rounds,
  showAnswers,
  disabled,
  onRegenerate,
}: {
  rounds: ArithmeticOutputRound[];
  showAnswers: boolean;
  disabled: boolean;
  onRegenerate: Regenerate;
}) {
  const id = useId();
  const tabs = useRef<HTMLDivElement>(null);
  const [selectedRound, setSelectedRound] = useState(rounds[0]?.round);
  const active =
    rounds.find((round) => round.round === selectedRound) ?? rounds[0];
  if (!active) return null;
  return (
    <div className={layout.rounds}>
      <div
        ref={tabs}
        className={layout.roundTabs}
        role="tablist"
        aria-label="검토할 회차"
      >
        {rounds.map((round, index) => (
          <button
            key={round.round}
            type="button"
            role="tab"
            id={`${id}-tab-${round.round}`}
            aria-controls={`${id}-panel`}
            aria-selected={round.round === active.round}
            tabIndex={round.round === active.round ? 0 : -1}
            onClick={() => setSelectedRound(round.round)}
            onKeyDown={(event) => {
              const target =
                event.key === "ArrowRight"
                  ? (index + 1) % rounds.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + rounds.length) % rounds.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? rounds.length - 1
                        : -1;
              if (target < 0) return;
              event.preventDefault();
              setSelectedRound(rounds[target].round);
              tabs.current
                ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
                [target]?.focus();
            }}
          >
            {round.round}회차 <span>{round.count}문항</span>
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${active.round}`}
        tabIndex={0}
      >
        <RoundReview
          key={active.round}
          round={active}
          disabled={disabled}
          showAnswers={showAnswers}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  );
}

function RoundReview({
  round,
  disabled,
  showAnswers,
  onRegenerate,
}: {
  round: ArithmeticOutputRound;
  disabled: boolean;
  showAnswers: boolean;
  onRegenerate: Regenerate;
}) {
  const [selection, setSelection] = useState<Set<number>>(() => new Set());
  const orders = round.groups.flatMap((group) => group.problems.map(itemOrder));
  const selected = orders.filter((order) => selection.has(order));
  function toggle(items: number[], checked: boolean) {
    setSelection((previous) => {
      const next = new Set(previous);
      for (const order of items) {
        if (checked) next.add(order);
        else next.delete(order);
      }
      return next;
    });
  }
  return (
    <section className={layout.round} aria-label={`${round.round}회차 문항`}>
      <div className={layout.roundActions}>
        <label className={layout.selectionLabel}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={selected.length === orders.length}
            ref={(node) => {
              if (node)
                node.indeterminate =
                  selected.length > 0 && selected.length < orders.length;
            }}
            onChange={(event) => toggle(orders, event.target.checked)}
          />
          회차 전체 선택
        </label>
        <span aria-live="polite">{selected.length}문항 선택</span>
        <button
          type="button"
          disabled={disabled || selected.length === 0}
          onClick={() => onRegenerate({ round: round.round, orders: selected })}
        >
          선택한 문항 숫자 바꾸기
        </button>
      </div>
      {round.groups.map((group) => {
        const groupOrders = group.problems.map(itemOrder);
        const count = groupOrders.filter((order) =>
          selection.has(order),
        ).length;
        return (
          <section key={group.problems[0].id} aria-label={group.title}>
            <div className={layout.typeHeader}>
              <h3 className={layout.typeHeading} aria-label={group.title}>
                <label className={layout.selectionLabel}>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={count === groupOrders.length}
                    aria-label={`${group.title} 문항 모두 선택`}
                    ref={(node) => {
                      if (node)
                        node.indeterminate =
                          count > 0 && count < groupOrders.length;
                    }}
                    onChange={(event) =>
                      toggle(groupOrders, event.target.checked)
                    }
                  />
                  {group.title}
                </label>
              </h3>
              <button
                type="button"
                disabled={disabled}
                aria-label={`${group.title} 숫자 바꾸기`}
                onClick={() =>
                  onRegenerate({ round: round.round, orders: groupOrders })
                }
              >
                이 유형 숫자 바꾸기
              </button>
            </div>
            <ol
              className={`${s.reviewGrid} ${group.problems.some((problem) => problem.figureSvg) ? s.geometryReviewGrid : ""}`}
            >
              {group.problems.map((problem) => {
                const order = itemOrder(problem);
                return (
                  <li
                    key={order}
                    className={s.reviewCard}
                    data-selected={selection.has(order) || undefined}
                  >
                    <label
                      className={`${layout.selectionLabel} ${layout.questionNumber}`}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={selection.has(order)}
                        aria-label={`${problem.arithmetic?.number}번 문항 선택`}
                        onChange={(event) =>
                          toggle([order], event.target.checked)
                        }
                      />
                      <strong data-arithmetic-question-number>
                        {problem.arithmetic?.number}.
                      </strong>
                    </label>
                    <NativeProblem problem={problem} print={false} />
                    {showAnswers && (
                      <div className={s.reviewAnswer} aria-label="정답">
                        <strong>정답</strong>{" "}
                        <MathText
                          text={fractionViewFor(problem)(problem.answer)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </section>
  );
}
