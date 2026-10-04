/**
 * Node-only. Measures how quiet the canonical PCM is at a clip boundary and proposes bounded,
 * read-only refinements. Every sample is read through planListeningSampleClip, the same stream
 * that produces the clip. The threshold is a deterministic measurement policy: it is not a human
 * listening review and it does not prove that no speech quieter than the threshold exists.
 */
import { createHash } from "node:crypto";
import { planListeningSampleClip, type ListeningPcmSource } from "./sampleClip";

/** Fixed. A noisier source stays uncertain; the threshold is never adapted to a file. */
export const LISTENING_BOUNDARY_POLICY = Object.freeze({
  id: "native-pcm16-max-channel-rms-v1",
  windowMs: 20,
  edgeMs: 50,
  minimumQuietMs: 400,
  refinementBoundMs: 1500,
  quietThresholdDbfs: -60,
  channelStatistic: "max_channel_rms",
} as const);

const FULL_SCALE_POWER = 32768 ** 2;
/** -60 dBFS as mean power is 32768^2 / 10^6; a sum of squares is an integer, so the floor is exact. */
const quietLimit = (frames: number) =>
  Math.floor((FULL_SCALE_POWER * frames) / 1e6);
const isQuiet = (sumSquares: number, frames: number) =>
  sumSquares <= quietLimit(frames);
/** Two decimals for reading; null is digital silence. Decisions use the integer sums, not this. */
const dbfs = (sumSquares: number, frames: number) =>
  sumSquares && frames
    ? Math.round(1000 * Math.log10(sumSquares / frames / FULL_SCALE_POWER)) /
      100
    : null;

function boundaryScale(sampleRate: number) {
  // Rounded up, so a counted window or minimum never covers less time than the policy says.
  const frames = (ms: number) => Math.ceil((sampleRate * ms) / 1000);
  const windowFrames = frames(LISTENING_BOUNDARY_POLICY.windowMs);
  const minimumQuietFrames = frames(LISTENING_BOUNDARY_POLICY.minimumQuietMs);
  return {
    windowFrames,
    edgeFrames: frames(LISTENING_BOUNDARY_POLICY.edgeMs),
    minimumQuietFrames,
    minimumQuietWindows: Math.ceil(minimumQuietFrames / windowFrames),
    refinementBoundWindows: Math.floor(
      Math.floor(
        (sampleRate * LISTENING_BOUNDARY_POLICY.refinementBoundMs) / 1000,
      ) / windowFrames,
    ),
  };
}
type Scale = ReturnType<typeof boundaryScale>;

export interface ListeningBoundaryRange {
  startFrame: number;
  endFrame: number;
}
export type ListeningBoundaryRejection =
  | "range_too_short"
  | "no_quiet_window"
  | "no_audible_window"
  | "leading_edge_above_threshold"
  | "leading_quiet_below_minimum"
  | "trailing_edge_above_threshold"
  | "trailing_quiet_below_minimum";
export interface ListeningBoundarySide {
  /** Consecutive windows at or below the threshold, counted from the boundary inwards. */
  quietWindows: number;
  quietFrames: number;
  /** Whole milliseconds, rounded down. */
  quietMs: number;
  edgeFrames: number;
  edgeRmsDbfs: number | null;
  edgeQuiet: boolean;
}
export interface ListeningBoundaryMeasurement {
  schemaVersion: 1;
  /** SHA of the exact WAV bytes scanned, including its generated clip header. */
  clipSha256: string;
  policy: typeof LISTENING_BOUNDARY_POLICY & Scale;
  source: {
    pcmSha256: string;
    sampleRate: number;
    channels: number;
    frameCount: number;
  };
  range: ListeningBoundaryRange;
  /** Full windows counted from the start of the range. */
  windows: { count: number; quiet: number };
  leading: ListeningBoundarySide;
  trailing: ListeningBoundarySide;
  /** `uncertain`: this policy cannot judge the range. Neither it nor `rejected` may be cut. */
  status: "measured_quiet" | "rejected" | "uncertain";
  reasons: ListeningBoundaryRejection[];
}

