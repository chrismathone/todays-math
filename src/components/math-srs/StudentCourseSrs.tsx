"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Submitted } from "@/components/learn/learnApi";
import type { CourseStudentState } from "@/contracts/mathSrsCourse.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import CoursePlanForm from "./CoursePlanForm";
import CourseProgressBoard from "./CourseProgressBoard";
import {
  StudentReviewPage,
  StudentReviewStatus,
  StudentReviewOverview,
} from "./StudentReviewHome";
import homeStyles from "./student-review-home.module.css";
import {
  answerCourse,
  getCourseState,
  hintCourse,
  saveOwnCoursePlan,
  startCourse,
} from "./courseApi";
import s from "./student-course.module.css";
import type { ExpeditionActivityCallbacks } from "@/components/math-explorers/ExplorerBankActivity";
import { useLearningSounds } from "./LearningSounds";
import { learningSoundCue } from "./learningSoundCue";

const StudentCoursePractice = dynamic(() => import("./StudentCoursePractice"), {
  loading: () => <p role="status">학습 화면을 준비하고 있어요…</p>,
});
type Failure = { status: number; message: string };
type Action = {
  run: () => Promise<Submitted<CourseStudentState>>;
  after?: (data: CourseStudentState) => void;
  gesture?: boolean;
};

