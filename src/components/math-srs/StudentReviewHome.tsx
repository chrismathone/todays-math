"use client";
import type { ComponentProps, MouseEventHandler, ReactNode } from "react";
import { LearnTopBar } from "@/components/learn/LearnTopBar";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
import { useStudentChrome } from "@/components/learn/StudentChromeContext";
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

const reviewCopy = {
  elementary: {
    grade: "초등 3~6학년",
    description: "시작 진도를 정하면, 필요한 복습과 새 학습을 차례로 안내해요.",
  },
  middle: {
    grade: "중학교 1학년",
    description:
      "일차방정식을 매일 조금씩 복습하고, 풀이 기록에 맞춰 이어 가요.",
  },
  explorers: {
    grade: "초3~중3 수학 탐험",
    description: "오늘의 탐험을 마치고, 수학의 길을 한 칸씩 걸어요.",
  },
};

export function StudentReviewPage({
  kind,
  student,
  practicing = false,
  boardReady = false,
  practiceTitle,
  practicePageClassName,
  practiceMainClassName,
  setupClassName,
  children,
}: {
  kind: keyof typeof reviewCopy;
  student: ComponentProps<typeof LearnTopBar>["student"];
  practicing?: boolean;
  boardReady?: boolean;
  practiceTitle: string;
  practicePageClassName?: string;
  practiceMainClassName?: string;
  setupClassName?: string;
  children: ReactNode;
}) {
  const chrome = useStudentChrome();
  return (
    <div
      className={
        chrome.managed
          ? s.embedded
          : practicing
            ? practicePageClassName
            : s.page
      }
      data-student-practice={practicing ? "true" : undefined}
    >
      <LearnTopBar student={student} />
      <main
        className={
          chrome.managed
            ? s.embeddedMain
            : practicing
              ? practiceMainClassName
              : `${s.main} ${boardReady ? s.boardMain : ""} ${setupClassName ?? ""}`
        }
      >
        {practicing ? (
          <h1 className={s.srOnly}>{practiceTitle}</h1>
        ) : (
          <>
            {!chrome.managed && <StudentMobileNav desktop />}
            <StudentReviewHeading {...reviewCopy[kind]} />
          </>
        )}
        {children}
      </main>
    </div>
  );
}

/** 저장 실패 문장 — 페이지 상태 줄과 모달 시트 안 한 줄이 같은 말을 한다. */
export function studentFailureText(error: { status: number; message: string }) {
  return error.status === 409
    ? "다른 화면에서 학습 기록이 바뀌었어요. 최신 기록을 불러온 뒤 이어 가 주세요."
    : error.status === 503
      ? "학습 저장소가 아직 준비되지 않았어요. 잠시 후 다시 시도하고, 계속되면 선생님께 알려 주세요."
      : error.message;
}

export function StudentReviewStatus({
  loading,
  error,
  busy,
  onReload,
  onRetry,
}: {
  loading: boolean;
  error: { status: number; message: string } | null;
  busy: boolean;
  onReload: () => void;
  onRetry?: () => void;
}) {
  if (loading)
    return (
      <div className={s.status} role="status">
        <span className={s.spinner} aria-hidden="true" />
        학습 기록을 불러오는 중…
      </div>
    );
  if (!error) return null;
  const message = studentFailureText(error);
  return (
    <div className={`${s.status} ${s.error}`} role="alert">
      <p>{message}</p>
      <div className={s.statusActions}>
        {onRetry ? (
          <button
            type="button"
            className={s.secondary}
            onClick={onRetry}
            disabled={busy}
          >
            같은 요청 다시 시도
          </button>
        ) : null}
        <button
          type="button"
          className={s.secondary}
          onClick={onReload}
          disabled={busy}
        >
          다시 불러오기
        </button>
      </div>
    </div>
  );
}

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
  board,
  boardActions,
}: {
  recommendation: Recommendation;
  progress: Progress;
  board?: ReactNode;
  boardActions?: ReadonlyArray<Action>;
}) {
  return (
    <div className={s.overview}>
      {board ? (
        <section className={s.boardSection} aria-label="전체 학습 진도판">
          {board}
          <p className={s.boardNote}>
            <strong>{recommendation.title}</strong>
            <span>{recommendation.reason}</span>
          </p>
          {boardActions?.length ? (
            <div className={s.boardActions}>
              {boardActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={s.secondary}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
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
      )}
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
