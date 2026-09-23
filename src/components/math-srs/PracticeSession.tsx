"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import { clearDraft, readDraft, writeDraft } from "@/lib/math-srs/draft";
import { suggestedRating } from "@/lib/math-srs/mission";
import {
  checkAnswer,
  parseSubmittedNumber,
} from "@/lib/math-srs/sharedAnswers";
import type {
  Attempt,
  GeneratedProblem,
  Mission,
  MissionKind,
  Rating,
} from "@/lib/math-srs/types";
import s from "./practice.module.css";

const KINDS: Record<MissionKind, { title: string; description: string }> = {
  warmup: {
    title: "가볍게 시작",
    description: "아는 것부터, 천천히 감을 깨워요.",
  },
  quick: {
    title: "짧은 한 문제",
    description: "속도보다 정확하게. 익숙한 생각을 꺼내 봐요.",
  },
  memory: {
    title: "기억 꺼내기",
    description: "이 개념을 얼마나 알고 있는지 확인해 봐요.",
  },
  training: {
    title: "실력 쌓기",
    description: "한 단계씩 식을 정리해 보세요.",
  },
  revenge: {
    title: "다시 도전",
    description: "틀렸던 개념, 새로운 숫자로 다시 도전해요.",
  },
  boss: {
    title: "마지막 도전",
    description: "조금 더 어려운 계산에 도전해 보세요.",
  },
};
const RATINGS: Record<Rating, string> = {
  again: "다시 익히기",
  hard: "조금 더 연습",
  good: "스스로 해결",
  easy: "빠르고 정확하게",
};
const conceptTitle = (id: string) =>
  CONCEPTS.find((concept) => concept.id === id)?.title ?? id;

