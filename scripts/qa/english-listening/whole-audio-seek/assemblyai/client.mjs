/** Resumable full-original ASR evidence. No DB/Storage/clip writes. */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  open,
  stat,
} from "node:fs/promises";
import { resolve, join } from "node:path";

export const transcriptionConfig = Object.freeze({
  speech_models: ["universal-2"],
  language_codes: ["en", "ko"],
  punctuate: true,
  format_text: false,
});
export const englishConfig = Object.freeze({
  speech_models: ["universal-3-5-pro"],
  language_code: "en",
  punctuate: true,
  format_text: false,
});
const api = "https://api.assemblyai.com/v2";
export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
export async function fileSha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
async function atomicJson(path, value) {
  const temporary = path + ".tmp-" + process.pid;
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  await rename(temporary, path);
}
function assert(value, message) {
  if (!value) throw new Error(message);
}
function safeFailure(message, key) {
  return String(message)
    .replaceAll(key, "[key omitted]")
    .replace(/https?:\/\/\S+/g, "[URL omitted]")
    .slice(0, 500);
}
/** Structural provenance for a reading library. Timings remain unverified ASR output.
 * Keep every raw word; exclude impossible intervals only from derived display text.
 * This deliberately does NOT authorize any question seek start.
 */
export function libraryTranscript(
  raw,
  durationMs,
  config = transcriptionConfig,
) {
  assert(raw.status === "completed", "Transcript is not completed");
  assert(
    Array.isArray(raw.words) && raw.words.length > 0,
    "Completed transcript has no word timing evidence",
  );
  assert(
    Number.isInteger(durationMs) && durationMs > 0,
    "Missing certified original duration",
  );
  let previousStart = -1;
  for (const word of raw.words) {
    assert(
      typeof word.text === "string" && word.text.trim(),
      "Invalid transcript word",
    );
    assert(
      Number.isInteger(word.start) &&
        Number.isInteger(word.end) &&
        word.start >= 0 &&
        word.end >= word.start &&
        word.start >= previousStart,
      "Word timing is out of original source bounds or order",
    );
    assert(
      Number.isFinite(word.confidence) &&
        word.confidence >= 0 &&
        word.confidence <= 1,
      "Word has no raw confidence",
    );
    previousStart = word.start;
  }
  assert(
    Number.isFinite(raw.audio_duration) && raw.audio_duration > 0,
    "Missing provider audio duration",
  );
  if (raw.speech_model_used != null)
    assert(
      raw.speech_model_used === config.speech_models[0],
      "Unexpected actual ASR model",
    );
  const valid = raw.words.filter((word) => word.end <= durationMs);
  const durationDeltaMs = Math.round(raw.audio_duration * 1000) - durationMs;
  return {
    displayText:
      valid.length === raw.words.length
        ? raw.text
        : valid.map((word) => word.text).join(" "),
    timingQuality: {
      outOfBoundsWordCount: raw.words.filter((word) => word.end > durationMs)
        .length,
      nonPositiveWordCount: raw.words.filter((word) => word.start === word.end)
        .length,
      durationDeltaMs,
      durationMatched: Math.abs(durationDeltaMs) <= 1500,
    },
  };
}
export function validateWords(raw, durationMs, config = transcriptionConfig) {
  libraryTranscript(raw, durationMs, config);
  assert(
    raw.words.every((word) => word.end <= durationMs + 1000),
    "Word timing is out of original source bounds or order",
  );
  assert(
    Math.abs(raw.audio_duration * 1000 - durationMs) <= 1500,
    "Provider audio duration differs from certified whole-original playback",
  );
}

