"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { courseById } from "@/lib/lab/courses";
import {
  clockMatch,
  isLevel,
  isShaded,
  isShared,
  surfaceComplete,
  symmetryComplete,
} from "@/lib/lab/domainMath";
import { judge } from "@/lib/lab/judge";
import {
  activityRecord,
  applyAttempt,
  courseRecord,
  recordHint,
  setCourseIndex,
  startActivity,
  writeSave,
} from "@/lib/lab/progress";
import { playHit } from "@/lib/lab/sound";
import type { LabSave } from "@/lib/lab/types";

import type { EngineSpec } from "@/lib/lab/types";
import {
  ActivityEngine,
  emptyValue,
  toJudgeAnswer,
  type EngineValue,
} from "./ActivityEngine";
import { LabShell } from "./LabShell";
import styles from "./lab.module.css";
import { useLabSave } from "./useLabSave";

function needsConfirm(spec: EngineSpec): boolean {
  return spec.type === "net-pick" || spec.type === "stack-build";
}

function shouldCommit(
  spec: EngineSpec,
  prev: EngineValue,
  next: EngineValue,
): boolean {
  switch (spec.type) {
    case "choice":
      return !Array.isArray(spec.correct) && next !== "" && next !== prev;
    case "compare":
    case "error-hunt":
    case "stack-view":
      return typeof next === "string" && next !== "" && next !== prev;
    case "cube-fold": {
      const a = prev as { prediction?: string };
      const b = next as { prediction?: string };
      return Boolean(b.prediction) && a.prediction !== b.prediction;
    }
    case "ruler": {
      const a = prev as { value?: string };
      const b = next as { value?: string };
      return Boolean(b.value) && a.value !== b.value;
    }
    case "area-cut": {
      const a = prev as { reason?: string };
      const b = next as { reason?: string };
      return Boolean(b.reason) && a.reason !== b.reason;
    }
    case "unit-squares": {
      const n = Array.isArray(next) ? next.length : Number(next);
      return n === spec.cols * spec.rows && next !== prev;
    }
    case "cover":
      return Number(next) === spec.length;
    case "bundle":
      return Number(next) === Math.floor(spec.total / 10) && next !== prev;
    case "fraction-bar":
      return (
        Array.isArray(next) &&
        isShaded(next as number[], spec.parts, spec.filled) &&
        next !== prev
      );
    case "symmetry":
      return (
        Array.isArray(next) &&
        symmetryComplete(
          spec.seed,
          next as string[],
          spec.rows,
          spec.cols,
          spec.axis,
        ) &&
        next !== prev
      );
    case "machine":
      return (
        Array.isArray(next) &&
        next.length === spec.pairs.length &&
        next !== prev
      );
    case "ratio":
      return Number(next) === spec.copies && next !== prev;
    case "share":
      return (
        Array.isArray(next) &&
        isShared(next as number[], spec.total, spec.groups) &&
        next !== prev
      );
    case "clock": {
      const b = next as { hour?: number; minute?: number };
      return (
        clockMatch(b.hour ?? 0, b.minute ?? -1, spec.hour, spec.minute) &&
        next !== prev
      );
    }
    case "angle":
      return Number(next) === spec.degrees && next !== prev;
    case "nline":
      return Number(next) === spec.target && next !== prev;
    case "chart":
    case "solid":
      return typeof next === "string" && next !== "" && next !== prev;
    case "level":
      return (
        Array.isArray(next) &&
        isLevel(next as number[], spec.target) &&
        next !== prev
      );
    case "surface":
      return (
        Array.isArray(next) &&
        surfaceComplete(next as string[]) &&
        next !== prev
      );
    default:
      return false;
  }
}

