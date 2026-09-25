"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LearnTopBar } from "@/components/learn/LearnTopBar";
import type { Submitted } from "@/components/learn/learnApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDayWithWeekday } from "@/components/unified/conceptFormat";
import type {
  MathSrsAttemptInput,
  MathSrsPublicMission,
  MathSrsPublicProblem,
  MathSrsState,
} from "@/contracts/mathSrs.contract";
import { kstDateOf } from "@/lib/kstDate";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import { parseSubmittedNumber } from "@/lib/math-srs/sharedAnswers";
import type { Rating } from "@/lib/math-srs/types";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import {
  fetchMathSrs,
  revealMathSrsHint,
  startMathSrs,
  submitMathSrsAttempt,
} from "./mathSrsApi";
import { SrsMemoryGrid } from "./SrsMemoryGrid";
import s from "./authenticated.module.css";

const ProblemContent = dynamic(() =>
  import("@/components/math/ProblemContent").then((mod) => mod.ProblemContent),
);
const MathText = dynamic(() =>
  import("@/components/math/MathText").then((mod) => mod.MathText),
);
type Failure = { status: number; message: string };

export function StudentMathSrs() {
  const router = useRouter();
  const [state, setState] = useState<MathSrsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Failure | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  // A lost response may already have been saved. Retry the exact same submission.
  const lastSubmission = useRef<MathSrsAttemptInput | null>(null);
  const alive = useRef(true);
  const [practicing, setPracticing] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    void fetchMathSrs().then((result) => {
      if (!current) return;
      setLoading(false);
      if (result.ok) {
        setState(result.data);
        setError(null);
      } else if (result.status === 401) router.replace("/learn/login");
      else if (
        result.status === 403 &&
        result.message === STUDENT_MUST_CHANGE_MESSAGE
      )
        router.replace("/learn/password");
      else setError(result);
    });
    return () => {
      current = false;
    };
  }, [reload, router]);

  async function mutate(
    action: () => Promise<Submitted<MathSrsState>>,
    after?: (data: MathSrsState) => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (!alive.current) return;
      if (result.ok) {
        setState(result.data);
        after?.(result.data);
      } else if (result.status === 401) router.replace("/learn/login");
      else if (
        result.status === 403 &&
        result.message === STUDENT_MUST_CHANGE_MESSAGE
      )
        router.replace("/learn/password");
      else setError(result);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const mission = state?.mission;
  const missionInProgress = !!mission && !mission.completedAt;
  const finishedToday =
    !!mission?.completedAt && mission.date === kstDateOf(new Date());
  const feedbackProblem = feedbackId
    ? mission?.problems.find((problem) => problem.id === feedbackId)
    : null;
  const currentProblem = mission?.problems[mission.attempts.length];
  const progressCount =
    missionInProgress || finishedToday ? mission.attempts.length : 0;
  const progressTitle =
    missionInProgress && mission.date !== kstDateOf(new Date())
      ? "진행 중인 복습"
      : "오늘의 학습";
  const nextConcept = missionInProgress
    ? CONCEPTS.find((concept) => concept.id === currentProblem?.conceptId)
        ?.title
    : null;
  const resetLoad = () => {
    lastSubmission.current = null;
    setLoading(true);
    setFeedbackId(null);
    setReload((value) => value + 1);
  };

  return (
    <div className={s.student}>
      <LearnTopBar student={state?.student ?? null} />
      <main className={`${s.body} ${practicing ? s.practiceBody : ""}`}>
        <nav className={s.nav} aria-label="학생 학습 메뉴">
          <Link href="/learn">개념 강의</Link>
          <span aria-current="page">매일 수학 복습</span>
        </nav>
        {practicing ? <h1 className={s.srOnly}>오늘의 수학 복습</h1> : null}
        {!practicing ? (
          <header className={s.pageHeading}>
            <p className={s.eyebrow}>하루 한 걸음 · 중학교 1학년</p>
            <h1>매일 쌓이는 수학</h1>
            <p className={s.muted}>
              일차방정식을 매일 조금씩 복습하고, 풀이 기록에 맞춰 이어 가요.
            </p>
          </header>
        ) : null}
        {loading ? (
          <p className={s.loading} role="status">
            학습 기록을 불러오는 중…
          </p>
        ) : null}
        {error ? (
          <div role="alert" className={s.error}>
            <p>
              {error.status === 503
                ? "학습 기록 저장 기능을 준비하고 있습니다. 선생님께 알려 주세요. 준비가 끝나면 이곳에서 학습할 수 있어요."
                : error.message}
            </p>
            {error.status === 409 ? (
              <p>다른 화면에서 학습한 기록을 다시 불러온 뒤 이어가세요.</p>
            ) : null}
            <Button
              variant="secondary"
              className={s.secondaryButton}
              onClick={resetLoad}
              disabled={busy || loading}
            >
              다시 불러오기
            </Button>
          </div>
        ) : null}
        {!loading && state && error?.status !== 503 ? (
          <>
            {practicing && mission ? (
              <>
                <div className={s.progress}>
                  <span>
                    오늘의 복습{" "}
                    <small>{formatDayWithWeekday(mission.date)}</small>
                  </span>
                  <progress
                    aria-label="미션 진행"
                    value={mission.attempts.length}
                    max={mission.problems.length}
                  />
                  <span>
                    {mission.attempts.length}/{mission.problems.length}
                  </span>
                </div>
                {feedbackProblem?.feedback ? (
                  <Feedback
                    problem={feedbackProblem}
                    mission={mission}
                    onNext={() => setFeedbackId(null)}
                  />
                ) : !mission.completedAt && currentProblem ? (
                  <Question
                    key={`${mission.id}:${currentProblem.id}`}
                    problem={currentProblem}
                    busy={busy || error?.status === 409}
                    onHint={() =>
                      void mutate(() =>
                        revealMathSrsHint({
                          missionId: mission.id,
                          problemId: currentProblem.id,
                        }),
                      )
                    }
                    onAnswer={(submittedAnswer, elapsedSeconds, rating) =>
                      void mutate(
                        () => {
                          const previous = lastSubmission.current;
                          const payload =
                            previous &&
                            previous.missionId === mission.id &&
                            previous.problemId === currentProblem.id &&
                            previous.submittedAnswer === submittedAnswer &&
                            previous.rating === rating
                              ? previous
                              : {
                                  missionId: mission.id,
                                  problemId: currentProblem.id,
                                  submittedAnswer,
                                  elapsedSeconds,
                                  rating,
                                };
                          lastSubmission.current = payload;
                          return submitMathSrsAttempt(payload);
                        },
                        (next) => {
                          lastSubmission.current = null;
                          if (
                            next.mission?.id === mission.id &&
                            next.mission.problems.find(
                              (problem) => problem.id === currentProblem.id,
                            )?.feedback
                          )
                            setFeedbackId(currentProblem.id);
                        },
                      )
                    }
                  />
                ) : (
                  <Result
                    mission={mission}
                    onHome={() => setPracticing(false)}
                  />
                )}
                <Button
                  variant="ghost"
                  className={s.quietButton}
                  onClick={() => {
                    setPracticing(false);
                    setFeedbackId(null);
                  }}
                  disabled={busy}
                >
                  학습 현황으로
                </Button>
              </>
            ) : (
              <div className={s.homeGrid}>
                <section
                  className={`${s.card} ${s.hero}`}
                  aria-labelledby="mission-heading"
                >
                  <div className={s.heroCopy}>
                    <p className={s.eyebrow}>
                      {finishedToday
                        ? "오늘의 복습 완료"
                        : missionInProgress
                          ? "이어서 학습"
                          : "오늘의 추천 복습"}
                    </p>
                    <h2 id="mission-heading">
                      {finishedToday
                        ? "오늘의 복습을 마쳤어요."
                        : missionInProgress
                          ? "풀던 복습을 이어 가요."
                          : "일차방정식을 복습해요."}
                    </h2>
                    <p className={s.heroSection}>중1 · 일차방정식</p>
                    <p className={s.heroReason}>
                      {finishedToday
                        ? "오늘 푼 문제를 돌아보고 다음 복습을 준비해요."
                        : missionInProgress
                          ? `${12 - mission.attempts.length}문제가 남았어요. 이어서 풀어 보세요.`
                          : "워밍업부터 다시 도전하는 문제까지, 풀이 기록에 맞춰 복습해요."}
                    </p>
                    {finishedToday ? (
                      <>
                        <p>오늘의 미션을 마쳤어요. 내일 새 문제로 만나요.</p>
                        <Button onClick={() => setPracticing(true)}>
                          오늘의 결과 보기
                        </Button>
                      </>
                    ) : (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void mutate(startMathSrs, () => {
                            setPracticing(true);
                            setFeedbackId(null);
                          })
                        }
                      >
                        {busy
                          ? "복습을 준비하는 중…"
                          : mission && !mission.completedAt
                            ? `이어서 학습하기 · ${mission.attempts.length}/12`
                            : "오늘의 복습 시작"}
                      </Button>
                    )}
                    <p className={s.heroNote}>한 번에 12문제 · 약 10~15분</p>
                  </div>
                </section>
                <aside className={s.todaySummary} aria-label={progressTitle}>
                  <h2>{progressTitle}</h2>
                  <p className={s.todayCount}>
                    <strong>{progressCount}</strong> / 12문제
                  </p>
                  <progress
                    aria-label="복습 진행"
                    value={progressCount}
                    max={12}
                  />
                  <dl>
                    <div>
                      <dt>남은 문제</dt>
                      <dd>{12 - progressCount}문제</dd>
                    </div>
                    <div>
                      <dt>다음 개념</dt>
                      <dd>
                        {nextConcept ??
                          (finishedToday
                            ? "내일 다시 만나요"
                            : "시작하면 안내")}
                      </dd>
                    </div>
                  </dl>
                </aside>
                <section
                  className={`${s.card} ${s.memorySection}`}
                  aria-labelledby="my-memory-heading"
                >
                  <p className={s.eyebrow}>개념별 복습 현황</p>
                  <h2 id="my-memory-heading">나의 개념 기억</h2>
                  <p className={s.muted}>
                    정답·힌트·지난 학습 시간을 바탕으로 추정한 값이에요. 처음
                    푸는 개념은 측정 전으로 표시해요.
                  </p>
                  <SrsMemoryGrid memories={state.memories} />
                </section>
                <section
                  className={s.card}
                  aria-labelledby="my-progress-heading"
                >
                  <p className={s.eyebrow}>수업과 연결하기</p>
                  <h2 id="my-progress-heading">수업과 함께 복습하기</h2>
                  {state.currentProgress ? (
                    <p>
                      <strong>{state.currentProgress.section}</strong>
                      <br />
                      <span className={s.muted}>
                        {state.currentProgress.source === "individual"
                          ? "개인 진도"
                          : "반 진도"}{" "}
                        ·{" "}
                        {formatDayWithWeekday(state.currentProgress.recordedAt)}
                      </span>
                    </p>
                  ) : (
                    <p className={s.muted}>아직 등록된 수업 진도가 없어요.</p>
                  )}
                  {state.lectures.length ? (
                    <ul className={s.links}>
                      {state.lectures.map((lecture) => (
                        <li key={lecture.id}>
                          <Link
                            href={`/learn/watch/${encodeURIComponent(lecture.id)}`}
                          >
                            <strong>{lecture.title}</strong>
                            <span className={s.muted}>
                              {lecture.section} · 개념 강의 보기 →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={s.muted}>
                      열린 개념 강의는 강의 목록에서 확인할 수 있어요.
                    </p>
                  )}
                </section>
                {state.recentMissions.length ? (
                  <section className={s.card}>
                    <p className={s.eyebrow}>나의 학습 기록</p>
                    <h2>최근 학습</h2>
                    <ul className={s.history}>
                      {state.recentMissions.slice(0, 7).map((item) => (
                        <li key={item.id}>
                          <span>{formatDayWithWeekday(item.date)}</span>
                          <span>
                            {item.completedAt
                              ? "완료"
                              : `${item.answered}/${item.total} 진행`}{" "}
                            · {item.correct}문제 정답
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function Question({
  problem,
  busy,
  onHint,
  onAnswer,
}: {
  problem: MathSrsPublicProblem;
  busy: boolean;
  onHint: () => void;
  onAnswer: (answer: string, elapsed: number, rating: Rating) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [rating, setRating] = useState<Rating>("good");
  const [validation, setValidation] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const form = useRef<HTMLFormElement>(null);
  function focusAnswer() {
    form.current
      ?.querySelector<HTMLInputElement>("#srs-answer")
      ?.focus({ preventScroll: true });
  }
  useEffect(() => {
    focusAnswer();
  }, [problem.id]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (parseSubmittedNumber(answer) === null) {
      setValidation(
        answer.trim()
          ? "숫자 또는 분수로 입력해 주세요. 분모는 0이 될 수 없어요."
          : "답을 먼저 입력해 주세요.",
      );
      focusAnswer();
      return;
    }
    setValidation(null);
    onAnswer(
      answer.trim(),
      Math.min(86_400, Math.max(0, (Date.now() - startedAt) / 1000)),
      rating,
    );
  }
  return (
    <section
      className={`${s.card} ${s.questionCard}`}
      aria-label="현재 문제"
      aria-busy={busy}
    >
      <p className={s.eyebrow}>
        {CONCEPTS.find((concept) => concept.id === problem.conceptId)?.title}
        {problem.source ? ` · ${problem.source.tier}` : ""}
      </p>
      <div className={s.question}>
        <ProblemContent content={problem.prompt} />
        {problem.equation ? (
          <MathText text={problem.equation} as="div" className={s.equation} />
        ) : null}
      </div>
      <form ref={form} onSubmit={submit}>
        <label className={s.label} htmlFor="srs-answer">
          나의 답
          {problem.answerUnit ? (
            <span className={s.answerUnit}> ({problem.answerUnit})</span>
          ) : null}
        </label>
        <div className={s.answer}>
          <Input
            id="srs-answer"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setValidation(null);
            }}
            disabled={busy}
            placeholder="예: -3, 1/2"
            maxLength={200}
            autoComplete="off"
            enterKeyHint="done"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={!!validation}
            aria-describedby="srs-answer-help"
          />
        </div>
        <p
          id="srs-answer-help"
          className={`${s.answerHelp} ${validation ? s.answerError : ""}`}
        >
          {validation ? (
            <span role="alert">{validation}</span>
          ) : (
            "음수와 분수도 입력할 수 있어요."
          )}
        </p>
        <fieldset className={s.ratings} disabled={busy}>
          <legend>어떻게 풀었나요?</legend>
          <div>
            {(
              [
                ["hard", "어려웠어요"],
                ["good", "풀 만했어요"],
                ["easy", "쉬웠어요"],
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="srs-rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className={s.actions}>
          <Button type="submit" className={s.answerSubmit} disabled={busy}>
            {busy ? "저장하는 중…" : "정답 확인"}
          </Button>
          <Button
            variant="secondary"
            className={s.secondaryButton}
            disabled={busy || problem.hint !== null}
            onClick={onHint}
          >
            {problem.hint !== null ? "힌트를 확인했어요" : "힌트 보기"}
          </Button>
        </div>
        <Button
          variant="ghost"
          className={s.quietButton}
          disabled={busy}
          onClick={() =>
            onAnswer(
              "",
              Math.min(86_400, Math.max(0, (Date.now() - startedAt) / 1000)),
              "again",
            )
          }
        >
          아직 모르겠어요
        </Button>
      </form>
      {problem.hint !== null ? (
        <aside className={s.hint} aria-label="힌트">
          <strong>한 걸음만 도와줄게요</strong>
          <MathText text={problem.hint} as="div" />
        </aside>
      ) : null}
    </section>
  );
}

function Feedback({
  problem,
  mission,
  onNext,
}: {
  problem: MathSrsPublicProblem;
  mission: MathSrsPublicMission;
  onNext: () => void;
}) {
  const feedbackSection = useRef<HTMLElement>(null);
  useEffect(() => {
    feedbackSection.current
      ?.querySelector("button")
      ?.focus({ preventScroll: true });
  }, [problem.id]);
  const attempt = mission.attempts.find(
    (item) => item.problemId === problem.id,
  );
  const feedback = problem.feedback!;
  return (
    <section
      ref={feedbackSection}
      className={`${s.card} ${s.feedbackCard}`}
      aria-labelledby="answer-feedback-heading"
    >
      <p className={s.eyebrow}>한 문제, 한 걸음</p>
      <h2
        id="answer-feedback-heading"
        tabIndex={-1}
        className={attempt?.correct ? s.correct : s.review}
      >
        {attempt?.correct ? "잘 풀었어요!" : "풀이를 보며 다시 생각해 봐요."}
      </h2>
      <div className={s.answerFeedback}>
        <div>
          <span>나의 답</span>
          <strong>{attempt?.submittedAnswer || "아직 모르겠어요"}</strong>
        </div>
        <div>
          <span>정답</span>
          <div className={s.exactAnswer}>
            {feedback.answerText ? (
              <MathText text={feedback.answerText} />
            ) : (
              `${feedback.answer}${problem.answerUnit ?? ""}`
            )}
          </div>
        </div>
      </div>
      {attempt?.usedHint ? (
        <p className={s.muted}>힌트를 참고한 풀이로 기록했어요.</p>
      ) : null}
      <div className={s.solution}>
        <h3>이렇게 풀어요</h3>
        <ol>
          {feedback.solution.map((line, index) => (
            <li key={index}>
              <MathText text={line} as="div" />
            </li>
          ))}
        </ol>
      </div>
      <Button onClick={onNext} aria-describedby="answer-feedback-heading">
        {mission.completedAt ? "미션 결과 보기" : "다음 문제"}
      </Button>
    </section>
  );
}

function Result({
  mission,
  onHome,
}: {
  mission: MathSrsPublicMission;
  onHome: () => void;
}) {
  const correct = mission.attempts.filter((attempt) => attempt.correct).length;
  const reviewed = [
    ...new Set(mission.attempts.map((attempt) => attempt.conceptId)),
  ].length;
  const resultSection = useRef<HTMLElement>(null);
  useEffect(() => {
    resultSection.current
      ?.querySelector("button")
      ?.focus({ preventScroll: true });
  }, []);
  return (
    <section
      ref={resultSection}
      className={`${s.card} ${s.resultCard}`}
      aria-labelledby="mission-result-heading"
    >
      <span className={s.resultMark} aria-hidden="true">
        ✓
      </span>
      <p className={s.eyebrow}>{formatDayWithWeekday(mission.date)}</p>
      <h2 tabIndex={-1} id="mission-result-heading">
        미션을 마쳤어요
      </h2>
      <p>
        <strong className={s.stat}>
          {correct} / {mission.problems.length}
        </strong>
        문제를 맞혔어요.
      </p>
      <p className={s.resultSummary}>{reviewed}개 개념을 다시 꺼내 봤어요.</p>
      <p className={s.muted}>
        어려웠던 개념은 다음 복습에 다시 반영해요. 학습 기록은 계정에
        저장됐어요.
      </p>
      <Button onClick={onHome} aria-describedby="mission-result-heading">
        학습 현황 보기
      </Button>
    </section>
  );
}