export default function StudentCourseSrs({
  expedition,
  paused: checkPaused = false,
}: { expedition?: ExpeditionActivityCallbacks; paused?: boolean } = {}) {
  const router = useRouter();
  const { gesture, play, resetStudent } = useLearningSounds();
  const soundEpoch = useRef(0);
  const soundStudent = useRef<string | null>(null);
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
  const settingsHeading = useRef<HTMLHeadingElement>(null);
  const settingsOpener = useRef<HTMLElement | null>(null);
  const [retryAction, setRetryAction] = useState<Action | null>(null);
  const expeditionRef = useRef(expedition);
  useEffect(() => {
    expeditionRef.current = expedition;
  }, [expedition]);

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
    void getCourseState().then(async (result) => {
      if (!current) return;
      if (result.ok) {
        soundEpoch.current++;
        soundStudent.current = result.data.student.id;
        resetStudent(result.data.student.id);
        setState(result.data);
        setError(null);
        if (expeditionRef.current) {
          const session = result.data.session;
          const unfinished =
            session &&
            (!session.completedAt ||
              (session.retry && !session.retry.completedAt));
          if (unfinished) setPracticing(true);
          else if (
            result.data.journey?.todayComplete &&
            !(
              result.data.prerequisiteContext?.kind === "unavailable" &&
              !result.data.prerequisiteContext.canStart
            )
          )
            expeditionRef.current.onComplete();
          else if (
            result.data.plan?.enabled &&
            result.data.prerequisiteContext?.canStart !== false &&
            result.data.summary.recommendation
          ) {
            const started = await startCourse();
            if (!current) return;
            if (started.ok) {
              setState(started.data);
              setPracticing(!!started.data.session);
            } else handleFailure(started);
          }
        }
      } else handleFailure(result);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [reload, handleFailure, resetStudent]);

  async function mutate(action: Action) {
    if (pending.current) return;
    if (action.gesture) gesture();
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
    soundEpoch.current++;
    setRetryAction(null);
    setError(null);
    setLoading(true);
    setPracticing(false);
    setFeedbackId(null);
    setReload((value) => value + 1);
  }

  function start() {
    if (
      state?.prerequisiteContext?.kind === "unavailable" &&
      !state.prerequisiteContext.canStart
    )
      return;
    void mutate({
      run: startCourse,
      gesture: true,
      after: (data) => {
        setFeedbackId(null);
        setPracticing(!!data.session);
      },
    });
  }

  const blocked =
    checkPaused || busy || loading || (!!error && error.status !== 400);
  const practice = practicing && state?.session;
  const summary = state?.summary;
  const recommendation = summary?.recommendation;
  const prerequisiteContext = state?.prerequisiteContext;
  const unavailable =
    prerequisiteContext?.kind === "unavailable" &&
    !prerequisiteContext.canStart;
  const section = recommendation
    ? getCourseSection(recommendation.sectionId)
    : summary?.currentSectionId
      ? getCourseSection(summary.currentSectionId)
      : undefined;
  const retryPending =
    !!state?.session?.retry && !state.session.retry.completedAt;
  const goalReached =
    !!summary && summary.todayAnswered >= summary.todayGoal && !retryPending;
  const done = (summary?.status === "done" || goalReached) && !retryPending;
  const paused = summary?.status === "paused" || state?.plan?.enabled === false;
  const needsSetup = !!state && (!state.plan || summary?.status === "setup");
  useEffect(() => {
    if (settings && !needsSetup) {
      settingsHeading.current?.focus({ preventScroll: true });
      if (window.matchMedia?.("(max-width: 430px)").matches)
        settingsHeading.current?.scrollIntoView({ block: "start" });
    }
    if (!settings && settingsOpener.current) {
      settingsOpener.current.focus({ preventScroll: true });
      settingsOpener.current = null;
    }
  }, [settings, needsSetup]);
  function openSettings(opener: HTMLElement) {
    settingsOpener.current = opener;
    setSettings(true);
  }
  const title = unavailable
    ? "지금은 새 문제를 열 수 없어요."
    : needsSetup
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
    <StudentReviewPage
      kind={expedition ? "explorers" : "elementary"}
      student={state?.student ?? null}
      practicing={!!practice || !!expedition}
      boardReady={!!state && !loading && !needsSetup && error?.status !== 503}
      practiceTitle="초등 수학 자동 복습"
      practicePageClassName={`${s.page} ${s.practicePage}`}
      practiceMainClassName={s.practiceMain}
      setupClassName={
        needsSetup ? `${s.setupMain} ${homeStyles.setupMain}` : undefined
      }
    >
      <StudentReviewStatus
        loading={loading}
        error={error}
        busy={busy}
        onReload={loadAgain}
        onRetry={
          retryAction && error && error.status !== 409 && error.status !== 400
            ? () => void mutate(retryAction)
            : undefined
        }
      />
      {practice && state ? (
        <div className={s.practiceStage}>
          <StudentCoursePractice
            key={practice.id}
            session={practice}
            summary={state.summary}
            journey={state.journey}
            prerequisiteContext={prerequisiteContext}
            feedbackId={feedbackId}
            busy={blocked}
            onAuthFailure={authFailure}
            onExit={() => {
              soundEpoch.current++;
              setPracticing(false);
              setFeedbackId(null);
              expedition?.onExit();
            }}
            onContinue={start}
            onNext={() => {
              setFeedbackId(null);
              if (
                practice.completedAt &&
                (!practice.retry || practice.retry.completedAt)
              ) {
                if (
                  state.summary.recommendation &&
                  !state.journey?.todayComplete
                )
                  start();
                else {
                  setPracticing(false);
                  if (!unavailable) expedition?.onComplete();
                }
              }
            }}
            onHint={(problemId) => {
              void mutate({
                run: () => hintCourse({ sessionId: practice.id, problemId }),
              });
            }}
            onAnswer={(input) => {
              const studentId = state.student.id;
              const soundTurn = soundEpoch.current;
              void mutate({
                run: () => answerCourse(input),
                gesture: true,
                after: (next) => {
                  setFeedbackId(input.problemId);
                  if (
                    soundEpoch.current !== soundTurn ||
                    soundStudent.current !== studentId ||
                    next.student.id !== studentId ||
                    next.session?.id !== input.sessionId
                  )
                    return;
                  const attempt =
                    input.retryIndex === undefined
                      ? next.session.attempts.find(
                          (item) => item.problemId === input.problemId,
                        )
                      : next.session.retry?.attempts[input.retryIndex];
                  if (!attempt || attempt.problemId !== input.problemId) return;
                  const cue = learningSoundCue(
                    { type: "course", ...input },
                    attempt.correct,
                  );
                  if (cue)
                    play(
                      cue,
                      `${studentId}:${input.sessionId}:${input.problemId}:${input.retryIndex ?? "first"}`,
                    );
                  expeditionRef.current?.onConfirmedAnswer?.(studentId);
                },
              });
            }}
          />
        </div>
      ) : expedition && !loading ? (
        <section className={s.settings}>
          <h2>
            {unavailable
              ? "지금은 새 문제를 열 수 없어요."
              : "탐험을 준비하고 있어요"}
          </h2>
          <p>
            {unavailable
              ? prerequisiteContext.reason
              : "학습 설정을 확인한 뒤 같은 탐험을 이어 갈 수 있어요."}
          </p>
          {unavailable ? (
            <button type="button" className={s.settingsButton} disabled>
              오늘의 추천 학습 시작
            </button>
          ) : null}
          <button
            type="button"
            className={s.settingsButton}
            onClick={expedition.onExit}
          >
            탐험판으로
          </button>
        </section>
      ) : state && !loading ? (
        <>
          <StudentReviewOverview
            board={
              !needsSetup && summary ? (
                <CourseProgressBoard
                  summary={summary}
                  journey={state.journey}
                  busy={blocked}
                  nextLabel={
                    recommendation?.mode === "resume"
                      ? "이어서 학습하기"
                      : "오늘의 추천 학습 시작"
                  }
                  nextAriaLabel={
                    recommendation?.mode === "resume"
                      ? "이어서 학습하기"
                      : "오늘의 추천 학습 시작"
                  }
                  onNext={
                    !paused && !done && recommendation ? start : undefined
                  }
                />
              ) : undefined
            }
            boardActions={[
              ...(unavailable
                ? [
                    {
                      label: "오늘의 추천 학습 시작",
                      disabled: true,
                      onClick: start,
                    },
                  ]
                : []),
              ...(state.session?.completedAt &&
              (!state.session.retry || state.session.retry.completedAt)
                ? [
                    {
                      label: "완료한 문제 다시 풀기",
                      disabled: blocked,
                      onClick: () => setPracticing(true),
                    },
                  ]
                : []),
              {
                label: paused ? "학습 설정 열기" : "학습 설정",
                disabled: blocked,
                onClick: (event) => openSettings(event.currentTarget),
              },
            ]}
            recommendation={{
              id: "course-recommendation",
              eyebrow: paused
                ? "잠시 쉬는 중"
                : done
                  ? goalReached
                    ? "오늘의 목표 완료"
                    : "오늘의 추천 학습 완료"
                  : recommendation?.mode === "resume"
                    ? "이어서 학습"
                    : recommendation?.mode === "review"
                      ? "오늘의 추천 복습"
                      : "오늘의 추천 학습",
              title,
              section:
                section && !needsSetup && !paused
                  ? `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`
                  : undefined,
              sectionTitle:
                section && !needsSetup && !paused ? section.title : undefined,
              reason: unavailable
                ? prerequisiteContext.reason
                : needsSetup
                  ? "학교나 학원에서 배우는 소단원을 선택해 주세요. 내 계정에 학습 기록이 쌓여요."
                  : paused
                    ? "설정에서 자동 학습을 켜면 저장된 기록에 맞춰 다시 시작해요."
                    : prerequisiteContext?.reason && !done
                      ? prerequisiteContext.reason
                      : done
                        ? "오늘은 여기까지! 다음 학습 때 필요한 복습부터 만나요."
                        : (recommendation?.reason ??
                          "복습할 시기가 되면 여기에 다음 학습이 나타나요."),
              action:
                needsSetup || paused
                  ? {
                      label: needsSetup ? "시작 진도 설정" : "학습 설정 열기",
                      disabled: blocked,
                      onClick: (event) => openSettings(event.currentTarget),
                    }
                  : unavailable
                    ? {
                        label: "오늘의 추천 학습 시작",
                        disabled: true,
                        onClick: start,
                      }
                    : recommendation && !done
                      ? {
                          label: busy
                            ? "학습 준비 중…"
                            : recommendation.mode === "resume"
                              ? "이어서 학습하기"
                              : "오늘의 추천 학습 시작",
                          disabled: blocked,
                          onClick: start,
                          arrow: true,
                        }
                      : undefined,
              completedLabel: unavailable
                ? undefined
                : done
                  ? "오늘 학습 완료"
                  : "지금 필요한 학습 완료",
              note:
                !needsSetup && !paused && !done && recommendation
                  ? "한 번에 5문제 · 하루 목표까지 차례로 풀어요"
                  : undefined,
            }}
            progress={{
              title: "오늘의 학습",
              ariaLabel: "오늘 목표 진행",
              completed: summary?.todayAnswered ?? 0,
              goal: summary?.todayGoal ?? 10,
              rows: [
                {
                  label: "복습할 소단원",
                  value: `${summary?.dueCount ?? 0}개`,
                },
                {
                  label: "완료한 소단원",
                  value: `${summary?.completedSections ?? 0}개`,
                },
                {
                  label: "다음 복습",
                  value: formatReview(summary?.nextReviewAt ?? null),
                },
              ],
            }}
          />
          {settings || needsSetup ? (
            <section
              id="course-settings"
              className={s.settings}
              aria-labelledby="course-settings-title"
              onKeyDown={(event) => {
                if (event.key === "Escape" && !needsSetup && !busy) {
                  event.stopPropagation();
                  setSettings(false);
                }
              }}
            >
              <h2
                id="course-settings-title"
                ref={settingsHeading}
                tabIndex={-1}
              >
                {needsSetup ? "나의 시작 진도" : "학습 설정"}
              </h2>
              <CoursePlanForm
                studentView
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
            풀어 본 문제와 풀이를 참고한 기록에 따라 다음 복습을 정해요. 한 번의
            학습을 마치면 다음 추천 학습을 확인할 수 있어요.
          </p>
        </>
      ) : null}
    </StudentReviewPage>
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
