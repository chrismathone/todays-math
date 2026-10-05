/** CPU-only replay of the production decoder; never writes media or PCM. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const digest = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const [inventoryPath, destination, sourceFilter] = process.argv.slice(2);
if (!inventoryPath || !destination) throw Error("native-clock.ts INVENTORY OUTPUT [SOURCE_ID]");
const bytes = fs.readFileSync(inventoryPath);
const inventory = JSON.parse(bytes.toString("utf8"));
const root = inventory.root;
const { parseMp3, decodeMp3, MAX_DURATION_MS, MAX_PLAYBACK_BYTES } = await import(
  pathToFileURL(path.join(root, "src/lib/english/listening/media/mp3.ts")).href
);
const snapshotBytes = fs.readFileSync(inventory.liveSnapshotPath);
if (digest(snapshotBytes) !== inventory.liveSnapshotSha256) throw Error("Frozen live snapshot changed");
const snapshots = JSON.parse(snapshotBytes.toString("utf8")).snapshots;
const results: unknown[] = [];
for (const s of inventory.records) {
  if (sourceFilter && s.sourceRecordId !== sourceFilter) continue;
  const snapshot = snapshots.find((r: { id: string }) => r.id === s.setId);
  try {
    if (!snapshot || snapshot.revision !== s.revision || digest(JSON.stringify(snapshot.document)) !== s.documentSha256)
      throw Error("Frozen document/revision mismatch");
    const original = fs.readFileSync(s.sourceAudioPath);
    if (digest(original) !== s.sourceAudioSha256) throw Error("Original source bytes changed");
    const parsed = parseMp3(original, MAX_DURATION_MS);
    const playbackSha256 = digest(original.subarray(parsed.audioStart, parsed.audioEnd));
    if (playbackSha256 !== s.audio.sha256) throw Error("Production playback is not the entire scrubbed original MP3");
    const hash = createHash("sha256");
    let frames = 0;
    const decoded = await decodeMp3(original, { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES }, async (pcm: Buffer) => {
      hash.update(pcm);
      frames += pcm.length / (parsed.channels * 2);
    });
    if (decoded.durationMs !== s.audio.durationMs) throw Error(`Playback clock drift: decoded ${decoded.durationMs}, live ${s.audio.durationMs}`);
    const result = {
      sourceRecordId: s.sourceRecordId, status: "passed", sourceAudioSha256: s.sourceAudioSha256,
      playbackSha256, documentSha256: s.documentSha256, revision: s.revision,
      decoder: "production-decodeMp3/mpg123-decoder/enableGapless", sampleRate: parsed.sampleRate,
      channels: parsed.channels, frameCount: frames, durationMs: decoded.durationMs,
      decodedInterleavedInt16Sha256: hash.digest("hex"), sourceToPlaybackOffsetMs: 0,
      playbackProof: "byte-identical-all-original-MPEG-frames-ID3-only-scrubbed",
    };
    results.push(result);
    process.stderr.write(`${s.sourceRecordId} ${decoded.durationMs}ms passed\n`);
  } catch (error) {
    results.push({ sourceRecordId: s.sourceRecordId, status: "held", reasons: [String(error)] });
    process.stderr.write(`${s.sourceRecordId} held: ${String(error)}\n`);
  }
}
const manifest = {
  schemaVersion: 1, evidenceContractVersion: 1, inventorySha256: digest(bytes),
  liveSnapshotSha256: digest(snapshotBytes), decoderImplementationSha256: digest(fs.readFileSync(path.join(root, "src/lib/english/listening/media/mp3.ts"))),
  sourceCount: results.length, records: results, writesDatabase: false, writesStorage: false, writesMedia: false,
};
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(manifest, null, 2), { flag: "wx" });
