/**
 * Candidate cue onsets on the native clock.
 *
 * A candidate is only a place worth listening to. It never becomes a seek start
 * by itself: a bounded recognition that begins at the proposed start must hear
 * the question's own number first.
 */
import { soundIslands, energyAtDbfs, quietBefore } from "./activity.mjs";
import { POLICY, leadFor } from "./policy.mjs";

/** Sound islands of a whole recording under the fixed policy. */
export function policyIslands(
  energy,
  windowFrames,
  bridgeWindows = POLICY.islandBridgeWindows,
) {
  const threshold = energyAtDbfs(POLICY.quietThresholdDbfs, windowFrames);
  return {
    threshold,
    islands: soundIslands(energy, threshold, bridgeWindows),
  };
}

/**
 * Every island onset with enough measured quiet before it, with what precedes.
 * Returns [{ onsetWindow, startWindow, quietWindows, islandWindows,
 *            previousIslandWindows, nextGapWindows }].
 */
export function onsetCandidates(
  energy,
  windowFrames,
  bridgeWindows = POLICY.islandBridgeWindows,
) {
  const { threshold, islands } = policyIslands(
    energy,
    windowFrames,
    bridgeWindows,
  );
  const out = [];
  islands.forEach((island, index) => {
    const quiet = quietBefore(energy, threshold, island.start);
    if (quiet < POLICY.minimumQuietBeforeWindows) return;
    const previous = islands[index - 1];
    const next = islands[index + 1];
    out.push({
      onsetWindow: island.start,
      startWindow: island.start - leadFor(quiet),
      quietWindows: quiet,
      islandWindows: island.end - island.start,
      previousIslandWindows: previous ? previous.end - previous.start : 0,
      nextGapWindows: next ? next.start - island.end : null,
    });
  });
  return out;
}

/**
 * Onsets under the finer split that lie in the tail of a long island of the
 * normal split, just before `beforeWindow`. This is where a spoken number sits
 * when bridge music runs into it.
 */
export function fineTailCandidates(energy, windowFrames, beforeWindow) {
  const from = beforeWindow - POLICY.fineTailWindows;
  return onsetCandidates(energy, windowFrames, POLICY.fineBridgeWindows).filter(
    (candidate) =>
      candidate.onsetWindow >= from && candidate.onsetWindow < beforeWindow,
  );
}

/** First sound after a long island (bridge music) or after a long quiet. */
export const followsBridge = (candidate) =>
  candidate.previousIslandWindows >= POLICY.bridgeIslandWindows ||
  candidate.quietWindows >= POLICY.longQuietWindows;

/** Probe bounds in windows for a candidate; null when too little audio remains. */
export function probeBounds(
  candidate,
  windowCount,
  length = POLICY.probeWindows,
) {
  const start = candidate.startWindow;
  if (start < 0) return null;
  const end = Math.min(windowCount, start + length);
  if (end - start < POLICY.minimumProbeWindows) return null;
  return { startWindow: start, windowCount: end - start };
}
