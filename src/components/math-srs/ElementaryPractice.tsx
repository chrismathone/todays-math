"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MathText } from "@/components/math/MathText";
import { BackButton } from "@/components/ui/BackLink";
import { ProblemContent } from "@/components/math/ProblemContent";
import {
  gradeCourseAnswer,
  validateCourseAnswer,
} from "@/lib/math-srs/elementary/answers";
import type {
  CourseAttempt,
  CourseProblem,
  CourseSection,
  CourseSession,
} from "@/lib/math-srs/elementary/types";
import { solutionForDisplay } from "@/lib/solutionSteps";
import { courseFigureFingerprint } from "@/lib/math-srs/elementary/figureFingerprint";
import s from "./elementary-practice.module.css";

interface ElementaryPracticeProps {
  session: CourseSession;
  section: CourseSection;
  onAttempt: (attempt: CourseAttempt) => boolean;
  onHint: (problemId: string) => boolean;
  onExit: () => void;
  onContinue: () => void;
}

export default function ElementaryPractice(props: ElementaryPracticeProps) {
  return <CourseRun key={props.session.id} {...props} />;
}

function CourseRun({
  session,
  section,
  onAttempt,
  onHint,
  onExit,
  onContinue,
}: ElementaryPracticeProps) {
  const [index, setIndex] = useState(() => {
    const unanswered = session.problems.findIndex(
      (problem) =>
        !session.attempts.some((attempt) => attempt.problemId === problem.id),
    );
    return unanswered < 0 ? session.problems.length : unanswered;
  });
  const problem = session.problems[index];

  if (!problem) {
    return (
      <CourseComplete
        session={session}
        section={section}
        onExit={onExit}
        onContinue={onContinue}
      />
    );
  }

  return (
    <div className={s.practice}>
      <header className={s.header}>
        <BackButton type="button" onClick={onExit}>
          학습 목록
        </BackButton>
        <span className={s.breadcrumb}>
          초{section.grade} · {section.semester}학기 · {section.chapterTitle}
        </span>
      </header>
      <div className={s.progressRow}>
        <span>
          {session.mode === "review" ? "다시 익히기" : "차근차근 배우기"}
        </span>
        <span>
          <strong>{index + 1}</strong> / {session.problems.length} 문제
        </span>
      </div>
      <progress
        className={s.progress}
        value={index}
        max={session.problems.length}
        aria-label="이번 학습 진행"
      />
      <CourseQuestion
        key={problem.id}
        problem={problem}
        section={section}
        hinted={session.hintedProblemIds?.includes(problem.id) ?? false}
        onAttempt={onAttempt}
        onHint={onHint}
        last={index === session.problems.length - 1}
        onNext={() => setIndex((current) => current + 1)}
      />
      <p className={s.footerNote}>
        종이와 펜으로 편하게 풀어요. 시간은 재지 않아요.
      </p>
    </div>
  );
}

type FigureState =
  | { status: "loading" | "error"; svg: null }
  | { status: "ready"; svg: string | null };

function useProblemFigure(problem: CourseProblem) {
  const [retry, setRetry] = useState(0);
  const [figure, setFigure] = useState<FigureState>(() => ({
    status: problem.figureSpec ? "loading" : "ready",
    svg: null,
  }));
  useEffect(() => {
    if (!problem.figureSpec) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      sectionId: problem.sectionId,
      seed: String(problem.seed),
      tier: problem.tier,
      spec: courseFigureFingerprint(problem.figureSpec),
    });
    async function loadFigure() {
      try {
        const response = await fetch(`/lab/math-srs/figure?${query}`, {
          signal: controller.signal,
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("image/svg+xml")
        ) {
          throw new Error("Figure unavailable");
        }
        const svg = await response.text();
        if (!svg.includes("<svg")) throw new Error("Figure unavailable");
        if (!controller.signal.aborted) setFigure({ status: "ready", svg });
      } catch {
        if (!controller.signal.aborted) {
          setFigure({ status: "error", svg: null });
        }
      }
    }
    void loadFigure();
    return () => controller.abort();
  }, [
    problem.figureSpec,
    problem.sectionId,
    problem.seed,
    problem.tier,
    retry,
  ]);
  return {
    ...figure,
    retry: () => {
      setFigure({ status: "loading", svg: null });
      setRetry((current) => current + 1);
    },
  };
}

