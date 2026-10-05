/**
 * What was asked for against what was heard.
 *
 * Every request file under a root is compared with the raw containers of its
 * round: one container per requested source, bound to that request's bytes and
 * to the source's bytes, holding exactly the requested probes in order. Nothing
 * is recognized or repaired here; a request that is short stays short.
 *
 * A full run is built only on complete coverage: every request finished, or
 * declared stopped by name with its reason (stopped-requests.json); no stage on
 * record that failed without such a declaration; no raw folder without request.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STOPPED_REQUESTS_PATH = join(HERE, "..", "stopped-requests.json");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const slash = (path) => resolve(path).replace(/\\/g, "/");
const REQUEST = /^round-(\d{3})\.json$/;
const RAW = /^round-(\d{3})$/;
const keyOf = (source, probe, language) =>
  [source, language, probe.startFrame, probe.frameCount].join("|");

/** Why a container does not answer its source's part of the request; [] when it does. */
function unbound(container, source, requestSha256) {
  const reasons = [];
  if (container.sourceRecordId !== source.sourceRecordId)
    reasons.push("another_source");
  if (container.requestSha256 !== requestSha256)
    reasons.push("another_request");
  if (container.sourceAudioSha256 !== source.sourceAudioSha256)
    reasons.push("another_original");
  if (!Array.isArray(container.probes)) return [...reasons, "no_probes"];
  if (container.probes.length !== source.probes.length)
    reasons.push("probe_count");
  else if (
    !source.probes.every((asked, i) => {
      const heard = container.probes[i];
      return (
        heard.id === asked.id &&
        heard.startFrame === asked.startFrame &&
        heard.frameCount === asked.frameCount &&
        (heard.requestedLanguage ?? container.requestedLanguage) ===
          asked.language &&
        Array.isArray(heard.segments) &&
        typeof heard.clipPcmSha256 === "string"
      );
    })
  )
    reasons.push("probe_identity");
  return reasons;
}

/** One root: its requests, each against its round's raw containers. */
function rootCoverage(root) {
  const requestsDir = join(root.path, "probe-requests");
  const rawDir = join(root.path, "probes");
  const requestFiles = existsSync(requestsDir)
    ? readdirSync(requestsDir).sort()
    : [];
  const rawFolders = existsSync(rawDir) ? readdirSync(rawDir).sort() : [];
  const heard = new Set();
  const rows = [];
  for (const file of requestFiles) {
    const match = REQUEST.exec(file);
    if (!match) continue;
    const round = match[1];
    const path = join(requestsDir, file);
    const bytes = readFileSync(path);
    const request = JSON.parse(bytes.toString("utf8"));
    const requestSha256 = sha256(bytes);
    const folder = join(rawDir, "round-" + round);
    const present = existsSync(folder) ? readdirSync(folder).sort() : [];
    const row = {
      root: root.name,
      round,
      stage: request.summary?.stage ?? request.mode ?? null,
      requestPath: slash(path),
      requestSha256,
      sourcesRequested: request.sources.length,
      sourcesComplete: 0,
      probesRequested: 0,
      probesHeard: 0,
      overflowProbes: 0,
      missingSources: [],
      unboundContainers: [],
      unrequestedContainers: present.filter(
        (name) =>
          !request.sources.some((s) => s.sourceRecordId + ".json" === name),
      ),
      missing: [],
    };
    for (const source of request.sources) {
      row.probesRequested += source.probes.length;
      const keys = source.probes.map((p) =>
        keyOf(source.sourceRecordId, p, p.language),
      );
      const containerPath = join(folder, source.sourceRecordId + ".json");
      if (!existsSync(containerPath)) {
        row.missingSources.push(source.sourceRecordId);
        row.missing.push(...keys);
        continue;
      }
      const container = JSON.parse(readFileSync(containerPath, "utf8"));
      const reasons = unbound(container, source, requestSha256);
      if (reasons.length) {
        row.unboundContainers.push({
          sourceRecordId: source.sourceRecordId,
          reasons,
        });
        row.missing.push(...keys);
        continue;
      }
      row.sourcesComplete += 1;
      row.probesHeard += container.probes.length;
      row.overflowProbes += container.probes.filter((p) => p.overflow).length;
      for (const key of keys) heard.add(key);
    }
    row.complete =
      row.sourcesComplete === row.sourcesRequested &&
      row.unrequestedContainers.length === 0;
    rows.push(row);
  }
  const requested = new Set(rows.map((row) => "round-" + row.round));
  return {
    rows,
    heard,
    rawFoldersWithoutRequest: rawFolders
      .filter((name) => !requested.has(name))
      .map((name) => root.name + ":" + name),
    unexpectedRequestFiles: requestFiles
      .filter((name) => !REQUEST.test(name))
      .map((name) => root.name + ":" + name),
    unexpectedRawFolders: rawFolders
      .filter((name) => !RAW.test(name))
      .map((name) => root.name + ":" + name),
  };
}

