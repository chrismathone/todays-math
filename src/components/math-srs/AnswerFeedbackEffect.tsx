import type { CSSProperties } from "react";
import s from "./answer-feedback-effect.module.css";

interface Props {
  correct: boolean | null;
  eventKey: string | number;
  message?: string;
}

const sparkAngles = [0, 45, 90, 135, 180, 225, 270, 315];

/** Place inside a positioned practice area. It never intercepts an answer tap. */
export default function AnswerFeedbackEffect({
  correct,
  eventKey,
  message,
}: Props) {
  if (correct === null) return null;

  return (
    <div
      key={`${eventKey}:${correct}`}
      className={`${s.effect} ${correct ? s.correct : s.incorrect}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-answer-feedback={correct ? "correct" : "incorrect"}
    >
      <div className={s.content}>
        <div className={s.emblem} aria-hidden="true">
          <span className={s.ring} />
          <span className={`${s.ring} ${s.secondRing}`} />
          {correct ? (
            <span className={s.sparks}>
              {sparkAngles.map((angle, index) => (
                <i
                  key={angle}
                  className={s.spark}
                  style={
                    {
                      "--angle": `${angle}deg`,
                      "--delay": `${index % 2 ? 50 : 0}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          ) : null}
          <span className={s.medallion}>
            <svg viewBox="0 0 64 64" fill="none" focusable="false">
              {correct ? (
                <path
                  className={s.mark}
                  pathLength="1"
                  d="m17 32 10 10 21-23"
                />
              ) : (
                <>
                  <path className={s.mark} pathLength="1" d="m22 22 20 20" />
                  <path
                    className={`${s.mark} ${s.secondStroke}`}
                    pathLength="1"
                    d="M42 22 22 42"
                  />
                </>
              )}
            </svg>
          </span>
        </div>
        <p className={s.message}>
          {message ??
            (correct ? "정확하게 풀었어요" : "다시 풀 문제로 모았어요")}
        </p>
      </div>
    </div>
  );
}
