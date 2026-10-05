/**
 * Measure one source's production energy without keeping PCM.
 *
 * Usage: node --experimental-strip-types measureNative.ts <sourceRecordId>
 * Reads the frozen inventory and Codex's passed native clock. Writes
 * grok/native/<id>.energy.f64 and grok/native/<id>.native.json.
 */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceRecordId = process.argv[2];
if (!sourceRecordId) throw new Error("sourceRecordId is required");

const root = "C:/Creative/testautocreator";
const outDir = `${root}/output/listening-assessments/whole-audio-seek-20261005/grok/native`;
const inventory = JSON.parse(readFileSync(`${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`, "utf8"));
const clockFile = JSON.parse(readFileSync(`${root}/output/listening-assessments/whole-audio-seek-20261005/codex/complete-native-clock.json`, "utf8"));
const record = inventory.records.find((item: { sourceRecordId: string }) => item.sourceRecordId === sourceRecordId);
const clock = clockFile.records.find((item: { sourceRecordId: string }) => item.sourceRecordId === sourceRecordId);
if (!record || record.assignedAgent !== "grok") throw new Error("Not a grok inventory record");
if (!clock || clock.status !== "passed") throw new Error("Native clock is not a passed replay");
if (clock.sourceAudioSha256 !== record.sourceAudioSha256) throw new Error("Clock source hash differs");
if (clock.playbackSha256 !== record.audio.sha256) throw new Error("Clock playback hash differs");
// 2006-2's original is m4a. native-windows decodes the proof's playback MP3
// only after the nine-landmark zero-offset proof verifies. Other sources stay
// on their own MPEG bytes.
if (sourceRecordId === "ebs-middle-1-2006-2") {
  if (!clock.convertedClockProof?.path || !clock.convertedClockProof?.sha256)
    throw new Error("2006-2 requires Codex's converted playback clock proof");
  if (clock.sourceToPlaybackOffsetMs !== 0)
    throw new Error("2006-2 clock offset is not zero");
} else if (clock.convertedClockProof) {
  throw new Error("Converted playback clock is only valid for ebs-middle-1-2006-2");
}

const spec = {
  root,
  source: {
    sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    audio: { sha256: record.audio.sha256 },
  },
  clock,
  probes: [],
};
const script = path.join(root, "scripts/qa/english-listening/whole-audio-seek/codex/native-windows.mts");
const tsx = "C:/Creative/testautocreator/node_modules/tsx/dist/cli.mjs";
const child = spawn(process.execPath, [tsx, script], { stdio: ["pipe", "pipe", "pipe"] });
let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });
child.stdin.end(JSON.stringify(spec));
const code: number = await new Promise((resolve) => child.on("close", resolve));
if (code !== 0) throw new Error(`native-windows exited ${code}: ${stderr.slice(0, 500)}`);
const measured = JSON.parse(stdout);
if (measured.pcmSha256 !== clock.decodedInterleavedInt16Sha256) throw new Error("PCM hash drifted");
if (measured.playbackSha256 !== record.audio.sha256) throw new Error("Playback hash drifted");
const energy = Buffer.from(measured.energyBase64, "base64");
const energySha256 = createHash("sha256").update(energy).digest("hex");
if (energySha256 !== measured.energySha256) throw new Error("Energy hash drifted");
mkdirSync(outDir, { recursive: true });
const energyName = `${sourceRecordId}.energy.f64`;
writeFileSync(path.join(outDir, energyName), energy, { flag: "wx" });
const native = {
  schemaVersion: 1,
  provider: "grok",
  inventorySha256: inventory.inventorySha256 ?? "beb63eeb348ea93a39fa87bcc594cb018104260b800c1b423bff378cb7f3c1ef",
  sourceRecordId,
  sourceAudioPath: record.sourceAudioPath,
  sourceAudioSha256: record.sourceAudioSha256,
  playback: { sha256: measured.playbackSha256, durationMs: measured.durationMs },
  pcm: {
    sampleRate: measured.sampleRate,
    channels: measured.channels,
    frameCount: measured.frameCount,
    sha256: measured.pcmSha256,
  },
  energy: {
    statistic: "max_channel_sum_of_squares_pcm16",
    windowMs: 20,
    windowFrames: measured.windowFrames,
    windowCount: energy.length / 8,
    encoding: "float64le",
    file: energyName,
    sha256: energySha256,
  },
  originalAudioModified: false,
  writesDatabase: false,
  writesStorage: false,
  persistentFullPcm: false,
  ...(sourceRecordId === "ebs-middle-1-2006-2"
    ? {
        decodedFrom: "converted-playback-mp3",
        convertedClockProof: clock.convertedClockProof,
        playbackAudioPath: measured.playbackAudioPath ?? null,
      }
    : { decodedFrom: "original-mpeg" }),
};
const nativePath = path.join(outDir, `${sourceRecordId}.native.json`);
writeFileSync(nativePath, JSON.stringify(native, null, 2), { flag: "wx" });
const nativeSha256 = createHash("sha256").update(readFileSync(nativePath)).digest("hex");
process.stdout.write(`${JSON.stringify({ sourceRecordId, energySha256, nativeSha256, frameCount: measured.frameCount, windows: energy.length / 8 })}\n`);
