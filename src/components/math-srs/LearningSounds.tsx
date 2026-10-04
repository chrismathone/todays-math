"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createLearningSoundEngine,
  type LearningSoundCue,
  type LearningSoundSnapshot,
  type LearningSoundStatus,
} from "@/lib/math-srs/learningSoundEngine";
import {
  LEARNING_SOUND_FILES,
  LEARNING_SOUND_GAIN,
} from "@/lib/math-srs/learningSoundManifest";

/**
 * 학생 수학 효과음 (3자 합의 사운드 v3, 2026-10-04) — 규칙은 `lib/math-srs/learningSoundEngine.ts`.
 *
 * - `enabled` 는 이 기기의 설정이다(기본 끔 · 움직임 줄이기와 따로 · 서버로 가지 않는다).
 * - `gesture()` 는 풀이의 사용자 조작(시작 · 답 제출)의 같은 호출 안에서, `play()` 는 확정된 전이에서 부른다.
 *   렌더 · effect 에서 부르지 않는다. 준비되지 않은 소리는 버려지고 나중에 나지 않는다.
 * - 메서드는 모두 동기 void 이고 던지지 않는다. 공급자가 바뀌지 않는 한 같은 함수다.
 */
export type LearningSounds = {
  enabled: boolean;
  status: LearningSoundStatus;
  setEnabled(value: boolean): void;
  gesture(): void;
  preview(): void;
  play(cue: LearningSoundCue, eventKey: string): void;
  resetStudent(studentId: string | null): void;
};

const noop = () => {};
/** 공급자 밖(교사 · 영어 · 공방 · 시험)은 소리가 없다. */
const OUTSIDE: LearningSounds = {
  enabled: false,
  status: "off",
  setEnabled: noop,
  gesture: noop,
  preview: noop,
  play: noop,
  resetStudent: noop,
};
const SERVER: LearningSoundSnapshot = { enabled: false, status: "off" };
const serverSnapshot = () => SERVER;

const SoundsContext = createContext(OUTSIDE);

const createEngine = () =>
  createLearningSoundEngine({
    files: LEARNING_SOUND_FILES,
    gain: LEARNING_SOUND_GAIN,
  });

/** 학생 수학 탐험 경계에만 둔다. Context 뿐이고 DOM 을 더하지 않는다. */
export function LearningSoundsProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(createEngine);
  const { enabled, status } = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    serverSnapshot,
  );
  useEffect(() => {
    const onStorage = (event: StorageEvent) =>
      engine.storageChanged(event.key, event.newValue);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") engine.pageHidden();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.dispose();
    };
  }, [engine]);
  const sounds = useMemo<LearningSounds>(
    () => ({
      enabled,
      status,
      setEnabled: engine.setEnabled,
      gesture: engine.gesture,
      preview: engine.preview,
      play: engine.play,
      resetStudent: engine.resetStudent,
    }),
    [engine, enabled, status],
  );
  return <SoundsContext value={sounds}>{children}</SoundsContext>;
}

export function useLearningSounds(): LearningSounds {
  return useContext(SoundsContext);
}

/** 공급자 안인가 — 밖에서는 효과음 설정을 보이지 않는다(눌러도 소리가 없는 스위치가 된다). */
export function useHasLearningSounds() {
  return useContext(SoundsContext) !== OUTSIDE;
}
