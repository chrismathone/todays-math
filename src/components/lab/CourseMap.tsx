"use client";

import Link from "next/link";

import { COURSES } from "@/lib/lab/courses";
import { WAITING_DOMAINS } from "@/lib/lab/scope";
import { courseCompleteCount, writeSave } from "@/lib/lab/progress";
import type { LabSave } from "@/lib/lab/types";

import { LabShell } from "./LabShell";
import styles from "./lab.module.css";
import { useLabSave } from "./useLabSave";

export function CourseMap() {
  const { save, setSave } = useLabSave();
  function persist(next: LabSave) {
    setSave(next);
    writeSave(next);
  }
  return (
    <LabShell save={save} onSave={persist}>
      <main className={styles.main}>
        <p className={styles.kicker}>초등 개념 실험실</p>
        <h1>직접 만지며 관계를 찾습니다</h1>
        <p className={styles.lead}>
          짧은 목표를 하나씩 끝낸 뒤, 모양과 숫자가 바뀐 문제에서 같은 생각을
          다시 씁니다. 수 모형을 묶고 푸는 덧셈·뺄셈부터 겉넓이까지, 직접
          조작하고 생각을 확인하는 코스가 열려 있습니다.
        </p>
        <Link href="/lab/math-srs" className={styles.cubeFeature}>
          <span className={styles.cubeFeatureBlocks} aria-hidden="true">
            ↺
          </span>
          <span>
            <small>중등 1학년 · 일차방정식</small>
            <b>오늘의 기억</b>
            <span>
              하루 12문제 · 나에게 맞는 복습 · 새로운 숫자로 다시 도전
            </span>
          </span>
          <strong>미션 시작 →</strong>
        </Link>
        <Link href="/lab/cube-3-1" className={styles.cubeFeature}>
          <span className={styles.cubeFeatureBlocks} aria-hidden="true">
            ▦ <span>▥</span> <i>▪</i>
          </span>
          <span>
            <small>초등 3-1 · 1단원 전체 여정</small>
            <b>덧셈과 뺄셈 실험실</b>
            <span>직접 묶고 풀기 → 세로셈 → 계산 탐정 → 혼자 적용</span>
          </span>
          <strong>실험 시작 →</strong>
        </Link>
        <div className={styles.courseGrid}>
          {COURSES.map((course) => {
            const done = courseCompleteCount(
              save,
              course.activities.map((a) => a.id),
              course.id,
            );
            const total = course.activities.length;
            return (
              <Link
                key={course.id}
                href={`/lab/play/${course.id}`}
                className={styles.courseLink}
              >
                <span className={styles.kicker}>{course.gradeLabel}</span>
                <b>{course.title}</b>
                <span>{course.summary}</span>
                <span>
                  {done} / {total}
                </span>
                <span className={styles.progress} aria-hidden="true">
                  <span style={{ width: `${(done / total) * 100}%` }} />
                </span>
              </Link>
            );
          })}
        </div>
        {WAITING_DOMAINS.length > 0 ? (
          <>
            <p className={styles.kicker}>아직 열지 않은 영역</p>
            <ul className={styles.waitList}>
              {WAITING_DOMAINS.map((domain) => (
                <li key={domain.id}>
                  <b>
                    {domain.gradeLabel} · {domain.title}
                  </b>
                  <span>{domain.summary}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className={styles.note}>
          학원 컴퓨터에서 바로 이어서 할 수 있습니다. 진행은 이 브라우저에
          저장됩니다. 단원별 제외 이유는{" "}
          <Link href="/lab/teacher">교사용 범위</Link>에 있습니다.
        </p>
      </main>
    </LabShell>
  );
}
