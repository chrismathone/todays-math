/**
 * 유튜브 IFrame Player API 로 학생 재생기를 세운다 — **nocookie** 호스트 · 유튜브 조작 막대를 끈다
 * (controls 0 · 키보드 0 · 전체 화면 0). 감기는 우리 막대(`LecturePlayer`)만 한다 — 그래야 앞으로 감기 가드
 * (`seekGuard.ts`)가 유일한 길이 된다. 가드는 우회 방지가 목적이 아니다(D-124 ⑸).
 *
 * 스크립트는 **재생 화면에서만** 부른다(브리프 §1.2) — 이 모듈이 불릴 때 처음 붙인다.
 * 못 불러오면(학교 망 차단 · 느린 망) 거절한다 → 화면이 «영상을 불러오지 못했습니다» + 다시 시도.
 */
import { parseYouTubeId } from "@/lib/concept/youtube";

import type { CreatePlayer, PlayerHandle } from "./playerAdapter";

const API_SRC = "https://www.youtube.com/iframe_api";
const NOCOOKIE_HOST = "https://www.youtube-nocookie.com";
/** 스크립트 · 재생기 준비를 기다리는 한도 */
const LOAD_TIMEOUT_MS = 15_000;

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YTNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = (why: string) => {
      window.clearTimeout(timer);
      loading = null;
      script.remove();
      reject(new Error(why));
    };
    const timer = window.setTimeout(
      () => fail("유튜브 스크립트가 제때 안 왔다"),
      LOAD_TIMEOUT_MS,
    );
    const before = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      before?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else fail("유튜브 스크립트가 재생기를 안 줬다");
    };
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => fail("유튜브 스크립트를 못 불러왔다");
    document.head.appendChild(script);
  });
  return loading;
}

export const createYouTubePlayer: CreatePlayer = async ({
  host,
  videoUrl,
  start,
  title,
  onEvent,
}) => {
  const videoId = parseYouTubeId(videoUrl);
  if (!videoId) throw new Error("유튜브 영상 주소가 아니다");
  const YT = await loadApi();
  return new Promise<PlayerHandle>((resolve, reject) => {
    const mount = document.createElement("div");
    host.appendChild(mount);
    let ready = false;
    const timer = window.setTimeout(() => {
      if (ready) return;
      player.destroy();
      mount.remove();
      reject(new Error("유튜브 재생기가 제때 준비되지 않았다"));
    }, LOAD_TIMEOUT_MS);
    const player: YTPlayer = new YT.Player(mount, {
      host: NOCOOKIE_HOST,
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        playsinline: 1,
        iv_load_policy: 3,
        start: Math.floor(start),
      },
      events: {
        onReady: () => {
          ready = true;
          window.clearTimeout(timer);
          player.getIframe().title = `«${title}» 영상`;
          resolve(handle);
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) onEvent("playing");
          else if (e.data === YT.PlayerState.PAUSED) onEvent("paused");
          else if (e.data === YT.PlayerState.ENDED) onEvent("ended");
        },
        onError: () => {
          if (!ready) {
            window.clearTimeout(timer);
            reject(new Error("유튜브 재생기 오류"));
          } else onEvent("error");
        },
      },
    });
    const handle: PlayerHandle = {
      play: () => player.playVideo(),
      pause: () => player.pauseVideo(),
      seekTo: (seconds) => player.seekTo(seconds, true),
      currentTime: () => player.getCurrentTime() || 0,
      duration: () => player.getDuration() || 0,
      setRate: (rate) => player.setPlaybackRate(rate),
      destroy: () => {
        player.destroy();
        mount.remove();
      },
    };
  });
};
