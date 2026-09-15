/**
 * 학생 재생기가 영상과 말하는 자리 — **어느 재생기든** 이 모양만 지키면 된다.
 *
 * 제품은 유튜브 IFrame Player API(`youtubePlayer.ts`)를 넣고, 화면 시험과 개발용 시안 페이지(`/dev/learn-hifi`)는
 * 가짜 재생기를 넣는다(`PlayerFactoryContext`). 앞으로 감기 가드는 재생기 안이 아니라 `LecturePlayer` 가
 * `src/lib/learn/seekGuard.ts` 를 불러 한다 — 재생기를 갈아 끼워도 규칙은 그대로다.
 */
import { createContext } from "react";

import { createYouTubePlayer } from "./youtubePlayer";

export type PlayerEvent = "playing" | "paused" | "ended" | "error";

export interface PlayerHandle {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  currentTime(): number;
  /** 모르면 0 */
  duration(): number;
  setRate(rate: number): void;
  destroy(): void;
}

export interface CreatePlayerInput {
  /** 재생기를 붙일 자리(16:9 틀 안) */
  host: HTMLElement;
  /** 정규 watch 주소(`canonicalVideoUrlSchema`) */
  videoUrl: string;
  /** 처음 설 자리(초) — 이어 보기(`resumePosition`) */
  start: number;
  /** 스크린 리더가 읽을 영상 이름 */
  title: string;
  onEvent: (event: PlayerEvent) => void;
}

/** 준비가 끝나면 손잡이를 준다. 못 불러오면(학교 망 차단 등) 거절한다 */
export type CreatePlayer = (input: CreatePlayerInput) => Promise<PlayerHandle>;

export const PlayerFactoryContext =
  createContext<CreatePlayer>(createYouTubePlayer);
