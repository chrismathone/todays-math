/**
 * Source-bound cue recognition.
 *
 * An ASR timestamp may choose which region is worth hearing. It is not the
 * onset. A start exists only when Whisper, on the unchanged source clip,
 * hears the spoken cue first. Generated sourceNumber is never that cue.
 *
 * Three selectors stay separate. absolute_energy_v2 cuts at -50 dBFS after
 * at least 100 ms of that quiet. Its lead is min(400 ms, the measured quiet).
 * A forced 400 ms lead after a shorter gap is not the onset. Radio hiss
 * above -50 is not quiet, and its count is never written as one.
 * noise_floor_contrast_v1 measures the previous two seconds of this source.
 * noise_floor_contrast_1second_v1 measures the previous one second with the
 * same median-plus-10 dB rule. Neither noise tier replaces the other.
 * Whisper is still the proof.
 */
import {
  dottedInstructionCueNumbers,
  questionAudioCueNumbers,
} from "./seekBeginnings.ts";

export const QUIET_DBFS = -50;
export const LEAD_WINDOWS = 20;
export const MIN_QUIET_WINDOWS = 20;
/** Clean-source v2. Five 20 ms windows is the 100 ms quiet floor. */
export const MIN_CLEAN_QUIET_WINDOWS = 5;
/** Decibels above this source's energy p05. Selection only, not a seek proof. */
export const NOISE_FLOOR_CONTRAST_DB = 10;
export const PROBE_WINDOWS = 700;
export const MIN_PROBE_WINDOWS = 150;
export const ISLAND_BRIDGE_WINDOWS = 15;
export const FINE_BRIDGE_WINDOWS = 5;
export const MAX_FIRST_SPEECH_SECONDS = 2;
export const HYPOTHESIS_BEFORE_SECONDS = 3;
export const HYPOTHESIS_AFTER_SECONDS = 0.5;
const FULL_SCALE_SQUARE = 32768 * 32768;

export function windowFrames(sampleRate: number): number {
  const frames = sampleRate / 50;
  if (!Number.isInteger(frames) || frames <= 0)
    throw new Error("Sample rate has no whole 20 ms window");
  return frames;
}

export function energyThreshold(frames: number): number {
  return frames * FULL_SCALE_SQUARE * 10 ** (QUIET_DBFS / 10);
}

export function windowDbfs(sumSquares: number, frames: number): number | null {
  if (!(sumSquares > 0)) return null;
  return 10 * Math.log10(sumSquares / frames / FULL_SCALE_SQUARE);
}

export function soundIslands(
  energy: ArrayLike<number>,
  threshold: number,
  bridgeWindows: number,
): Array<{ start: number; end: number }> {
  const islands: Array<{ start: number; end: number }> = [];
  let start = -1;
  let last = -1;
  for (let window = 0; window < energy.length; window += 1) {
    if (energy[window] < threshold) continue;
    if (start >= 0 && window - last - 1 >= bridgeWindows) {
      islands.push({ start, end: last + 1 });
      start = -1;
    }
    if (start < 0) start = window;
    last = window;
  }
  if (start >= 0) islands.push({ start, end: last + 1 });
  return islands;
}

export function quietBefore(
  energy: ArrayLike<number>,
  threshold: number,
  window: number,
): number {
  let count = 0;
  for (let index = window - 1; index >= 0 && energy[index] < threshold; index -= 1)
    count += 1;
  return count;
}

export function leadPeakDbfs(
  energy: ArrayLike<number>,
  frames: number,
  from: number,
  to: number,
): number | null {
  let best = 0;
  for (let window = from; window < to; window += 1)
    if (energy[window] > best) best = energy[window];
  if (best <= 0) return null;
  return 10 * Math.log10(best / frames / FULL_SCALE_SQUARE);
}

export type PlannedProbe = {
  purpose: "reconstructed_cue_hypothesis";
  startFrame: number;
  frameCount: number;
  onsetFrame: number;
  quietBeforeFrames: number;
  leadPeakDbfs: number | null;
  onsetSeconds: number;
  hypothesisSeconds: number;
  hypothesisMayBeLate: boolean;
};

/**
 * The island onset inside the hypothesis window, or null.
 * An interior loudness edge is not an onset.
 */
