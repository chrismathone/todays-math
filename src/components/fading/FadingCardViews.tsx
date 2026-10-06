"use client";

import type { FadingConcept, FadingProposition } from "@/lib/fading/concepts";
import { FadingMath } from "./FadingMath";
import s from "./fading.module.css";

export const seenLabels = ["처음 봄", "들어 봄", "알고 있었음"] as const;
export const confidenceLabels = [
  "모르겠어요",
  "긴가민가해요",
  "확실해요",
] as const;

export function FadingCardCheck({
  labels,
  value,
  disabled,
  onChoose,
}: {
  labels: readonly string[];
  value?: string;
  disabled: boolean;
  onChoose: (value: "1" | "2" | "3") => void;
}) {
  return (
    <div className={s.cardCheck}>
      {labels.map((label, index) => (
        <button
          type="button"
          className={s.secondary}
          key={label}
          disabled={disabled}
          aria-keyshortcuts={String(index + 1)}
          aria-pressed={value === String(index + 1)}
          onClick={() => onChoose(String(index + 1) as "1" | "2" | "3")}
        >
          <span className={s.chipNumber} aria-hidden="true">
            {index + 1}
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}

export function FadingAnkiCard({
  proposition,
  revealed,
  disabled,
  onReveal,
  onSeen,
}: {
  proposition: FadingProposition;
  revealed: boolean;
  disabled: boolean;
  onReveal: () => void;
  onSeen: (value: "1" | "2" | "3") => void;
}) {
  return (
    <article
      className={`${s.proposition} ${s.singleCard} ${s.ankiCard}`}
      data-fading-sentence={proposition.id}
      data-card-side={revealed ? "back" : "front"}
    >
      <p className={s.caps}>{revealed ? "문장 확인" : "떠올려 보기"}</p>
      <h2 className={s.ankiTerm}>
        <FadingMath text={proposition.term} />
      </h2>
      <span className={s.singleCardCaption}>{proposition.kind}</span>
      {revealed ? (
        <>
          <div className={s.sentence}>
            {proposition.pieces.map((piece, index) => (
              <span
                key={piece.kind === "target" ? piece.target.id : index}
                className={
                  piece.kind === "target" ? s.readingTextTarget : undefined
                }
              >
                <FadingMath
                  text={
                    piece.kind === "target" ? piece.target.text : piece.text
                  }
                />
              </span>
            ))}
          </div>
          <p className={s.small}>보기 전에 얼마나 알고 있었나요</p>
          <FadingCardCheck
            labels={seenLabels}
            disabled={disabled}
            onChoose={onSeen}
          />
        </>
      ) : (
        <>
          <p className={s.muted}>이 용어의 뜻과 문장을 먼저 떠올려 보세요.</p>
          <button
            type="button"
            className={s.primary}
            data-fading-action="true"
            aria-keyshortcuts="Space Enter"
            onClick={onReveal}
            disabled={disabled}
          >
            문장 보기
          </button>
        </>
      )}
    </article>
  );
}

/** Mounted only after the complete bundle has been submitted. */
export function FadingTypedComparison({
  concept,
  answers,
  unjudged,
  judgments,
  disabled,
  onJudge,
}: {
  concept: FadingConcept;
  answers: Readonly<Record<string, string>>;
  unjudged: readonly { targetId: string; text: string }[];
  judgments: Readonly<Record<string, "same" | "different">>;
  disabled: boolean;
  onJudge: (targetId: string, judgment: "same" | "different") => void;
}) {
  const unknown = new Set(unjudged.map((item) => item.targetId));
  return (
    <section className={s.typedComparison} aria-label="내 답과 기준안 대조">
      {concept.propositions.map((proposition, index) => (
        <article
          className={s.comparisonRow}
          key={proposition.id}
          data-fading-comparison-sentence={proposition.id}
        >
          <h2 className={s.singleCardCaption}>
            문장 {index + 1} · <FadingMath text={proposition.term} /> ·{" "}
            {proposition.kind}
          </h2>
          <div className={s.comparisonColumns}>
            <div>
              <p className={s.caps}>내 답</p>
              <div className={s.sentence}>
                {proposition.pieces.map((piece, i) => (
                  <span key={i}>
                    {piece.kind === "text" ? (
                      <FadingMath text={piece.text} />
                    ) : (
                      <span className={s.typedWritten}>
                        {answers[piece.target.id] || "[미입력]"}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className={s.caps}>기준안</p>
              <div className={s.sentence}>
                {proposition.pieces.map((piece, i) => (
                  <span
                    key={i}
                    className={
                      piece.kind === "target" ? s.readingTextTarget : undefined
                    }
                  >
                    <FadingMath
                      text={
                        piece.kind === "text" ? piece.text : piece.target.text
                      }
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>
          {proposition.pieces
            .filter(
              (piece) =>
                piece.kind === "target" && unknown.has(piece.target.id),
            )
            .map((piece) => {
              if (piece.kind !== "target") return null;
              const targetId = piece.target.id;
              return (
                <fieldset
                  key={targetId}
                  className={s.selfJudge}
                  disabled={disabled}
                >
                  <legend>«{answers[targetId]}»의 뜻이 기준안과 같나요</legend>
                  <div className={s.actions}>
                    {(["same", "different"] as const).map((judgment) => (
                      <button
                        type="button"
                        key={judgment}
                        className={s.secondary}
                        aria-pressed={judgments[targetId] === judgment}
                        onClick={() => onJudge(targetId, judgment)}
                      >
                        {judgment === "same" ? "같은 뜻" : "다름"}
                      </button>
                    ))}
                  </div>
                </fieldset>
              );
            })}
        </article>
      ))}
    </section>
  );
}
