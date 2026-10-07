"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { mmss } from "@/components/unified/conceptFormat";
import type { ConceptLectureForStudent } from "@/contracts/conceptLecture.contract";
import type {
  LearnLectureDetail,
  LearnLectureList,
} from "@/contracts/studentAccount.contract";
import { nextLectureAfter, watchState } from "@/lib/learn/lectureGroups";

import { fetchLectureDetail, fetchLectureList, type Loaded } from "./learnApi";
import s from "./learn.module.css";
import { LearnTopBar } from "./LearnTopBar";
import { LecturePlayer, type WatchProgress } from "./LecturePlayer";

/** 감기 안내 문구 셋 — 시안 `sPlay` 그대로(처음 · 보는 중 · 끝까지 본 뒤) */
function seekNote(progress: WatchProgress): string {
  if (progress.completed)
    return "끝까지 본 영상입니다 — 어느 곳이든 다시 볼 수 있습니다.";
  if (progress.maxWatched > 0)
    return `앞으로 감기는 본 곳(${mmss(progress.maxWatched)})까지만 됩니다. 뒤로 감기와 배속은 됩니다.`;
  return "처음부터 봅니다. 앞으로 감기는 본 곳까지만 됩니다.";
}

/**
 * 재생 화면 — 시안 `sPlay`(05 §8.9 · D-125 ⑴ 1안). «‹ 목록» · 재생기 · 제목 · 차시 · 길이 · 상태 · 감기 안내 ·
 * 다음 영상. 부르는 것은 `GET /api/learn/lectures/{id}`(이 강의) · `GET /api/learn/lectures`(다음 영상의 차례) ·
 * `POST /api/learn/watch`(재생기가 보고).
 */
export function WatchScreen({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<Loaded<LearnLectureDetail> | null>(null);
  const [list, setList] = useState<LearnLectureList | null>(null);
  const [watch, setWatch] = useState<ConceptLectureForStudent["watch"]>(null);
  const [progress, setProgress] = useState<WatchProgress>({
    maxWatched: 0,
    completed: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    void fetchLectureDetail(lectureId).then((result) => {
      if (!alive) return;
      if (!result.ok && result.failure === "unauthorized") {
        router.replace("/learn/login");
        return;
      }
      if (!result.ok && result.failure === "mustChange") {
        router.replace("/learn/password");
        return;
      }
      setDetail(result);
      if (result.ok) {
        const w = result.data.lecture.watch;
        setWatch(w);
        setProgress({
          maxWatched: Math.floor(w?.maxSeconds ?? 0),
          completed: w?.completed ?? false,
        });
      }
    });
    void fetchLectureList().then((result) => {
      if (alive && result.ok) setList(result.data);
    });
    return () => {
      alive = false;
    };
  }, [lectureId, attempt, router]);

  const data = detail?.ok ? detail.data : null;
  const next =
    data && list ? nextLectureAfter(list.lectures, data.lecture.id) : null;
  const state = watchState(watch);

  return (
    <div className={s.column} data-student-module-content="watch">
      <LearnTopBar student={data?.student ?? null} />
      <main className={`${s.body} ${s.watchBody}`}>
        <Link href="/learn/lectures" className={s.back}>
          ‹ 목록
        </Link>
        {detail === null ? (
          <p role="status" className={s.line}>
            불러오는 중…
          </p>
        ) : null}
        {detail && !detail.ok && detail.failure === "notFound" ? (
          <p className={s.line}>볼 수 없는 강의입니다.</p>
        ) : null}
        {detail && !detail.ok && detail.failure === "error" ? (
          <>
            <p role="alert" className={s.error}>
              강의를 불러오지 못했습니다.
            </p>
            <button
              type="button"
              className={s.primary}
              onClick={() => {
                setDetail(null);
                setAttempt((n) => n + 1);
              }}
            >
              다시 불러오기
            </button>
          </>
        ) : null}
        {data ? (
          <>
            <LecturePlayer
              key={data.lecture.id}
              lecture={data.lecture}
              onProgress={setProgress}
              onWatched={setWatch}
            />
            <div className={s.watchHeading}>
              <h1 className={s.titleLine}>{data.lecture.title}</h1>
              <span className={s.meta}>
                {data.unit.section} · {mmss(data.lecture.seconds)} ·{" "}
                <span className={s[state.key]}>{state.label}</span>
              </span>
            </div>
            <p className={s.note}>{seekNote(progress)}</p>
            {next ? (
              <Link href={`/learn/watch/${next.id}`} className={s.next}>
                <span>다음 영상</span>
                <b>{next.title}</b>
              </Link>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
