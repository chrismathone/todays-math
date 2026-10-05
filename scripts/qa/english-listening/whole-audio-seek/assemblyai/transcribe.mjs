import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  transcribeOriginal,
  fileSha256,
  transcriptionConfig,
  englishConfig,
} from "./client.mjs";

const { values } = parseArgs({
  options: {
    inventory: { type: "string" },
    certificate: { type: "string" },
    sources: { type: "string" },
    output: { type: "string" },
    "max-audio-minutes": { type: "string", default: "120" },
    profile: { type: "string", default: "bilingual" },
    purpose: { type: "string", default: "seek" },
    concurrency: { type: "string", default: "2" },
  },
});
if (
  !values.inventory ||
  !values.certificate ||
  !values.sources ||
  !values.output
)
  throw new Error(
    "Explicit immutable inventory, certificate, source IDs and output required",
  );
const inventoryPath = resolve(values.inventory),
  certificatePath = resolve(values.certificate);
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const certificate = JSON.parse(await readFile(certificatePath, "utf8"));
if (certificate.completeReplay !== true || certificate.errors.length !== 0)
  throw new Error("Current held certificate is not complete");
if (!["seek", "library"].includes(values.purpose))
  throw new Error("Unknown transcription purpose");
const ids =
  values.sources === "all"
    ? inventory.records.map((source) => source.sourceRecordId)
    : values.sources.split(",");
if (new Set(ids).size !== ids.length)
  throw new Error("Duplicate requested source");
const sources = ids.map((id) =>
  inventory.records.find((source) => source.sourceRecordId === id),
);
if (sources.some((source) => !source)) throw new Error("Unknown source");
for (const source of sources) {
  const rows = certificate.records.filter(
    (row) => row.sourceRecordId === source.sourceRecordId,
  );
  if (
    (values.purpose === "seek" && !rows.some((row) => row.status === "held")) ||
    rows.length !== source.questions.length ||
    rows.some(
      (row) =>
        row.sourceAudioSha256 !== source.sourceAudioSha256 ||
        row.playbackSha256 !== source.audio.sha256,
    )
  )
    throw new Error(
      "Requested source has no held question or mismatched original audio",
    );
}
if (!["bilingual", "english", "both"].includes(values.profile))
  throw new Error("Unknown reviewed transcription profile");
const configs =
  values.profile === "both"
    ? [englishConfig, transcriptionConfig]
    : [values.profile === "english" ? englishConfig : transcriptionConfig];
const audioMinutes = sources.reduce(
  (n, source) => n + source.audio.durationMs / 60000,
  0,
);
const billableAudioMinutes = audioMinutes * configs.length;
const cap = Number(values["max-audio-minutes"]);
if (!Number.isFinite(cap) || cap <= 0 || billableAudioMinutes > cap)
  throw new Error("Explicit transcription audio-minute cap exceeded");
const concurrency = Number(values.concurrency);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5)
  throw new Error("Concurrency must be between one and five");
const output = resolve(values.output);
await mkdir(output, { recursive: true });
const plan = {
  createdAt: new Date().toISOString(),
  provider: "assemblyai",
  profile: values.profile,
  purpose: values.purpose,
  configs,
  audioMinutes,
  billableAudioMinutes,
  maxAudioMinutes: cap,
  concurrency,
  inventory: { path: inventoryPath, sha256: await fileSha256(inventoryPath) },
  certificate: {
    path: certificatePath,
    sha256: await fileSha256(certificatePath),
  },
  sources: sources.map((source) => ({
    sourceRecordId: source.sourceRecordId,
    sourceAudioSha256: source.sourceAudioSha256,
    playbackSha256: source.audio.sha256,
    durationMs: source.audio.durationMs,
  })),
  writesDatabase: false,
  writesStorage: false,
};
await writeFile(
  resolve(output, "plan-" + Date.now() + ".json"),
  JSON.stringify(plan, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    phase: "plan",
    sources: sources.length,
    audioMinutes: Number(audioMinutes.toFixed(2)),
    billableAudioMinutes: Number(billableAudioMinutes.toFixed(2)),
    models: configs.map((config) => config.speech_models[0]),
    profile: values.profile,
    concurrency,
  }),
);
const jobs = configs.flatMap((config) =>
  sources.map((source) => ({ source, config })),
);
const results = new Array(jobs.length);
let nextIndex = 0;
await Promise.all(
  Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (nextIndex < jobs.length) {
      const index = nextIndex++,
        { source, config } = jobs[index];
      try {
        results[index] = await transcribeOriginal({
          source,
          output,
          config,
          purpose: values.purpose,
          apiKey: process.env.ASSEMBLYAI_API_KEY,
          onProgress: (progress) =>
            console.log(
              JSON.stringify({ ...progress, model: config.speech_models[0] }),
            ),
        });
      } catch (error) {
        results[index] = {
          sourceRecordId: source.sourceRecordId,
          requestedModel: config.speech_models[0],
          failed: true,
          error: error.message,
        };
      }
      console.log(
        JSON.stringify({
          phase: "job_finished",
          sourceRecordId: source.sourceRecordId,
          model: config.speech_models[0],
          failed: Boolean(results[index].failed),
          finishedJobs: results.filter(Boolean).length,
          totalJobs: jobs.length,
        }),
      );
    }
  }),
);
await writeFile(
  resolve(output, "results-" + Date.now() + ".json"),
  JSON.stringify({ ...plan, results }, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    phase: "finished",
    successful: results.filter((result) => !result.failed).length,
    failed: results.filter((result) => result.failed),
  }),
);
if (results.some((result) => result.failed)) process.exitCode = 1;
