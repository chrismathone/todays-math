// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  LISTENING_BOUNDARY_POLICY,
  findListeningBoundaryRefinement,
  measureListeningBoundaryQuiet,
} from "@/lib/english/listening/media/audioBoundary";
import { waveHeader } from "@/lib/english/listening/media/mp3";
import type { ListeningPcmSource } from "@/lib/english/listening/media/sampleClip";
import {
  listeningSampleClipSha256,
  planListeningSampleClip,
} from "@/lib/english/listening/media/sampleClip";

/** One stretch of an alternating +A/-A square wave, whose RMS is exactly A in every window. */
type Stretch = { ms: number; left: number; right?: number };
function pcmSource(
  stretches: Stretch[],
  { rate = 48000, channels = 2 as 1 | 2, chunkBytes = 1024 * 1024 } = {},
) {
  const frames = stretches.map((s) => Math.round((s.ms * rate) / 1000));
  const frameCount = frames.reduce((a, b) => a + b, 0);
  const pcm = Buffer.alloc(frameCount * channels * 2);
  let frame = 0;
  for (const [index, stretch] of stretches.entries())
    for (let i = 0; i < frames[index]; i++, frame++) {
      const sign = frame % 2 ? -1 : 1;
      pcm.writeInt16LE(sign * stretch.left, frame * channels * 2);
      if (channels === 2)
        pcm.writeInt16LE(
          sign * (stretch.right ?? stretch.left),
          frame * channels * 2 + 2,
        );
    }
  const bytes = Buffer.concat([waveHeader(frameCount, rate, channels), pcm]);
  const source: ListeningPcmSource = {
    header: bytes.subarray(0, 44),
    totalBytes: bytes.length,
    sampleRate: rate,
    channels,
    frameCount,
    pcmSha256: createHash("sha256").update(pcm).digest("hex"),
    sourceDurationMs: Math.ceil((frameCount * 1000) / rate),
    async *readRange(start, endExclusive) {
      for (let p = start; p < endExclusive; p += chunkBytes)
        yield bytes.subarray(p, Math.min(endExclusive, p + chunkBytes));
    },
  };
  return { source, at: (ms: number) => Math.round((ms * rate) / 1000) };
}
const QUIET = 8; // -72.25 dBFS
const SPEECH = 3000;
/** 1 s quiet, 3 s speech, 1 s quiet. */
const plain = () =>
  pcmSource([
    { ms: 1000, left: QUIET },
    { ms: 3000, left: SPEECH },
    { ms: 1000, left: QUIET },
  ]);

