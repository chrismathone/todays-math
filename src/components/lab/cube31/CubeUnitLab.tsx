"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CUBE_LESSONS, CUBE_TASK_IDS } from "@/lib/lab/cube31/lessons";
import {
  CONCEPTS,
  CUBE_SAVE_KEY,
  emptyCubeSave,
  parseCubeSave,
  practiceRound,
  updateCubeRecord,
  type CubeSave,
} from "@/lib/lab/cube31/progress";
import type { CubePractice, CubeTask } from "@/lib/lab/cube31/types";
import { labZoom } from "@/lib/lab/cube31/zoom";
import {
  emptyMomentum,
  recordLabSuccess,
  type LabCelebration as Celebration,
} from "@/lib/lab/cube31/momentum";
import RegroupingBoard from "./RegroupingBoard";
import LearningActivity from "./LearningActivity";
import LabCelebration from "./LabCelebration";
import { useLabSound } from "./useLabSound";
import styles from "./CubeUnitLab.module.css";

const Base10Explorer = dynamic(() => import("./Base10Explorer"), {
  ssr: false,
  loading: () => <p role="status">수 모형을 준비하고 있어요…</p>,
});
const ConceptPlay = dynamic(() => import("./ConceptPlay"), {
  ssr: false,
  loading: () => (
    <p className={styles.playLoading} role="status">
      두리와 모아가 블록 가게를 열고 있어요…
    </p>
  ),
});
const subscribeResize = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};
const zoomSnapshot = () => labZoom(window.innerWidth, window.innerHeight);
const serverZoom = () => 1;
const subscribeNever = () => () => {};
const serverFalse = () => false;
const clientTrue = () => true;
const motionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeMotion = (callback: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const CONCEPT_LABELS: Record<CubePractice["concept"], string> = {
  "add-none": "받아올림 없는 덧셈",
  "add-once": "한 번 받아올림",
  "add-many": "여러 번 받아올림",
  "subtract-none": "받아내림 없는 뺄셈",
  "subtract-once": "한 번 받아내림",
  "subtract-twice": "두 번 받아내림",
};

export default function CubeUnitLab({
  practice,
}: {
  practice: CubePractice[];
}) {
  const hydrated = useSyncExternalStore(
    subscribeNever,
    clientTrue,
    serverFalse,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    serverFalse,
  );
  const zoom = useSyncExternalStore(subscribeResize, zoomSnapshot, serverZoom);
  const [ready, setReady] = useState(false);
  const [save, setSave] = useState<CubeSave>(emptyCubeSave);
  const [storageError, setStorageError] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [playOpen, setPlayOpen] = useState(false);
  const [momentum, setMomentum] = useState(emptyMomentum);
  const sound = useLabSound();
  const heading = useRef<HTMLHeadingElement>(null);
  const lessonList = useRef<HTMLElement>(null);
  useEffect(() => {
    const list = lessonList.current;
    if (!list) return;
    const center = () => {
      const current = list.querySelector<HTMLElement>('[aria-current="step"]');
      if (!current) return;
      const height = list.clientHeight;
      if (!height) return;
      // Centre as far as the list can scroll — the ends stay flush, no blank padding.
      const top = current.offsetTop - (height - current.offsetHeight) / 2;
      list.scrollTo({ top, behavior: "instant" });
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(list);
    return () => observer.disconnect();
  }, [save.lesson, ready, mapOpen]);
  if (hydrated && !ready) {
    setReady(true);
    try {
      setSave(parseCubeSave(localStorage.getItem(CUBE_SAVE_KEY)));
    } catch {
      setStorageError(true);
    }
  }
  const lesson = CUBE_LESSONS[save.lesson] ?? CUBE_LESSONS[0];
  const challenge = lesson.id === "challenge";
  const round = practiceRound(practice, save.round);
  const steps = challenge ? round.length : lesson.tasks.length;
  const step = Math.min(save.step, Math.max(steps - 1, 0));
  const task = lesson.tasks[step];
  const done = CUBE_TASK_IDS.filter((id) => save.tasks[id]?.completed).length;
  const mastered = CONCEPTS.filter(
    (c) => (save.mastery[c]?.length ?? 0) > 0,
  ).length;
  function celebrate(activity: string, clean: boolean) {
    const result = recordLabSuccess(momentum, activity, clean);
    setMomentum(result);
    sound.play(result.celebration?.milestone ? "milestone" : "success");
  }
  function retry(withSound = true) {
    setMomentum((previous) => ({ ...previous, streak: 0 }));
    if (withSound) sound.play("retry");
  }
  function persist(next: CubeSave) {
    setSave(next);
    try {
      localStorage.setItem(CUBE_SAVE_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  function navigate(lessonIndex: number, nextStep = 0) {
    persist({ ...save, lesson: lessonIndex, step: nextStep });
    setMapOpen(false);
    heading.current?.focus({ preventScroll: true });
  }
  function next() {
    sound.play("advance");
    if (step + 1 < steps) navigate(save.lesson, step + 1);
    else if (challenge) {
      setReportOpen(true);
    } else if (save.lesson + 1 < CUBE_LESSONS.length) navigate(save.lesson + 1);
    else setReportOpen(true);
  }
  return (
    <div
      className={styles.page}
      style={{ "--lab-zoom": zoom } as React.CSSProperties}
    >
      <header className={styles.header}>
        <Link href="/lab" className={styles.brand}>
          <span aria-hidden="true">▦</span> 오늘 수학{" "}
          <span className={styles.labTag}>랩실</span>
        </Link>
        <span className={styles.headerUnit}>초등 3-1 · 1단원</span>
        <button
          type="button"
          className={`${styles.playButton} ${styles.desktopPlay}`}
          onClick={() => setPlayOpen(true)}
        >
          <ChatIcon /> 대화로 배우기
        </button>
        <div className={styles.headerTools}>
          <div
            className={styles.momentum}
            aria-label={`이번 탐험 ${momentum.solved.length}개 해결`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 2-9 12h6l-1 8 9-12h-6z" fill="currentColor" />
            </svg>
            <b key={`solved-${momentum.solved.length}`}>
              {momentum.solved.length}
            </b>
            <span>해결</span>
            {momentum.streak >= 2 && (
              <strong
                className={styles.streak}
                key={`streak-${momentum.streak}`}
                title="도움 없이 첫 시도에 연속으로 해결했어요"
              >
                {momentum.streak}연속
              </strong>
            )}
          </div>
          <button
            type="button"
            className={styles.soundButton}
            aria-label={sound.enabled ? "효과음 끄기" : "효과음 켜기"}
            aria-pressed={sound.enabled}
            title={sound.enabled ? "효과음 끄기" : "효과음 켜기"}
            onClick={sound.toggle}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4z" />
              {sound.enabled ? (
                <>
                  <path d="M15 8a6 6 0 0 1 0 8" />
                  <path d="M18 5a10 10 0 0 1 0 14" />
                </>
              ) : (
                <path d="m16 9 5 6m0-6-5 6" />
              )}
            </svg>
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setReportOpen(true)}
          >
            학습 기록{" "}
            <span>
              {done}/{CUBE_TASK_IDS.length}
            </span>
          </button>
        </div>
      </header>
      <main className={styles.layout} id="main-content">
        <aside className={styles.sidebar} data-open={mapOpen}>
          <div className={styles.courseTitle}>
            <span className={styles.eyebrow}>CUBE MATH · CONCEPT LAB</span>
            <h1>덧셈과 뺄셈</h1>
            <p>
              수를 움직이면
              <br />
              계산의 이유가 보여요.
            </p>
            <div
              className={styles.sessionGoal}
              aria-label={`이번 탐험 목표 5개 중 ${Math.min(momentum.solved.length, 5)}개 해결`}
            >
              <span>
                {momentum.solved.length >= 5
                  ? "다섯 미션, 해냈어요!"
                  : "이번 탐험 · 다섯 미션 도전"}
              </span>
              <div aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} data-filled={momentum.solved.length > i}>
                    ◆
                  </i>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.courseProgress}>
            <span>
              개념 여정{" "}
              <b>{Math.round((done / CUBE_TASK_IDS.length) * 100)}%</b>
            </span>
            <progress max={CUBE_TASK_IDS.length} value={done} />
          </div>
          <nav
            id="cube-lesson-list"
            ref={lessonList}
            aria-label="단원 학습 순서"
          >
            {CUBE_LESSONS.map((item, index) => {
              const completed =
                item.id === "challenge"
                  ? mastered === 6
                  : item.tasks.every((t) => save.tasks[t.id]?.completed);
              return (
                <button
                  type="button"
                  className={styles.lessonButton}
                  key={item.id}
                  aria-current={index === save.lesson ? "step" : undefined}
                  onClick={() => navigate(index)}
                >
                  <span className={styles.lessonNumber}>
                    {completed ? "✓" : String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <b>{item.title}</b>
                    <small>{item.subtitle}</small>
                  </span>
                </button>
              );
            })}
          </nav>
          <p className={styles.sourceNote}>
            큐브수학 개념 3-1 진도북
            <br />
            8~31쪽의 개념과 유형을 따라가요.
          </p>
        </aside>
        <section className={styles.workspace} aria-busy={!ready}>
          <div className={styles.mobileBar}>
            <button
              type="button"
              className={styles.secondaryButton}
              aria-expanded={mapOpen}
              aria-controls="cube-lesson-list"
              onClick={() => setMapOpen(!mapOpen)}
            >
              학습 순서 {mapOpen ? "닫기" : "보기"}
            </button>
            <button
              type="button"
              className={styles.playButton}
              onClick={() => setPlayOpen(true)}
            >
              <ChatIcon /> 대화로 배우기
            </button>
            <span>
              {save.lesson + 1} / {CUBE_LESSONS.length}
            </span>
          </div>
          <div className={styles.lessonHeading}>
            <div>
              <span className={styles.eyebrow}>
                {lesson.subtitle} · {lesson.pages}쪽
              </span>
              <h2 ref={heading} tabIndex={-1}>
                {lesson.title}
              </h2>
              <p>{lesson.goal}</p>
            </div>
            <div
              className={styles.stepTrack}
              aria-label={"활동 " + (step + 1) + " / " + steps}
            >
              {Array.from({ length: steps }, (_, index) => (
                <button
                  type="button"
                  key={index}
                  className={styles.stepButton}
                  aria-label={index + 1 + "번째 활동"}
                  aria-current={step === index ? "step" : undefined}
                  data-completed={
                    challenge
                      ? momentum.solved.includes(`practice:${round[index]?.id}`)
                      : !!save.tasks[lesson.tasks[index]?.id]?.completed
                  }
                  onClick={() => navigate(save.lesson, index)}
                >
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.explorerButton}
              onClick={() => setExplorerOpen(true)}
            >
              <span aria-hidden="true">◈</span> 묶음 3D 탐험
            </button>
          </div>
          {!ready ? (
            <div className={styles.stage} role="status">
              완료한 활동을 불러오고 있어요…
            </div>
          ) : challenge && round[step] ? (
            <PracticeStage
              key={round[step].id + ":" + save.round}
              problem={round[step]}
              onNext={next}
              last={step + 1 === steps}
              celebration={momentum.celebration}
              onSolved={(clean) =>
                celebrate(`practice:${round[step].id}`, clean)
              }
              onRetry={() => retry()}
              onAssist={() => retry(false)}
              onMastered={(id) =>
                persist({
                  ...save,
                  mastery: {
                    ...save.mastery,
                    [round[step].concept]: [
                      ...new Set([
                        ...(save.mastery[round[step].concept] ?? []),
                        id,
                      ]),
                    ],
                  },
                })
              }
            />
          ) : task ? (
            <TaskStage
              key={task.id}
              task={task}
              onNext={next}
              celebration={momentum.celebration}
              onRecord={(action, clean) => {
                persist(updateCubeRecord(save, task.id, action));
                if (action === "complete") celebrate(task.id, !!clean);
                else retry(action === "attempt");
              }}
            />
          ) : (
            <p role="alert">
              활동을 준비하지 못했어요. 학습 순서에서 다른 활동을 선택해 주세요.
            </p>
          )}
          <footer className={styles.footnote}>
            <span>답 입력 후 Enter로 확인 · 정답이면 Enter로 다음 활동</span>
            <span>
              {storageError
                ? "브라우저 저장 공간을 사용할 수 없어 이번 진도는 저장되지 않아요."
                : "완료한 활동은 이 브라우저에 저장돼요."}
            </span>
          </footer>
        </section>
      </main>
      {explorerOpen && (
        <Modal title="묶음 3D 탐험" onClose={() => setExplorerOpen(false)}>
          <Base10Explorer initialOpen reducedMotion={reducedMotion} />
          <p className={styles.footnote}>
            10개의 낱개가 십 묶음 하나로, 10개의 십 묶음이 백 묶음 하나로
            바뀌어요.
          </p>
        </Modal>
      )}
      {playOpen && (
        <Modal
          title="두리·모아와 대화로 배우기"
          play
          onClose={() => setPlayOpen(false)}
        >
          <ConceptPlay onClose={() => setPlayOpen(false)} />
        </Modal>
      )}
      {reportOpen && (
        <Modal title="나의 학습 기록" onClose={() => setReportOpen(false)}>
          <div className={styles.reportSummary}>
            <strong>
              {done}
              <small> / {CUBE_TASK_IDS.length} 활동</small>
            </strong>
            <strong>
              {mastered}
              <small> / 6 독립 적용</small>
            </strong>
          </div>
          <p className={styles.sessionSummary}>
            이번 탐험에서 <b>{momentum.solved.length}개</b> 해결 · 한 번에 맞힌
            최고 기록 <b>{momentum.best}연속</b>
          </p>
          <p>
            독립 적용은 도움 없이 첫 시도에 새 문제를 맞혔을 때 기록돼요. 틀린
            문제는 수 모형으로 다시 확인할 수 있어요.
          </p>
          <ul className={styles.masteryList}>
            {CONCEPTS.map((c) => (
              <li key={c}>
                <span>{CONCEPT_LABELS[c]}</span>
                <b>
                  {(save.mastery[c]?.length ?? 0) > 0
                    ? "확인했어요"
                    : "새 문제로 확인해요"}
                </b>
              </li>
            ))}
          </ul>
          <div className={styles.reportActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                persist({
                  ...save,
                  lesson: CUBE_LESSONS.findIndex((l) => l.id === "challenge"),
                  step: 0,
                  round: save.round + 1,
                });
                setReportOpen(false);
              }}
            >
              다른 수로 도전
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                navigate(0);
                setReportOpen(false);
              }}
            >
              개념 다시 살펴보기
            </button>
          </div>
          <details className={styles.recordDetails}>
            <summary>활동별 시도와 도움 기록</summary>
            <ul>
              {CUBE_LESSONS.flatMap((l) => l.tasks).map((t) => (
                <li key={t.id}>
                  <span>{t.title}</span>
                  <small>
                    {save.tasks[t.id]?.completed ? "완료" : "진행 전"} · 시도{" "}
                    {save.tasks[t.id]?.attempts ?? 0} · 도움{" "}
                    {save.tasks[t.id]?.hints ?? 0}
                  </small>
                </li>
              ))}
            </ul>
          </details>
        </Modal>
      )}
    </div>
  );
}

function useActivityFocus(complete: boolean, modelOpen = false) {
  const stage = useRef<HTMLElement>(null);
  useEffect(() => {
    const target = complete
      ? stage.current?.querySelector<HTMLElement>("[data-continue-activity]")
      : (stage.current?.querySelector<HTMLElement>(
          "[data-activity-answer]:not(:disabled)",
        ) ??
        stage.current?.querySelector<HTMLElement>(
          'input:not(:disabled):not([type="hidden"]), button:not(:disabled)',
        ));
    target?.focus({ preventScroll: true });
  }, [complete, modelOpen]);
  return stage;
}

function guardActivityEnter(event: React.KeyboardEvent<HTMLElement>) {
  if (
    event.key === "Enter" &&
    (event.repeat ||
      event.nativeEvent.isComposing ||
      // Some IMEs report the confirming Enter as keyCode 229.
      event.keyCode === 229)
  ) {
    event.preventDefault();
  }
}

function TaskStage({
  task,
  onNext,
  onRecord,
  celebration,
}: {
  task: CubeTask;
  onNext: () => void;
  onRecord: (action: "attempt" | "hint" | "complete", clean: boolean) => void;
  celebration: Celebration | null;
}) {
  const [complete, setComplete] = useState(false);
  const [hint, setHint] = useState(false);
  const clean = useRef(true);
  const stage = useActivityFocus(complete);
  function record(action: "attempt" | "hint" | "complete") {
    if (action !== "complete") clean.current = false;
    onRecord(action, clean.current);
  }
  return (
    <article
      ref={stage}
      className={styles.stage}
      data-kind={task.kind}
      data-experiment={task.kind === "question" && !!task.experiment}
      data-complete={complete}
      onKeyDownCapture={guardActivityEnter}
    >
      {complete && celebration && <LabCelebration result={celebration} />}
      <div className={styles.taskTitle}>
        <span className={styles.activityTag}>
          {task.kind === "regroup"
            ? "직접 조작"
            : task.kind === "question" && task.experiment
              ? "움직이며 발견하기"
              : task.kind === "repair"
                ? "오류 찾기"
                : task.kind === "puzzle"
                  ? "공간 탐험"
                  : "생각해 보기"}
        </span>
        <h3>{task.title}</h3>
        <p>{task.instruction}</p>
      </div>
      <ActivityViewport>
        {task.kind === "regroup" ? (
          <RegroupingBoard
            problem={task}
            disabled={complete}
            onAttempt={() => record("attempt")}
            onComplete={() => {
              setComplete(true);
              record("complete");
            }}
          />
        ) : (
          <LearningActivity
            task={task}
            onAttempt={() => record("attempt")}
            onComplete={() => {
              setComplete(true);
              record("complete");
            }}
          />
        )}
      </ActivityViewport>
      <div className={styles.stageFooter}>
        {!complete ? (
          <>
            <button
              type="button"
              className={styles.hintButton}
              aria-expanded={hint}
              onClick={() => {
                setHint(!hint);
                if (!hint) record("hint");
              }}
            >
              생각하는 힌트 {hint ? "접기" : "보기"}
            </button>
            {hint && (
              <p className={styles.hint} role="status">
                {task.hint}
              </p>
            )}
          </>
        ) : (
          <div className={styles.success} role="status">
            <div>
              <b>
                <span aria-hidden="true">✓ </span>이 생각을 기억해요
              </b>
              <p>{task.explanation}</p>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              data-continue-activity
              aria-keyshortcuts="Enter"
              title="Enter 키로 다음 활동"
              onClick={onNext}
            >
              다음 활동 →<kbd aria-hidden="true">Enter</kbd>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
function PracticeStage({
  problem,
  onNext,
  onMastered,
  last,
  celebration,
  onSolved,
  onRetry,
  onAssist,
}: {
  problem: CubePractice;
  onNext: () => void;
  onMastered: (id: string) => void;
  last: boolean;
  celebration: Celebration | null;
  onSolved: (clean: boolean) => void;
  onRetry: () => void;
  onAssist: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [assisted, setAssisted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const stage = useActivityFocus(complete, modelOpen);
  function check(event: React.FormEvent) {
    event.preventDefault();
    if (complete) return;
    const correct =
      /^\d+$/.test(answer.trim()) && Number(answer) === problem.answer;
    if (correct) {
      setComplete(true);
      setMessage(
        !assisted && !attempted
          ? "도움 없이 해결했어요. 새로운 수에도 같은 생각을 쓸 수 있네요!"
          : "다시 생각해서 해결했어요. 다음에는 다른 수로 혼자 도전해 봐요.",
      );
      if (!assisted && !attempted) onMastered(problem.id);
      onSolved(!assisted && !attempted);
    } else {
      onRetry();
      setAttempted(true);
      setMessage(
        answer.trim()
          ? "한 번 더 살펴보세요. 각 자리의 묶음이 바뀌는지 확인해요."
          : "계산한 답을 입력해 주세요.",
      );
    }
  }
  return (
    <article
      ref={stage}
      className={styles.stage}
      data-kind="practice"
      data-complete={complete}
      onKeyDownCapture={guardActivityEnter}
    >
      {complete && celebration && <LabCelebration result={celebration} />}
      <div className={styles.taskTitle}>
        <span className={styles.activityTag}>
          혼자 적용 · {CONCEPT_LABELS[problem.concept]}
        </span>
        <h3>새로운 수로 해볼까요?</h3>
        <p>
          먼저 수 모형 없이 계산해 보세요. 도움이 필요하면 모형을 열어 다시
          생각할 수 있어요.
        </p>
      </div>
      <ActivityViewport>
        {!modelOpen && (
          <>
            <form onSubmit={check} className={styles.practiceForm}>
              <div className={styles.largeEquation}>
                {problem.a} {problem.operation === "add" ? "+" : "−"}{" "}
                {problem.b} <span>=</span>
                <input
                  aria-label="계산한 답"
                  inputMode="numeric"
                  autoComplete="off"
                  value={answer}
                  disabled={complete}
                  onChange={(event) => setAnswer(event.target.value)}
                  maxLength={5}
                />
              </div>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={complete}
              >
                답 확인
              </button>
            </form>
            {message && (
              <p
                role="status"
                className={complete ? styles.correctMessage : styles.hint}
              >
                {message}
              </p>
            )}
          </>
        )}
        {modelOpen && !complete && (
          <RegroupingBoard
            problem={problem}
            onComplete={() => {
              setModelOpen(false);
              setMessage("모형에서 확인한 결과를 위의 답 칸에 입력해 보세요.");
            }}
          />
        )}
      </ActivityViewport>
      <div className={styles.stageFooter}>
        {!complete && (
          <button
            type="button"
            className={styles.hintButton}
            aria-expanded={modelOpen}
            onClick={() => {
              setModelOpen(!modelOpen);
              setAssisted(true);
              if (!modelOpen) onAssist();
            }}
          >
            수 모형으로 {modelOpen ? "접기" : "다시 생각하기"}
          </button>
        )}
        {complete && (
          <div className={styles.success}>
            <p>
              {problem.a} {problem.operation === "add" ? "+" : "−"} {problem.b}{" "}
              = {problem.answer}
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              data-continue-activity
              aria-keyshortcuts="Enter"
              title={
                last ? "Enter 키로 학습 기록 보기" : "Enter 키로 다음 문제"
              }
              onClick={onNext}
            >
              {last ? "학습 기록 보기" : "다음 문제 →"}
              <kbd aria-hidden="true">Enter</kbd>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
/** Fit the complete activity into the stage, including on viewport resize. */
function ActivityViewport({ children }: { children: React.ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = viewport.current;
    const body = content.current;
    if (!frame || !body) return;
    // 줄일 때는 폭 W/s 로 펼쳐 놓고 s 배로 줄인다 — 줄인 뒤에도 폭이 칸을 꽉 채워 활동마다 카드 폭이 같다
    // (원장님 2026-09-22 «문제마다 창 크기가 다르지않고 똑같았으면»). 글이 대부분인 활동은 넓히면 짧아지지만,
    // 폭에 비례해 커지는 그림(모양 탐험)은 넓히면 **길어진다** — 펼쳐서 안 들어가면 폭 그대로 줄여 가운데 둔다.
    const heightAt = (scale: number) => {
      body.style.width = frame.clientWidth / scale + "px";
      return Math.max(1, body.offsetHeight);
    };
    const fit = () => {
      // On a phone, keep the manipulatives and instructions at their readable
      // size. The activity viewport scrolls instead of shrinking the lesson.
      if (window.innerWidth <= 760) {
        body.style.width = "100%";
        body.style.setProperty("--activity-scale", "1");
        body.style.setProperty("--activity-inset", "0px");
        return;
      }
      const room = frame.clientHeight;
      let scale = 1;
      let spread = true;
      if (room && heightAt(1) > room) {
        let fits = room / heightAt(1);
        if (heightAt(fits) * fits > room) spread = false;
        else {
          let over = Math.min(1, room / heightAt(fits));
          for (let i = 0; i < 6 && over - fits > 0.002; i++) {
            const mid = (fits + over) / 2;
            if (heightAt(mid) * mid <= room) fits = mid;
            else over = mid;
          }
        }
        scale = fits;
      }
      heightAt(spread ? scale : 1);
      body.style.setProperty("--activity-scale", String(scale));
      body.style.setProperty(
        "--activity-inset",
        spread ? "0px" : ((1 - scale) * frame.clientWidth) / 2 + "px",
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(body);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);
  return (
    <div ref={viewport} className={styles.activityViewport}>
      <div ref={content} className={styles.activityContent}>
        {children}
      </div>
    </div>
  );
}
function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" />
      <path d="M7 9h8M7 13h5" />
    </svg>
  );
}
function Modal({
  title,
  children,
  onClose,
  play = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  play?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Capture the opener before a child experiment moves focus on mount.
  const [previous] = useState(() =>
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => {
      node?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [previous]);
  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${play ? styles.playModal : ""}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className={styles.modalBody}>
        {!play && (
          <div className={styles.modalHeading}>
            <h2>{title}</h2>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              aria-label={title + " 닫기"}
            >
              닫기 ×
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