export function QuestionCard({
  learnerId,
  problem,
  onSubmit,
  onExit,
}: {
  learnerId: string;
  problem: GeneratedProblem;
  onSubmit: (attempt: Attempt) => boolean;
  onExit: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [draft] = useState(() => readDraft(learnerId, problem.id));
  const [usedHint, setUsedHint] = useState(draft.usedHint);
  const [elapsed, setElapsed] = useState(draft.elapsedSeconds);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const time = useRef({
    activeMs: draft.elapsedSeconds * 1000,
    last: 0,
    usedHint: draft.usedHint,
  });
  const submitted = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    time.current.last = performance.now();
    function tick() {
      const now = performance.now();
      if (!document.hidden)
        time.current.activeMs += Math.max(
          0,
          Math.min(now - time.current.last, 2000),
        );
      time.current.last = now;
      setElapsed(Math.floor(time.current.activeMs / 1000));
    }
    function keepDraft() {
      if (submitted.current) return;
      writeDraft(learnerId, {
        problemId: problem.id,
        usedHint: time.current.usedHint,
        elapsedSeconds: Math.min(
          86400,
          Math.floor(time.current.activeMs / 1000),
        ),
      });
    }
    const timer = window.setInterval(tick, 500);
    const draftTimer = window.setInterval(keepDraft, 5000);
    document.addEventListener("visibilitychange", tick);
    document.addEventListener("visibilitychange", keepDraft);
    window.addEventListener("pagehide", keepDraft);
    return () => {
      keepDraft();
      window.clearInterval(timer);
      window.clearInterval(draftTimer);
      document.removeEventListener("visibilitychange", tick);
      document.removeEventListener("visibilitychange", keepDraft);
      window.removeEventListener("pagehide", keepDraft);
    };
  }, [learnerId, problem.id]);

  function submit(event?: FormEvent, skipped = false) {
    event?.preventDefault();
    if (submitted.current) return;
    if (!skipped && !answer.trim()) {
      setError("답을 입력하거나 ‘아직 모르겠어요’를 선택해 주세요.");
      input.current?.focus();
      return;
    }
    if (!skipped && parseSubmittedNumber(answer) === null) {
      setError(
        "정수, 소수 또는 분수로 입력해 주세요. 분모는 0이 될 수 없어요.",
      );
      input.current?.focus();
      return;
    }
    submitted.current = true;
    setLocked(true);
    const seconds = Math.max(1, Math.round(time.current.activeMs / 1000));
    const correct = !skipped && checkAnswer(answer, problem.answer);
    const accepted = onSubmit({
      problemId: problem.id,
      conceptId: problem.conceptId,
      templateId: problem.templateId,
      kind: problem.kind,
      submittedAnswer: skipped ? "" : answer.trim(),
      correct,
      rating: suggestedRating(
        correct,
        usedHint,
        seconds,
        problem.expectedSeconds,
      ),
      usedHint,
      elapsedSeconds: seconds,
      answeredAt: new Date().toISOString(),
    });
    if (!accepted) {
      submitted.current = false;
      setLocked(false);
      setError(
        "기록 상태가 바뀌었습니다. 나의 학습으로 돌아가 다시 이어 주세요.",
      );
    } else clearDraft(learnerId);
  }

  const kind = KINDS[problem.kind];
  return (
    <section className={s.question} aria-labelledby="question-title">
      <div className={s.questionTop}>
        <span className={s.kind}>
          <i aria-hidden="true" />
          {kind.title}
        </span>
        <span className={s.time} aria-label={`풀이 시간 ${elapsed}초`}>
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="10"
              cy="10"
              r="7"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M10 6v4l2.5 1.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>
      <div className={s.problemBody}>
        <p className={s.eyebrow}>
          {conceptTitle(problem.conceptId)}
          <span aria-hidden="true">·</span>
          {problem.source?.tier ?? `난이도 ${problem.difficulty}`}
        </p>
        <h2 id="question-title">{problem.source?.title ?? problem.prompt}</h2>
        {problem.source ? (
          <ProblemContent content={problem.prompt} className={s.prompt} />
        ) : null}
        {problem.equation ? (
          <div className={s.equation}>
            <MathText text={problem.equation} />
          </div>
        ) : null}
      </div>
      <form onSubmit={submit} className={s.answerForm}>
        <label htmlFor="srs-answer">
          나의 답 {problem.answerUnit ? `(${problem.answerUnit})` : ""}
        </label>
        <div className={s.answerLine}>
          <input
            ref={input}
            id="srs-answer"
            className={s.answerInput}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            type="text"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setError("");
            }}
            placeholder="예: -3, 1/2"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "answer-error" : "answer-help"}
            disabled={locked}
            maxLength={40}
          />
          <button className={s.primary} type="submit" disabled={locked}>
            정답 확인 →
          </button>
        </div>
        <div className={s.inputMessage}>
          {error ? (
            <p id="answer-error" className={s.error} role="alert">
              {error}
            </p>
          ) : (
            <p id="answer-help" className={s.inputHelp}>
              정수·소수·분수로 입력할 수 있어요.
            </p>
          )}
        </div>
      </form>
      {usedHint ? (
        <aside className={s.hint} aria-labelledby="hint-title" id="srs-hint">
          <span className={s.hintMark} aria-hidden="true">
            ↗
          </span>
          <div>
            <h3 id="hint-title">생각의 실마리</h3>
            <MathText text={problem.hint} as="div" />
          </div>
        </aside>
      ) : null}
      <div className={s.questionActions}>
        <button
          type="button"
          onClick={() => {
            time.current.usedHint = true;
            writeDraft(learnerId, {
              problemId: problem.id,
              usedHint: true,
              elapsedSeconds: Math.floor(time.current.activeMs / 1000),
            });
            setUsedHint(true);
          }}
          disabled={usedHint || locked}
          aria-expanded={usedHint}
          aria-controls={usedHint ? "srs-hint" : undefined}
          className={s.secondary}
        >
          {usedHint ? "힌트를 확인했어요" : "힌트 보기"}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => submit(undefined, true)}
          className={s.textButton}
        >
          아직 모르겠어요
        </button>
        <button
          type="button"
          onClick={onExit}
          className={`${s.textButton} ${s.pause}`}
        >
          잠시 쉬기
        </button>
      </div>
      <p className={s.encouragement}>{kind.description}</p>
    </section>
  );
}

