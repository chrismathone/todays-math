import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import {
  transcribeOriginal,
  sha256,
  validateWords,
  libraryTranscript,
  englishConfig,
} from "./client.mjs";

const key = "local-test-key-never-sent";
const complete = () => ({
  id: "test-job-1",
  status: "completed",
  speech_model_used: "universal-2",
  audio_duration: 10,
  words: [
    { text: "1번", start: 500, end: 850, confidence: 0.96 },
    { text: "대화를", start: 950, end: 1200, confidence: 0.92 },
  ],
});
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "listening-aai-test-"));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("listening-aai-test-"));
    return rm(directory, { recursive: true, force: true });
  });
  const bytes = Buffer.from("original-test-audio");
  const sourceAudioPath = join(directory, "audio.mp3");
  await writeFile(sourceAudioPath, bytes);
  return {
    output: join(directory, "results"),
    source: {
      sourceRecordId: "test-source",
      sourceAudioPath,
      sourceAudioSha256: sha256(bytes),
      audio: { durationMs: 10000, sha256: sha256(bytes) },
    },
  };
}
function fakeAPI({ submissionFailure, completed = complete() } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({
      url,
      method: options.method,
      config:
        typeof options.body === "string" ? JSON.parse(options.body) : null,
    });
    if (url.endsWith("/upload")) {
      for await (const _ of options.body) {
        /* consume actual original input stream */
      }
      return Response.json({
        upload_url: "https://cdn.assemblyai.com/upload/local-test",
      });
    }
    if (options.method === "POST") {
      if (submissionFailure) throw new Error("unknown network result");
      return Response.json({ id: "test-job-1", status: "queued" });
    }
    return Response.json(completed);
  };
  return { fetchImpl, calls };
}