export function CoursePlayer({ courseId }: { courseId: string }) {
  const course = courseById(courseId);
  const { save, setSave, ready } = useLabSave();
  const [value, setValue] = useState<EngineValue>("");
  const [feedback, setFeedback] = useState("");
  const [tone, setTone] = useState<"" | "good" | "bad">("");
  const [hintText, setHintText] = useState("");
  const [hintBack, setHintBack] = useState<string | undefined>();
  const [boundId, setBoundId] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<number | null>(null);
  const saveRef = useRef(save);
  const busyRef = useRef(false);
  // 처리기·타이머가 읽는 «가장 최근 기록». 렌더 중에 ref 를 쓰면 react-hooks/refs 가 막아
  // 커밋 직후(처리기가 돌기 전)에 맞춘다. 아래 startActivity 효과보다 먼저 돈다.
  useLayoutEffect(() => {
    saveRef.current = save;
  });

  const index = course ? (save.courses[course.id]?.index ?? 0) : 0;
  const activity = course?.activities[index];
  if (ready && activity && boundId !== activity.id) {
    setBoundId(activity.id);
    setValue(emptyValue(activity.engine));
    setFeedback("");
    setTone("");
    setHintText("");
    setHintBack(undefined);
  }
  // 활동이 바뀌면(boundId) 넘어가는 중 표시를 푼다 — 렌더 중이던 것을 커밋 직후로 옮겼다.
  useLayoutEffect(() => {
    busyRef.current = false;
  }, [boundId]);
  useEffect(() => {
    if (ready && boundId) heading.current?.focus({ preventScroll: true });
  }, [ready, boundId]);
  useEffect(
    () => () => {
      if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!ready || !course || !activity) return;
    const next = startActivity(saveRef.current, course.id, activity);
    writeSave(next);
    setSave({ ...next });
    // setSave 는 useState 의 설정자라 늘 같다 — 훅에서 받아 와 린트가 모를 뿐이다.
  }, [ready, course, activity, setSave]);

  const persist = (next: LabSave) => {
    writeSave(next);
    setSave({ ...next });
  };
  const navigate = (next: LabSave) => {
    if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    busyRef.current = false;
    persist(next);
  };

  const doneAll = Boolean(course && index >= course.activities.length);

  const record = useMemo(() => {
    if (!course || !activity) return null;
    return activityRecord(courseRecord(save, course.id), activity.id);
  }, [activity, course, save]);

  if (!course) {
    return (
      <LabShell save={save} onSave={persist}>
        <main className={styles.main}>
          <h1>없는 코스입니다</h1>
          <Link href="/lab">코스 목록</Link>
        </main>
      </LabShell>
    );
  }

  if (doneAll) {
    return (
      <LabShell save={save} onSave={persist} kicker={course.title}>
        <main className={styles.main}>
          <div className={styles.done}>
            <p className={styles.kicker}>{course.gradeLabel}</p>
            <h1>{course.title} 활동을 마쳤습니다</h1>
            <p className={styles.lead}>
              같은 활동을 다시 해도 이미 받은 점수는 다시 쌓이지 않습니다.
            </p>
            <div className={styles.actions}>
              <Link href="/lab" className={styles.wordmark}>
                코스 목록
              </Link>
              <button
                type="button"
                className={styles.labBtnSecondary}
                onClick={() => navigate(setCourseIndex(save, course.id, 0))}
              >
                처음부터
              </button>
            </div>
          </div>
        </main>
      </LabShell>
    );
  }

  if (!activity) return null;
  const currentCourse = course;
  const currentActivity = activity;

  function goTo(id: string) {
    const i = currentCourse.activities.findIndex((a) => a.id === id);
    if (i >= 0) navigate(setCourseIndex(save, currentCourse.id, i));
  }

  function checkWith(answer: EngineValue) {
    if (busyRef.current) return;
    const result = judge(
      currentActivity.engine,
      toJudgeAnswer(currentActivity.engine, answer),
    );
    const mapped = result.ok
      ? currentActivity.success
      : result.message === "align"
        ? "먼저 자의 0을 막대 시작에 맞추세요."
        : result.message === "move"
          ? "조각을 끝까지 옮겨 직사각형을 만드세요."
          : result.message === "fold"
            ? "전개도를 끝까지 접은 뒤 면을 고르세요."
            : currentActivity.wrong;
    const next = applyAttempt(
      saveRef.current,
      currentCourse.id,
      currentActivity,
      result.ok,
      Boolean(result.observe),
    );
    if (result.ok) playHit(saveRef.current.sound);
    persist(next.save);
    setFeedback(mapped);
    setTone(result.ok ? "good" : "bad");
    if (result.ok) {
      busyRef.current = true;
      advanceTimer.current = window.setTimeout(
        () => {
          advanceTimer.current = null;
          persist(setCourseIndex(next.save, currentCourse.id, index + 1));
          busyRef.current = false;
        },
        saveRef.current.reducedMotion ? 0 : 420,
      );
    }
  }

  function onEngineChange(nextValue: EngineValue) {
    const prev = value;
    setValue(nextValue);
    if (shouldCommit(currentActivity.engine, prev, nextValue)) {
      checkWith(nextValue);
    }
  }

  function hint() {
    const h = currentActivity.hints[0];
    persist(recordHint(save, currentCourse.id, currentActivity.id));
    setHintText(h?.text ?? "");
    setHintBack(h?.backTo);
    setTone("");
  }

  const total = currentCourse.activities.length;

  return (
    <LabShell save={save} onSave={persist} kicker={course.title}>
      <main className={styles.main}>
        <p className={styles.kicker}>
          {course.gradeLabel} · {index + 1} / {total}
        </p>
        <section className={styles.stage}>
          <h1 ref={heading} tabIndex={-1}>
            {activity.title}
          </h1>
          <p className={styles.intro}>{activity.intro}</p>
          <div className={styles.board} ref={board}>
            <ActivityEngine
              spec={activity.engine}
              value={value}
              onChange={onEngineChange}
              reducedMotion={save.reducedMotion}
            />
          </div>
          <div
            className={`${styles.feedback} ${tone === "good" ? styles.feedbackGood : ""} ${tone === "bad" ? styles.feedbackBad : ""}`}
            role="status"
          >
            {feedback ||
              (needsConfirm(activity.engine)
                ? "확인을 누르면 됩니다."
                : "고르면 바로 이어집니다.")}
          </div>
          {hintText ? (
            <p className={styles.hintBox}>
              {hintText}{" "}
              {hintBack ? (
                <button
                  type="button"
                  className={styles.labBtnGhost}
                  onClick={() => goTo(hintBack)}
                >
                  이전 단계로
                </button>
              ) : null}
            </p>
          ) : null}
          <div className={styles.actions}>
            {needsConfirm(activity.engine) ? (
              <button
                type="button"
                className={styles.labBtnPrimary}
                onClick={() => checkWith(value)}
              >
                확인
              </button>
            ) : null}
            <button
              type="button"
              className={styles.labBtnSecondary}
              onClick={hint}
            >
              도움
            </button>
            {tone === "bad" ? (
              <button
                type="button"
                className={styles.labBtnSecondary}
                onClick={() => {
                  board.current
                    ?.querySelector<HTMLElement>(
                      'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
                    )
                    ?.focus({ preventScroll: true });
                  setValue(emptyValue(currentActivity.engine));
                  setFeedback("");
                  setTone("");
                }}
              >
                다시 해보기
              </button>
            ) : null}
            {index > 0 ? (
              <button
                type="button"
                className={styles.labBtnGhost}
                onClick={() =>
                  navigate(setCourseIndex(save, course.id, index - 1))
                }
              >
                이전
              </button>
            ) : null}
            {record?.completed ? (
              <button
                type="button"
                className={styles.labBtnGhost}
                onClick={() =>
                  navigate(setCourseIndex(save, course.id, index + 1))
                }
              >
                다음
              </button>
            ) : null}
          </div>
        </section>
        <div
          className={styles.bar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index}
          aria-label="코스 진행"
        >
          <span style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <p className={styles.note}>
          <Link href="/lab">코스 목록</Link>
        </p>
      </main>
    </LabShell>
  );
}