export function Feedback({
  problem,
  attempt,
  onNext,
  last,
}: {
  problem: GeneratedProblem;
  attempt: Attempt;
  onNext: () => void;
  last: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      className={`${s.question} ${s.feedback}`}
      aria-labelledby="feedback-title"
    >
      <div
        className={`${s.feedbackBanner} ${attempt.correct ? s.success : s.retry}`}
      >
        <span className={s.feedbackMark} aria-hidden="true">
          {attempt.correct ? "✓" : "↺"}
        </span>
        <div>
          <p className={s.eyebrow}>{RATINGS[attempt.rating]}</p>
          <h2 id="feedback-title" tabIndex={-1} ref={heading}>
            {attempt.correct
              ? "잘 꺼냈어요, 이 생각!"
              : "괜찮아요. 함께 다시 풀어봐요."}
          </h2>
          <p className={s.feedbackNote}>
            {attempt.correct
              ? "오늘의 풀이를 기억 기록에 남겼어요."
              : "다음 미션에서 새 문제로 다시 만날 거예요."}
          </p>
        </div>
      </div>
      <div className={s.reviewQuestion}>
        <p className={s.eyebrow}>{conceptTitle(problem.conceptId)}</p>
        {problem.equation ? (
          <MathText text={problem.equation} />
        ) : (
          <ProblemContent content={problem.prompt} />
        )}
      </div>
      <div className={s.answerResult}>
        <div>
          <span className={s.resultLabel}>정답</span>
          <div className={s.answerValue}>
            {problem.answerText ? (
              <MathText text={problem.answerText} />
            ) : (
              <>
                {problem.answer}
                {problem.answerUnit ? ` ${problem.answerUnit}` : ""}
              </>
            )}
          </div>
        </div>
        <div className={s.myAnswer}>
          <span className={s.resultLabel}>내 답</span>
          <span>{attempt.submittedAnswer || "아직 모름"}</span>
        </div>
      </div>
      <div className={s.solution}>
        <h3>이렇게 생각해요</h3>
        <ol>
          {problem.solution.map((step, index) => (
            <li key={index}>
              <span className={s.stepNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <MathText text={step} as="div" />
            </li>
          ))}
        </ol>
      </div>
      <div className={s.feedbackFoot}>
        <span className={s.small}>
          {attempt.elapsedSeconds}초 ·{" "}
          {attempt.usedHint ? "힌트 사용" : "힌트 없이 도전"}
        </span>
        <button type="button" className={s.primary} onClick={onNext}>
          {last ? "오늘의 결과 보기" : "다음 문제"} →
        </button>
      </div>
    </section>
  );
}

export function Complete({
  mission,
  today,
  onHome,
}: {
  mission: Mission;
  today: string;
  onHome: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const correct = mission.attempts.filter((attempt) => attempt.correct).length;
  const independent = mission.attempts.filter(
    (attempt) => attempt.correct && !attempt.usedHint,
  ).length;
  const reviewConcepts = CONCEPTS.filter((concept) =>
    mission.attempts.some(
      (attempt) => attempt.conceptId === concept.id && !attempt.correct,
    ),
  );
  const attemptsByProblem = new Map(
    mission.attempts.map((attempt) => [attempt.problemId, attempt]),
  );
  return (
    <section className={s.complete} aria-labelledby="complete-title">
      <div className={s.completeMark} aria-hidden="true">
        ✓
      </div>
      <p className={s.eyebrow}>TODAY, A LITTLE STRONGER</p>
      <h1 id="complete-title" ref={heading} tabIndex={-1}>
        오늘의 기억을 쌓았어요.
      </h1>
      <p className={s.completeNote}>
        완벽하지 않아도 좋아요.
        <br />
        다시 꺼낸 생각이 내일의 실력이 됩니다.
      </p>
      <div className={s.resultStats}>
        <div>
          <b>
            {correct}
            <small> / {mission.problems.length}</small>
          </b>
          <span>정답</span>
        </div>
        <div>
          <b>{independent}</b>
          <span>힌트 없이 해결</span>
        </div>
        <div>
          <b>
            {mission.problems.length
              ? Math.round((correct / mission.problems.length) * 100)
              : 0}
            <small>%</small>
          </b>
          <span>정확도</span>
        </div>
      </div>
      <div className={s.journey}>
        <p className={s.journeyTitle}>오늘의 도전, 하나씩</p>
        <ol className={s.outcomes} aria-label="문제별 풀이 결과">
          {mission.problems.map((problem, index) => {
            const attempt = attemptsByProblem.get(problem.id);
            const label = attempt
              ? attempt.correct
                ? "정답"
                : "다시 익히기"
              : "풀이 전";
            return (
              <li
                key={problem.id}
                className={
                  attempt?.correct ? s.correctOutcome : s.reviewOutcome
                }
                aria-label={`${index + 1}번 ${conceptTitle(problem.conceptId)}: ${label}`}
              >
                <span aria-hidden="true">
                  {attempt?.correct ? "✓" : attempt ? "↺" : "·"}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={s.small}>
          ✓ 기억해 낸 문제 <span aria-hidden="true">·</span> ↺ 다시 만나볼 문제
        </p>
      </div>
      {reviewConcepts.length ? (
        <div className={s.nextReview}>
          <h2>다음에 다시 만나볼 개념</h2>
          <p>{reviewConcepts.map((concept) => concept.title).join(" · ")}</p>
        </div>
      ) : null}
      <button type="button" onClick={onHome} className={s.primary}>
        나의 기억 지도 보기 →
      </button>
      <p className={s.nextMission}>
        다음 미션:{" "}
        {mission.date === today ? "내일" : "오늘 바로 시작할 수 있어요"} · 틀린
        개념은 다음 미션에 반영됩니다.
      </p>
    </section>
  );
}
