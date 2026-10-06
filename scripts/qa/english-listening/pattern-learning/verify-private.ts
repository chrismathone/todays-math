import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeCorpus,
  type PrivateRecord,
  type TranscriptRow,
  type Supplement,
} from "./analyzer";
import { loadAssessmentPatterns } from "../../../../src/lib/english/listening/creation/assessmentPatterns";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const index = process.argv.indexOf("--main");
const main = path.resolve(
  index < 0 ? "C:/Creative/testautocreator" : process.argv[index + 1],
);
async function readJson(filename: string): Promise<unknown> {
  return JSON.parse((await readFile(filename, "utf8")).replace(/^\uFEFF/, ""));
}
const englishTokens = (text: string) =>
  text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
function ngrams(text: string) {
  const words = englishTokens(text);
  return Array.from({ length: Math.max(0, words.length - 7) }, (_, i) =>
    words.slice(i, i + 8).join(" "),
  );
}
function allStrings(
  value: unknown,
  visit: (key: string, value: string) => void,
  key = "",
) {
  if (typeof value === "string") visit(key, value);
  else if (Array.isArray(value))
    value.forEach((v) => allStrings(v, visit, key));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([k, v]) => allStrings(v, visit, k));
}
async function verify() {
  const packet = (await readJson(
    path.join(
      main,
      ".qa-artifacts/listening-retirement-20261006/corpus-private.json",
    ),
  )) as { records: PrivateRecord[]; transcripts: TranscriptRow[] };
  const inventory = (await readJson(
    path.join(
      main,
      "output/listening-assessments/whole-audio-seek-20261006/native-recovery/rebase-baseline-001/inventory.json",
    ),
  )) as { records: PrivateRecord[] };
  const supplements = new Map<string, Supplement>();
  for (const r of packet.records) {
    // No private file is copied into this checkout or into test fixtures.
    supplements.set(r.sourceRecordId, {
      asr: (await readJson(
        path.resolve(main, r.asrPath!),
      )) as Supplement["asr"],
      prepared: await readJson(path.resolve(main, r.preparedPath!)),
      alignment: (await readJson(
        path.resolve(main, r.alignmentPath!),
      )) as Supplement["alignment"],
    });
  }
  const { patterns } = analyzeCorpus(packet, inventory, supplements);
  const reverse = analyzeCorpus(
    {
      records: [...packet.records].reverse(),
      transcripts: [...packet.transcripts].reverse(),
    },
    { records: [...inventory.records].reverse() },
    supplements,
  ).patterns;
  const retainedBytes = await readFile(
    path.join(
      root,
      "src/lib/english/listening/creation/assessment-patterns.json",
    ),
    "utf8",
  );
  loadAssessmentPatterns(JSON.parse(retainedBytes));
  const reproduced = JSON.stringify(patterns, null, 2) + "\n" === retainedBytes;
  const orderIndependent = JSON.stringify(patterns) === JSON.stringify(reverse);

  const files = [
    "src/lib/english/listening/creation/assessmentPatterns.ts",
    "src/lib/english/listening/creation/assessment-patterns.json",
    "docs/listening-production/PATTERN-GUIDE.md",
    "src/__tests__/unit/englishListeningAssessmentPatterns.test.ts",
    "scripts/qa/english-listening/pattern-learning/analyzer.ts",
    "scripts/qa/english-listening/pattern-learning/analyze.ts",
    "scripts/qa/english-listening/pattern-learning/verify-private.ts",
    "scripts/qa/english-listening/pattern-learning/tsconfig.json",
  ];
  const bundle = (
    await Promise.all(files.map((f) => readFile(path.join(root, f), "utf8")))
  ).join("\n");
  const bundleGrams = new Set(ngrams(bundle));
  const sourceGrams = new Set<string>(),
    identities = new Set<string>(),
    longStrings = new Set<string>();
  const visit = (key: string, value: string) => {
    if (
      /(?:^id$|_id$|Id$|Sha256$|sha256$|^title$|^originalFilename$)/.test(
        key,
      ) &&
      value.length >= 12
    )
      identities.add(value);
    if (
      [
        "text",
        "spokenText",
        "display_text",
        "translation",
        "prompt",
        "instruction",
        "explanation",
      ].includes(key)
    ) {
      if (value.trim().length >= 32) longStrings.add(value.trim());
      for (const gram of ngrams(value)) sourceGrams.add(gram);
    }
  };
  allStrings(packet, visit);
  allStrings(inventory, visit);
  for (const supplement of supplements.values()) allStrings(supplement, visit);
  const identityMatches = [...identities].filter((s) =>
    bundle.includes(s),
  ).length;
  const rawStringMatches = [...longStrings].filter((s) =>
    bundle.includes(s),
  ).length;
  const transcriptNgramMatches = [...sourceGrams].filter((gram) =>
    bundleGrams.has(gram),
  ).length;
  let privateReceiptIgnored = false;
  try {
    execFileSync(
      "git",
      [
        "check-ignore",
        "--quiet",
        path.join(
          main,
          ".qa-artifacts/listening-retirement-20261006/pattern-coverage-private.json",
        ),
      ],
      { cwd: main, stdio: "ignore" },
    );
    privateReceiptIgnored = true;
  } catch {
    /* report only a boolean */
  }
  const passed =
    reproduced &&
    orderIndependent &&
    !identityMatches &&
    !rawStringMatches &&
    !transcriptNgramMatches &&
    privateReceiptIgnored;
  console.log(
    JSON.stringify({
      passed,
      sources: patterns.population.sources,
      questions: patterns.population.questions,
      retainedFilesScanned: files.length,
      reproducedByteForByte: reproduced,
      inputOrderIndependent: orderIndependent,
      sourceIdentityMatches: identityMatches,
      rawSourceStringMatches: rawStringMatches,
      transcriptEightWordMatches: transcriptNgramMatches,
      privateReceiptIgnored,
    }),
  );
  if (!passed) process.exitCode = 1;
}
verify().catch(() => {
  console.error(
    "Private verification failed; no source content or matching evidence printed.",
  );
  process.exitCode = 1;
});
