"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { FadingConceptDetail } from "@/lib/fading/source";
import { FadingMath } from "./FadingMath";
import { FadingFigureView } from "./FadingFigureView";
import { FadingSentenceCaption } from "./FadingSentenceCaption";
import { FadingSentencePager } from "./FadingSentencePager";
import { curriculumName, dueLabel } from "./labels";
import s from "./fading.module.css";

export function FadingConceptReader({
  detail,
  busy,
  canDrop,
  onBack,
  onStart,
  onPractice,
  onDrop,
}: {
  detail: FadingConceptDetail;
  busy: boolean;
  canDrop: boolean;
  onBack: () => void;
  onStart: () => void;
  onPractice: () => void;
  onDrop: () => void;
}) {
  const concept = detail.content.concept;
  const [index, setIndex] = useState(0);
  const proposition = concept.propositions[index]!;
  const chapter = concept.section.split("::");
  const beforeDue = detail.status?.rated && (detail.status.daysUntil ?? 0) > 0;
  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (
      busy ||
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      document.querySelector('dialog[open], [role="dialog"]') ||
      (event.target instanceof Element &&
        event.target.closest(
          'input,textarea,select,button,a,[contenteditable="true"]',
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
        if (beforeDue) onPractice();
        else onStart();
        return;
      }
      setIndex((current) =>
        Math.min(current + 1, concept.propositions.length - 1),
      );
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setIndex((current) => Math.max(0, current - 1));
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <div className={`${s.stack} ${s.singleCardReader}`}>
      <div className={s.row}>
        <h1 className={s.heading}>개념 읽기</h1>
        <button className={s.quiet} onClick={onBack}>
          목록으로
        </button>
      </div>
      <header className={s.singleCardIdentity}>
        <p className={s.small}>
          {chapter.map(curriculumName).join(" · ")} · {concept.level} ·{" "}
          {concept.ordinal}/{concept.siblings}
        </p>
        <h2 className={s.subheading}>{curriculumName(chapter.at(-1))}</h2>
        {detail.status && (
          <p className={s.pill}>
            {detail.status.step}단계 · {dueLabel(detail.status.daysUntil)}
          </p>
        )}
      </header>
      <div className={s.singleCardReadingIntro}>
        <span className={s.stepPill}>STEP 01 · 정독</span>
        <p className={s.muted}>
          문장을 하나씩 읽고 강조된 핵심어의 뜻을 살펴보세요.
        </p>
      </div>
      <FadingFigureView figure={detail.content.figure} answers />
      <article
        className={`${s.proposition} ${s.singleCard}`}
        data-fading-sentence={proposition.id}
      >
        <h3 className={s.singleCardHeading}>
          <FadingSentenceCaption
            proposition={proposition}
            index={index}
            section={concept.section}
          />
          <span className={s.readingCheck} aria-hidden="true">
            ✓
          </span>
        </h3>
        <div className={s.sentence}>
          {proposition.pieces.map((piece, pieceIndex) => (
            <span
              key={pieceIndex}
              className={
                piece.kind === "target" ? s.readingTextTarget : undefined
              }
            >
              <FadingMath
                text={piece.kind === "text" ? piece.text : piece.target.text}
              />
            </span>
          ))}
        </div>
      </article>
      <FadingSentencePager
        index={index}
        count={concept.propositions.length}
        onChange={setIndex}
        disabled={busy}
      />
      <p className={`${s.small} ${s.singleCardKeyboard}`}>
        Space·Enter 다음 문장 · 마지막 문장에서 풀이 시작 · ← → 문장 이동
      </p>
      {beforeDue && (
        <p className={s.muted}>
          복습일 전에는 연습할 수 있어요. 평가와 일정은 바뀌지 않습니다.
        </p>
      )}
      <button
        className={s.primary}
        disabled={busy}
        onClick={beforeDue ? onPractice : onStart}
      >
        {beforeDue
          ? "연습하기"
          : detail.status
            ? "풀이 시작"
            : "복습에 추가하고 시작"}
      </button>
      {canDrop && (
        <button className={s.quiet} disabled={busy} onClick={onDrop}>
          선택에서 빼기
        </button>
      )}
    </div>
  );
}
