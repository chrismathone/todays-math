"use client";

import { useEffect, useRef } from "react";
import type {
  ExplorerFeedback,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import { studentDateLabel } from "@/components/fading/labels";
import { gradeLabel, type ExplorerCard } from "./ExplorerHome";
import { ConceptKindTag, conceptHeadingLabel } from "./ExplorerConceptHead";
import { ExplorerMath } from "./ExplorerMath";
import { ExplorerSolution } from "./ExplorerSolution";
import s from "./math-explorers.module.css";

export default function ExplorerCardDialog({
  card,
  state,
  solution,
  workshopSolution,
  busy,
  onInspect,
  onSolution,
  onWorkshopSolution,
  onClose,
}: {
  card: ExplorerCard;
  state: ExplorerState;
  solution: ExplorerFeedback["solution"] | null;
  workshopSolution?: ExplorerFeedback["workshopSolution"] | null;
  busy: boolean;
  onInspect: (card: ExplorerCard) => void;
  onSolution: () => void;
  onWorkshopSolution?: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cards = state.units.flatMap((unit) => unit.cards);
  const unit = state.units.find((item) => item.id === card.unitId);
  const active =
    (!!state.session && !state.session.done) ||
    (!!state.expedition?.mission &&
      state.expedition.mission.status !== "complete");
  const canReveal =
    (!active ||
      (!!state.session?.done &&
        state.session.unresolved.some((item) => item.cardId === card.id) &&
        state.expedition?.mission?.kind !== "elementary" &&
        state.expedition?.mission?.kind !== "middle")) &&
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
          <h2
            id="explorer-card-title"
            aria-label={conceptHeadingLabel(card.id, card.name)}
          >
            <ExplorerMath text={card.name} />
            {/* 풀이 화면과 같은 갈래 딱지(05 §8.19 · D-143). 이 창의 «정의» 문구도 «뜻»으로 — 딱지(방법 · 성질 …)와
                어긋나지 않게(D-143 ⑥, Claude · codex · grok 셋 다 (나)). */}
            <ConceptKindTag cardId={card.id} large />
          </h2>
        </div>
        <button type="button" aria-label="개념 카드 닫기" onClick={onClose}>
          ×
        </button>
      </header>
      <div className={s.dialogBody}>
        <p className={s.memoryBadge}>
          {card.progress?.level
            ? state.dueCardIds.includes(card.id)
              ? "다시 기억할 때"
              : `${studentDateLabel(card.progress.due, state.today)} 복습`
            : "아직 수집 전"}
        </p>
        {solution?.cardId === card.id ? (
          <ExplorerSolution solution={solution} />
        ) : (
          <>
            <p className={s.quietNote}>
              {active && !canReveal
                ? "탐험과 오답 복습을 마친 뒤 해설을 볼 수 있어요."
                : canReveal
                  ? "필요할 때 뜻과 해설을 열어 확인해 보세요."
                  : "뜻을 만나고 세 활동을 해결하면 내 카드로 모을 수 있어요."}
            </p>
            {canReveal ? (
              <button
                type="button"
                className={s.primary}
                disabled={busy}
                onClick={onSolution}
              >
                {busy ? "불러오는 중…" : "뜻과 해설 보기"}
              </button>
            ) : null}
          </>
        )}
        {card.id === "g5-common-denominator" &&
        !active &&
        state.workshop?.session?.done ? (
          <section className={s.solutionContent}>
            {workshopSolution ? (
              <>
                <h3>{workshopSolution.title}</h3>
                <div className={s.solutionLine}>
                  <ExplorerMath text={workshopSolution.explanation} />
                </div>
                {workshopSolution.examples.map((example, index) => (
                  <div key={index} className={s.solutionLine}>
                    <ExplorerMath
                      text={example.fractions
                        .map(
                          (fraction, fractionIndex) =>
                            `${fraction.numerator}/${fraction.denominator} = ${example.numerators[fractionIndex]}/${example.denominator}`,
                        )
                        .join(" · ")}
                    />
                  </div>
                ))}
              </>
            ) : (
              <button
                type="button"
                className={s.secondary}
                disabled={busy}
                onClick={onWorkshopSolution}
              >
                조각 활동 해설 보기
              </button>
            )}
          </section>
        ) : null}
        {card.prerequisiteIds.length ? (
          <section className={s.prerequisites}>
            <h3>먼저 알아둘 개념</h3>
            <div>
              {card.prerequisiteIds.map((id) => {
                const prerequisite = cards.find((item) => item.id === id);
                return prerequisite ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onInspect(prerequisite)}
                  >
                    <ExplorerMath text={prerequisite.name} />
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
      </div>
    </dialog>
  );
}