/** Max-channel sum of squares of every full window on each grid, and of each span, in range frames. */
async function scan(
  source: ListeningPcmSource,
  startFrame: number,
  endFrame: number,
  windowFrames: number,
  origins: number[],
  spans: [number, number][] = [],
) {
  const plan = planListeningSampleClip(source, startFrame, endFrame);
  const channels = source.channels,
    frameBytes = channels * 2;
  const grids = origins.map((origin) => ({
    origin,
    filled: 0,
    sums: new Array<number>(channels).fill(0),
    windows: [] as number[],
  }));
  const parts = spans.map(([from, to]) => ({
    from,
    to,
    sums: new Array<number>(channels).fill(0),
  }));
  let header = 44,
    index = 0,
    carry: Buffer = Buffer.alloc(0);
  const clipHash = createHash("sha256");
  // plan.read() itself refuses a source that yields more or fewer bytes than the range.
  for await (const chunk of plan.read()) {
    clipHash.update(chunk);
    const skipped = Math.min(header, chunk.length);
    header -= skipped;
    const part = carry.length
      ? Buffer.concat([carry, chunk.subarray(skipped)])
      : chunk.subarray(skipped);
    const usable = part.length - (part.length % frameBytes);
    for (let p = 0; p < usable; p += frameBytes, index++) {
      for (let c = 0; c < channels; c++) {
        const value = part.readInt16LE(p + c * 2),
          square = value * value;
        for (const grid of grids)
          if (index >= grid.origin) grid.sums[c] += square;
        for (const span of parts)
          if (index >= span.from && index < span.to) span.sums[c] += square;
      }
      for (const grid of grids)
        if (index >= grid.origin && ++grid.filled === windowFrames) {
          grid.windows.push(Math.max(...grid.sums));
          grid.sums.fill(0);
          grid.filled = 0;
        }
    }
    carry = part.subarray(usable);
  }
  return {
    clipSha256: clipHash.digest("hex"),
    windows: grids.map((grid) => grid.windows),
    spans: parts.map((span) => Math.max(...span.sums)),
  };
}

/** Rejects a range unless both cut points and 400 ms inside each of them are measured quiet. */
export async function measureListeningBoundaryQuiet(
  source: ListeningPcmSource,
  range: ListeningBoundaryRange,
): Promise<ListeningBoundaryMeasurement> {
  const { startFrame, endFrame } = range;
  const scale = boundaryScale(source.sampleRate),
    total = endFrame - startFrame,
    edgeFrames = Math.min(scale.edgeFrames, total);
  const measured = await scan(
    source,
    startFrame,
    endFrame,
    scale.windowFrames,
    // The second grid ends exactly on the end frame.
    [0, total % scale.windowFrames],
    [
      [0, edgeFrames],
      [total - edgeFrames, total],
    ],
  );
  const quiet = (sum: number) => isQuiet(sum, scale.windowFrames);
  const run = (windows: number[]) => {
    const audible = windows.findIndex((sum) => !quiet(sum));
    return audible < 0 ? windows.length : audible;
  };
  const side = (quietWindows: number, sum: number): ListeningBoundarySide => ({
    quietWindows,
    quietFrames: quietWindows * scale.windowFrames,
    quietMs: Math.floor(
      (quietWindows * scale.windowFrames * 1000) / source.sampleRate,
    ),
    edgeFrames,
    edgeRmsDbfs: dbfs(sum, edgeFrames),
    edgeQuiet: isQuiet(sum, edgeFrames),
  });
  const [forward, backward] = measured.windows;
  const windows = {
    count: forward.length,
    quiet: forward.filter(quiet).length,
  };
  const leading = side(run(forward), measured.spans[0]),
    trailing = side(run([...backward].reverse()), measured.spans[1]);
  const reasons: ListeningBoundaryRejection[] = [];
  if (total < 2 * scale.minimumQuietFrames + scale.windowFrames)
    reasons.push("range_too_short");
  if (windows.count && !windows.quiet) reasons.push("no_quiet_window");
  if (windows.count && windows.quiet === windows.count)
    reasons.push("no_audible_window");
  if (!leading.edgeQuiet) reasons.push("leading_edge_above_threshold");
  if (leading.quietFrames < scale.minimumQuietFrames)
    reasons.push("leading_quiet_below_minimum");
  if (!trailing.edgeQuiet) reasons.push("trailing_edge_above_threshold");
  if (trailing.quietFrames < scale.minimumQuietFrames)
    reasons.push("trailing_quiet_below_minimum");
  return {
    schemaVersion: 1,
    clipSha256: measured.clipSha256,
    policy: { ...LISTENING_BOUNDARY_POLICY, ...scale },
    source: {
      pcmSha256: source.pcmSha256,
      sampleRate: source.sampleRate,
      channels: source.channels,
      frameCount: source.frameCount,
    },
    range: { startFrame, endFrame },
    windows,
    leading,
    trailing,
    status: !reasons.length
      ? "measured_quiet"
      : reasons.includes("range_too_short") ||
          reasons.includes("no_quiet_window")
        ? "uncertain"
        : "rejected",
    reasons,
  };
}