function CourseQuestion({
  problem,
  section,
  hinted,
  onAttempt,
  onHint,
  onNext,
  last,
}: {
  problem: CourseProblem;
  section: CourseSection;
  hinted: boolean;
  onAttempt: ElementaryPracticeProps["onAttempt"];
  onHint: ElementaryPracticeProps["onHint"];
  onNext: () => void;
  last: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(hinted);
  const [usedHint, setUsedHint] = useState(hinted);
  const [attempt, setAttempt] = useState<CourseAttempt | null>(null);
  const [panel, setPanel] = useState<"problem" | "answer">("problem");
  const submitted = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const solutionHeading = useRef<HTMLHeadingElement>(null);
  const figure = useProblemFigure(problem);
  const selfCheck = problem.input.mode === "self-check";
  const ready = figure.status === "ready";

  useEffect(() => {
    if (
      panel === "problem" &&
      window.matchMedia?.("(max-width: 900px)").matches
    ) {
      questionHeading.current?.focus({ preventScroll: true });
      return;
    }
    if (attempt) heading.current?.focus({ preventScroll: true });
    else if (revealed && selfCheck) {
      solutionHeading.current?.focus({ preventScroll: true });
    } else if (ready) {
      if (selfCheck) questionHeading.current?.focus({ preventScroll: true });
      else input.current?.focus({ preventScroll: true });
    }
  }, [attempt, ready, revealed, selfCheck, panel]);

  function reveal() {
    if (!ready || submitted.current) return;
    if (!selfCheck && !usedHint) {
      if (!onHint(problem.id)) {
        setError("학습 기록을 저장하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setUsedHint(true);
    }
    setError("");
    setRevealed(true);
    setPanel("answer");
  }

  function record(correct: boolean, skipped = false) {
    if (submitted.current || !ready) return;
    submitted.current = true;
    const result: CourseAttempt = {
      problemId: problem.id,
      submittedAnswer: skipped ? "" : answer.trim(),
      correct,
      usedHint: usedHint || hinted,
      selfAssessed: selfCheck,
      answeredAt: new Date().toISOString(),
    };
    if (!onAttempt(result)) {
      submitted.current = false;
      setError("학습 기록을 저장하지 못했어요. 다시 시도해 주세요.");
      input.current?.focus({ preventScroll: true });
      return;
    }
    setAttempt(result);
    setPanel("answer");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (submitted.current || !ready || selfCheck) return;
    const validation = validateCourseAnswer(problem, answer);
    if (validation) {
      setError(validation);
      input.current?.focus({ preventScroll: true });
      return;
    }
    const correct = gradeCourseAnswer(problem, answer);
    if (correct === null) {
      setError("답의 형식을 확인해 주세요.");
      input.current?.focus({ preventScroll: true });
      return;
    }
    record(correct);
  }

  return (
    <section className={s.question} aria-labelledby="course-question-title">
      <div className={s.mobileSwitch} role="group" aria-label="학습 화면">
        <button
          type="button"
          aria-pressed={panel === "problem"}
          onClick={() => setPanel("problem")}
        >
          문제
        </button>
        <button
          type="button"
          aria-pressed={panel === "answer"}
          onClick={() => setPanel("answer")}
        >
          {attempt ? "결과 · 풀이" : revealed ? "답안 · 풀이" : "답안"}
        </button>
      </div>
      <div className={s.problemPane} data-active={panel === "problem"}>
        <div className={s.problemTitle}>
          <div className={s.problemHeading}>
            <span className={s.tier}>{problem.tier}</span>
            {selfCheck ? (
              <span className={s.selfCheckLabel}>직접 확인하는 문제</span>
            ) : null}
          </div>
          <h2 id="course-question-title" ref={questionHeading} tabIndex={-1}>
            {section.title}
          </h2>
        </div>
        <div
          className={s.problemScroll}
          tabIndex={0}
          role="region"
          aria-label="문제 내용"
        >
          <ProblemContent
            content={problem.content}
            figureSvg={figure.svg}
            className={s.problem}
            deferFigures={false}
          />
          {figure.status === "loading" ? (
            <p className={s.figureStatus} role="status">
              문제의 그림을 준비하고 있어요.
            </p>
          ) : figure.status === "error" ? (
            <div className={s.figureStatus} role="alert">
              <p>그림을 불러오지 못했어요. 그림을 확인한 뒤 풀어 주세요.</p>
              <button
                type="button"
                className={s.secondary}
                onClick={figure.retry}
              >
                그림 다시 불러오기
              </button>
            </div>
          ) : null}
        </div>
        <div className={s.mobileProblemAction}>
          <button
            type="button"
            className={s.primary}
            onClick={() => setPanel("answer")}
          >
            {attempt
              ? "결과와 풀이 보기"
              : selfCheck
                ? "풀이 마무리하기"
                : "답 입력하기"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div className={s.responsePane} data-active={panel === "answer"}>
        {!ready ? (
          <div className={s.mobileFigureNotice}>
            <p>
              {figure.status === "loading"
                ? "그림을 준비하고 있어요. 잠시만 기다려 주세요."
                : "그림을 다시 불러온 뒤 답을 확인할 수 있어요."}
            </p>
            {figure.status === "error" ? (
              <BackButton type="button" onClick={() => setPanel("problem")}>
                문제로 돌아가기
              </BackButton>
            ) : null}
          </div>
        ) : null}
        {attempt ? (
          <div className={s.feedback}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="풀이 결과 내용"
            >
              <p className={s.feedbackLabel}>
                {attempt.selfAssessed ? "나의 확인 결과" : "풀이 결과"}
              </p>
              <h3 ref={heading} tabIndex={-1}>
                {attempt.correct
                  ? attempt.usedHint
                    ? "풀이를 보고 확인했어요."
                    : attempt.selfAssessed
                      ? "스스로 풀이를 확인했어요."
                      : "정확하게 풀었어요"
                  : "괜찮아요, 풀이를 살펴봐요."}
              </h3>
              {attempt.submittedAnswer ? (
                <div className={s.submittedAnswer}>
                  <span>나의 답</span>
                  <MathText
                    text={attempt.submittedAnswer}
                    as="span"
                    className={s.submittedValue}
                  />
                </div>
              ) : null}
              <Solution problem={problem} />
            </div>
            <div className={s.paneAction}>
              <button type="button" className={s.primary} onClick={onNext}>
                {last ? "이번 학습 마치기" : "다음 문제"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : selfCheck ? (
          <div className={s.selfCheck}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="내 풀이 확인"
            >
              {!revealed ? (
                <>
                  <p className={s.feedbackLabel}>연습장에 차근차근</p>
                  <h3>나의 풀이를 남겨요.</h3>
                  <p className={s.paperHint}>
                    연습장에 답과 풀이를 적어 주세요. 다 풀고 나면 정답과
                    비교해요.
                  </p>
                  <label htmlFor="course-answer-note">
                    나의 답 또는 풀이 메모 <span>(선택)</span>
                  </label>
                  <textarea
                    id="course-answer-note"
                    className={s.noteInput}
                    value={answer}
                    onChange={(event) => {
                      setAnswer(event.target.value);
                      setError("");
                    }}
                    placeholder="연습장에 적었다면 비워 두어도 돼요."
                    maxLength={2000}
                    rows={3}
                    disabled={!ready}
                  />
                </>
              ) : (
                <>
                  <p className={s.feedbackLabel}>직접 확인하기</p>
                  <h3 ref={solutionHeading} tabIndex={-1}>
                    연습장의 풀이와 비교해 보세요.
                  </h3>
                  <Solution problem={problem} />
                  <p className={s.paperHint}>
                    답과 풀이를 직접 확인하고 골라 주세요. 자동으로 채점하지
                    않아요.
                  </p>
                </>
              )}
              {error ? (
                <p className={s.error} role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className={s.paneAction}>
              {!revealed ? (
                <button
                  type="button"
                  className={s.primary}
                  disabled={!ready}
                  onClick={reveal}
                >
                  다 풀었어요 · 정답 확인
                </button>
              ) : (
                <div className={s.selfCheckActions}>
                  <button
                    type="button"
                    className={s.primary}
                    disabled={!ready}
                    onClick={() => record(true)}
                  >
                    맞았어요
                  </button>
                  <button
                    type="button"
                    className={s.secondary}
                    disabled={!ready}
                    onClick={() => record(false)}
                  >
                    다시 연습할래요
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={s.automatic}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="답안 작성"
            >
              <p className={s.feedbackLabel}>생각한 답을 적어 주세요</p>
              <h3 className={s.answerTitle}>어떤 답이 나왔나요?</h3>
              <form
                id="course-answer-form"
                className={s.answerForm}
                onSubmit={submit}
                noValidate
              >
                <label htmlFor="course-answer">{problem.input.label}</label>
                <input
                  id="course-answer"
                  ref={input}
                  className={s.answerInput}
                  type="text"
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setError("");
                  }}
                  placeholder={problem.input.placeholder}
                  aria-invalid={Boolean(error)}
                  aria-describedby="course-answer-help"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  maxLength={200}
                  disabled={!ready}
                />
                <div className={s.inputMessage}>
                  <p
                    id="course-answer-help"
                    className={error ? s.error : s.help}
                    role={error ? "alert" : undefined}
                  >
                    {error || problem.input.help}
                  </p>
                </div>
              </form>
              <div className={s.questionActions}>
                <button
                  type="button"
                  className={s.secondary}
                  onClick={reveal}
                  disabled={!ready || revealed}
                  aria-expanded={revealed}
                  aria-controls="course-solution"
                >
                  {revealed ? "풀이를 확인했어요" : "풀이 보기"}
                </button>
                <button
                  type="button"
                  className={s.textButton}
                  disabled={!ready}
                  onClick={() => record(false, true)}
                >
                  아직 모르겠어요
                </button>
              </div>
              {revealed ? (
                <div id="course-solution" className={s.revealedSolution}>
                  <p className={s.help}>풀이를 참고한 문제로 기록해요.</p>
                  <Solution problem={problem} />
                </div>
              ) : null}
            </div>
            <div className={s.paneAction}>
              <button
                className={s.primary}
                type="submit"
                form="course-answer-form"
                disabled={!ready}
              >
                정답 확인 <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Solution({ problem }: { problem: CourseProblem }) {
  return (
    <div className={s.solution}>
      <div className={s.correctAnswer}>
        <span>정답</span>
        <MathText text={problem.answer} as="div" />
      </div>
      {problem.solution.trim() ? (
        <MathText
          text={solutionForDisplay(problem.solution) ?? ""}
          as="div"
          className={s.explanation}
        />
      ) : null}
    </div>
  );
}

function CourseComplete({
  session,
  section,
  onExit,
  onContinue,
}: Pick<
  ElementaryPracticeProps,
  "session" | "section" | "onExit" | "onContinue"
>) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  const automatic = session.attempts.filter((attempt) => !attempt.selfAssessed);
  const selfChecked = session.attempts.filter(
    (attempt) => attempt.selfAssessed,
  );
  const reviewCount = session.attempts.filter(
    (attempt) => !attempt.correct || attempt.usedHint,
  ).length;

  return (
    <section className={`${s.practice} ${s.complete}`}>
      <div
        className={s.completeBody}
        tabIndex={0}
        role="region"
        aria-label="이번 학습 결과"
      >
        <p className={s.completionLabel}>한 걸음 완료</p>
        <h2 ref={heading} tabIndex={-1}>
          차근차근, 오늘도 배웠어요.
        </h2>
        <p className={s.completeSection}>
          초{section.grade} · {section.semester}학기 · {section.title}
        </p>
        <div className={s.results}>
          <div>
            <strong>{session.attempts.length}</strong>
            <span>풀어 본 문제</span>
          </div>
          {automatic.length ? (
            <div>
              <strong>
                {automatic.filter((attempt) => attempt.correct).length}
                <small> / {automatic.length}</small>
              </strong>
              <span>자동 채점 정답</span>
            </div>
          ) : null}
          {selfChecked.length ? (
            <div>
              <strong>{selfChecked.length}</strong>
              <span>직접 확인한 문제</span>
            </div>
          ) : null}
        </div>
        <ol className={s.outcomes} aria-label="문제별 학습 결과">
          {session.problems.map((problem, index) => {
            const attempt = session.attempts.find(
              (item) => item.problemId === problem.id,
            );
            const label = !attempt
              ? "아직 풀지 않음"
              : !attempt.correct
                ? "다시 연습"
                : attempt.usedHint
                  ? "풀이 참고"
                  : attempt.selfAssessed
                    ? "스스로 확인"
                    : "정답";
            return (
              <li
                key={problem.id}
                data-review={!attempt?.correct || attempt.usedHint}
                aria-label={`${index + 1}번: ${label}`}
              >
                <strong>{index + 1}</strong>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
        <p className={s.completeMessage}>
          {reviewCount
            ? `${reviewCount}문제에서 풀이를 더 익힐 수 있어요. 다음 복습에서 다시 도전해요.`
            : "배운 내용을 다음 복습에서 다시 꺼내 봐요."}
        </p>
      </div>
      <div className={s.completeActions}>
        <button type="button" className={s.primary} onClick={onContinue}>
          다음 학습으로 <span aria-hidden="true">→</span>
        </button>
        <button type="button" className={s.secondary} onClick={onExit}>
          학습 목록으로
        </button>
      </div>
    </section>
  );
}
