import type { MouseEventHandler, ReactNode } from "react";
import s from "./student-review-home.module.css";

type Action = {
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  arrow?: boolean;
};

type Recommendation = {
  id: string;
  eyebrow: string;
  title: string;
  section?: string;
  sectionTitle?: string;
  reason: string;
  action?: Action;
  completedLabel?: string;
  note?: string;
};

type Progress = {
  title: string;
  ariaLabel: string;
  completed: number;
  goal: number;
  rows: ReadonlyArray<{ label: string; value: ReactNode }>;
  footer?: ReactNode;
};

export function StudentReviewHeading({
  grade,
  description,
}: {
  grade: string;
  description: string;
}) {
  return (
    <header className={s.heading}>
      <p>하루 한 걸음 · {grade}</p>
      <h1>매일 쌓이는 수학</h1>
      <span>{description}</span>
    </header>
  );
}

export function StudentReviewOverview({
  recommendation,
  progress,
}: {
  recommendation: Recommendation;
  progress: Progress;
}) {
  return (
    <div className={s.overview}>
      <section className={s.hero} aria-labelledby={recommendation.id}>
        <p className={s.eyebrow}>{recommendation.eyebrow}</p>
        <h2 id={recommendation.id}>{recommendation.title}</h2>
        {recommendation.section ? (
          <p className={s.section}>
            {recommendation.section}
            {recommendation.sectionTitle ? (
              <strong>{recommendation.sectionTitle}</strong>
            ) : null}
          </p>
        ) : null}
        <p className={s.reason}>{recommendation.reason}</p>
        {recommendation.action ? (
          <button
            className={s.primary}
            type="button"
            disabled={recommendation.action.disabled}
            onClick={recommendation.action.onClick}
          >
            {recommendation.action.label}
            {recommendation.action.arrow ? (
              <span aria-hidden="true"> →</span>
            ) : null}
          </button>
        ) : recommendation.completedLabel ? (
          <p className={s.finish}>✓ {recommendation.completedLabel}</p>
        ) : null}
        {recommendation.note ? <small>{recommendation.note}</small> : null}
      </section>
      <aside className={s.summary} aria-label={progress.title}>
        <h2>{progress.title}</h2>
        <p className={s.count}>
          <strong>{progress.completed}</strong> / {progress.goal}문제
        </p>
        <progress
          aria-label={progress.ariaLabel}
          value={Math.min(progress.completed, progress.goal)}
          max={progress.goal}
        />
        <dl>
          {progress.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {progress.footer}
      </aside>
    </div>
  );
}