export interface ListeningBoundaryRefinementInput extends ListeningBoundaryRange {
  /** Native-frame spans of the first and last semantic ASR speech. Every one must stay inside. */
  anchors?: ListeningBoundaryRange[];
  /** Neighboring clip ranges. A candidate never enters them. */
  previous?: ListeningBoundaryRange | null;
  next?: ListeningBoundaryRange | null;
}
export type ListeningBoundarySideAction =
  | "unchanged"
  | "extended_through_measured_quiet"
  | "extended_to_complete_boundary_sound"
  | "moved_inside_unanchored_boundary_sound"
  | "held";
export type ListeningBoundaryHold =
  | "range_shorter_than_window"
  | "audible_before_minimum_quiet"
  | "source_or_scan_limit"
  | "boundary_sound_not_completed_within_bound"
  | "anchor_inside_boundary_sound"
  | "no_measured_quiet_run_within_bound"
  | "refinement_bound_exceeded"
  | "neighbor_or_source_limit";
export interface ListeningBoundarySideDecision {
  action: ListeningBoundarySideAction;
  reasons: ListeningBoundaryHold[];
  boundaryFrame: number | null;
  /** Positive moves the boundary outwards, away from the clip. */
  shiftFrames: number | null;
  /** Audible frames of the original range that a candidate leaves out. */
  removedAudible: ListeningBoundaryRange | null;
  /** Raw evidence: max-channel sum of squares per window, in time order. */
  scan: {
    firstFrame: number;
    windowFrames: number;
    maxChannelSumSquares: number[];
  };
}
export interface ListeningBoundaryRefinement {
  schemaVersion: 1;
  policy: ListeningBoundaryMeasurement["policy"];
  source: ListeningBoundaryMeasurement["source"];
  original: {
    range: ListeningBoundaryRange;
    measurement: ListeningBoundaryMeasurement;
  };
  start: ListeningBoundarySideDecision;
  end: ListeningBoundarySideDecision;
  /** A range that passed measureListeningBoundaryQuiet again. Nothing is cut or written here. */
  candidate: {
    range: ListeningBoundaryRange;
    measurement: ListeningBoundaryMeasurement;
  } | null;
  status: "unchanged" | "candidate" | "held";
  reasons: string[];
}

/**
 * One boundary in outward window indices: window m covers [m, m + 1) windows beyond the boundary,
 * so -1 is the window just inside the clip. Quiet is true/false, or undefined when unmeasured.
 */
