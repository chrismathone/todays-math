"use client";
import { useContext, useEffect, useRef, useState } from "react";
import type { TextbookStudentQr } from "@/contracts/textbookStudent.contract";
import { PlayerFactoryContext, type PlayerHandle } from "../playerAdapter";
import { LectureFrame } from "../LectureFrame";
import s from "./textbookLearn.module.css";

/** Uses the same player adapter as lectures. A clip never submits a fabricated lecture watch record. */
export function TextbookVideo({
  video,
  title,
}: {
  video: TextbookStudentQr["video"];
  title: string;
}) {
  const createPlayer = useContext(PlayerFactoryContext);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerHandle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [playing, setPlaying] = useState(false);
  const [retry, setRetry] = useState(0);
  const id = video.providerVideoId,
    start = video.startSeconds,
    end = video.endSeconds;
  useEffect(() => {
    if (!id || !host.current) return;
    let cancelled = false;
    let handle: PlayerHandle | null = null;
    void createPlayer({
      host: host.current,
      videoUrl: `https://www.youtube.com/watch?v=${id}`,
      start,
      title,
      onEvent: (event) => {
        if (cancelled) return;
        if (event === "error") setStatus("failed");
        setPlaying(event === "playing");
      },
    })
      .then((created) => {
        if (cancelled) {
          created.destroy();
          return;
        }
        handle = created;
        player.current = created;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    const timer = window.setInterval(() => {
      if (!handle) return;
      const time = handle.currentTime();
      if (end !== null && time >= end) {
        handle.pause();
        setPlaying(false);
      }
      if (time < start - 1) handle.seekTo(start);
    }, 250);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      handle?.destroy();
      player.current = null;
    };
  }, [id, start, end, title, createPlayer, retry]);
  if (video.state !== "ready")
    return (
      <p className={s.muted}>
        {video.state === "withdrawn"
          ? "영상 제공이 중단되었습니다."
          : "해설 영상을 준비하고 있습니다."}
      </p>
    );
  return (
    <section aria-label="교재 해설 영상" className={s.block}>
      <LectureFrame title={title}>
        <div ref={host} className={s.playerHost} />
      </LectureFrame>
      {status === "failed" ? (
        <>
          <p role="alert">영상을 불러오지 못했습니다.</p>
          <button
            onClick={() => {
              setStatus("loading");
              setRetry((value) => value + 1);
            }}
          >
            다시 불러오기
          </button>
        </>
      ) : (
        <button
          disabled={status !== "ready"}
          onClick={() => {
            const current = player.current;
            if (!current) return;
            if (playing) current.pause();
            else {
              if (end !== null && current.currentTime() >= end)
                current.seekTo(start);
              current.play();
            }
          }}
        >
          {status === "loading"
            ? "영상 준비 중…"
            : playing
              ? "일시 정지"
              : "해설 재생"}
        </button>
      )}
    </section>
  );
}