describe("measured native PCM boundary quiet", () => {
  it("binds the measurement to streamed clip bytes and exposes a changed reader despite identical source labels", async () => {
    const { source, at } = plain();
    const range = { startFrame: at(600), endFrame: at(4400) };
    const planned = await listeningSampleClipSha256(
      planListeningSampleClip(source, range.startFrame, range.endFrame),
    );
    expect(
      (await measureListeningBoundaryQuiet(source, range)).clipSha256,
    ).toBe(planned);
    const changed: ListeningPcmSource = {
      ...source,
      async *readRange(start, end) {
        let first = true;
        for await (const bytes of source.readRange(start, end)) {
          const altered = Buffer.from(bytes);
          if (first) {
            altered.writeInt16LE(altered.readInt16LE(0) + 1, 0);
            first = false;
          }
          yield altered;
        }
      },
    };
    const measured = await measureListeningBoundaryQuiet(changed, range);
    expect(measured.source.pcmSha256).toBe(source.pcmSha256);
    expect(measured.status).toBe("measured_quiet");
    expect(measured.clipSha256).not.toBe(planned);
  });
  it("measures a clip that starts and ends inside 400 ms of quiet on the exact source identity", async () => {
    const { source, at } = plain();
    const range = { startFrame: at(600), endFrame: at(4400) };
    const measured = await measureListeningBoundaryQuiet(source, range);
    expect(measured).toMatchObject({
      schemaVersion: 1,
      source: {
        pcmSha256: source.pcmSha256,
        sampleRate: 48000,
        channels: 2,
        frameCount: source.frameCount,
      },
      range,
      policy: {
        id: LISTENING_BOUNDARY_POLICY.id,
        quietThresholdDbfs: -60,
        windowFrames: 960,
        edgeFrames: 2400,
        minimumQuietFrames: 19200,
        minimumQuietWindows: 20,
        refinementBoundWindows: 75,
      },
      windows: { count: 190, quiet: 40 },
      leading: {
        quietWindows: 20,
        quietFrames: 19200,
        quietMs: 400,
        edgeRmsDbfs: -72.25,
        edgeQuiet: true,
      },
      trailing: {
        quietWindows: 20,
        quietFrames: 19200,
        quietMs: 400,
        edgeRmsDbfs: -72.25,
        edgeQuiet: true,
      },
      status: "measured_quiet",
      reasons: [],
    });
    const refined = await findListeningBoundaryRefinement(source, range);
    expect(refined.status).toBe("unchanged");
    expect(refined.candidate).toEqual({ range, measurement: measured });
    expect(refined.start.action).toBe("unchanged");
    expect(refined.end.action).toBe("unchanged");
  });

  it("holds the -60 dBFS line exactly and never treats 380 ms as 400 ms", async () => {
    const level = async (amplitude: number) => {
      const { source, at } = pcmSource([
        { ms: 1000, left: amplitude },
        { ms: 3000, left: SPEECH },
        { ms: 1000, left: amplitude },
      ]);
      return measureListeningBoundaryQuiet(source, {
        startFrame: at(600),
        endFrame: at(4400),
      });
    };
    // 32768 * 10^(-60/20) = 32.768: 32 is at or below the line and 33 is above it.
    expect((await level(32)).status).toBe("measured_quiet");
    const above = await level(33);
    expect(above.status).toBe("uncertain");
    expect(above.reasons).toEqual([
      "no_quiet_window",
      "leading_edge_above_threshold",
      "leading_quiet_below_minimum",
      "trailing_edge_above_threshold",
      "trailing_quiet_below_minimum",
    ]);
    expect(above.leading.edgeRmsDbfs).toBe(-59.94);
    const { source, at } = plain();
    const short = await measureListeningBoundaryQuiet(source, {
      startFrame: at(620),
      endFrame: at(4380),
    });
    expect(short.status).toBe("rejected");
    expect(short.reasons).toEqual([
      "leading_quiet_below_minimum",
      "trailing_quiet_below_minimum",
    ]);
    expect([short.leading.quietMs, short.trailing.quietMs]).toEqual([380, 380]);
    expect([short.leading.edgeQuiet, short.trailing.edgeQuiet]).toEqual([
      true,
      true,
    ]);
  });

  it("rejects a start inside the first word and refines only by completing that word", async () => {
    const { source, at } = pcmSource([
      { ms: 2000, left: QUIET },
      { ms: 300, left: 2500 },
      { ms: 100, left: QUIET },
      { ms: 2000, left: SPEECH },
      { ms: 1000, left: QUIET },
    ]);
    const range = { startFrame: at(2150), endFrame: at(4800) };
    const measured = await measureListeningBoundaryQuiet(source, range);
    expect(measured.status).toBe("rejected");
    expect(measured.reasons).toEqual([
      "leading_edge_above_threshold",
      "leading_quiet_below_minimum",
    ]);
    expect(measured.leading.quietMs).toBe(0);
    expect(measured.leading.edgeRmsDbfs).toBe(-22.35);
    const refined = await findListeningBoundaryRefinement(source, range);
    expect(refined.status).toBe("candidate");
    expect(refined.start).toMatchObject({
      action: "extended_to_complete_boundary_sound",
      boundaryFrame: at(1590),
      shiftFrames: at(560),
      removedAudible: null,
    });
    expect(refined.end.action).toBe("unchanged");
    expect(refined.candidate?.range).toEqual({
      startFrame: at(1590),
      endFrame: at(4800),
    });
    expect(refined.candidate?.measurement.status).toBe("measured_quiet");
    expect(refined.candidate?.measurement.leading.quietMs).toBe(400);
    // The word began 2 s before the cut: that is outside the refinement bound, so nothing is proposed.
    const far = pcmSource([
      { ms: 1000, left: QUIET },
      { ms: 4000, left: SPEECH },
      { ms: 1000, left: QUIET },
    ]);
    const held = await findListeningBoundaryRefinement(far.source, {
      startFrame: far.at(3000),
      endFrame: far.at(5400),
    });
    expect(held.status).toBe("held");
    expect(held.candidate).toBeNull();
    expect(held.start).toMatchObject({
      action: "held",
      reasons: ["boundary_sound_not_completed_within_bound"],
    });
  });

  it("moves an end out of a following signal only with anchors and a real 400 ms quiet run before it", async () => {
    const layout = (gapMs: number) =>
      pcmSource([
        { ms: 1000, left: QUIET },
        { ms: 2000, left: SPEECH },
        { ms: gapMs, left: QUIET },
        { ms: 4000, left: 700 },
        { ms: 1000, left: QUIET },
      ]);
    const { source, at } = layout(600);
    const range = { startFrame: at(600), endFrame: at(4700) };
    const measured = await measureListeningBoundaryQuiet(source, range);
    expect(measured.status).toBe("rejected");
    expect(measured.reasons).toEqual([
      "trailing_edge_above_threshold",
      "trailing_quiet_below_minimum",
    ]);
    expect(measured.trailing.edgeRmsDbfs).toBe(-33.41);
    // Without semantic anchors audible material is never removed, and the signal runs past the bound.
    const blind = await findListeningBoundaryRefinement(source, range);
    expect(blind.status).toBe("held");
    expect(blind.end.reasons).toEqual([
      "boundary_sound_not_completed_within_bound",
    ]);
    const anchors = [{ startFrame: at(1000), endFrame: at(3000) }];
    const refined = await findListeningBoundaryRefinement(source, {
      ...range,
      anchors,
    });
    expect(refined.status).toBe("candidate");
    expect(refined.end).toMatchObject({
      action: "moved_inside_unanchored_boundary_sound",
      boundaryFrame: at(3600),
      shiftFrames: -at(1100),
      removedAudible: { startFrame: at(3600), endFrame: at(4700) },
    });
    expect(refined.candidate?.range).toEqual({
      startFrame: at(600),
      endFrame: at(3600),
    });
    expect(refined.candidate?.measurement.trailing).toMatchObject({
      quietMs: 600,
      edgeQuiet: true,
    });
    // An anchor that reaches into the boundary sound keeps it: the candidate is not forced.
    const anchored = await findListeningBoundaryRefinement(source, {
      ...range,
      anchors: [{ startFrame: at(1000), endFrame: at(3700) }],
    });
    expect(anchored.status).toBe("held");
    expect(anchored.end.reasons).toEqual(["anchor_inside_boundary_sound"]);
    // 300 ms of quiet before the signal is not a 400 ms run.
    const tight = layout(300);
    const none = await findListeningBoundaryRefinement(tight.source, {
      startFrame: tight.at(600),
      endFrame: tight.at(4400),
      anchors: [{ startFrame: tight.at(1000), endFrame: tight.at(3000) }],
    });
    expect(none.status).toBe("held");
    expect(none.end.reasons).toEqual(["no_measured_quiet_run_within_bound"]);
  });

  it("uses the louder channel so opposite stereo phase cannot pass as quiet", async () => {
    const { source, at } = pcmSource([
      { ms: 600, left: QUIET },
      { ms: 400, left: 1000, right: -1000 },
      { ms: 3000, left: SPEECH },
      { ms: 1000, left: QUIET },
    ]);
    // The mid signal of the opposed stretch is exactly zero.
    const bytes: Buffer[] = [];
    for await (const part of source.readRange(44, source.totalBytes))
      bytes.push(part);
    const pcm = Buffer.concat(bytes);
    const frame = at(800);
    expect(pcm.readInt16LE(frame * 4) + pcm.readInt16LE(frame * 4 + 2)).toBe(0);
    const measured = await measureListeningBoundaryQuiet(source, {
      startFrame: at(600),
      endFrame: at(4400),
    });
    expect(measured.status).toBe("rejected");
    expect(measured.reasons).toEqual([
      "leading_edge_above_threshold",
      "leading_quiet_below_minimum",
    ]);
    expect(measured.leading).toMatchObject({
      quietMs: 0,
      edgeRmsDbfs: -30.31,
      edgeQuiet: false,
    });
    // One loud channel is enough.
    const single = pcmSource([
      { ms: 600, left: QUIET },
      { ms: 400, left: QUIET, right: 1000 },
      { ms: 3000, left: SPEECH },
      { ms: 1000, left: QUIET },
    ]);
    const one = await measureListeningBoundaryQuiet(single.source, {
      startFrame: single.at(600),
      endFrame: single.at(4400),
    });
    expect(one.leading.edgeRmsDbfs).toBe(-30.31);
    expect(one.status).toBe("rejected");
  });

  it("leaves short ranges uncertain and refuses truncated or non-canonical sources", async () => {
    const { source, at } = plain();
    const short = await measureListeningBoundaryQuiet(source, {
      startFrame: at(800),
      endFrame: at(1300),
    });
    expect(short.status).toBe("uncertain");
    expect(short.reasons).toContain("range_too_short");
    const tiny = await measureListeningBoundaryQuiet(source, {
      startFrame: at(1000),
      endFrame: at(1000) + 100,
    });
    expect(tiny.status).toBe("uncertain");
    expect(tiny.windows.count).toBe(0);
    expect(tiny.leading.edgeFrames).toBe(100);
    const sliver = await findListeningBoundaryRefinement(source, {
      startFrame: at(1000),
      endFrame: at(1000) + 100,
    });
    expect(sliver.status).toBe("held");
    expect(sliver.reasons).toEqual([
      "start_range_shorter_than_window",
      "end_range_shorter_than_window",
    ]);
    const held = await findListeningBoundaryRefinement(source, {
      startFrame: at(800),
      endFrame: at(1300),
    });
    expect(held.status).toBe("held");
    expect(held.candidate).toBeNull();
    const truncated: ListeningPcmSource = {
      ...source,
      async *readRange(start, endExclusive) {
        yield Buffer.alloc(Math.floor((endExclusive - start) / 2));
      },
    };
    const range = { startFrame: at(600), endFrame: at(4400) };
    await expect(
      measureListeningBoundaryQuiet(truncated, range),
    ).rejects.toThrow(/truncated/);
    await expect(
      findListeningBoundaryRefinement(truncated, range),
    ).rejects.toThrow(/truncated/);
    await expect(
      measureListeningBoundaryQuiet(
        { ...source, frameCount: source.frameCount - 1 },
        range,
      ),
    ).rejects.toThrow(/canonical PCM/);
    await expect(
      measureListeningBoundaryQuiet(
        { ...source, totalBytes: source.totalBytes - 4 },
        range,
      ),
    ).rejects.toThrow(/canonical PCM/);
  });

  it("keeps a source without measured quiet uncertain instead of adapting the threshold", async () => {
    // A -50.3 dBFS floor: clearly below the speech, never below the fixed line.
    const { source, at } = pcmSource([
      { ms: 1000, left: 100 },
      { ms: 3000, left: SPEECH },
      { ms: 1000, left: 100 },
    ]);
    const range = { startFrame: at(600), endFrame: at(4400) };
    const measured = await measureListeningBoundaryQuiet(source, range);
    expect(measured.status).toBe("uncertain");
    expect(measured.reasons).toContain("no_quiet_window");
    expect(measured.windows.quiet).toBe(0);
    expect(measured.leading.edgeRmsDbfs).toBe(-50.31);
    expect(measured.policy.quietThresholdDbfs).toBe(-60);
    const refined = await findListeningBoundaryRefinement(source, {
      ...range,
      anchors: [{ startFrame: at(1000), endFrame: at(4000) }],
    });
    expect(refined.status).toBe("held");
    expect(refined.candidate).toBeNull();
    expect(refined.start.action).toBe("held");
    expect(refined.end.action).toBe("held");
  });

  it("judges a candidate with the same gate and reports a range it cannot certify as held", async () => {
    // Every 20 ms window of the lead is at or below the line, yet the first 50 ms are above it.
    const { source, at } = pcmSource([
      { ms: 600, left: QUIET },
      { ms: 40, left: 32 },
      { ms: 10, left: 46 },
      { ms: 10, left: 0 },
      { ms: 340, left: QUIET },
      { ms: 3000, left: SPEECH },
      { ms: 1000, left: QUIET },
    ]);
    const range = { startFrame: at(600), endFrame: at(4400) };
    const measured = await measureListeningBoundaryQuiet(source, range);
    expect(measured.leading).toMatchObject({
      quietMs: 400,
      edgeRmsDbfs: -59.37,
      edgeQuiet: false,
    });
    expect(measured.status).toBe("rejected");
    expect(measured.reasons).toEqual(["leading_edge_above_threshold"]);
    const refined = await findListeningBoundaryRefinement(source, range);
    expect(refined.start.action).toBe("unchanged");
    expect(refined.status).toBe("held");
    expect(refined.candidate).toBeNull();
    expect(refined.reasons).toEqual(["candidate_leading_edge_above_threshold"]);
    // A range with nothing audible has quiet cuts and is still not a clip.
    const empty = pcmSource([{ ms: 3000, left: QUIET }]);
    const silent = { startFrame: empty.at(500), endFrame: empty.at(2500) };
    const nothing = await measureListeningBoundaryQuiet(empty.source, silent);
    expect(nothing.status).toBe("rejected");
    expect(nothing.reasons).toEqual(["no_audible_window"]);
    const heldEmpty = await findListeningBoundaryRefinement(
      empty.source,
      silent,
    );
    expect(heldEmpty.status).toBe("held");
    expect(heldEmpty.candidate).toBeNull();
    expect(heldEmpty.reasons).toEqual(["candidate_no_audible_window"]);
  });

  it("extends only through measured quiet and stops at the next sound", async () => {
    const layout = (afterMs: number) =>
      pcmSource([
        { ms: 1000, left: QUIET },
        { ms: 3000, left: SPEECH },
        { ms: afterMs, left: QUIET },
        { ms: 500, left: 900 },
        { ms: 1000, left: QUIET },
      ]);
    const { source, at } = layout(1200);
    const refined = await findListeningBoundaryRefinement(source, {
      startFrame: at(800),
      endFrame: at(4200),
    });
    expect(refined.status).toBe("candidate");
    expect(refined.start).toMatchObject({
      action: "extended_through_measured_quiet",
      shiftFrames: at(200),
      removedAudible: null,
    });
    expect(refined.end).toMatchObject({
      action: "extended_through_measured_quiet",
      shiftFrames: at(200),
    });
    expect(refined.candidate?.range).toEqual({
      startFrame: at(600),
      endFrame: at(4400),
    });
    const tight = layout(300);
    const held = await findListeningBoundaryRefinement(tight.source, {
      startFrame: tight.at(600),
      endFrame: tight.at(4200),
    });
    expect(held.status).toBe("held");
    expect(held.end).toMatchObject({
      action: "held",
      reasons: ["audible_before_minimum_quiet"],
    });
  });

  it("refuses invalid ranges, source limits, neighbor intrusion and anchors that would be left out", async () => {
    const { source, at } = plain();
    for (const range of [
      { startFrame: 0.5, endFrame: at(4400) },
      { startFrame: -1, endFrame: at(4400) },
      { startFrame: at(4400), endFrame: at(4400) },
      { startFrame: at(600), endFrame: source.frameCount + 1 },
    ]) {
      await expect(
        measureListeningBoundaryQuiet(source, range),
      ).rejects.toThrow(/range/);
      await expect(
        findListeningBoundaryRefinement(source, range),
      ).rejects.toThrow(/range/);
    }
    const range = { startFrame: at(800), endFrame: at(4200) };
    await expect(
      findListeningBoundaryRefinement(source, {
        ...range,
        anchors: [{ startFrame: at(900), endFrame: at(900) }],
      }),
    ).rejects.toThrow(/anchor/);
    // The quiet before the first sound is only 200 ms long in this source.
    const early = pcmSource([
      { ms: 200, left: QUIET },
      { ms: 3000, left: SPEECH },
      { ms: 1000, left: QUIET },
    ]);
    const limited = await findListeningBoundaryRefinement(early.source, {
      startFrame: early.at(100),
      endFrame: early.at(3600),
    });
    expect(limited.status).toBe("held");
    expect(limited.start.reasons).toEqual(["source_or_scan_limit"]);
    const intruding = await findListeningBoundaryRefinement(source, {
      ...range,
      previous: { startFrame: 0, endFrame: at(700) },
      next: { startFrame: at(4300), endFrame: source.frameCount },
    });
    expect(intruding.status).toBe("held");
    expect(intruding.start.reasons).toEqual(["neighbor_or_source_limit"]);
    expect(intruding.end.reasons).toEqual(["neighbor_or_source_limit"]);
    const free = await findListeningBoundaryRefinement(source, {
      ...range,
      previous: { startFrame: 0, endFrame: at(600) },
      next: { startFrame: at(4400), endFrame: source.frameCount },
    });
    expect(free.candidate?.range).toEqual({
      startFrame: at(600),
      endFrame: at(4400),
    });
    // An anchor that starts 300 ms before a passing start is pulled in through quiet.
    const passing = { startFrame: at(600), endFrame: at(4400) };
    const pulled = await findListeningBoundaryRefinement(source, {
      ...passing,
      anchors: [{ startFrame: at(300), endFrame: at(4500) }],
    });
    expect(pulled.status).toBe("candidate");
    expect(pulled.candidate?.range).toEqual({
      startFrame: at(300),
      endFrame: at(4500),
    });
    // An anchor beyond the refinement bound is never cut off and never forced in.
    const far = pcmSource([
      { ms: 3400, left: QUIET },
      { ms: 3000, left: SPEECH },
      { ms: 1600, left: QUIET },
    ]);
    const beyond = await findListeningBoundaryRefinement(far.source, {
      startFrame: far.at(3000),
      endFrame: far.at(7000),
      anchors: [{ startFrame: far.at(1000), endFrame: far.at(6000) }],
    });
    expect(beyond.status).toBe("held");
    expect(beyond.start.reasons).toEqual(["refinement_bound_exceeded"]);
  });

  it("does not depend on how the source splits its bytes, the channel count or the sample rate", async () => {
    const stretches = [
      { ms: 1000, left: QUIET },
      { ms: 300, left: 2500 },
      { ms: 100, left: QUIET },
      { ms: 2000, left: SPEECH },
      { ms: 1000, left: QUIET },
    ];
    const whole = pcmSource(stretches),
      odd = pcmSource(stretches, { chunkBytes: 4093 });
    const range = { startFrame: whole.at(850), endFrame: whole.at(3700) };
    expect(await measureListeningBoundaryQuiet(odd.source, range)).toEqual(
      await measureListeningBoundaryQuiet(whole.source, range),
    );
    expect(await findListeningBoundaryRefinement(odd.source, range)).toEqual(
      await findListeningBoundaryRefinement(whole.source, range),
    );
    const mono = pcmSource(stretches, { rate: 44100, channels: 1 });
    const measured = await measureListeningBoundaryQuiet(mono.source, {
      startFrame: mono.at(600),
      endFrame: mono.at(3800),
    });
    expect(measured.policy).toMatchObject({
      windowFrames: 882,
      edgeFrames: 2205,
      minimumQuietFrames: 17640,
      minimumQuietWindows: 20,
      refinementBoundWindows: 75,
    });
    expect(measured.status).toBe("measured_quiet");
    expect(measured.source).toMatchObject({ sampleRate: 44100, channels: 1 });
    // 11,025 Hz has no whole 20 ms window: windows round up, so 20 windows still cover 400 ms.
    const slow = pcmSource(stretches, { rate: 11025, channels: 1 });
    const coarse = await measureListeningBoundaryQuiet(slow.source, {
      startFrame: slow.at(600) - 20,
      endFrame: slow.at(3800) + 20,
    });
    expect(coarse.policy).toMatchObject({
      windowFrames: 221,
      edgeFrames: 552,
      minimumQuietFrames: 4410,
      minimumQuietWindows: 20,
    });
    expect(coarse.status).toBe("measured_quiet");
    expect(coarse.leading.quietFrames).toBeGreaterThanOrEqual(4410);
  });
});