export function planHypothesisProbe(
  energy: ArrayLike<number>,
  sampleRate: number,
  sourceFrameCount: number,
  hypothesisSeconds: number,
  windowSeconds: { before?: number; after?: number } = {},
): PlannedProbe | null {
  const frames = windowFrames(sampleRate);
  const threshold = energyThreshold(frames);
  const window = 0.02;
  const before = windowSeconds.before ?? HYPOTHESIS_BEFORE_SECONDS;
  const after = windowSeconds.after ?? HYPOTHESIS_AFTER_SECONDS;
  const earliest = hypothesisSeconds - before;
  const latest = hypothesisSeconds + after;
  const bridges = [ISLAND_BRIDGE_WINDOWS, FINE_BRIDGE_WINDOWS];
  let onsetWindow: number | null = null;
  let quiet = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const bridge of bridges) {
    for (const island of soundIslands(energy, threshold, bridge)) {
      const seconds = island.start * window;
      const lead = quietBefore(energy, threshold, island.start);
      const distance = Math.abs(seconds - hypothesisSeconds);
      if (seconds < earliest || seconds > latest || lead < MIN_QUIET_WINDOWS) continue;
      if (distance >= bestDistance) continue;
      onsetWindow = island.start;
      quiet = lead;
      bestDistance = distance;
    }
  }
  if (onsetWindow == null) return null;
  const startWindow = onsetWindow - LEAD_WINDOWS;
  if (startWindow < 0) return null;
  const startFrame = startWindow * frames;
  const remaining = sourceFrameCount - startFrame;
  const wanted = Math.min(PROBE_WINDOWS, Math.floor(remaining / frames));
  if (wanted < MIN_PROBE_WINDOWS) return null;
  const onsetSeconds = onsetWindow * window;
  return {
    purpose: "reconstructed_cue_hypothesis",
    startFrame,
    frameCount: wanted * frames,
    onsetFrame: onsetWindow * frames,
    quietBeforeFrames: quiet * frames,
    leadPeakDbfs: leadPeakDbfs(energy, frames, startWindow, onsetWindow),
    onsetSeconds,
    hypothesisSeconds,
    hypothesisMayBeLate: hypothesisSeconds - onsetSeconds > MAX_FIRST_SPEECH_SECONDS - LEAD_WINDOWS * window,
  };
}

export type NoiseFloorMethod = "noise_floor_contrast_v1" | "noise_floor_contrast_1second_v1";

export type NoiseFloorProbe = {
  purpose: NoiseFloorMethod;
  onsetWindow: number;
  onsetFrame: number;
  onsetSeconds: number;
  baselineStartFrame: number;
  baselineFrameCount: number;
  medianDbfs: number;
  p10Dbfs: number;
  p90Dbfs: number;
  thresholdDbfs: number;
  contrastDb: number;
  /** Windows under the measured threshold. This is not an absolute -50 count. */
  quietWindows: number;
  /** Consecutive windows under the absolute -50 gate. Zero when hiss sits above it. */
  absoluteQuietWindows: number;
  leadWindows: number;
  startFrame: number;
  frameCount: number;
  quietBeforeFrames: number;
  leadPeakDbfs: number | null;
};

/** Codex nearest-rank: index ceil(p * count) - 1. Count is 100 or 50. */
function nearestRank(sorted: number[], percentile: number, count: number): number {
  return sorted[Math.ceil(percentile * count) - 1];
}

/**
 * First rise inside the search whose previous baseline is a stationary floor
 * and whose own threshold is that floor's median plus 10 dB.
 * baselineWindows is 100 for the two-second tier and 50 for the one-second tier.
 * quietBeforeFrames counts windows under that measured threshold.
 */
