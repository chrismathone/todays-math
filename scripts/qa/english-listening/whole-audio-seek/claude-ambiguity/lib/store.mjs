/**
 * Read-only access to the frozen inputs and to stored bounded recognitions.
 *
 * Every file is read as bytes once; its SHA-256 is of those bytes. A frozen
 * input whose hash differs from the value fixed for this task is refused.
 * Nothing under the inventory root is opened for writing.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

export class FrozenInputError extends Error {}

const MAIN = "C:/Creative/testautocreator";
const SEEK = MAIN + "/output/listening-assessments/whole-audio-seek-20261005";

/** The immutable inputs of this task and the hashes they were handed over with. */
export const FROZEN = Object.freeze({
  inventory: {
    path: MAIN + "/.qa-artifacts/whole-audio-seek-20261005/inventory.json",
    sha256: "beb63eeb348ea93a39fa87bcc594cb018104260b800c1b423bff378cb7f3c1ef",
  },
  liveSnapshot: {
    path:
      MAIN +
      "/.qa-artifacts/listening-original-preservation/2026-10-05T03-36-49-881Z/live-snapshot.json",
    sha256: "362336b01784bf52476f75b0b266a1f257a6e2c58a7f46c7a2285d18bdd870d0",
  },
  frozenInputs: {
    path: SEEK + "/codex/frozen-inputs-v3.json",
    sha256: "fcf2183939b8e39178fa11da2fb2bb868ae6564fac88797a4a952cd38f6343f0",
  },
  clock: {
    path: SEEK + "/codex/complete-native-clock.json",
    sha256: "681e9c18bab9054afa96c4493811879087d5250cdd473e81802ec2b162892d73",
  },
  certificate: {
    path: SEEK + "/codex/replay-final-002/certificate.json",
    sha256: "99c5bc17db4c18e5b3b683776947df21b4b1b4c3ac83f9fe1159a3e5eb972368",
  },
  heldDiagnostics: {
    path: SEEK + "/codex/replay-final-002/held-diagnostics.json",
    sha256: "116dbffa47b87b409f8847abb2b95c36debc103b70546def714256090c648674",
  },
  claudeMarks: {
    path: SEEK + "/claude/runs/final-002/marks.json",
    sha256: "31c9caa808038c2286a44bbddaef0eb729a6d5b9fd6d5cfa164db977dd2c58de",
  },
  geminiLedger: {
    path: SEEK + "/gemini/ledger1282-004.json",
    sha256: "109ab91847b847ec1a12a3499c250a7b71a9709db6c6ba5a6422c2842c66b374",
  },
  mappingAudit: {
    path: SEEK + "/codex/reconstructed-mapping-audit-003.json",
    sha256: "5319ab98d94b38237052da5fb5994ec383cd452b7d51861fd7c62b82ae1a8050",
  },
});

export const PATHS = Object.freeze({
  seek: SEEK,
  claudeOut: SEEK + "/claude",
  grokOut: SEEK + "/grok",
  heldOut: SEEK + "/claude-held-validation-20261005",
});

const parse = (bytes) =>
  JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));

/** Reads one frozen input and refuses it when its bytes changed. */
export function readFrozen(name) {
  const entry = FROZEN[name];
  if (!entry) throw new FrozenInputError("Unknown frozen input: " + name);
  const bytes = readFileSync(entry.path);
  const actual = sha256(bytes);
  if (actual !== entry.sha256)
    throw new FrozenInputError(
      `${name} changed: expected ${entry.sha256} got ${actual}`,
    );
  return parse(bytes);
}

/** Reads a JSON file bound to a hash named by another frozen file. */
export function readBoundJson(path, expectedSha256, label) {
  const bytes = readFileSync(path);
  const actual = sha256(bytes);
  if (actual !== expectedSha256)
    throw new FrozenInputError(
      `${label} changed: ${path} expected ${expectedSha256} got ${actual}`,
    );
  return parse(bytes);
}

/**
 * The official script of one source exactly as the independent verifier reads
 * it: the original prepared file's group transcripts, bound through the frozen
 * prepared file. The live snapshot's transcript must be the same text.
 */
