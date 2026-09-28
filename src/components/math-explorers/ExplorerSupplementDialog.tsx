"use client";

import { useEffect, useRef } from "react";
import type {
  ExplorerFeedback,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import { ConceptKindTag, conceptHeadingLabel } from "./ExplorerConceptHead";
import { gradeLabel } from "./ExplorerHome";
import { ExplorerMath } from "./ExplorerMath";
import { ExplorerSolution } from "./ExplorerSolution";
import {
  supplementCardOf,
  supplementStartLabel,
} from "./ExplorerSupplementPieces";
import s from "./math-explorers.module.css";

/**
 * 보충 카드 창(D-147 · 05 §8.22 — Hi-fi 1안) — 본 카드 창과 같은 틀(.dialog), 제목 뒤 갈래 + «교재» 딱지.
 * - 아직 수집 전: «세 활동 해 보기»(멈춘 진행이 있으면 «이어서 하기 · n / 3», 못 모았으면 «다시 해 보기»).
 *   오늘의 탐험이 열려 있으면 흐리게 + 한 줄(열린 탐험은 하나).
 * - 수집 완료: «수집 완료 · 기억 복습 없음» · 뜻과 해설만(다시 풀기 없음 — 별이 늘 길이 없다).
 * - 못 모은 카드: 다시 해 보기와 함께 뜻과 해설.
 */
export default function ExplorerSupplementDialog({
  cardId,
  state,
  solution,
  busy,
  locked,
  onStart,
  onSolution,
  onClose,
}: {
  cardId: string;
  state: ExplorerState;
  solution: ExplorerFeedback["solution"] | null;
  busy: boolean;
  locked: boolean;
  onStart: () => void;
  onSolution: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = supplementCardOf(state, cardId);
  const unit = state.units.find((item) => item.id === card?.unitId);

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

  if (!card) return null;
  const collected = !!card.collectedAt;
  const canReveal = (collected || !!card.missedAt) && !card.started;
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="explorer-supplement-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className={s.dialogHeader}>
        <div>
          <p>
            {unit ? `${gradeLabel(unit.grade)} · ${unit.title}` : "교재 개념"}
          </p>
          <h2
            id="explorer-supplement-title"
            aria-label={conceptHeadingLabel(card.id, card.name)}
          >
            <ExplorerMath text={card.name} />
            <ConceptKindTag cardId={card.id} large />
          </h2>
        </div>
        <button type="button" aria-label="보충 카드 닫기" onClick={onClose}>
          ×
        </button>
      </header>
      <div className={s.dialogBody}>
        <p className={s.memoryBadge}>
          {collected ? "수집 완료 · 기억 복습 없음" : "아직 수집 전"}
        </p>
        {solution?.cardId === card.id ? (
          <ExplorerSolution solution={solution} />
        ) : (
          <>
            <p className={s.quietNote}>
              {collected
                ? "필요할 때 뜻과 해설을 열어 확인해 보세요."
                : "뜻을 만나고 세 활동을 해결하면 내 카드로 모을 수 있어요. 오늘의 탐험 · 기억 복습과 따로예요."}
            </p>
            {!collected && locked ? (
              <p className={s.quietNote}>
                오늘의 탐험을 마친 뒤 해 볼 수 있어요.
              </p>
            ) : null}
            {collected ? null : (
              <button
                type="button"
                className={s.primary}
                disabled={busy || locked}
                onClick={onStart}
              >
                {supplementStartLabel(card)} <span aria-hidden="true">→</span>
              </button>
            )}
            {canReveal ? (
              <button
                type="button"
                className={collected ? s.primary : s.secondary}
                disabled={busy}
                onClick={onSolution}
              >
                {busy ? "불러오는 중…" : "뜻과 해설 보기"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </dialog>
  );
}