function planStationaryNoiseProbe(
  energy: ArrayLike<number>,
  sampleRate: number,
  sourceFrameCount: number,
  search: { fromSeconds: number; toSeconds: number },
  baselineWindows: 50 | 100,
  purpose: NoiseFloorMethod,
): NoiseFloorProbe | null {
  const frames = windowFrames(sampleRate);
  const window = frames / sampleRate;
  const fromWindow = Math.max(baselineWindows, Math.round(search.fromSeconds / window));
  const toWindow = Math.min(energy.length - 5, Math.round(search.toSeconds / window));
  for (let onsetWindow = fromWindow; onsetWindow < toWindow; onsetWindow += 1) {
    const levels: number[] = [];
    for (let index = onsetWindow - baselineWindows; index < onsetWindow; index += 1) {
      const db = windowDbfs(energy[index], frames);
      if (db == null) {
        levels.length = 0;
        break;
      }
      levels.push(db);
    }
    if (levels.length !== baselineWindows) continue;
    const sorted = [...levels].sort((left, right) => left - right);
    const p10Dbfs = nearestRank(sorted, 0.1, baselineWindows);
    const medianDbfs = nearestRank(sorted, 0.5, baselineWindows);
    const p90Dbfs = nearestRank(sorted, 0.9, baselineWindows);
    if (p90Dbfs - p10Dbfs > 6) continue;
    const thresholdDbfs = medianDbfs + NOISE_FLOOR_CONTRAST_DB;
    const limit = frames * FULL_SCALE_SQUARE * 10 ** (thresholdDbfs / 10);
    if (levels.some((level) => level >= thresholdDbfs)) continue;
    const onsetDbfs = windowDbfs(energy[onsetWindow], frames);
    if (onsetDbfs == null || onsetDbfs < thresholdDbfs) continue;
    let persistent = 0;
    for (let index = onsetWindow; index < onsetWindow + 5; index += 1) {
      if (energy[index] >= limit) persistent += 1;
    }
    if (persistent < 3) continue;
    const quietWindows = quietBefore(energy, limit, onsetWindow);
    if (quietWindows < 5) continue;
    const leadWindows = Math.min(LEAD_WINDOWS, quietWindows);
    const startFrame = (onsetWindow - leadWindows) * frames;
    const wanted = Math.min(PROBE_WINDOWS, Math.floor((sourceFrameCount - startFrame) / frames));
    if (wanted < MIN_PROBE_WINDOWS) continue;
    return {
      purpose,
      onsetWindow,
      onsetFrame: onsetWindow * frames,
      onsetSeconds: onsetWindow * window,
      baselineStartFrame: (onsetWindow - baselineWindows) * frames,
      baselineFrameCount: baselineWindows * frames,
      medianDbfs,
      p10Dbfs,
      p90Dbfs,
      thresholdDbfs,
      contrastDb: NOISE_FLOOR_CONTRAST_DB,
      quietWindows,
      absoluteQuietWindows: quietBefore(energy, energyThreshold(frames), onsetWindow),
      leadWindows,
      startFrame,
      frameCount: wanted * frames,
      quietBeforeFrames: quietWindows * frames,
      leadPeakDbfs: leadPeakDbfs(energy, frames, onsetWindow - leadWindows, onsetWindow),
    };
  }
  return null;
}

export function planNoiseFloorProbe(
  energy: ArrayLike<number>,
  sampleRate: number,
  sourceFrameCount: number,
  search: { fromSeconds: number; toSeconds: number },
): NoiseFloorProbe | null {
  return planStationaryNoiseProbe(energy, sampleRate, sourceFrameCount, search, 100, "noise_floor_contrast_v1");
}

export function planNoiseFloor1SecondProbe(
  energy: ArrayLike<number>,
  sampleRate: number,
  sourceFrameCount: number,
  search: { fromSeconds: number; toSeconds: number },
): NoiseFloorProbe | null {
  return planStationaryNoiseProbe(
    energy,
    sampleRate,
    sourceFrameCount,
    search,
    50,
    "noise_floor_contrast_1second_v1",
  );
}

export type CleanSourceProbe = {
  purpose: "absolute_energy_v2";
  onsetWindow: number;
  onsetFrame: number;
  onsetSeconds: number;
  /** Consecutive windows under the absolute -50 gate. */
  quietWindows: number;
  leadWindows: number;
  startFrame: number;
  frameCount: number;
  quietBeforeFrames: number;
  leadPeakDbfs: number | null;
};

/**
 * First absolute -50 onset in the search.
 * Quiet must be at least 100 ms. The lead is that quiet, capped at 400 ms.
 */