export function officialScript(record, frozenFiles, liveBySet) {
  const prepared = readBoundJson(
    record.preparedPath,
    record.preparedSha256,
    "Prepared file",
  );
  const bound = frozenFiles.originalPrepared;
  if (
    !prepared.originalPreparedPath ||
    !bound ||
    resolve(prepared.originalPreparedPath) !== resolve(bound.path) ||
    prepared.originalPreparedSha256 !== bound.sha256
  )
    return { text: null, reason: "official_original_prepared_unbound" };
  const original = readBoundJson(
    bound.path,
    bound.sha256,
    "Original prepared file",
  );
  const text = original.editableInput.groups
    .map((g) => g.transcript.text)
    .join("\n");
  const live = liveBySet.get(record.setId);
  const liveText = live?.document?.groups
    ?.map((g) => g.transcript?.text ?? "")
    .join("\n");
  if (liveText !== text)
    return { text: null, reason: "official_script_sources_disagree" };
  return {
    text,
    sha256: sha256(Buffer.from(text, "utf8")),
    originalPrepared: { path: bound.path, sha256: bound.sha256 },
    reason: null,
  };
}

/** Native loudness of one source from a measured cache, bound to the clock proof. */
export function loadNativeEnergy(outDir, record, clock) {
  const metaPath = join(
    outDir,
    "native",
    record.sourceRecordId + ".native.json",
  );
  const energyPath = join(
    outDir,
    "native",
    record.sourceRecordId + ".energy.f64",
  );
  const metaBytes = readFileSync(metaPath);
  const meta = parse(metaBytes);
  const energyBytes = readFileSync(energyPath);
  const problems = [];
  if (
    meta.sourceRecordId !== record.sourceRecordId ||
    meta.sourceAudioSha256 !== record.sourceAudioSha256
  )
    problems.push("native_cache_wrong_source");
  if (sha256(energyBytes) !== meta.energy.sha256)
    problems.push("native_energy_hash_mismatch");
  if (
    meta.pcm.sha256 !== clock.decodedInterleavedInt16Sha256 ||
    meta.pcm.sampleRate !== clock.sampleRate ||
    meta.pcm.frameCount !== clock.frameCount ||
    meta.pcm.channels !== clock.channels
  )
    problems.push("native_full_pcm_hash_mismatch");
  if (energyBytes.length !== meta.energy.windowCount * 8)
    problems.push("native_energy_shape_mismatch");
  if (problems.length)
    throw new FrozenInputError(problems.join(",") + ": " + metaPath);
  const energy = new Float64Array(
    energyBytes.buffer.slice(
      energyBytes.byteOffset,
      energyBytes.byteOffset + energyBytes.byteLength,
    ),
  );
  return {
    energy,
    windowFrames: meta.energy.windowFrames,
    sampleRate: meta.pcm.sampleRate,
    frameCount: meta.pcm.frameCount,
    channels: meta.pcm.channels,
    pcmSha256: meta.pcm.sha256,
    cachePath: metaPath,
    cacheSha256: sha256(metaBytes),
    energyPath,
    energySha256: meta.energy.sha256,
  };
}

/**
 * Stored bounded recognitions of one source across several output folders.
 * A container is offered only together with the bytes hash of itself and of
 * the request file it names.
 */
export class ProbeStore {
  constructor(roots) {
    this.roots = roots;
    this.bySource = new Map();
    this.requests = new Map();
  }

  request(path) {
    const key = resolve(path);
    if (!this.requests.has(key)) {
      const bytes = readFileSync(key);
      this.requests.set(key, { sha256: sha256(bytes), value: parse(bytes) });
    }
    return this.requests.get(key);
  }

  /** Every stored container of a source: [{ path, containerSha256, container, requestSha256, request }]. */
  containers(sourceRecordId) {
    if (this.bySource.has(sourceRecordId))
      return this.bySource.get(sourceRecordId);
    const found = [];
    for (const root of this.roots) {
      const probes = join(root, "probes");
      if (!existsSync(probes)) continue;
      for (const round of readdirSync(probes).sort()) {
        const path = join(probes, round, sourceRecordId + ".json");
        if (!existsSync(path)) continue;
        const bytes = readFileSync(path);
        const container = parse(bytes);
        const request = this.request(container.requestPath);
        found.push({
          path: resolve(path),
          containerSha256: sha256(bytes),
          container,
          requestSha256: request.sha256,
          request: request.value,
        });
      }
    }
    this.bySource.set(sourceRecordId, found);
    return found;
  }

  /** The loaded container a row's `{ path }` reference names, or null. */
  load(sourceRecordId, path) {
    const wanted = resolve(path);
    return (
      this.containers(sourceRecordId).find((c) => c.path === wanted) ?? null
    );
  }
}
