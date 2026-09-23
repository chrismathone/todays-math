"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LearnTopBar } from "@/components/learn/LearnTopBar";
import type { Submitted } from "@/components/learn/learnApi";
import type { CourseStudentState } from "@/contracts/mathSrsCourse.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import CoursePlanForm from "./CoursePlanForm";
import {
  answerCourse,
  getCourseState,
  hintCourse,
  saveOwnCoursePlan,
  startCourse,
} from "./courseApi";
import s from "./student-course.module.css";

const StudentCoursePractice = dynamic(() => import("./StudentCoursePractice"), {
  loading: () => <p role="status">학습 화면을 준비하고 있어요…</p>,
});
type Failure = { status: number; message: string };
type Action = {
  run: () => Promise<Submitted<CourseStudentState>>;
  after?: (data: CourseStudentState) => void;
};

export default function StudentCourseSrs() {
  const router = useRouter();
  const [state, setState] = useState<CourseStudentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [settings, setSettings] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const [retryAction, setRetryAction] = useState<Action | null>(null);

  const authFailure = useCallback(
    (status: number) => {
      router.replace(status === 401 ? "/learn/login" : "/learn/password");
    },
    [router],
  );
  const handleFailure = useCallback(
    (failure: Failure) => {
      if (failure.status === 401) authFailure(401);
      else if (
        failure.status === 403 &&
        failure.message === STUDENT_MUST_CHANGE_MESSAGE
      )
        authFailure(403);
      else setError(failure);
    },
    [authFailure],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    void getCourseState().then((result) => {
      if (!current) return;
      setLoading(false);
      if (result.ok) {
        setState(result.data);
        setError(null);
      } else handleFailure(result);
    });
    return () => {
      current = false;
    };
  }, [reload, handleFailure]);

  async function mutate(action: Action) {
    if (pending.current) return;
    pending.current = true;
    setRetryAction(action);
    setBusy(true);
    setError(null);
    try {
      const result = await action.run();
      if (!alive.current) return;
      if (result.ok) {
        setRetryAction(null);
        setState(result.data);
        action.after?.(result.data);
      } else {
        if (result.status === 400 || result.status === 409)
          setRetryAction(null);
        handleFailure(result);
      }
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function loadAgain() {
    if (pending.current) return;
    setRetryAction(null);
    setError(null);
    setLoading(true);
    setPracticing(false);
    setFeedbackId(null);
    setReload((value) => value + 1);
  }

  function start() {
    void mutate({
      run: startCourse,
      after: (data) => {
        setFeedbackId(null);
        setPracticing(!!data.session);
      },
    });
  }

  const blocked = busy || loading || (!!error && error.status !== 400);
  const practice = practicing && state?.session;
  const summary = state?.summary;
  const recommendation = summary?.recommendation;
  const section = recommendation
    ? getCourseSection(recommendation.sectionId)
    : summary?.currentSectionId
      ? getCourseSection(summary.currentSectionId)
      : undefined;
  const goalReached = !!summary && summary.todayAnswered >= summary.todayGoal;
  const done = summary?.status === "done" || goalReached;
  const paused = summary?.status === "paused" || state?.plan?.enabled === false;
  const needsSetup = !!state && (!state.plan || summary?.status === "setup");
  const title = needsSetup
    ? "시작 진도를 한 번 골라 주세요."
    : paused
      ? "지금은 학습을 쉬고 있어요."
      : goalReached
        ? "오늘의 목표를 모두 채웠어요."
        : done
          ? "오늘은 여기까지, 기억할 시간을 가져요."
          : summary?.status === "complete"
            ? "새 학습을 모두 마쳤어요."
            : recommendation?.mode === "resume"
              ? "풀던 학습을 이어 가요."
              : recommendation?.mode === "review"
                ? "잊기 전에, 한 번 더."
                : recommendation
                  ? "오늘도 한 걸음 배워요."
                  : "지금은 예정된 학습이 없어요.";

  return (
    <div className={`${s.page} ${practice ? s.practicePage : ""}`}>
      <LearnTopBar student={state?.student ?? null} />
      <main className={practice ? s.practiceMain : s.main}>
        {practice ? (
          <h1 className={s.srOnly}>초등 수학 자동 복습</h1>
        ) : (
          <>
            <nav className={s.nav} aria-label="학생 학습 메뉴">
              <Link href="/learn">개념 강의</Link>
              <span aria-current="page">초등 수학 자동 복습</span>
              <Link href="/learn/math-srs/algebra">중등 일차방정식 연습</Link>
            </nav>
            <header className={s.heading}>
              <p>하루 한 걸음 · 초등 3~6학년</p>
              <h1>매일 쌓이는 수학</h1>
              <span>
                시작 진도를 정하면, 필요한 복습과 새 학습을 차례로 안내해요.
              </span>
            </header>
          </>
        )}
        {loading ? (
          <p className={s.notice} role="status">
            내 학습 기록을 불러오고 있어요…
          </p>
        ) : null}
        {error ? (
          <div className={s.error} role="alert">
            <p>
              {error.status === 409
                ? "다른 화면에서 학습 기록이 바뀌었어요. 최신 기록을 불러온 뒤 이어 가 주세요."
                : error.status === 503
                  ? "학습 저장소가 아직 준비되지 않았어요. 잠시 후 다시 시도하고, 계속되면 선생님께 알려 주세요."
                  : error.message}
            </p>
            <div className={s.actions}>
              {retryAction && error.status !== 409 && error.status !== 400 ? (
                <button
                  className={s.secondary}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (retryAction) void mutate(retryAction);
                  }}
                >
                  같은 요청 다시 시도
                </button>
              ) : null}
              <button
                className={s.secondary}
                type="button"
                disabled={busy}
                onClick={loadAgain}
              >
                최신 기록 불러오기
              </button>
            </div>
          </div>
        ) : null}
        {practice && state ? (
          <div className={s.practiceStage}>
            <StudentCoursePractice
              key={practice.id}
              session={practice}
              summary={state.summary}
              feedbackId={feedbackId}
              busy={blocked}
              onAuthFailure={authFailure}
              onExit={() => {
                setPracticing(false);
                setFeedbackId(null);
              }}
              onContinue={start}
              onNext={() => setFeedbackId(null)}
              onHint={(problemId) => {
                void mutate({
                  run: () => hintCourse({ sessionId: practice.id, problemId }),
                });
              }}
              onAnswer={(input) => {
                void mutate({
                  run: () => answerCourse(input),
                  after: () => setFeedbackId(input.problemId),
                });
              }}
            />
          </div>
        ) : state && !loading ? (
          <>
            <div className={s.overview}>
              <section
                className={s.hero}
                aria-labelledby="course-recommendation"
              >
                <p className={s.eyebrow}>
                  {paused
                    ? "잠시 쉬는 중"
                    : done
                      ? goalReached
                        ? "오늘의 목표 완료"
                        : "오늘의 추천 학습 완료"
                      : recommendation?.mode === "resume"
                        ? "이어서 학습"
                        : recommendation?.mode === "review"
                          ? "오늘의 추천 복습"
                          : "오늘의 추천 학습"}
                </p>
                <h2 id="course-recommendation">{title}</h2>
                {section && !needsSetup && !paused ? (
                  <p className={s.section}>
                    초{section.grade} · {section.semester}학기 ·{" "}
                    {section.chapterTitle}
                    <strong>{section.title}</strong>
                  </p>
                ) : null}
                <p className={s.reason}>
                  {needsSetup
                    ? "학교나 학원에서 배우는 소단원을 선택해 주세요. 내 계정에 학습 기록이 쌓여요."
                    : paused
                      ? "설정에서 자동 학습을 켜면 저장된 기록에 맞춰 다시 시작해요."
                      : done
                        ? "오늘은 여기까지! 다음 학습 때 필요한 복습부터 만나요."
                        : (recommendation?.reason ??
                          "복습할 시기가 되면 여기에 다음 학습이 나타나요.")}
                </p>
                {needsSetup || paused ? (
                  <button
                    className={s.primary}
                    type="button"
                    disabled={blocked}
                    onClick={() => setSettings(true)}
                  >
                    {needsSetup ? "시작 진도 설정" : "학습 설정 열기"}
                  </button>
                ) : recommendation && !done ? (
                  <button
                    className={s.primary}
                    type="button"
                    disabled={blocked}
                    onClick={start}
                  >
                    {busy
                      ? "학습 준비 중…"
                      : recommendation.mode === "resume"
                        ? "이어서 학습하기"
                        : "오늘의 추천 학습 시작"}
                    <span aria-hidden="true"> →</span>
                  </button>
                ) : (
                  <p className={s.finish}>
                    ✓ {done ? "오늘 학습 완료" : "지금 필요한 학습 완료"}
                  </p>
                )}
                {!needsSetup && !paused && !done && recommendation ? (
                  <small>한 번에 5문제 · 하루 목표까지 차례로 풀어요</small>
                ) : null}
              </section>
              <aside className={s.summary} aria-label="오늘의 학습 현황">
                <h2>오늘의 학습</h2>
                <p className={s.count}>
                  <strong>{summary?.todayAnswered ?? 0}</strong> /{" "}
                  {summary?.todayGoal ?? 10}문제
                </p>
                <progress
                  aria-label="오늘 목표 진행"
                  value={Math.min(
                    summary?.todayAnswered ?? 0,
                    summary?.todayGoal ?? 10,
                  )}
                  max={summary?.todayGoal ?? 10}
                />
                <dl>
                  <div>
                    <dt>복습할 소단원</dt>
                    <dd>{summary?.dueCount ?? 0}개</dd>
                  </div>
                  <div>
                    <dt>완료한 소단원</dt>
                    <dd>{summary?.completedSections ?? 0}개</dd>
                  </div>
                  <div>
                    <dt>다음 복습</dt>
                    <dd>{formatReview(summary?.nextReviewAt ?? null)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className={s.settingsButton}
                  disabled={blocked}
                  onClick={() => setSettings((value) => !value)}
                  aria-expanded={settings}
                  aria-controls="course-settings"
                >
                  학습 설정 <span aria-hidden="true">→</span>
                </button>
              </aside>
            </div>
            {settings || needsSetup ? (
              <section
                id="course-settings"
                className={s.settings}
                aria-labelledby="course-settings-title"
              >
                <h2 id="course-settings-title">
                  {needsSetup ? "나의 시작 진도" : "학습 설정"}
                </h2>
                <CoursePlanForm
                  plan={state.plan}
                  revision={state.revision}
                  busy={blocked}
                  submitLabel={
                    needsSetup ? "저장하고 학습 준비" : "변경 내용 저장"
                  }
                  onSave={(input) => {
                    void mutate({
                      run: () => saveOwnCoursePlan(input),
                      after: () => setSettings(false),
                    });
                  }}
                />
                {!needsSetup ? (
                  <button
                    className={s.settingsButton}
                    type="button"
                    onClick={() => setSettings(false)}
                    disabled={busy}
                  >
                    설정 닫기
                  </button>
                ) : null}
              </section>
            ) : null}
            <p className={s.note}>
              풀어 본 문제와 풀이를 참고한 기록에 따라 다음 복습을 정해요. 한
              번의 학습을 마치면 다음 추천 학습을 확인할 수 있어요.
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}

function formatReview(value: string | null) {
  if (!value) return "학습 후 안내";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
