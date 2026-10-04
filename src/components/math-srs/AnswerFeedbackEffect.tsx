import s from "./answer-feedback-effect.module.css";

interface Props {
  correct: boolean | null;
  eventKey: string | number;
  message?: string;
  /** Only the caller decides combo eligibility and calculates the streak. */
  streak?: number | null;
}

/** Use in the existing dock instruction row, keeping answers and formulas uncovered. */
export default function AnswerFeedbackEffect({
  correct,
  eventKey,
  message,
  streak,
}: Props) {
  if (correct === null) return null;
  const combo = correct && streak != null ? streak : null;
  return (
    <div
      key={`${eventKey}:${correct}`}
      className={`${s.effect} ${correct ? s.correct : s.incorrect}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-answer-feedback={correct ? "correct" : "incorrect"}
      data-streak={combo ?? undefined}
    >
      <svg
        className={s.icon}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {correct ? (
          <path d="m5 12 4 4L19 6" />
        ) : (
          <path d="M5 9a7 7 0 1 1 0 7M5 4v5h5" />
        )}
      </svg>
      {combo !== null ? (
        <p className={`${s.message} ${s.streak}`}>
          <b className={s.streakNumber}>{combo}</b>
          <span>문제 연속 정답</span>
        </p>
      ) : (
        <p className={s.message}>
          {message ??
            (correct ? "정확하게 풀었어요" : "다시 생각해 볼 문제예요")}
        </p>
      )}
    </div>
  );
}