/**
 * @param roots    [{ name, path }]
 * @param stopped  [{ root, round, reason }] requests declared stopped
 * @param stages   stage records of the drivers (logs/stages.jsonl), oldest first
 */
export function coverageOf({ roots, stopped = [], stages = [] }) {
  const parts = roots.map(rootCoverage);
  const heard = new Set(parts.flatMap((part) => [...part.heard]));
  const declared = new Map(stopped.map((s) => [s.root + ":" + s.round, s]));
  const requests = parts
    .flatMap((part) => part.rows)
    .map(({ missing, ...row }) => {
      const declaration = declared.get(row.root + ":" + row.round);
      const elsewhere = missing.filter((key) => heard.has(key)).length;
      return {
        ...row,
        // Of the probes this request never got: how many of the same source,
        // language, start and length were heard in another round, and how many
        // nowhere. A stopped request is not thereby finished; this only says
        // what became of what it had asked.
        missingProbes: missing.length,
        missingProbesHeardInAnotherRound: elsewhere,
        missingProbesHeardNowhere: missing.length - elsewhere,
        stopped: declaration && !row.complete ? declaration.reason : null,
      };
    });
  const undeclared = requests.filter((row) => !row.complete && !row.stopped);
  const rootOf = (stage) =>
    roots.find((root) => slash(root.path) === slash(stage.root))?.name ?? null;
  const failedStages = stages.filter(
    (s) => s.runnerExit !== 0 && s.runnerExit !== null,
  );
  const unresolved = failedStages.filter(
    (s) => !declared.has(rootOf(s) + ":" + s.round),
  );
  // A stage on record must have its request; one that planned nothing has none.
  const stagesWithoutRequest = stages.filter(
    (s) =>
      s.round !== null &&
      !requests.some((row) => row.root === rootOf(s) && row.round === s.round),
  );
  const list = (name) => parts.flatMap((part) => part[name]);
  const summary = {
    requests: requests.length,
    requestsComplete: requests.filter((row) => row.complete).length,
    requestsStopped: requests
      .filter((row) => row.stopped)
      .map((r) => r.root + ":" + r.round),
    requestsIncompleteUndeclared: undeclared.map((r) => r.root + ":" + r.round),
    sourcesRequested: requests.reduce((n, r) => n + r.sourcesRequested, 0),
    sourcesComplete: requests.reduce((n, r) => n + r.sourcesComplete, 0),
    probesRequested: requests.reduce((n, r) => n + r.probesRequested, 0),
    probesHeard: requests.reduce((n, r) => n + r.probesHeard, 0),
    overflowProbes: requests.reduce((n, r) => n + r.overflowProbes, 0),
    rawFoldersWithoutRequest: list("rawFoldersWithoutRequest"),
    unexpectedRequestFiles: list("unexpectedRequestFiles"),
    unexpectedRawFolders: list("unexpectedRawFolders"),
    stagesOnRecord: stages.length,
    stagesThatPlannedNothing: stages.filter((s) => s.round === null).length,
    stagesFailed: failedStages.map(
      (s) => s.driver + ":" + s.stage + ":" + s.round,
    ),
    stagesFailedUndeclared: unresolved.map(
      (s) => s.driver + ":" + s.stage + ":" + s.round,
    ),
    stagesWithoutRequest: stagesWithoutRequest.map(
      (s) => s.driver + ":" + s.stage + ":" + s.round,
    ),
  };
  return {
    schemaVersion: 1,
    producer: "claude-native-recovery",
    kind: "listening-coverage-receipt",
    roots: roots.map((root) => ({ name: root.name, path: slash(root.path) })),
    complete:
      undeclared.length === 0 &&
      unresolved.length === 0 &&
      stagesWithoutRequest.length === 0 &&
      summary.rawFoldersWithoutRequest.length === 0 &&
      summary.unexpectedRequestFiles.length === 0 &&
      summary.unexpectedRawFolders.length === 0,
    summary,
    stoppedRequests: stopped,
    requests,
    stages,
    humanReviewed: false,
  };
}

/** Stage records of the drivers: one JSON object per line. */
export function readStages(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

/** The producer's own output root: its rounds and its adversarial rounds. */
export function listeningCoverage(out, stoppedPath = STOPPED_REQUESTS_PATH) {
  const stoppedBytes = readFileSync(stoppedPath);
  const stagesPath = join(out, "logs", "stages.jsonl");
  const receipt = coverageOf({
    roots: [
      { name: basename(out), path: out },
      { name: "adversarial", path: join(out, "adversarial") },
    ],
    stopped: JSON.parse(stoppedBytes.toString("utf8")).requests,
    stages: readStages(stagesPath),
  });
  return {
    ...receipt,
    stoppedRequestsFile: {
      path: slash(stoppedPath),
      sha256: sha256(stoppedBytes),
    },
    stageRecordsFile: existsSync(stagesPath)
      ? { path: slash(stagesPath), sha256: sha256(readFileSync(stagesPath)) }
      : null,
    stageRecordsNote:
      "Stage records exist from round 023 on; earlier rounds are covered by their requests and containers only.",
  };
}
