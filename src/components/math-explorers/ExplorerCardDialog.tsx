"use client";

import { useEffect, useRef } from "react";
import type {
  ExplorerFeedback,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import { gradeLabel, type ExplorerCard } from "./ExplorerHome";
import s from "./math-explorers.module.css";

export default function ExplorerCardDialog({
  card,
  state,
  solution,
  busy,
  onInspect,
  onSolution,
  onRepair,
  onClose,
}: {
  card: ExplorerCard;
  state: ExplorerState;
  solution: ExplorerFeedback["solution"] | null;
  busy: boolean;
  onInspect: (card: ExplorerCard) => void;
  onSolution: () => void;
  onRepair: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cards = state.units.flatMap((unit) => unit.cards);
  const unit = state.units.find((item) => item.id === card.unitId);
  const active = !!state.session && !state.session.done;
  const canReveal =
    !active &&
    ((card.progress?.level ?? 0) > 0 ||
      !!state.session?.unresolved.some((item) => item.cardId === card.id));

  useEffect(() => {
    const node = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node?.showModal();
    return () => {
      node?.close();
      document.body.style.overflow = previous;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="explorer-card-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className={s.dialogHeader}>
        <div>
          <p>
            {unit ? `${gradeLabel(unit.grade)} · ${unit.title}` : "개념 카드"}
          </p>
          <h2 id="explorer-card-title">{card.name}</h2>
        </div>
        <button type="button" aria-label="개념 카드 닫기" onClick={onClose}>
          ×
        </button>
      </header>
      <div className={s.dialogBody}>
        <p className={s.memoryBadge}>
          {card.progress?.level
            ? `기억 ${card.progress.level}단계 · 다음 복습 ${card.progress.due.slice(5).replace("-", "/")}`
            : "아직 수집 전"}
        </p>
        {solution?.cardId === card.id ? (
          <div className={s.solutionContent} data-explorer-solution="true">
            <h3>뜻 다시 보기</h3>
            <p className={s.readingDefinition}>{solution.definition}</p>
            <p>{solution.note}</p>
            <h3>해설</h3>
            <p>{solution.explanation}</p>
            <div className={s.solutionExamples}>
              {[true, false].map((correct) => (
                <div key={String(correct)}>
                  <strong>
                    {correct ? "해당하는 예" : "해당하지 않는 예"}
                  </strong>
                  {solution.examples
                    .filter((example) => example.correct === correct)
                    .map((example, index) => (
                      <p key={index}>{example.label}</p>
                    ))}
                </div>
              ))}
            </div>
            <p className={s.statement}>
              {solution.statement}
              <strong>
                {solution.truth ? "맞는 설명이에요." : "맞지 않는 설명이에요."}
              </strong>
            </p>
          </div>
        ) : (
          <>
            <p className={s.quietNote}>
              {active
                ? "탐험과 오답 복습을 마친 뒤 해설을 볼 수 있어요."
                : canReveal
                  ? "필요할 때 정의와 해설을 열어 확인해 보세요."
                  : "정의를 만나고 세 활동을 해결하면 내 카드로 모을 수 있어요."}
            </p>
            {canReveal ? (
              <button
                type="button"
                className={s.primary}
                disabled={busy}
                onClick={onSolution}
              >
                {busy ? "불러오는 중…" : "정의와 해설 보기"}
              </button>
            ) : null}
          </>
        )}
        {card.prerequisiteIds.length ? (
          <section className={s.prerequisites}>
            <h3>연결된 앞개념</h3>
            <div>
              {card.prerequisiteIds.map((id) => {
                const prerequisite = cards.find((item) => item.id === id);
                return prerequisite ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onInspect(prerequisite)}
                  >
                    {prerequisite.name}
                    <span>
                      {prerequisite.progress?.level
                        ? "수집 완료"
                        : "아직 수집 전"}
                    </span>
                  </button>
                ) : null;
              })}
            </div>
          </section>
        ) : null}
        <button
          type="button"
          className={s.secondary}
          disabled={busy || active}
          onClick={onRepair}
        >
          이 개념과 앞개념 복습하기 →
        </button>
      </div>
    </dialog>
  );
}
