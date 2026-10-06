"use client";
import { useEffect, useRef } from "react";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingPlacement } from "@/contracts/fading.contract";
import { chipTray, type FadingTrap } from "@/lib/fading/chips";
import { erasedTargets } from "@/lib/fading/erasure";
import type { FadingStepResult } from "@/lib/fading/session";
import type { FadingFigure } from "@/lib/fading/figures";
import { FadingMath as ExplorerMath } from "./FadingMath";
import { FadingFigureView } from "./FadingFigureView";
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
            {concept.section.split("::").at(-1)} · 기준안
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
          <h3>명제별 대조</h3>
          <span className={s.code}>틀림 기록 유지</span>
        </div>
        {concept.propositions.map((p, i) => {
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
            <article className={s.comparisonRow} key={p.id}>
              <div className={s.row}>
                <strong>
                  <span className={s.roundNumber}>{i + 1}</span>
                  <ExplorerMath text={p.term} />
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
        })}
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
