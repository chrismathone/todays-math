/** Original audio-only staging; one local GPU ASR and at most two generation jobs. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

async function main() {
  const { values } = parseArgs({
    options: {
      prepared: { type: "string" },
      output: { type: "string" },
      "asr-output": { type: "string" },
      python: { type: "string" },
      "model-cache": { type: "string" },
      "env-file": { type: "string" },
      "style-templates": { type: "string" },
      limit: { type: "string", default: "72" },
      execute: { type: "boolean", default: false },
    },
    strict: true,
  });
  for (const field of [
    "prepared",
    "output",
    "asr-output",
    "python",
    "model-cache",
    "env-file",
  ] as const)
    if (!values[field]) throw new Error(`--${field} required`);
  const limit = Number(values.limit);
  if (values.execute && !values["style-templates"])
    throw new Error(
      "New generation requires actual same-grade --style-templates (version 3)",
    );
  if (!Number.isInteger(limit) || limit < 1 || limit > 72)
    throw new Error("Batch limit must be 1..72");
  const output = path.resolve(values.output!);
  const manifestFile = path.join(output, "manifest.json");
  const exists = async (file: string) =>
    fs.access(file).then(
      () => true,
      () => false,
    );
  const json = async (file: string) =>
    JSON.parse(await fs.readFile(file, "utf8"));
  const records = [];
  for (const file of await fs.readdir(values.prepared!)) {
    if (!/^ebs-middle-[123]-\d{4}-[12]\.json$/.test(file)) continue;
    const payload = await json(path.join(values.prepared!, file));
    if (
      payload.verification.audioOnly &&
      payload.verification.originalDocumentsMissing
    )
      records.push({ file: path.join(values.prepared!, file), payload });
  }
  records.sort(
    (a, b) =>
      b.payload.createInput.source.year - a.payload.createInput.source.year ||
      b.payload.createInput.source.round - a.payload.createInput.source.round ||
      a.payload.createInput.level.localeCompare(
        b.payload.createInput.level,
        "ko",
      ),
  );
  const manifest = (await exists(manifestFile))
    ? await json(manifestFile)
    : { schemaVersion: 1, createdAt: new Date().toISOString(), records: [] };
  await fs.mkdir(output, { recursive: true });
  let manifestWrites = Promise.resolve();
  const save = async () => {
    manifest.updatedAt = new Date().toISOString();
    const snapshot = JSON.stringify(manifest, null, 2);
    manifestWrites = manifestWrites.then(async () => {
      const partial = manifestFile + ".partial";
      await fs.writeFile(partial, snapshot, "utf8");
      for (let attempt = 0; ; attempt++)
        try {
          await fs.rename(partial, manifestFile);
          break;
        } catch (error) {
          if (attempt >= 5) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * (attempt + 1)),
          );
        }
    });
    await manifestWrites;
  };
  const upsert = (record: Record<string, unknown>) => {
    const previous = manifest.records.findIndex(
      (item: { sourceRecordId: string }) =>
        item.sourceRecordId === record.sourceRecordId,
    );
    if (previous < 0) manifest.records.push(record);
    else manifest.records[previous] = record;
  };
  const registerPrepared = async (id: string, file: string) => {
    const bytes = await fs.readFile(file);
    const payload = JSON.parse(bytes.toString("utf8"));
    upsert({
      sourceRecordId: id,
      status: "prepared",
      path: file,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      questionCount: payload.verification.questionCount,
      aiVerified: payload.verification.semanticVerification.aiVerified,
      needsReview: payload.verification.semanticVerification.needsReview,
      sourceAudioSha256: payload.verification.asr.sourceAudioSha256,
      asrSeconds: payload.verification.asr.transcriptionSeconds,
      estimatedOffPeakUsd:
        payload.verification.apiCosts.estimatedOffPeakTotalUsd ?? null,
    });
    await save();
    console.log(
      JSON.stringify({
        stage: "prepared",
        sourceRecordId: id,
        questionCount: payload.verification.questionCount,
        aiVerified: payload.verification.semanticVerification.aiVerified,
        needsReview: payload.verification.semanticVerification.needsReview,
      }),
    );
  };
  const run = async (executable: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn(executable, args, {
        cwd: process.cwd(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          HF_HUB_DISABLE_SYMLINKS_WARNING: "1",
        },
      });
      child.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-3000);
      });
      child.once("error", () => reject(new Error("Worker could not start")));
      child.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Worker exited ${code}; ${stderr.slice(-800)}`)),
      );
    });
  const tasks = new Set<Promise<void>>();
  for (const { file, payload } of records.slice(0, limit)) {
    const id = payload.sourceRecordId;
    const resultFile = path.join(output, `${id}.json`);
    if (await exists(resultFile)) {
      await registerPrepared(id, resultFile);
      continue;
    }
    if (!values.execute) {
      console.log(JSON.stringify({ stage: "pending", sourceRecordId: id }));
      continue;
    }
    while (tasks.size >= 2) await Promise.race(tasks);
    const asrFile = path.join(
      values["asr-output"]!,
      id,
      "asr-medium-multilingual.json",
    );
    try {
      upsert({
        sourceRecordId: id,
        status: "transcribing",
        sourceAudioSha256: payload.sourceFiles.find(
          (asset: { kind: string }) => asset.kind === "audio",
        ).sha256,
      });
      await save();
      if (!(await exists(asrFile)))
        await run(values.python!, [
          "scripts/qa/english-listening/transcribe-local.py",
          "--audio",
          payload.audioFilePath,
          "--expected-sha256",
          payload.sourceFiles.find(
            (asset: { kind: string }) => asset.kind === "audio",
          ).sha256,
          "--output",
          asrFile,
          "--model-cache",
          values["model-cache"]!,
          "--model",
          "medium",
          "--device",
          "cuda",
          "--compute-type",
          "int8",
          "--language",
          "auto",
          "--multilingual",
        ]);
      upsert({ sourceRecordId: id, status: "generating", asrPath: asrFile });
      await save();
      const task = (async () => {
        try {
          await run(process.execPath, [
            "--import",
            "tsx",
            "scripts/qa/english-listening/reconstruct-audio.ts",
            "--prepared",
            file,
            "--asr",
            asrFile,
            "--output",
            output,
            "--env-file",
            values["env-file"]!,
            "--generate",
            "--verify",
            "--generation-version",
            "3",
            "--style-templates",
            values["style-templates"]!,
            "--repair-four-choices",
          ]);
          await registerPrepared(id, resultFile);
        } catch (error) {
          upsert({
            sourceRecordId: id,
            status: "failed",
            error: error instanceof Error ? error.message : "Worker failed",
            asrPath: asrFile,
          });
          await save();
          console.log(JSON.stringify({ stage: "failed", sourceRecordId: id }));
        }
      })();
      tasks.add(task);
      void task.finally(() => tasks.delete(task));
    } catch (error) {
      upsert({
        sourceRecordId: id,
        status: "failed",
        error: error instanceof Error ? error.message : "ASR failed",
      });
      await save();
      console.log(JSON.stringify({ stage: "failed", sourceRecordId: id }));
    }
  }
  await Promise.all(tasks);
  manifest.completedAt = new Date().toISOString();
  await save();
  console.log(
    JSON.stringify({
      stage: "complete",
      manifest: manifestFile,
      prepared: manifest.records.filter(
        (item: { status: string }) => item.status === "prepared",
      ).length,
      failed: manifest.records.filter(
        (item: { status: string }) => item.status === "failed",
      ).length,
    }),
  );
}
void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Batch failed",
    }),
  );
  process.exitCode = 1;
});