export async function transcribeOriginal({
  source,
  output,
  apiKey,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  pollMs = 3000,
  maxPolls = 600,
  onProgress = () => {},
  config = transcriptionConfig,
  purpose = "seek",
}) {
  assert(
    purpose === "seek" || purpose === "library",
    "Unreviewed transcription purpose",
  );
  const validate = purpose === "library" ? libraryTranscript : validateWords;
  assert(apiKey && apiKey.length >= 16, "ASSEMBLYAI_API_KEY is missing");
  assert(
    /^[a-z0-9-]+$/.test(source.sourceRecordId),
    "Invalid original source identity",
  );
  const audioPath = resolve(source.sourceAudioPath);
  const originalHash = await fileSha256(audioPath);
  assert(
    originalHash === source.sourceAudioSha256,
    "Original audio bytes changed",
  );
  const durationMs = source.audio.durationMs;
  assert(
    Number.isInteger(durationMs) && durationMs > 0,
    "Whole-original playback duration is missing",
  );
  assert(
    [transcriptionConfig, englishConfig].some(
      (allowed) => JSON.stringify(config) === JSON.stringify(allowed),
    ),
    "Unreviewed transcription profile",
  );
  const configSha256 = sha256(JSON.stringify(config));
  const directory = join(
    resolve(output),
    source.sourceRecordId,
    configSha256.slice(0, 12),
  );
  await mkdir(directory, { recursive: true });
  const statePath = join(directory, "job.json");
  const lockPath = join(directory, "active.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        "An existing job lock needs ownership inspection; no duplicate submission",
      );
    throw error;
  }
  await lock.writeFile(
    JSON.stringify({
      pid: process.pid,
      createdAt: new Date().toISOString(),
      sourceRecordId: source.sourceRecordId,
    }),
  );
  const identity = {
    sourceRecordId: source.sourceRecordId,
    sourceAudioSha256: originalHash,
    playbackSha256: source.audio.sha256,
    durationMs,
    configSha256,
  };
  const request = async (method, route, body, bytes = false) => {
    let response;
    try {
      response = await fetchImpl(api + route, {
        method,
        headers: {
          authorization: apiKey,
          ...(body == null
            ? {}
            : {
                "content-type": bytes
                  ? "application/octet-stream"
                  : "application/json",
              }),
        },
        ...(body == null ? {} : { body: bytes ? body : JSON.stringify(body) }),
        ...(bytes ? { duplex: "half" } : {}),
        signal: AbortSignal.timeout(bytes ? 180000 : 30000),
      });
    } catch (error) {
      throw new Error(safeFailure(error.message, apiKey));
    }
    if (!response.ok) {
      const raw = await response.text();
      throw new Error(
        "AssemblyAI HTTP " + response.status + ": " + safeFailure(raw, apiKey),
      );
    }
    return response.json();
  };
  let state;
  try {
    try {
      state = await json(statePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (state) {
      assert(
        Object.entries(identity).every(([key, value]) => state[key] === value),
        "Cached job has different source bytes, clock or model configuration",
      );
      assert(
        state.phase !== "submission_pending",
        "Submission outcome is unknown; inspect provider before any retry to avoid duplicate billing",
      );
    } else {
      state = {
        schemaVersion: 1,
        ...identity,
        config,
        phase: "new",
        createdAt: new Date().toISOString(),
      };
      await atomicJson(statePath, state);
    }
    if (state.phase === "completed") {
      const rawPath = join(directory, "raw.json");
      assert(
        (await fileSha256(rawPath)) === state.rawSha256,
        "Cached completed transcript changed",
      );
      const raw = await json(rawPath);
      validate(raw, durationMs, config);
      return {
        ...identity,
        transcriptId: state.transcriptId,
        directory,
        cached: true,
        wordCount: raw.words.length,
      };
    }
    assert(
      state.phase !== "error",
      "Previous provider job failed; a paid retry must be explicitly investigated",
    );
    if (!state.uploadUrl) {
      onProgress({
        sourceRecordId: source.sourceRecordId,
        phase: "uploading_original",
      });
      const upload = await request(
        "POST",
        "/upload",
        createReadStream(audioPath),
        true,
      );
      const url = new URL(upload.upload_url);
      assert(
        url.protocol === "https:" &&
          (url.hostname === "cdn.assemblyai.com" ||
            url.hostname.endsWith(".assemblyai.com")),
        "Upload receipt did not name AssemblyAI",
      );
      state.uploadUrl = upload.upload_url;
      state.phase = "uploaded";
      await atomicJson(statePath, state);
    }
    if (!state.transcriptId) {
      state.phase = "submission_pending";
      state.submittedAt = new Date().toISOString();
      await atomicJson(statePath, state);
      const submitted = await request("POST", "/transcript", {
        audio_url: state.uploadUrl,
        ...config,
      });
      assert(
        typeof submitted.id === "string" &&
          /^[a-zA-Z0-9-]+$/.test(submitted.id),
        "Invalid transcript submission receipt",
      );
      state.transcriptId = submitted.id;
      state.phase = submitted.status;
      await atomicJson(join(directory, "submission.json"), submitted);
      await atomicJson(statePath, state);
    }
    onProgress({
      sourceRecordId: source.sourceRecordId,
      phase: "submitted",
      transcriptId: state.transcriptId,
    });
    let lastPhase;
    for (let poll = 0; poll < maxPolls; poll++) {
      const raw = await request("GET", "/transcript/" + state.transcriptId);
      assert(
        raw.id === state.transcriptId,
        "Provider returned a different transcript",
      );
      if (raw.status !== lastPhase) {
        onProgress({
          sourceRecordId: source.sourceRecordId,
          phase: raw.status,
          transcriptId: state.transcriptId,
        });
        lastPhase = raw.status;
      }
      if (raw.status === "error") {
        state.phase = "error";
        state.error = safeFailure(raw.error, apiKey);
        await atomicJson(join(directory, "error.json"), raw);
        await atomicJson(statePath, state);
        throw new Error("AssemblyAI transcription failed: " + state.error);
      }
      if (raw.status === "completed") {
        const rawPath = join(directory, "raw.json");
        await atomicJson(rawPath, raw);
        const library = validate(raw, durationMs, config);
        assert(
          (await fileSha256(audioPath)) === originalHash,
          "Original audio changed while transcribing",
        );
        state.rawSha256 = await fileSha256(rawPath);
        state.phase = "completed";
        state.completedAt = new Date().toISOString();
        await atomicJson(statePath, state);
        await atomicJson(join(directory, "envelope.json"), {
          schemaVersion: 1,
          provider: "assemblyai",
          ...identity,
          originalAudioPath: audioPath,
          originalAudioBytes: (await stat(audioPath)).size,
          request: config,
          requestedModel: config.speech_models[0],
          actualModel: raw.speech_model_used ?? null,
          transcriptId: raw.id,
          completedAt: state.completedAt,
          raw: { path: rawPath, sha256: state.rawSha256 },
          wordCount: raw.words.length,
          providerDurationSeconds: raw.audio_duration,
          writesDatabase: false,
          writesStorage: false,
          originalAudioModified: false,
          humanReviewed: false,
          alignmentVerified: false,
          ...(purpose === "library"
            ? { timingQuality: library.timingQuality }
            : {}),
        });
        return {
          ...identity,
          transcriptId: state.transcriptId,
          directory,
          cached: false,
          wordCount: raw.words.length,
          actualModel: raw.speech_model_used ?? null,
        };
      }
      assert(
        raw.status === "queued" || raw.status === "processing",
        "Unknown provider job state",
      );
      await sleep(pollMs);
    }
    throw new Error(
      "Provider job remains pending; resume its existing transcript ID",
    );
  } finally {
    await lock.close();
    const { unlink } = await import("node:fs/promises");
    await unlink(lockPath);
  }
}
