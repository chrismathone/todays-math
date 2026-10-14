"use client";

import { useMemo } from "react";
import type { FadingGate } from "@/lib/fading/enabled";
import type { TeacherWireFixture } from "@/components/fading/teacher/fixture";
import { createTeacherFixtureSource } from "@/components/fading/teacher/fixtureSource";
import { SrsWorkspaceView } from "@/components/fading/teacher/SrsWorkspaceView";
import s from "@/components/fading/teacher/TeacherHifiGallery.module.css";
import workroom from "@/components/unified/Workroom.module.css";

export function SrsWorkspaceDevClient({
  fixture,
  gate,
}: {
  fixture: TeacherWireFixture;
  gate: FadingGate;
}) {
  const source = useMemo(() => createTeacherFixtureSource(fixture), [fixture]);
  return (
    <div className={`${s.root} ${workroom.workspace}`}>
      <aside className={s.rail} aria-label="작업실 위치">
        <strong>오늘 수학</strong>
        <p>작업실</p>
        <div>오늘의 작업</div>
        <div>오늘의 개념</div>
        <div className={s.currentMenu}>오늘의 기억 · SRS</div>
        <p className={s.railFoot}>작업실 연결 확인</p>
      </aside>
      <main className={s.main}>
        <header className={s.galleryHeading}>
          <p>작업실 연결 · 표본 자료</p>
          <h1>오늘의 기억 · SRS</h1>
          <nav aria-label="서버 문 표본">
            <a href="?product=off">off</a>
            <a href="?product=read">read</a>
            <a href="?product=on">on</a>
            <a href="?variant=H2">H2 시안</a>
          </nav>
        </header>
        <SrsWorkspaceView
          fadingGate={gate}
          source={source}
          legacy={
            <section aria-label="기존 SRS 현황 표본">
              <h2>기존 SRS 현황</h2>
              <p>이 개발 화면은 기존 화면의 자리를 표본으로 표시합니다.</p>
            </section>
          }
        />
      </main>
    </div>
  );
}
