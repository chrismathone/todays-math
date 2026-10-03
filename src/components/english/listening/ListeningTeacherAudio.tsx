"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./ListeningTeacherWorkspace.module.css";

function clock(seconds: number) {
  const whole = Math.floor(Math.max(0, seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/** A new key is required for each document, revision, group or media URL. */
export function ListeningTeacherAudio({
  url,
  durationMs,
  disabled,
}: {
  url: string | undefined;
  durationMs: number;
  disabled: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const active = useRef(false);
  const wanted = useRef(false);
  const attempt = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(durationMs / 1000);
  const [error, setError] = useState<"play" | "source" | "seek" | null>(null);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    active.current = true;
    return () => {
      active.current = false;
      wanted.current = false;
      attempt.current += 1;
      audio?.pause();
    };
  }, []);

  function pause() {
    wanted.current = false;
    attempt.current += 1;
    audioRef.current?.pause();
    setPlaying(false);
    setPending(false);
  }

  async function play(fromStart = false) {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    const ticket = ++attempt.current;
    wanted.current = true;
    setPending(true);
    setError(null);
    try {
      if (error === "source") audio.load();
      if (fromStart) {
        audio.currentTime = 0;
        setPosition(0);
      }
      await audio.play();
      if (!active.current || !wanted.current) {
        audio.pause();
        return;
      }
      if (ticket === attempt.current) setPlaying(true);
    } catch {
      if (active.current && ticket === attempt.current) {
        wanted.current = false;
        setPlaying(false);
        setError("play");
      }
    } finally {
      if (active.current && ticket === attempt.current) setPending(false);
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    try {
      const next = Math.min(duration, Math.max(0, value));
      audio.currentTime = next;
      setPosition(next);
    } catch {
      setError("seek");
    }
  }

  const unavailable = !url || disabled;
  return (
    <section className={styles.player} aria-label="교사 음원 재생">
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            if (Number.isFinite(value) && value > 0) setDuration(value);
          }}
          onPlaying={() => {
            if (!active.current || !wanted.current) audioRef.current?.pause();
            else {
              setPlaying(true);
              setPending(false);
            }
          }}
          onPause={() => {
            setPlaying(false);
          }}
          onEnded={() => {
            wanted.current = false;
            setPlaying(false);
            setPending(false);
          }}
          onError={() => {
            pause();
            setError("source");
          }}
        />
      ) : null}
      <div className={styles.playerMain}>
        <button
          type="button"
          disabled={unavailable}
          onClick={() => (playing || pending ? pause() : void play())}
        >
          {playing ? "일시정지" : pending ? "재생 취소" : "재생"}
        </button>
        <input
          type="range"
          aria-label="재생 위치"
          aria-valuetext={`${clock(position)} / ${clock(duration)}`}
          min={0}
          max={duration}
          step={0.1}
          value={Math.min(position, duration)}
          disabled={unavailable}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <span className={styles.time}>
          {clock(position)} / {clock(duration)}
        </span>
        <button
          type="button"
          disabled={unavailable || pending}
          onClick={() => void play(true)}
        >
          처음부터 재생
        </button>
      </div>
      <p className={styles.muted} role="status">
        {!url
          ? "재생할 음원이 없습니다."
          : playing
            ? "재생 중 · 교사 기기"
            : pending
              ? "재생 준비 중입니다."
              : "교사 기기에서 재생합니다."}
      </p>
      {error ? (
        <div role="alert" className={styles.error}>
          <p>
            {error === "source"
              ? "음원을 불러오지 못했습니다. 다시 시도해 주세요."
              : error === "seek"
                ? "재생 위치를 옮기지 못했습니다. 다시 시도해 주세요."
                : "음원을 재생하지 못했습니다. 다시 시도해 주세요."}
          </p>
          <button
            type="button"
            disabled={unavailable || pending}
            onClick={() => void play()}
          >
            재생 다시 시도
          </button>
        </div>
      ) : null}
    </section>
  );
}
