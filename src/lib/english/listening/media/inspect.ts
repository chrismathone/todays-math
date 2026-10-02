import type { ListeningMediaBlocker } from "../../../../contracts/englishListeningMedia.contract";

export type ListeningMediaInspection =
  | { playable: true; durationMs: number }
  | { playable: false; blocker: ListeningMediaBlocker };

/**
 * L0 accepts ONLY canonical RIFF/WAVE, fmt(16), PCM16 mono/stereo, data, EOF.
 * Every bit pattern is a valid PCM16 sample; size/block alignment proves the full
 * sample stream is decodable. No optional chunks, ID3, LIST, trailing tags or
 * compressed codecs are accepted. This does not establish audible correctness.
 * MP3 magic is a weak hint, NEVER a decode or metadata scrub attestation.
 */
export function inspectListeningMedia(
  prefix: Buffer,
  totalBytes: number,
  mimeType: string,
  maxDurationMs: number,
): ListeningMediaInspection {
  const block = (blocker: ListeningMediaBlocker): ListeningMediaInspection => ({
    playable: false,
    blocker,
  });
  const wave =
    prefix.subarray(0, 4).toString("latin1") === "RIFF" &&
    prefix.subarray(8, 12).toString("latin1") === "WAVE";
  const mp3Hint =
    prefix.subarray(0, 3).toString("latin1") === "ID3" ||
    (prefix.length >= 4 &&
      prefix[0] === 0xff &&
      (prefix[1] & 0xe0) === 0xe0 &&
      (prefix[1] & 0x06) !== 0);
  if (mimeType === "audio/mpeg")
    return block(
      mp3Hint
        ? "mp3_decoder_and_scrubber_unavailable"
        : "type_signature_mismatch",
    );
  if (!wave) return block("type_signature_mismatch");
  if (
    prefix.length < 44 ||
    prefix.subarray(12, 16).toString("latin1") !== "fmt " ||
    prefix.readUInt32LE(16) !== 16 ||
    prefix.readUInt16LE(20) !== 1 ||
    prefix.readUInt16LE(34) !== 16 ||
    prefix.subarray(36, 40).toString("latin1") !== "data" ||
    prefix.readUInt32LE(4) !== totalBytes - 8 ||
    prefix.readUInt32LE(40) !== totalBytes - 44
  )
    return block("unsupported_or_invalid_wave");
  const channels = prefix.readUInt16LE(22);
  const sampleRate = prefix.readUInt32LE(24);
  const alignment = prefix.readUInt16LE(32);
  const byteRate = prefix.readUInt32LE(28);
  if (
    ![1, 2].includes(channels) ||
    ![8000, 16000, 22050, 24000, 32000, 44100, 48000].includes(sampleRate) ||
    alignment !== channels * 2 ||
    byteRate !== sampleRate * alignment ||
    totalBytes <= 44 ||
    (totalBytes - 44) % alignment !== 0
  )
    return block("unsupported_or_invalid_wave");
  const durationMs = ((totalBytes - 44) / byteRate) * 1000;
  return durationMs > maxDurationMs
    ? block("duration_limit")
    : // The document contract uses integer milliseconds; never round a sample down.
      { playable: true, durationMs: Math.ceil(durationMs) };
}
