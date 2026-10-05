/**
 * Fixed measurement policy of this ledger. Every number that decides a seek
 * start lives here so a replay can bind to one object.
 *
 * A seek start is NOT a cut. It is a point inside measured quiet, a fixed lead
 * before the first sound of the spoken question number, on the native frame
 * clock of the original recording. Playback continues to the end of the
 * original from there.
 */
export const POLICY = Object.freeze({
  id: "whole-audio-seek-start-v1",
  windowMs: 20,
  /** A window at or above this level is sound; below it is quiet. */
  quietThresholdDbfs: -50,
  /** A quiet run shorter than this does not end a sound island. */
  islandBridgeWindows: 15,
  /** Seek start = cue onset minus this lead, entirely inside measured quiet. */
  leadWindows: 20,
  /** Minimum measured quiet immediately before the cue onset. */
  minimumQuietBeforeWindows: 20,
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
