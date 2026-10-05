/**
 * Source-bound cue recognition.
 *
 * An ASR timestamp may choose which quiet-lead island is worth hearing.
 * It is not the onset. A start exists only when Whisper, on the native
 * clip that begins 400 ms before that island, hears the spoken cue first.
 * Generated sourceNumber is never that cue.
 */
import {
  dottedInstructionCueNumbers,
  questionAudioCueNumbers,
} from "./seekBeginnings.ts";

export const QUIET_DBFS = -50;
export const LEAD_WINDOWS = 20;
export const MIN_QUIET_WINDOWS = 20;
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
): PlannedProbe | null {
  const frames = windowFrames(sampleRate);
  const threshold = energyThreshold(frames);
  const window = 0.02;
  const earliest = hypothesisSeconds - HYPOTHESIS_BEFORE_SECONDS;
  const latest = hypothesisSeconds + HYPOTHESIS_AFTER_SECONDS;
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

export function metricsUncertain(segment: WhisperSegment): boolean {
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
  if (probe.onsetFrame - probe.startFrame !== LEAD_WINDOWS * frames)
    return "held_native_lead";
  if (probe.quietBeforeFrames < MIN_QUIET_WINDOWS * frames)
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
