"use client";

import type { FadingProposition } from "@/lib/fading/concepts";
import { FadingMath } from "./FadingMath";
import { FadingIcon } from "./FadingIcon";
import s from "./fading.module.css";
import fill from "./FadingFillCard.module.css";

/** Presentation only: the source chooses the erased targets and accepted answers. */
export function FadingFillCard({
  proposition,
  caption,
  erased,
  answers,
  missed,
  active,
  wrong,
  typed,
  disabled,
  onBlank,
  drag,
}: {
  proposition: FadingProposition;
  caption: string;
  erased: readonly { id: string }[];
  answers: Readonly<Record<string, string>>;
  missed: readonly string[];
  active: string | null;
  wrong: { targetId: string; text: string } | null;
  typed: boolean;
  disabled: boolean;
  onBlank: (targetId: string) => void;
  drag?: { active: boolean; over: string | null };
}) {
  const erasedIds = new Set(erased.map((item) => item.id));
  return (
    <article
      className={`${s.proposition} ${s.singleCard} ${fill.card}`}
      data-fading-sentence={proposition.id}
    >
      <h2 className={s.singleCardHeading}>
        <span className={s.singleCardCaption}>{caption}</span>
      </h2>
      <div className={`${s.sentence} ${fill.sentence}`}>
        {proposition.pieces.map((piece, index) => {
          if (piece.kind === "text")
            return (
              <span key={index}>
                <FadingMath text={piece.text} />
              </span>
            );
          const target = piece.target;
          if (!erasedIds.has(target.id))
            return (
              <span key={target.id}>
                <FadingMath text={target.text} />
              </span>
            );
          const blankIndex =
            erased.findIndex((item) => item.id === target.id) + 1;
          const answer = answers[target.id];
          if (answer !== undefined)
            return (
              <span
                key={target.id}
                className={`${s.filled} ${fill.slot} ${fill.written} ${missed.includes(target.id) ? s.missed : ""}`}
                data-fading-slot={target.id}
              >
                {typed ? (
                  <span className={fill.answer}>{answer || "[넘김]"}</span>
                ) : (
                  <FadingMath text={answer} />
                )}
              </span>
            );
          return (
            <button
              type="button"
              key={target.id}
              className={`${s.blank} ${fill.slot} ${missed.includes(target.id) ? s.missed : ""}`}
              aria-label={`빈칸 ${blankIndex}`}
              aria-pressed={active === target.id}
              data-pending={active === target.id}
              data-fading-slot={target.id}
              data-fading-blank={target.id}
              data-wrong={wrong?.targetId === target.id || undefined}
              data-drag-available={drag?.active || undefined}
              data-drag-over={drag?.over === target.id}
              disabled={disabled}
              onClick={() => onBlank(target.id)}
            >
              {wrong?.targetId === target.id ? (
                <FadingMath text={wrong.text} />
              ) : (
                <>
                  <FadingIcon name="erase" />
                  <span className={s.blankCaption}>빈칸 {blankIndex}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {missed.some((id) =>
        proposition.pieces.some(
          (piece) => piece.kind === "target" && piece.target.id === id,
        ),
      ) && <p className={s.missedNote}>틀림 기록은 남아 있어요.</p>}
    </article>
  );
}
