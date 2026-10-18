/**
 * Offline taxonomy evidence. No DB client, credentials, HTTP, or generation API.
 * Run with tsx: --snapshot-dir <completed export> --out <private directory>.
 * Writes private parsed rows and public-safe registry metadata; Python companion
 * builds candidate/family inventories without copying textbook text into Git.
 */
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { once } from "node:events";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";
import {
  elementaryUnits,
  listedForms,
} from "../../../src/lib/elementary/generate";
import { elementaryComboDefinitions } from "../../../src/lib/elementary/combo";
import { registeredTypes } from "../../../src/lib/middle/generate";
import { middleComboDefinitions } from "../../../src/lib/middle/combo";
import { judgementDefinitions } from "../../../src/lib/middle/judge/registry";
import {
  registeredHighTypes,
  registeredHighHolds,
} from "../../../src/lib/high/generate";
import { nativeDescriptiveDefinitions } from "../../../src/lib/engine/nativeDescriptive20261018";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";

const arg = (name: string) => process.argv[process.argv.indexOf(name) + 1];
if (!process.argv.includes("--snapshot-dir") || !process.argv.includes("--out"))
  throw new Error(
    "Required: --snapshot-dir <completed export> --out <private directory>",
  );
const input = resolve(arg("--snapshot-dir"));
const out = resolve(arg("--out"));
const meta = JSON.parse(
  readFileSync(join(input, "snapshot-meta.json"), "utf8"),
);
if (meta.readOnly !== true || meta.isolation !== "RepeatableRead")
  throw new Error("Expected completed read-only repeatable-read snapshot");
mkdirSync(out, { recursive: true, mode: 0o700 });
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const norm = (s: string | null) =>
  (s ?? "").normalize("NFC").replace(/\s+/gu, " ").trim();
function metadata<T extends { handler: unknown }>(entry: T) {
  const { handler, ...data } = entry;
  void handler;
  return data;
}
const registrations = [
  ...elementaryUnits().flatMap((u) =>
    listedForms(u).map((f) => ({
      kind: "elementary",
      familyKey: `elem:${u.grade}|${u.section}|${f.id}`,
      grade: u.grade,
      chapter: u.chapter,
      unitSection: u.section,
      label: `문형 ${f.id}`,
      tier: f.tier,
    })),
  ),
  ...registeredTypes().map((e) => ({
    ...metadata(e),
    kind: "middle",
    familyKey: `mid:${e.key}`,
    label: e.rpmTitle,
  })),
  ...middleComboDefinitions().map((e) => ({
    ...e,
    kind: "middle-combo",
    familyKey: `mid:${e.id}`,
    grade: e.anchorGrade,
    unitSection: e.anchorSection,
    label: e.id,
  })),
  ...judgementDefinitions().map((e) => ({
    ...e,
    kind: "judge",
    label: e.title,
  })),
  ...registeredHighTypes().map((e) => ({
    ...metadata(e),
    kind: "high",
    familyKey: null,
    label: e.rpmTitle,
  })),
  ...nativeDescriptiveDefinitions().map((e) => ({
    ...e,
    kind: "native-descriptive",
    familyKey: `native-desc:${e.definitionId}`,
    label: e.title,
  })),
];
writeFileSync(
  join(out, "registry.json"),
  JSON.stringify(
    {
      sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      registrations,
      highHolds: registeredHighHolds(),
      elementaryCombos: elementaryComboDefinitions(),
      labelEvidence:
        "Registered labels only; no claim to original exam or publisher-question correspondence",
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);

async function main() {
  const stream = createWriteStream(join(out, "parsed.jsonl"), { mode: 0o600 });
  const checksum = createHash("sha256");
  const raw = createReadStream(join(input, "snapshot.jsonl"));
  raw.on("data", (chunk) => checksum.update(chunk));
  const lines = createInterface({ input: raw, crlfDelay: Infinity });
  let count = 0;
  let eligible = 0;
  let parseErrors = 0;
  for await (const line of lines) {
    if (!line) continue;
    const row = JSON.parse(line);
    let parsed;
    let parseError: string | null = null;
    try {
      parsed = parseProblemContent(row.content);
    } catch (err) {
      parseErrors += 1;
      parseError = err instanceof Error ? err.message : String(err);
      parsed = { question: row.content, choices: [] };
    }
    const answer = norm(row.answer);
    const answerIndex = /^[①-⑤]$/.test(answer)
      ? answer.charCodeAt(0) - "①".charCodeAt(0)
      : -1;
    const resolvedAnswer =
      answerIndex >= 0 && parsed.choices[answerIndex] !== undefined
        ? norm(parsed.choices[answerIndex])
        : answer;
    const figure = sha(
      JSON.stringify([
        row.figureSvg ?? null,
        row.figureUrls ?? [],
        row.choiceFigureIndex ?? [],
      ]),
    );
    const record = {
      id: row.id,
      unitId: row.unitId,
      familyKey: row.familyKey,
      source: row.source,
      eligible: row.eligible,
      problemCode: row.problemCode,
      difficulty: row.difficulty,
      questionType: row.questionType,
      problemType: row.problemType,
      originProblemId: row.originProblemId,
      sourceMaterialId: row.sourceMaterialId,
      externalId: row.externalId,
      parseError,
      choiceCount: parsed.choices.length,
      hasFigure: !!row.figureSvg || (row.figureUrls?.length ?? 0) > 0,
      figure,
      content: norm(row.content),
      question: norm(parsed.question),
      answer,
      resolvedAnswer,
      solution: norm(row.solution),
      choices: parsed.choices.map(norm),
      payload: sha(
        JSON.stringify([
          row.content,
          row.answer,
          row.solution,
          row.figureSvg ?? null,
          row.figureUrls ?? [],
          row.choiceFigureIndex ?? [],
        ]),
      ),
      contentExact: sha(JSON.stringify([norm(row.content), figure])),
      contentOnly: sha(norm(row.content)),
      questionHash: sha(norm(parsed.question)),
      answerHash: sha(answer),
      solutionHash: sha(norm(row.solution)),
    };
    if (!stream.write(JSON.stringify(record) + "\n"))
      await once(stream, "drain");
    count += 1;
    if (row.eligible) eligible += 1;
  }
  stream.end();
  await once(stream, "finish");
  const digest = checksum.digest("hex");
  if (
    digest !== meta.sha256 ||
    count !== meta.total ||
    eligible !== meta.eligible
  )
    throw new Error(`Snapshot mismatch: ${count}/${eligible}/${digest}`);
  writeFileSync(
    join(out, "parse-meta.json"),
    JSON.stringify(
      { snapshotSha256: digest, count, eligible, parseErrors },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      count,
      eligible,
      parseErrors,
      registrations: registrations.length,
      out,
    }),
  );
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
