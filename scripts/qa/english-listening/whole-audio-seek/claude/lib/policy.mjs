/**
 * Fixed measurement policy of this ledger. Every number that decides a seek
 * start lives here so a replay can bind to one object.
 *
 * A seek start is NOT a cut. It is a point inside measured quiet, a short lead
 * before the first sound of the spoken question number, on the native frame
 * clock of the original recording. Playback continues to the end of the
 * original from there.
 */
export const POLICY = Object.freeze({
  id: "whole-audio-seek-start-v2",
  windowMs: 20,
  /** A window at or above this level is sound; below it is quiet. */
  quietThresholdDbfs: -50,
  /** A quiet run shorter than this does not end a sound island. */
  islandBridgeWindows: 15,
  /**
   * Seek start = cue onset minus the lead, entirely inside measured quiet. The
   * lead is this long when the quiet allows it; where bridge music runs closer
   * to the spoken number, the start is the first quiet window after the music.
   */
  leadWindows: 20,
  /** Minimum measured quiet immediately before the cue onset. */
  minimumQuietBeforeWindows: 5,
  /**
   * Finer island split used only to listen inside the tail of a long island,
   * for a spoken number that follows bridge music after a very short quiet.
   */
  fineBridgeWindows: 5,
  fineTailWindows: 175,
  /** Bounded confirmation probe that begins exactly at the proposed start. */
  probeWindows: 700,
  minimumProbeWindows: 150,
  /** Round one candidates: first sound after a long island or a long quiet. */
  bridgeIslandWindows: 300,
  longQuietWindows: 150,
  /** Recognized speech must begin this soon after the probe start. */
  maximumFirstSpeechSeconds: 2,
  /** Share of the official instruction that must be heard after the number. */
  minimumInstructionCoverage: 0.8,
  /** A shared-instruction member must not be followed by that instruction. */
  maximumForeignInstructionCoverage: 0.5,
});

export const POLICY_TEXT = JSON.stringify(POLICY);

/** Lead in windows for an onset with `quietWindows` of measured quiet before it. */
export const leadFor = (quietWindows) =>
  Math.min(POLICY.leadWindows, quietWindows);