export function planCleanSourceProbe(
  energy: ArrayLike<number>,
  sampleRate: number,
  sourceFrameCount: number,
  search: { fromSeconds: number; toSeconds: number },
): CleanSourceProbe | null {
  const frames = windowFrames(sampleRate);
  const window = frames / sampleRate;
  const threshold = energyThreshold(frames);
  const fromWindow = Math.max(0, Math.round(search.fromSeconds / window));
  const toWindow = Math.min(energy.length, Math.round(search.toSeconds / window));
  for (let onsetWindow = fromWindow; onsetWindow < toWindow; onsetWindow += 1) {
    if (!(energy[onsetWindow] >= threshold)) continue;
    const quietWindows = quietBefore(energy, threshold, onsetWindow);
    if (quietWindows < MIN_CLEAN_QUIET_WINDOWS) continue;
    const leadWindows = Math.min(LEAD_WINDOWS, quietWindows);
    if (onsetWindow - leadWindows < 0) continue;
    const startFrame = (onsetWindow - leadWindows) * frames;
    const wanted = Math.min(PROBE_WINDOWS, Math.floor((sourceFrameCount - startFrame) / frames));
    if (wanted < MIN_PROBE_WINDOWS) continue;
    return {
      purpose: "absolute_energy_v2",
      onsetWindow,
      onsetFrame: onsetWindow * frames,
      onsetSeconds: onsetWindow * window,
      quietWindows,
      leadWindows,
      startFrame,
      frameCount: wanted * frames,
      quietBeforeFrames: quietWindows * frames,
      leadPeakDbfs: leadPeakDbfs(energy, frames, onsetWindow - leadWindows, onsetWindow),
    };
  }
  return null;
}

export type WhisperWord = {
  text: string;
  localStartSeconds: number;
  localEndSeconds: number;
  probability: number;
};

export type WhisperSegment = {
  id: number;
  text: string;
  localStartSeconds: number;
  localEndSeconds: number;
  avgLogProbability: number;
  noSpeechProbability: number;
  compressionRatio: number;
  uncertain?: boolean;
  words: WhisperWord[];
};

export type WhisperProbe = {
  id: string | number;
  startFrame: number;
  frameCount: number;
  onsetFrame: number;
  quietBeforeFrames: number;
  sampleRate: number;
  durationSeconds: number;
  overflow: boolean;
  pcmLayout?: string;
  segments: WhisperSegment[];
  inputMonoFloat32Sha256?: string;
};

export function copiedFullAsrProbe(probe: {
  pcmLayout?: string;
  segments?: Array<Record<string, unknown>>;
}): boolean {
  if (probe.pcmLayout === "float32le-interleaved") return true;
  return (probe.segments ?? []).some(
    (segment) =>
      "rawEstimatedStartSeconds" in segment || "localEstimatedStartSeconds" in segment,
  );
}

export function metricsUncertain(segment: Pick<WhisperSegment, "avgLogProbability" | "noSpeechProbability" | "compressionRatio">): boolean {
  return (
    segment.avgLogProbability < -1 ||
    segment.compressionRatio > 2.4 ||
    (segment.noSpeechProbability > 0.6 && segment.avgLogProbability < -0.6)
  );
}

/** Null when every raw local time lies inside the probe. */
export function probeTimeProblem(probe: WhisperProbe): string | null {
  const duration = probe.durationSeconds;
  if (!(duration > 0) || duration > 14 || !Number.isFinite(duration))
    return "held_probe_duration";
  if (probe.overflow) return "held_probe_overflow";
  if (Math.abs(duration - probe.frameCount / probe.sampleRate) > 1e-9)
    return "held_probe_duration";
  for (const segment of probe.segments) {
    if (
      !(
        0 <= segment.localStartSeconds &&
        segment.localStartSeconds < segment.localEndSeconds &&
        segment.localEndSeconds <= duration
      )
    )
      return "held_probe_time_overflow";
    for (const word of segment.words) {
      if (
        !(
          0 <= word.localStartSeconds &&
          word.localStartSeconds <= word.localEndSeconds &&
          word.localEndSeconds <= duration &&
          word.probability >= 0 &&
          word.probability <= 1
        )
      )
        return "held_probe_time_overflow";
    }
  }
  return null;
}

export function spokenNumbers(text: string): number[] | "out_of_range" | null {
  const ordinal = questionAudioCueNumbers(text);
  if (ordinal.length > 0) return ordinal;
  return dottedInstructionCueNumbers(text);
}

