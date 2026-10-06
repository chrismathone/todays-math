/**
 * 테스트 도구판의 상태 바꾸기 — 순수 함수만. 저장은 `testConsoleRoutes.ts` 가 `changeSrsState` 로 한다
 * (저장 직전 `parseSrsState` 가 계약을 다시 보므로, 여기서 만든 값이 계약을 어기면 저장되지 않는다).
 */
import type { StoredExplorer } from "@/contracts/mathExplorers.contract";
import type { ResetPart } from "@/contracts/testConsole.contract";
import { createMemories } from "./memory";
import type { StoredSrsState } from "./serverState";

/** `all` 은 행을 지우는 일이라 여기 오지 않는다(라우트가 직접 지운다). */
export function resetSrsPart(
  state: StoredSrsState,
  part: Exclude<ResetPart, "all">,
): StoredSrsState {
  switch (part) {
    case "memory":
      return { ...state, memories: createMemories(), missions: [] };
    case "explorers":
      return { ...state, explorers: undefined };
    case "expedition":
      return { ...state, expedition: undefined };
    case "course":
      return { ...state, course: undefined };
    case "journey":
      return { ...state, dailyJourney: undefined };
    case "fading":
      return { ...state, fading: undefined };
  }
}

export interface ExplorerPatch {
  stars?: number;
  level?: number;
  clearCards?: boolean;
}

export function patchExplorerProfile(
  explorer: StoredExplorer,
  patch: ExplorerPatch,
): StoredExplorer {
  const profile = { ...explorer.profile };
  if (patch.stars !== undefined) {
    profile.stars = patch.stars;
    profile.earned = Math.max(profile.earned, patch.stars);
  }
  if (patch.level !== undefined) profile.level = patch.level;
  if (patch.clearCards && profile.definitions) {
    const { session: _session, ...rest } = profile.definitions;
    void _session;
    profile.definitions = { ...rest, cards: {}, history: [] };
  }
  return { ...explorer, profile };
}
