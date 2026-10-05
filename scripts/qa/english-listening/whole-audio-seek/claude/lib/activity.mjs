/**
 * Measured loudness of the native PCM, in fixed 20 ms windows.
 *
 * One number per window: the larger channel's sum of squared PCM16 samples. It is
 * an exact integer, so a replay must reproduce it bit for bit. All time values
 * derived from it are multiples of the window on the native frame clock.
 */

export const WINDOW_MS = 20;
export const FULL_SCALE_SQUARE = 32768 * 32768;

export class ActivityError extends Error {}

const fail = (message) => {
  throw new ActivityError(message);
};

export function windowFrames(sampleRate) {
  const frames = (sampleRate * WINDOW_MS) / 1000;
  if (!Number.isInteger(frames) || frames <= 0)
    fail("Sample rate has no whole 20 ms window: " + sampleRate);
  return frames;
}

/** Max-channel sum of squares for every complete window; a trailing partial is not measured. */
export function measureEnergy(planes, frameCount, sampleRate) {
  const frames = windowFrames(sampleRate);
  const count = Math.floor(frameCount / frames);
  const energy = new Float64Array(count);
  for (let w = 0; w < count; w++) {
    let best = 0;
    const from = w * frames;
    for (const plane of planes) {
      let sum = 0;
      for (let i = from; i < from + frames; i++) sum += plane[i] * plane[i];
      if (sum > best) best = sum;
    }
    energy[w] = best;
  }
  return energy;
}

/** Energy of a window whose RMS equals the given dBFS level. */
export const energyAtDbfs = (dbfs, frames) =>
  frames * FULL_SCALE_SQUARE * 10 ** (dbfs / 10);

export const dbfsOfEnergy = (energy, frames) =>
  energy <= 0
    ? -Infinity
    : 10 * Math.log10(energy / frames / FULL_SCALE_SQUARE);

/**
 * Sound islands: maximal runs of windows at or above the threshold, where a quiet
 * run shorter than `bridgeWindows` does not split an island.
 * Returns [{ start, end }] in windows, end exclusive.
 */
export function soundIslands(energy, threshold, bridgeWindows, from = 0, to) {
  const limit = to === undefined ? energy.length : to;
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(limit) ||
    from < 0 ||
    limit > energy.length ||
    from > limit
  )
    fail("Island scan is outside the measured audio");
  const islands = [];
  let start = -1;
  let lastActive = -1;
  for (let w = from; w < limit; w++) {
    if (energy[w] < threshold) continue;
    if (start >= 0 && w - lastActive - 1 >= bridgeWindows) {
      islands.push({ start, end: lastActive + 1 });
      start = -1;
    }
    if (start < 0) start = w;
    lastActive = w;
  }
  if (start >= 0) islands.push({ start, end: lastActive + 1 });
  return islands;
}

/** Count of consecutive windows below the threshold immediately before `window`. */
export function quietBefore(energy, threshold, window) {
  if (!Number.isInteger(window) || window < 0 || window > energy.length)
    fail("Quiet scan is outside the measured audio");
  let count = 0;
  for (let w = window - 1; w >= 0 && energy[w] < threshold; w--) count++;
  return count;
}

/** Loudest window level in [from, to), or -Infinity for an empty or silent range. */
export function peakDbfs(energy, frames, from, to) {
  if (from < 0 || to > energy.length || from > to)
    fail("Peak scan is outside the measured audio");
  let best = 0;
  for (let w = from; w < to; w++) if (energy[w] > best) best = energy[w];
  return dbfsOfEnergy(best, frames);
}
