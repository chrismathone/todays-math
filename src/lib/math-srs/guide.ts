import type { GuideId } from "@/contracts/mathSrsGuide.contract";
import type { StoredSrsState } from "./serverState";

/** Choosing the same guide again keeps its first time; another guide replaces it. */
export function chooseGuide(
  state: StoredSrsState,
  id: GuideId,
  now: Date,
): StoredSrsState {
  if (state.guide?.id === id) return state;
  return { ...state, guide: { id, chosenAt: now.toISOString() } };
}
