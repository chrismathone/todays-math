"use client";

import { useMemo, useState } from "react";
import type { TeacherWireFixture } from "./fixture";
import {
  createTeacherFixtureSource,
  type TeacherFixtureState,
} from "./fixtureSource";
import {
  TeacherFadingStatus,
  type TeacherFadingPreviewData,
} from "./TeacherFadingStatus";
import {
  TEACHER_HIFI_PROPOSALS,
  TEACHER_HIFI_VARIANTS,
  type TeacherHifiVariant,
} from "./hifiVariants";
import s from "./TeacherHifiGallery.module.css";

export function TeacherHifiGallery({
  fixture,
  preview,
  only,
  initialClass,
  initialState = "ready",
}: {
  fixture: TeacherWireFixture;
  preview: TeacherFadingPreviewData;
  only?: TeacherHifiVariant;
  initialClass?: string;
  initialState?: TeacherFixtureState;
}) {
  const [state, setState] = useState(initialState);
  const source = useMemo(
    () => createTeacherFixtureSource(fixture, state),
    [fixture, state],
  );
  const classIndex = fixture.dashboard.classes.findIndex(
    (cls) => cls.id === initialClass,
  );
  const suffix = classIndex < 0 ? "" : `&class=${classIndex}`;
  return (
    <div className={s.root}>
      <aside className={s.rail} aria-label="작업실 위치">
        <strong>오늘 수학</strong>
        <p>작업실</p>
        <div>오늘의 작업</div>
        <div>오늘의 개념</div>
        <div className={s.currentMenu}>오늘의 기억 · SRS</div>
        <p className={s.railFoot}>학생 현황 시각 시안</p>
      </aside>
      <main className={s.main}>
        <header className={s.galleryHeading}>
          <p>원장 화면 · Wire B</p>
          <h1>학생 현황 · Hi-fi 4안</h1>
          <p>살펴볼 학생 먼저. 같은 구조와 표본으로 비교합니다.</p>
          <nav aria-label="시안 이동">
            <a
              href={`/dev/fading-teacher-hifi${suffix ? `?class=${classIndex}` : ""}`}
            >
              4안 함께 보기
            </a>
            {TEACHER_HIFI_VARIANTS.map((variant) => (
              <a
                href={`/dev/fading-teacher-hifi?variant=${variant}${suffix}`}
                key={variant}
                aria-current={only === variant ? "page" : undefined}
              >
                {variant}안{variant === "H2" ? " · 추천" : ""}
              </a>
            ))}
            <a href={`/dev/fading-teacher-wire?variant=B${suffix}`}>
              Wire B 보기
            </a>
          </nav>
          <label className={s.statePicker}>
            상태 표본
            <select
              value={state}
              onChange={(event) =>
                setState(event.target.value as TeacherFixtureState)
              }
            >
              <option value="ready">현황</option>
              <option value="loading">싣는 중</option>
              <option value="empty">학생 0</option>
              <option value="failure">실패</option>
              <option value="closed">닫혀 있음 · 404</option>
              <option value="forbidden">권한 없음 · 403</option>
            </select>
          </label>
        </header>
        {(only ? [only] : TEACHER_HIFI_VARIANTS).map((variant) => (
          <section
            className={s.proposal}
            key={variant}
            data-testid="teacher-hifi-proposal"
            data-variant={variant}
          >
            <header className={s.proposalHeading}>
              <div>
                <h2>
                  {variant}안 · {TEACHER_HIFI_PROPOSALS[variant].title}
                </h2>
                <p>{TEACHER_HIFI_PROPOSALS[variant].description}</p>
              </div>
              {variant === "H2" ? <span>추천</span> : null}
            </header>
            <TeacherFadingStatus
              key={state}
              {...source}
              variant={variant}
              preview={preview}
              initialClass={initialClass}
            />
          </section>
        ))}
      </main>
    </div>
  );
}
