"use client";
import { useEffect, useRef, useState } from "react";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingPlacement } from "@/contracts/fading.contract";
import { chipTray, type FadingTrap } from "@/lib/fading/chips";
import { erasedTargets } from "@/lib/fading/erasure";
import type { FadingStepResult } from "@/lib/fading/session";
import type { FadingFigure } from "@/lib/fading/figures";
import { FadingMath as ExplorerMath } from "./FadingMath";
import { FadingFigureView } from "./FadingFigureView";
import { FadingSentenceCaption } from "./FadingSentenceCaption";
import { FadingSentencePager } from "./FadingSentencePager";
import { curriculumName } from "./labels";
import s from "./fading.module.css";

export function FadingComparisonSheet({
  concept,
  result,
  placements,
  seed,
  traps,
  figure,
  onClose,
  onNext,
}: {
  concept: FadingConcept;
  result: FadingStepResult;
  placements: readonly FadingPlacement[];
  seed: number;
  traps: readonly FadingTrap[];
  figure: FadingFigure | null;
  onClose: () => void;
  onNext: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    if (node?.showModal) node.showModal();
    else node?.setAttribute("open", "");
    return () => node?.close?.();
  }, []);
  const erased = new Set(
    erasedTargets(concept, result.step).map((target) => target.id),
  );
  const tray = chipTray(concept, result.step, { seed, traps });
  const written = new Map(
    placements.map((place) => [
      place.targetId,
      tray.find((chip) => chip.id === place.chipId)?.text ?? "미입력",
    ]),
  );
  return (
    <dialog
      ref={dialog}
      className={s.compareSheet}
      aria-labelledby="fading-compare-title"
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          event.repeat ||
          event.nativeEvent.isComposing ||
          event.nativeEvent.keyCode === 229 ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey ||
          (event.target instanceof Element &&
            event.target.closest(
              'button,a,input,textarea,select,[contenteditable="true"]',
            ))
        )
          return;
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "ArrowRight"
        ) {
          event.preventDefault();
          if (
            index === concept.propositions.length - 1 &&
            event.key !== "ArrowRight"
          ) {
            onNext();
            return;
          }
          setIndex((current) =>
            Math.min(current + 1, concept.propositions.length - 1),
          );
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          setIndex((current) => Math.max(0, current - 1));
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={s.sheetHandle} />
      <div className={s.row}>
        <div>
          <p className={s.caps}>
            기준안 대조 · STEP {String(result.step).padStart(2, "0")}
          </p>
          <h2 id="fading-compare-title" className={s.subheading}>
            {curriculumName(concept.section.split("::").at(-1))} · 기준안
          </h2>
        </div>
        <button
          className={s.closeButton}
          onClick={onClose}
          aria-label="기준안 접기"
        >
          ×
        </button>
      </div>
      <section aria-label="기준안" className={s.canonical}>
        <p className={s.comparisonMeter}>
          첫 시도에 맞힌 빈칸{" "}
          <strong>
            {result.blanks - result.missed.length} / {result.blanks}
          </strong>
          <span
            className={s.propositionState}
            data-state={result.missed.length ? "waiting" : "filled"}
          >
            {result.missed.length ? "검토 필요" : "일치"}
          </span>
        </p>
        <FadingFigureView figure={figure} answers />
        <div className={s.sectionTitle}>
          <h3>개념별 대조</h3>
          <span className={s.code}>틀림 기록 유지</span>
        </div>
        {(() => {
          const i = index;
          const p = concept.propositions[i]!;
          const missed = p.pieces.some(
            (piece) =>
              piece.kind === "target" &&
              result.missed.includes(piece.target.id),
          );
          const canon = p.pieces
            .map((piece) =>
              piece.kind === "text" ? piece.text : piece.target.text,
            )
            .join("");
          const mine = p.pieces
            .map((piece) =>
              piece.kind === "text"
                ? piece.text
                : erased.has(piece.target.id)
                  ? (written.get(piece.target.id) ?? "[미입력]")
                  : piece.target.text,
            )
            .join("");
          return (
            <article
              className={`${s.comparisonRow} ${s.singleCard}`}
              key={p.id}
              data-fading-comparison-sentence={p.id}
            >
              <div className={s.row}>
                <strong>
                  <FadingSentenceCaption
                    proposition={p}
                    index={i}
                    section={concept.section}
                  />
                </strong>
                <span
                  className={s.propositionState}
                  data-state={missed ? "waiting" : "filled"}
                >
                  {missed ? "검토" : "일치"}
                </span>
              </div>
              <div className={s.comparisonColumns}>
                <div>
                  <p className={s.caps}>기준안</p>
                  <ExplorerMath text={canon} />
                </div>
                <div data-missed={missed}>
                  <p className={s.caps}>내가 넣은 칩</p>
                  <ExplorerMath text={mine} />
                </div>
              </div>
            </article>
          );
        })()}
        <FadingSentencePager
          index={index}
          count={concept.propositions.length}
          onChange={setIndex}
        />
        <p className={`${s.small} ${s.singleCardKeyboard}`}>
          Space·Enter 다음 문장 · 마지막 문장에서 대조 마치기 · ← → 문장 이동
        </p>
      </section>
      <button
        className={`${s.primary} ${s.full} ${s.sheetContinue}`}
        onClick={onNext}
      >
        대조 마치기 · 계속
      </button>
    </dialog>
  );
}