async function sideWindows(
  source: ListeningPcmSource,
  boundary: number,
  clipFrames: number,
  outward: 1 | -1,
  scale: Scale,
) {
  const width = scale.windowFrames,
    reach = scale.refinementBoundWindows + scale.minimumQuietWindows;
  const outside = Math.min(
    reach,
    Math.floor(
      (outward === 1 ? source.frameCount - boundary : boundary) / width,
    ),
  );
  const inside = Math.min(reach, Math.floor(clipFrames / width));
  const firstFrame = boundary - (outward === 1 ? inside : outside) * width;
  const sums =
    inside + outside
      ? (
          await scan(
            source,
            firstFrame,
            firstFrame + (inside + outside) * width,
            width,
            [0],
          )
        ).windows[0]
      : [];
  return {
    firstFrame,
    sums,
    outside,
    quiet(m: number) {
      const index = outward === 1 ? m + inside : outside - 1 - m;
      return index >= 0 && index < sums.length
        ? isQuiet(sums[index], width)
        : undefined;
    },
  };
}

function decideSide(
  windows: Awaited<ReturnType<typeof sideWindows>>,
  scale: Scale,
  passes: boolean,
  anchored: boolean,
  /** Smallest outward shift that keeps every anchor inside. */
  anchorShift: number,
  /** Largest outward shift before a neighbor or the end of the source. */
  limitShift: number,
): {
  action: ListeningBoundarySideAction;
  shift: number | null;
  reasons: ListeningBoundaryHold[];
} {
  const { quiet } = windows,
    minimum = scale.minimumQuietWindows,
    bound = scale.refinementBoundWindows;
  const held = (reason: ListeningBoundaryHold) => ({
    action: "held" as const,
    shift: null,
    reasons: [reason],
  });
  /** First window in [from, to) that is not measured quiet. */
  const firstNotQuiet = (from: number, to: number) => {
    for (let m = from; m < to; m++) if (quiet(m) !== true) return m;
    return null;
  };
  const quietBefore = (shift: number) =>
    firstNotQuiet(shift - minimum, shift) === null;
  if (limitShift < 0) return held("neighbor_or_source_limit");
  if (passes && anchorShift <= 0)
    return { action: "unchanged", shift: 0, reasons: [] };
  let shift: number, action: ListeningBoundarySideAction;
  if (quiet(-1) === true) {
    // The cut lies in measured quiet: it only grows, through measured quiet, and is never trimmed.
    let audible = -1;
    while (quiet(audible) === true) audible--;
    shift = Math.max(0, audible + 1 + minimum, anchorShift);
    if (shift > bound) return held("refinement_bound_exceeded");
    const blocked = firstNotQuiet(0, shift);
    if (blocked !== null)
      return held(
        quiet(blocked) === undefined
          ? "source_or_scan_limit"
          : "audible_before_minimum_quiet",
      );
    action = shift ? "extended_through_measured_quiet" : "unchanged";
  } else if (quiet(-1) === false) {
    // The cut is inside audible material. Completing that sound is preferred: the nearest
    // outward place whose inner 400 ms is measured quiet and that keeps every anchor.
    let complete: number | null = null;
    for (
      let m = Math.max(minimum, anchorShift);
      m <= Math.min(bound, limitShift, windows.outside) && complete === null;
      m++
    )
      if (quietBefore(m)) complete = m;
    if (complete !== null) {
      shift = complete;
      action = "extended_to_complete_boundary_sound";
    } else {
      // Audible material is left out only when semantic anchors exist, all of them end before
      // it, and a measured 400 ms quiet run separates it from what is kept. Never a fixed trim.
      if (!anchored) return held("boundary_sound_not_completed_within_bound");
      let inner = -1;
      while (inner >= -bound && !quietBefore(inner)) inner--;
      if (inner < -bound) return held("no_measured_quiet_run_within_bound");
      if (inner < anchorShift) return held("anchor_inside_boundary_sound");
      shift = inner;
      action = "moved_inside_unanchored_boundary_sound";
    }
  } else return held("range_shorter_than_window");
  if (shift > limitShift) return held("neighbor_or_source_limit");
  return { action, shift, reasons: [] };
}

/**
 * Proposes at most one refined range within 1.5 s of each original boundary. Each boundary moves
 * only to a place with a measured 400 ms quiet run inside it, the result must pass
 * measureListeningBoundaryQuiet again, and a range that cannot be certified is reported as held.
 */
