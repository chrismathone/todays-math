/** Decode the authenticated existing proxy; no new encoded audio is created. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const [inventoryPath, mappingPath, outputPath] = process.argv.slice(2);
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
if (mapping.status !== "passed" || mapping.clock.sourceToPlaybackOffsetMs !== 0) throw Error("Actual converted clock mapping has not proved zero offset");
const source = inventory.records.find((s: { sourceRecordId: string }) => s.sourceRecordId === mapping.sourceRecordId);
const proxy = fs.readFileSync(mapping.playback.path);
if (digest(proxy) !== mapping.playback.sha256 || digest(proxy) !== source.audio.sha256) throw Error("Actual existing playback bytes changed");
if (digest(fs.readFileSync(source.sourceAudioPath)) !== source.sourceAudioSha256) throw Error("Original converted source changed");
const { decodeMp3, parseMp3, MAX_DURATION_MS, MAX_PLAYBACK_BYTES } = await import(pathToFileURL(path.join(inventory.root, "src/lib/english/listening/media/mp3.ts")).href);
const parsed = parseMp3(proxy, MAX_DURATION_MS);
const hash = createHash("sha256");
let frames = 0;
const decoded = await decodeMp3(proxy, { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES }, async (pcm: Buffer) => {
  hash.update(pcm);
  frames += pcm.length / (parsed.channels * 2);
});
if (decoded.durationMs !== source.audio.durationMs) throw Error("Converted production duration differs from actual playback decode");
const proof = {
  sourceRecordId: source.sourceRecordId, status: "passed", sourceAudioSha256: source.sourceAudioSha256,
  playbackSha256: source.audio.sha256, documentSha256: source.documentSha256, revision: source.revision,
  sampleRate: parsed.sampleRate, channels: parsed.channels, frameCount: frames, durationMs: decoded.durationMs,
  decodedInterleavedInt16Sha256: hash.digest("hex"), sourceToPlaybackOffsetMs: 0,
  decoder: "production-decodeMp3/mpg123-decoder/enableGapless",
  playbackProof: "authenticated-existing-converted-MP3; nine whole-source actual MP4/proxy correlation landmarks prove zero offset",
  convertedClockProof: { path: path.resolve(mappingPath), sha256: digest(fs.readFileSync(mappingPath)) },
};
fs.writeFileSync(outputPath, JSON.stringify(proof, null, 2), { flag: "wx" });
process.stdout.write(JSON.stringify({ status: proof.status, durationMs: proof.durationMs, sourceRecordId: proof.sourceRecordId }));
