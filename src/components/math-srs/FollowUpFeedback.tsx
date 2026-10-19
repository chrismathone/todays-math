"use client";

import { useId, type ReactNode, type Ref } from "react";
import s from "./follow-up-feedback.module.css";

export interface FollowUpSolutionProps {
  children: ReactNode;
  figure?: ReactNode;
  footerText: string;
  busy: boolean;
  onUnderstood: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  headingId?: string;
}

export function FollowUpSolution({
  children,
  figure,
  footerText,
  busy,
  onUnderstood,
  buttonRef,
  headingId,
}: FollowUpSolutionProps) {
  const generatedId = useId();
  const titleId = headingId ?? generatedId;
  return (
    <section className={s.solution} aria-labelledby={titleId}>
      <span className={s.tag}>다시 살펴봐요</span>
      <h3 id={titleId}>정답과 풀이</h3>
      {figure ? (
        <div className={s.columns}>
          <div>{children}</div>
          <div className={s.figure}>{figure}</div>
        </div>
      ) : (
        <div>{children}</div>
      )}
      <footer className={s.solutionFooter}>
        <p>{footerText}</p>
        <button
          ref={buttonRef}
          type="button"
          className={s.understood}
          disabled={busy}
          onClick={onUnderstood}
        >
          알겠어요
        </button>
      </footer>
    </section>
  );
}

export function PreviousAnswerMark() {
  return <span className={s.previous}>앞에서 고른 답</span>;
}

export function FollowUpWarning() {
  return (
    <p role="status" className={s.warning}>
      다시 해 볼까요
    </p>
  );
}
