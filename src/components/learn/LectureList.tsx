"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

import { formatDayWithWeekday, mmss } from "@/components/unified/conceptFormat";
import type { ConceptLectureForStudent } from "@/contracts/conceptLecture.contract";
import type { LearnLectureList } from "@/contracts/studentAccount.contract";
import { kstDateOf } from "@/lib/kstDate";
import {
  groupLecturesByDay,
  watchState,
  type DayGroup,
} from "@/lib/learn/lectureGroups";

import { fetchLectureList } from "./learnApi";
import s from "./learn.module.css";
import { LearnTopBar } from "./LearnTopBar";
import { LectureFrame } from "./LectureFrame";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: LearnLectureList };

/**
 * 학생 목록 — 시안 `sList`(05 §8.9 · D-125 ⑴ 1안). 윗줄 · «오늘의 개념» · **남색 판**(가장 최근 수업) ·
 * 흰 카드(지난 수업). 부르는 것은 `GET /api/learn/lectures` 하나.
 *
 * 묶음·«오늘» 표시는 `groupLecturesByDay` 가 정한다(🔴 «오늘»은 그 날이 오늘(KST)일 때만). 상태 알약은
 * 서버가 센 %(`watchState`). 학생 화면에 AI 고지·잡 ID 는 없다 — 받는 모양에 그 칸이 없다(D-124 ⑹).
 * `now` 는 개발용 시안 페이지·시험이 날짜를 고정할 때만 준다.
 */
export function LectureList({ now }: { now?: Date }) {
  const router = useRouter();
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const today = kstDateOf(now ?? new Date());

  useEffect(() => {
    let alive = true;
    void fetchLectureList().then((result) => {
      if (!alive) return;
      if (result.ok) setState({ status: "ready", data: result.data });
      else if (result.failure === "unauthorized")
        router.replace("/learn/login");
      else if (result.failure === "mustChange")
        router.replace("/learn/password");
      else setState({ status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [attempt, router]);

  const grouped = useMemo((): DayGroup[] | null => {
    if (state.status !== "ready") return [];
    try {
      return groupLecturesByDay(state.data.units, state.data.lectures, today);
    } catch {
      return null;
    }
  }, [state, today]);

  const failed = state.status === "error" || grouped === null;

  return (
    <div className={s.column} data-student-module-content="lectures">
      <LearnTopBar
        student={state.status === "ready" ? state.data.student : null}
      />
      <main className={`${s.body} ${s.lectureBody}`}>
        {state.status === "ready" ? (
          <div className={s.mobileWelcome}>
            <p>오늘도 한 걸음씩</p>
            <strong>{state.data.student.name}님, 수학을 시작해 볼까요?</strong>
          </div>
        ) : null}
        <div className={s.listHeading}>
          <h1 className={s.h}>강의 자료</h1>
          <p>수업에서 배운 강의를 이어서 봐요.</p>
        </div>
        {state.status === "loading" ? (
          <p role="status" className={s.line}>
            불러오는 중…
          </p>
        ) : null}
        {failed ? (
          <>
            <p role="alert" className={s.error}>
              목록을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              className={s.primary}
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              다시 불러오기
            </button>
          </>
        ) : null}
        {state.status === "ready" && grouped?.length === 0 ? (
          <div className={s.lectureEmpty} role="status">
            <strong>아직 배정된 강의가 없어요</strong>
            <p>선생님이 강의를 배정하면 이곳에서 이어 볼 수 있어요.</p>
          </div>
        ) : null}
        {grouped?.map((group, i) => (
          <DaySection key={group.day} group={group} latest={i === 0} />
        ))}
      </main>
    </div>
  );
}

function DaySection({ group, latest }: { group: DayGroup; latest: boolean }) {
  const date = formatDayWithWeekday(group.day);
  return (
    <section
      className={latest ? s.today : s.past}
      aria-label={group.isToday ? `${date} 오늘` : date}
    >
      <p className={s.date}>
        {date}
        {group.isToday ? <span className={s.tag}>오늘</span> : null}
      </p>
      {group.units.map(({ unit, lectures }) => (
        <Fragment key={unit.id}>
          <h2 className={s.unit}>{unit.section}</h2>
          {lectures.map((lecture) => (
            <LectureItem key={lecture.id} lecture={lecture} />
          ))}
        </Fragment>
      ))}
    </section>
  );
}

function LectureItem({ lecture }: { lecture: ConceptLectureForStudent }) {
  const state = watchState(lecture.watch);
  return (
    <Link href={`/learn/watch/${lecture.id}`} className={s.item}>
      <LectureFrame title={lecture.title} mini />
      <span>
        <b className={s.it}>{lecture.title}</b>
        <span className={s.meta}>
          {mmss(lecture.seconds)} ·{" "}
          <span className={s[state.key]}>{state.label}</span>
        </span>
      </span>
    </Link>
  );
}