export function anchorsInsidePassage(
  segments: Array<{ id: number; text: string; estimatedStartSeconds: number }>,
  cueSegmentId: number,
  anchorIds: number[],
): boolean {
  const ordered = [...segments].sort((a, b) => a.id - b.id);
  const cue = ordered.find((segment) => segment.id === cueSegmentId);
  if (!cue || anchorIds.length === 0) return false;
  const next = ordered.find(
    (segment) =>
      segment.id > cue.id &&
      segment.estimatedStartSeconds >= cue.estimatedStartSeconds &&
      spokenNumbers(segment.text) != null &&
      spokenNumbers(segment.text) !== "out_of_range",
  );
  const end = next ? next.estimatedStartSeconds : Number.POSITIVE_INFINITY;
  const byId = new Map(ordered.map((segment) => [segment.id, segment]));
  return anchorIds.every((id) => {
    const anchor = byId.get(id);
    return (
      anchor != null &&
      anchor.estimatedStartSeconds >= cue.estimatedStartSeconds &&
      anchor.estimatedStartSeconds < end
    );
  });
}

export type CueReading =
  | { ok: true; spoken: number[]; text: string; segmentIds: number[] }
  | { ok: false; reasons: string[] };

/**
 * Read the cue from the probe's own first segment.
 * A mismatched hypothesis is held. It is not repaired from a nearby number.
 */
export function interpretCueProbe(
  probe: WhisperProbe,
  expectedSpoken: number[] | null,
): CueReading {
  if (copiedFullAsrProbe(probe)) return { ok: false, reasons: ["held_copied_asr_probe"] };
  const time = probeTimeProblem(probe);
  if (time) return { ok: false, reasons: [time] };
  const first = probe.segments[0];
  if (!first) return { ok: false, reasons: ["held_probe_empty"] };
  if (metricsUncertain(first) || first.uncertain === true)
    return { ok: false, reasons: ["held_uncertain_cue"] };
  if (first.localStartSeconds > MAX_FIRST_SPEECH_SECONDS)
    return { ok: false, reasons: ["held_cue_not_at_probe_start"] };
  const spoken = spokenNumbers(first.text);
  if (spoken == null) return { ok: false, reasons: ["held_probe_does_not_begin_with_cue"] };
  if (spoken === "out_of_range") return { ok: false, reasons: ["held_out_of_range_cue"] };
  if (expectedSpoken && spoken.join(",") !== expectedSpoken.join(","))
    return { ok: false, reasons: ["held_probe_cue_mismatch"] };
  return { ok: true, spoken, text: first.text, segmentIds: [first.id] };
}

export type RecognitionClock = {
  sampleRate: number;
  channels: number;
  frameCount: number;
  durationMs: number;
  pcmSha256: string;
  sourceAudioSha256: string;
  playbackSha256: string;
};

export function nativeLeadProblem(
  probe: WhisperProbe,
  clock: RecognitionClock,
): string | null {
  const frames = windowFrames(clock.sampleRate);
  if (probe.sampleRate !== clock.sampleRate) return "held_native_bounds";
  // Codex measured_onset: quiet is at least 100 ms, and the lead is the
  // measured quiet capped at 400 ms. A forced 400 ms lead after a shorter
  // gap is not the onset.
  const quietWindows = probe.quietBeforeFrames / frames;
  const leadWindows = Math.min(LEAD_WINDOWS, quietWindows);
  if (
    !Number.isInteger(quietWindows) ||
    quietWindows < 5 ||
    probe.onsetFrame - probe.startFrame !== leadWindows * frames
  )
    return "held_native_lead";
  if (
    probe.startFrame % frames !== 0 ||
    probe.onsetFrame % frames !== 0 ||
    probe.quietBeforeFrames % frames !== 0
  )
    return "held_native_lead";
  if (
    probe.startFrame < 0 ||
    probe.onsetFrame <= probe.startFrame ||
    probe.frameCount <= 0 ||
    probe.startFrame + probe.frameCount > clock.frameCount
  )
    return "held_native_bounds";
  return null;
}

export function seekStartMs(startFrame: number, sampleRate: number): number {
  return Math.floor((startFrame * 1000) / sampleRate);
}
