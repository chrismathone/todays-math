/**
 * Candidate cue onsets on the native clock.
 *
 * A candidate is only a place worth listening to. It never becomes a seek start
 * by itself: a bounded recognition that begins at the proposed start must hear
 * the question's own number first.
 */
import { soundIslands, energyAtDbfs, quietBefore } from "./activity.mjs";
import { POLICY } from "./policy.mjs";

/** Sound islands of a whole recording under the fixed policy. */
export function policyIslands(energy, windowFrames) {
  const threshold = energyAtDbfs(POLICY.quietThresholdDbfs, windowFrames);
  return {
    threshold,
    islands: soundIslands(energy, threshold, POLICY.islandBridgeWindows),
  };
}

/**
 * Every island onset with enough measured quiet before it, with what precedes.
 * Returns [{ onsetWindow, startWindow, quietWindows, islandWindows,
 *            previousIslandWindows, nextGapWindows }].
 */
export function onsetCandidates(energy, windowFrames) {
  const { threshold, islands } = policyIslands(energy, windowFrames);
  const out = [];
  islands.forEach((island, index) => {
    const quiet = quietBefore(energy, threshold, island.start);
    if (quiet < POLICY.minimumQuietBeforeWindows) return;
    const previous = islands[index - 1];
    const next = islands[index + 1];
    out.push({
      onsetWindow: island.start,
      startWindow: island.start - POLICY.leadWindows,
      quietWindows: quiet,
      islandWindows: island.end - island.start,
      previousIslandWindows: previous ? previous.end - previous.start : 0,
      nextGapWindows: next ? next.start - island.end : null,
    });
  });
  return out;
}

/** First sound after a long island (bridge music) or after a long quiet. */
export const followsBridge = (candidate) =>
  candidate.previousIslandWindows >= POLICY.bridgeIslandWindows ||
  candidate.quietWindows >= POLICY.longQuietWindows;

/** Probe bounds in windows for a candidate; null when too little audio remains. */
export function probeBounds(candidate, windowCount) {
  const start = candidate.startWindow;
  if (start < 0) return null;
  const end = Math.min(windowCount, start + POLICY.probeWindows);
  if (end - start < POLICY.minimumProbeWindows) return null;
  return { startWindow: start, windowCount: end - start };
}