export async function findListeningBoundaryRefinement(
  source: ListeningPcmSource,
  input: ListeningBoundaryRefinementInput,
): Promise<ListeningBoundaryRefinement> {
  const range = { startFrame: input.startFrame, endFrame: input.endFrame };
  const measurement = await measureListeningBoundaryQuiet(source, range);
  const anchors = input.anchors ?? [];
  for (const anchor of [
    ...anchors,
    ...(input.previous ? [input.previous] : []),
    ...(input.next ? [input.next] : []),
  ])
    if (
      ![anchor.startFrame, anchor.endFrame].every(Number.isSafeInteger) ||
      anchor.startFrame < 0 ||
      anchor.startFrame >= anchor.endFrame ||
      anchor.endFrame > source.frameCount
    )
      throw Error("Invalid anchor or neighbor range");
  const scale = boundaryScale(source.sampleRate),
    width = scale.windowFrames,
    total = range.endFrame - range.startFrame;
  const passes = (side: ListeningBoundarySide) =>
    side.edgeQuiet && side.quietFrames >= scale.minimumQuietFrames;
  const decide = async (
    outward: 1 | -1,
    boundary: number,
    side: ListeningBoundarySide,
    anchorFrames: number,
    limitFrames: number,
  ): Promise<ListeningBoundarySideDecision> => {
    const windows = await sideWindows(source, boundary, total, outward, scale);
    const decision = decideSide(
      windows,
      scale,
      passes(side),
      anchors.length > 0,
      anchors.length ? Math.ceil(anchorFrames / width) : -Infinity,
      Math.floor(limitFrames / width),
    );
    const shiftFrames = decision.shift === null ? null : decision.shift * width,
      boundaryFrame =
        shiftFrames === null ? null : boundary + outward * shiftFrames;
    return {
      action: decision.action,
      reasons: decision.reasons,
      boundaryFrame,
      shiftFrames,
      removedAudible:
        decision.action === "moved_inside_unanchored_boundary_sound"
          ? {
              startFrame: Math.min(boundary, boundaryFrame!),
              endFrame: Math.max(boundary, boundaryFrame!),
            }
          : null,
      scan: {
        firstFrame: windows.firstFrame,
        windowFrames: width,
        maxChannelSumSquares: windows.sums,
      },
    };
  };
  const start = await decide(
    -1,
    range.startFrame,
    measurement.leading,
    range.startFrame - Math.min(...anchors.map((a) => a.startFrame)),
    range.startFrame - (input.previous?.endFrame ?? 0),
  );
  const end = await decide(
    1,
    range.endFrame,
    measurement.trailing,
    Math.max(...anchors.map((a) => a.endFrame)) - range.endFrame,
    (input.next?.startFrame ?? source.frameCount) - range.endFrame,
  );
  const result = {
    schemaVersion: 1 as const,
    policy: measurement.policy,
    source: measurement.source,
    original: { range, measurement },
    start,
    end,
  };
  const reasons = [
    ...start.reasons.map((reason) => "start_" + reason),
    ...end.reasons.map((reason) => "end_" + reason),
  ];
  if (start.boundaryFrame === null || end.boundaryFrame === null)
    return { ...result, candidate: null, status: "held", reasons };
  const refined = {
    startFrame: start.boundaryFrame,
    endFrame: end.boundaryFrame,
  };
  const unchanged =
    refined.startFrame === range.startFrame &&
    refined.endFrame === range.endFrame;
  const candidate = unchanged
    ? measurement
    : await measureListeningBoundaryQuiet(source, refined);
  // The same gate that judges the original judges the candidate; nothing is waved through.
  if (candidate.status !== "measured_quiet")
    return {
      ...result,
      candidate: null,
      status: "held",
      reasons: candidate.reasons.map((reason) => "candidate_" + reason),
    };
  return {
    ...result,
    candidate: { range: refined, measurement: candidate },
    status: unchanged ? "unchanged" : "candidate",
    reasons: [],
  };
}
