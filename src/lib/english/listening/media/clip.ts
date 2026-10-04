import type { ListeningDraft } from "@/contracts/englishListeningHttp.contract";
import { inspectListeningMedia } from "./inspect";
import { MAX_DURATION_MS, MAX_PLAYBACK_BYTES } from "./mp3";

type Question = ListeningDraft["groups"][number]["questions"][number] & {
  audioRange?: { startMs: number; endMs: number };
};
export interface ListeningWaveClipPlan {
  header: Buffer;
  durationMs: number;
  totalBytes: number;
  ranges: { start: number; endExclusive: number }[];
  evidenceByQuestionId: Map<string, Question["evidence"]>;
  audioRangeByQuestionId: Map<string, { startMs: number; endMs: number }>;
}

/** Explicit teacher-entered ranges only. No speech detection, guessed timing or resampling. */
export function planListeningWaveClip(
  header: Buffer,
  totalBytes: number,
  questions: Question[],
): ListeningWaveClipPlan {
  const checked = inspectListeningMedia(
    header,
    totalBytes,
    "audio/wav",
    MAX_DURATION_MS,
  );
  if (!checked.playable) throw new Error("검증된 PCM 음원이 필요합니다.");
  const rate = header.readUInt32LE(24);
  const alignment = header.readUInt16LE(32);
  const samples = (totalBytes - 44) / alignment;
  if (!questions.length || questions.some((question) => !question.audioRange))
    throw new Error("문항 음원 구간을 먼저 지정해 주세요.");
  const ranges = questions
    .map((question, order) => {
      const range = question.audioRange!;
      if (
        !Number.isSafeInteger(range.startMs) ||
        !Number.isSafeInteger(range.endMs) ||
        range.startMs < 0 ||
        range.startMs >= range.endMs ||
        range.endMs > checked.durationMs
      )
        throw new Error("문항 음원 구간이 원본 음원 범위를 벗어났습니다.");
      const start = Math.floor((range.startMs * rate) / 1000);
      const end = Math.min(samples, Math.ceil((range.endMs * rate) / 1000));
      if (start >= end) throw new Error("문항 음원 구간을 확인해 주세요.");
      return { start, end, order };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const union: {
    start: number;
    end: number;
    order: number;
    outputStart: number;
  }[] = [];
  for (const range of ranges) {
    const previous = union.at(-1);
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
      previous.order = Math.min(previous.order, range.order);
    } else union.push({ ...range, outputStart: 0 });
  }
  union.sort((a, b) => a.order - b.order || a.start - b.start);
  let outputSamples = 0;
  for (const range of union) {
    range.outputStart = outputSamples;
    outputSamples += range.end - range.start;
  }
  const outputBytes = 44 + outputSamples * alignment;
  const durationMs = Math.ceil((outputSamples * 1000) / rate);
  if (outputBytes > MAX_PLAYBACK_BYTES || durationMs > MAX_DURATION_MS)
    throw new Error("선택한 음원이 보관 한도를 초과했습니다.");
  const outputHeader = Buffer.from(header.subarray(0, 44));
  outputHeader.writeUInt32LE(outputBytes - 8, 4);
  outputHeader.writeUInt32LE(outputBytes - 44, 40);
  const remap = (range: { startMs: number; endMs: number }) => {
    const start = Math.floor((range.startMs * rate) / 1000);
    const end = Math.min(samples, Math.ceil((range.endMs * rate) / 1000));
    const containing = union.find(
      (part) => part.start <= start && part.end >= end,
    );
    if (!containing || start < 0 || start >= end) return null;
    return {
      startMs: Math.floor(
        ((containing.outputStart + start - containing.start) * 1000) / rate,
      ),
      endMs: Math.min(
        durationMs,
        Math.ceil(
          ((containing.outputStart + end - containing.start) * 1000) / rate,
        ),
      ),
    };
  };
  const evidenceByQuestionId = new Map(
    questions.map((question) => [
      question.id,
      question.evidence.flatMap((range) => {
        const remapped = remap(range);
        return remapped ? [remapped] : [];
      }),
    ]),
  );
  const audioRangeByQuestionId = new Map(
    questions.map((question) => [question.id, remap(question.audioRange!)!]),
  );
  return {
    header: outputHeader,
    durationMs,
    totalBytes: outputBytes,
    ranges: union.map((range) => ({
      start: 44 + range.start * alignment,
      endExclusive: 44 + range.end * alignment,
    })),
    evidenceByQuestionId,
    audioRangeByQuestionId,
  };
}