test("one whole original upload binds raw timed words and both languages; cached resume makes no provider calls", async (t) => {
  const input = await fixture(t),
    api = fakeAPI();
  const first = await transcribeOriginal({ ...input, apiKey: key, ...api });
  assert.equal(first.cached, false);
  assert.equal(first.wordCount, 2);
  assert.equal(api.calls.length, 3);
  assert.deepEqual(api.calls[1].config.language_codes, ["en", "ko"]);
  assert.equal(api.calls[1].config.language_detection, undefined);
  assert.deepEqual(api.calls[1].config.speech_models, ["universal-2"]);
  const envelope = JSON.parse(
    await readFile(join(first.directory, "envelope.json"), "utf8"),
  );
  assert.equal(envelope.sourceAudioSha256, input.source.sourceAudioSha256);
  assert.equal(envelope.durationMs, 10000);
  assert.equal(envelope.alignmentVerified, false);
  assert.equal(envelope.writesStorage, false);
  assert.equal(envelope.writesDatabase, false);
  assert.equal(JSON.stringify(envelope).includes(key), false);
  const second = await transcribeOriginal({
    ...input,
    apiKey: key,
    fetchImpl: () => {
      throw new Error("must be cache only");
    },
  });
  assert.equal(second.cached, true);
  assert.equal(second.transcriptId, first.transcriptId);
});
test("unknown paid submission outcome cannot automatically resubmit", async (t) => {
  const input = await fixture(t),
    api = fakeAPI({ submissionFailure: true });
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /unknown network result/,
  );
  const callsBefore = api.calls.length;
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /Submission outcome is unknown/,
  );
  assert.equal(api.calls.length, callsBefore);
});
test("English evidence uses a separate paid request and cache identity from bilingual evidence", async (t) => {
  const input = await fixture(t),
    bilingual = fakeAPI();
  const first = await transcribeOriginal({
    ...input,
    apiKey: key,
    ...bilingual,
  });
  const english = fakeAPI({
    completed: { ...complete(), speech_model_used: "universal-3-5-pro" },
  });
  const second = await transcribeOriginal({
    ...input,
    config: englishConfig,
    apiKey: key,
    ...english,
  });
  assert.notEqual(first.directory, second.directory);
  assert.equal(english.calls[1].config.language_code, "en");
  assert.equal(english.calls[1].config.language_codes, undefined);
  assert.deepEqual(english.calls[1].config.speech_models, [
    "universal-3-5-pro",
  ]);
});
test("changed original audio is rejected before upload", async (t) => {
  const input = await fixture(t),
    api = fakeAPI();
  await writeFile(input.source.sourceAudioPath, "different-audio");
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /Original audio bytes changed/,
  );
  assert.equal(api.calls.length, 0);
});
test("a changed playback clock cannot reuse the previous transcription receipt", async (t) => {
  const input = await fixture(t),
    api = fakeAPI();
  await transcribeOriginal({ ...input, apiKey: key, ...api });
  input.source.audio.durationMs = 11000;
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /different source bytes, clock or model/,
  );
  assert.equal(api.calls.length, 3);
});
test("tampered cached timed words are rejected without retranscribing", async (t) => {
  const input = await fixture(t),
    api = fakeAPI();
  const result = await transcribeOriginal({ ...input, apiKey: key, ...api });
  await writeFile(
    join(result.directory, "raw.json"),
    JSON.stringify({ ...complete(), words: [] }),
  );
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /Cached completed transcript changed/,
  );
  assert.equal(api.calls.length, 3);
});
test("failed provider job remains failed on resume and cannot double bill", async (t) => {
  const input = await fixture(t),
    api = fakeAPI({
      completed: { id: "test-job-1", status: "error", error: "unsupported" },
    });
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /transcription failed/,
  );
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /Previous provider job failed/,
  );
  assert.equal(api.calls.length, 3);
});
test("unknown active job ownership prevents duplicate work", async (t) => {
  const input = await fixture(t),
    api = fakeAPI();
  const first = await transcribeOriginal({ ...input, apiKey: key, ...api });
  await writeFile(
    join(first.directory, "active.lock"),
    JSON.stringify({ pid: 987654, sourceRecordId: "test-source" }),
  );
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /existing job lock needs ownership inspection/,
  );
  assert.equal(api.calls.length, 3);
});
test("HTTP error cannot expose the provider key or private upload URL", async (t) => {
  const input = await fixture(t);
  await assert.rejects(
    transcribeOriginal({
      ...input,
      apiKey: key,
      fetchImpl: async () =>
        new Response(
          "failure " + key + " https://private.example/upload?token=secret",
          { status: 401 },
        ),
    }),
    (error) =>
      !error.message.includes(key) &&
      !error.message.includes("token=secret") &&
      error.message.includes("401"),
  );
});
test("provider timestamps stay estimates and invalid word bounds/clock/model cannot become usable evidence", () => {
  validateWords(complete(), 10000);
  for (const mutate of [
    (raw) => {
      raw.words[1].start = 200;
    },
    (raw) => {
      raw.words[0].start = -1;
    },
    (raw) => {
      raw.words[0].end = 11001;
    },
    (raw) => {
      raw.words[0].confidence = null;
    },
    (raw) => {
      raw.audio_duration = 20;
    },
    (raw) => {
      raw.speech_model_used = "another-model";
    },
    (raw) => {
      raw.words = [];
    },
  ]) {
    const raw = complete();
    mutate(raw);
    assert.throws(() => validateWords(raw, 10000));
  }
});
test("library can resume a structurally valid completed job with unusable timing without another paid submission", async (t) => {
  const input = await fixture(t),
    raw = complete();
  raw.text = "1번 대화를 Fabricated sign-off.";
  raw.words.push({
    text: "Fabricated sign-off.",
    start: 40000,
    end: 43000,
    confidence: 0.9,
  });
  const api = fakeAPI({ completed: raw });
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /bounds/,
  );
  assert.equal(api.calls.filter((call) => call.method === "POST").length, 2);
  const resumed = await transcribeOriginal({
    ...input,
    apiKey: key,
    ...api,
    purpose: "library",
  });
  assert.equal(api.calls.filter((call) => call.method === "POST").length, 2);
  assert.deepEqual(
    JSON.parse(await readFile(join(resumed.directory, "raw.json"), "utf8")),
    raw,
  );
  const envelope = JSON.parse(
    await readFile(join(resumed.directory, "envelope.json"), "utf8"),
  );
  assert.equal(envelope.timingQuality.outOfBoundsWordCount, 1);
  assert.equal(envelope.alignmentVerified, false);
  await assert.rejects(
    transcribeOriginal({ ...input, apiKey: key, ...api }),
    /bounds/,
  );
  assert.equal(api.calls.length, 4);
});
test("zero-duration in-bounds text is preserved while outside intervals are neither clamped nor added to reading text", () => {
  const raw = complete();
  raw.text = "1번 대화를 impossible";
  raw.words.push({ text: "short", start: 2000, end: 2000, confidence: 0.8 });
  raw.words.push({
    text: "impossible",
    start: 15000,
    end: 15000,
    confidence: 0.8,
  });
  const result = libraryTranscript(raw, 10000);
  assert.equal(result.displayText, "1번 대화를 short");
  assert.equal(result.timingQuality.nonPositiveWordCount, 2);
  assert.equal(result.timingQuality.outOfBoundsWordCount, 1);
  assert.equal(raw.words[3].start, 15000);
});
