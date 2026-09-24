"use client";

import {
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { mmss } from "@/components/unified/conceptFormat";
import type { ConceptLectureForStudent } from "@/contracts/conceptLecture.contract";
import { resumePosition, watchPercent } from "@/lib/concept/watchRules";
import {
  clampSeekTarget,
  nextPlaybackRate,
  PLAYBACK_TICK_MS,
  playbackTick,
  WATCH_REPORT_INTERVAL_MS,
  type SeekState,
} from "@/lib/learn/seekGuard";

import { postWatch } from "./learnApi";
import s from "./learn.module.css";
import { LectureFrame } from "./LectureFrame";
import {
  PlayerFactoryContext,
  type PlayerEvent,
  type PlayerHandle,
} from "./playerAdapter";

export type WatchProgress = { maxWatched: number; completed: boolean };
type Watch = NonNullable<ConceptLectureForStudent["watch"]>;

/**
 * 학생 재생기 — 시안 `sPlay` 의 16:9 판 + 막대(재생 · 진행 막대(코발트) · 본 곳(검은 눈금) · 시간 · 배속).
 *
 * 🔴 앞으로 감기는 **본 곳까지만**, 뒤로 감기·배속은 되고, 한 번 끝까지 본 영상은 어디든(D-124 ⑸).
 *    규칙은 `src/lib/learn/seekGuard.ts` 한 곳 — 막대로 옮길 때 `clampSeekTarget`, 재생 중 감시 틱마다
 *    `playbackTick`(배속·밀린 틱을 안다). 유튜브 조작 막대는 꺼 두었다(`youtubePlayer.ts`) — 감기는 이 막대뿐이다.
 *    우회 방지가 목적은 아니다 — 평범한 학생이 무심코 건너뛰지 않게 하는 정도(D-124 ⑸).
 *
 * 시청 보고(`POST /api/learn/watch`): 재생 중 `WATCH_REPORT_INTERVAL_MS` 마다 + 멈춤 · 끝 · 창 가림/닫기
 * (`visibilitychange` · `pagehide` — keepalive). 서버가 %를 다시 센다. 실패는 조용히 되돌려 다음 보고가
 * 다시 보낸다 — 학생 화면에 오류를 띄우지 않는다(브리프 §1.2).
 */
export function LecturePlayer({
  lecture,
  onProgress,
  onWatched,
}: {
  lecture: ConceptLectureForStudent;
  /** 본 곳(초 단위) · 완료가 바뀌면 — 안내 문구가 쓴다 */
  onProgress?: (progress: WatchProgress) => void;
  /** 서버가 센 시청 기록 — 상태 알약이 쓴다 */
  onWatched?: (watch: Watch) => void;
}) {
  const createPlayer = useContext(PlayerFactoryContext);
  const initialMax = lecture.watch?.maxSeconds ?? 0;
  const initialCompleted = lecture.watch?.completed ?? false;

  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const seekRef = useRef<SeekState>({
    maxWatched: initialMax,
    completed: initialCompleted,
    duration: lecture.seconds,
  });
  const rateRef = useRef(1);
  const lastTickRef = useRef<{ pos: number; at: number } | null>(null);
  const reportedRef = useRef(initialMax);
  const lastReportAtRef = useRef(0);
  const progressRef = useRef<WatchProgress>({
    maxWatched: Math.floor(initialMax),
    completed: initialCompleted,
  });

  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [maxWatched, setMaxWatched] = useState(initialMax);
  const [duration, setDuration] = useState(lecture.seconds);
  const [rate, setRate] = useState(1);

  /** 본 곳(초) · 완료가 바뀌었을 때만 부모에 알린다 */
  const emitProgress = useEffectEvent(() => {
    const next = {
      maxWatched: Math.floor(seekRef.current.maxWatched),
      completed: seekRef.current.completed,
    };
    const before = progressRef.current;
    if (
      next.maxWatched === before.maxWatched &&
      next.completed === before.completed
    )
      return;
    progressRef.current = next;
    onProgress?.(next);
  });

  /** 새로 본 곳이 있을 때만 보고한다. 실패하면 조용히 되돌린다 — 다음 보고가 다시 보낸다 */
  const report = useEffectEvent(async (keepalive: boolean) => {
    const max = seekRef.current.maxWatched;
    if (max <= reportedRef.current) return;
    const before = reportedRef.current;
    reportedRef.current = max;
    lastReportAtRef.current = Date.now();
    const watch = await postWatch(
      {
        lectureId: lecture.id,
        seconds: max,
        percent: Math.round(watchPercent(max, seekRef.current.duration)),
      },
      { keepalive },
    );
    if (!watch) {
      if (reportedRef.current === max) reportedRef.current = before;
      return;
    }
    if (watch.completed && !seekRef.current.completed) {
      seekRef.current.completed = true;
      emitProgress();
    }
    onWatched?.(watch);
  });

  /** 🔴 감시 틱 — 저절로 흐르면 본 곳을 올리고, 안 본 곳으로 튀었으면 본 곳으로 되돌린다 */
  const tick = useEffectEvent(() => {
    const player = playerRef.current;
    if (!player) return;
    const now = Date.now();
    const current = player.currentTime();
    const last = lastTickRef.current ?? { pos: current, at: now };
    const verdict = playbackTick(
      {
        previous: last.pos,
        current,
        elapsedSeconds: (now - last.at) / 1000,
        rate: rateRef.current,
      },
      seekRef.current,
    );
    if (verdict.kind === "rewind") {
      player.seekTo(verdict.to);
      lastTickRef.current = { pos: verdict.to, at: now };
      setPosition(verdict.to);
      return;
    }
    if (verdict.kind === "advance") {
      seekRef.current.maxWatched = verdict.maxWatched;
      setMaxWatched(verdict.maxWatched);
      emitProgress();
    }
    lastTickRef.current = { pos: current, at: now };
    setPosition(current);
    if (now - lastReportAtRef.current >= WATCH_REPORT_INTERVAL_MS)
      void report(false);
  });

  const onPlayerEvent = useEffectEvent((event: PlayerEvent) => {
    if (event === "playing") {
      const player = playerRef.current;
      lastTickRef.current = player
        ? { pos: player.currentTime(), at: Date.now() }
        : null;
      if (lastReportAtRef.current === 0) lastReportAtRef.current = Date.now();
      setPlaying(true);
      return;
    }
    if (event === "error") {
      setPlaying(false);
      setStatus("failed");
      return;
    }
    // 멈춤 · 끝 — 마지막 자리를 한 번 더 읽고(가드를 지나) 보고한다
    tick();
    setPlaying(false);
    void report(false);
  });

  // 재생기 세우기 — 유튜브 스크립트는 이 화면에서만 붙는다(브리프 §1.2)
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    let handle: PlayerHandle | null = null;
    const start = seekRef.current;
    createPlayer({
      host,
      videoUrl: lecture.videoUrl,
      start: start.completed
        ? 0
        : resumePosition(start.maxWatched, start.duration),
      title: lecture.title,
      onEvent: (event) => {
        if (alive) onPlayerEvent(event);
      },
    }).then(
      (player) => {
        if (!alive) {
          player.destroy();
          return;
        }
        handle = player;
        playerRef.current = player;
        const known = player.duration();
        if (known > 0) {
          seekRef.current.duration = known;
          setDuration(known);
        }
        setPosition(player.currentTime());
        setStatus("ready");
      },
      () => {
        if (alive) setStatus("failed");
      },
    );
    return () => {
      alive = false;
      handle?.destroy();
      if (playerRef.current === handle) playerRef.current = null;
    };
  }, [createPlayer, lecture.videoUrl, lecture.title, attempt]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => tick(), PLAYBACK_TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  // 창을 가리거나 닫을 때 · 목록으로 떠날 때 — 새로 본 곳이 있으면 keepalive 로 보낸다
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void report(true);
    };
    const onPageHide = () => void report(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      void report(true);
    };
  }, []);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pause();
    else player.play();
  }

  /** 🔴 막대로 옮긴다 — 앞으로는 본 곳까지만(끝까지 본 영상은 어디든) */
  function seek(target: number) {
    const player = playerRef.current;
    if (!player) return;
    const to = clampSeekTarget(target, seekRef.current);
    player.seekTo(to);
    lastTickRef.current = { pos: to, at: Date.now() };
    setPosition(to);
  }

  function cycleRate() {
    const player = playerRef.current;
    if (!player) return;
    const next = nextPlaybackRate(rateRef.current);
    rateRef.current = next;
    player.setRate(next);
    setRate(next);
  }

  const ready = status === "ready";
  const pct = (seconds: number) =>
    `${duration > 0 ? Math.min(100, (seconds / duration) * 100) : 0}%`;

  return (
    <div className={s.player}>
      <LectureFrame title={lecture.title}>
        <div ref={hostRef} className={s.frameHost} />
        {status === "failed" ? (
          <div className={s.failed} role="alert">
            <span>영상을 불러오지 못했습니다.</span>
            <button
              type="button"
              className={s.playButton}
              onClick={() => {
                setStatus("loading");
                setAttempt((n) => n + 1);
              }}
            >
              다시 시도
            </button>
          </div>
        ) : null}
      </LectureFrame>
      <div className={s.bar}>
        <button
          type="button"
          className={s.playButton}
          onClick={togglePlay}
          disabled={!ready}
        >
          {playing ? "멈춤" : "재생"}
        </button>
        <span
          className={s.track}
          style={{ "--played": pct(position) } as CSSProperties}
        >
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.round(duration))}
            step={1}
            value={Math.min(Math.round(position), Math.round(duration))}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="재생 위치"
            aria-valuetext={`${mmss(position)} / ${mmss(duration)}`}
            disabled={!ready}
            style={{ "--played": pct(position) } as CSSProperties}
          />
          <i
            className={s.seen}
            style={{ left: pct(maxWatched) }}
            title="본 곳"
            aria-hidden="true"
          />
        </span>
        <span className={s.time}>
          {mmss(position)} / {mmss(duration)}
        </span>
        <button
          type="button"
          className={s.rateButton}
          onClick={cycleRate}
          disabled={!ready}
          aria-label={`재생 속도 ${rate}배`}
        >
          {rate}×
        </button>
      </div>
    </div>
  );
}
