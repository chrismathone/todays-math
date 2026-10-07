/** Read current source and review files afresh; write a plan only after complete content agreement. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import {
  compileContentApplicationPlan,
  type ApplicationScope,
} from "./application";
import { canonicalProposalFile } from "./files";
import { readIndependentEvidence } from "./independent";

const requiredNames = new Set([
  "baseline",
  "baseline-hash",
  "e3e4",
  "e5e6",
  "middle",
  "reviews",
  "out",
]);
const names = new Set([...requiredNames, "example-corrections"]);
const args: Record<string, string> = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index]?.replace(/^--/, "");
  const value = process.argv[index + 1];
  if (!key || !names.has(key) || args[key] || !value || value.startsWith("--"))
    throw new Error(`명령행 옵션을 확인하세요: ${process.argv[index]}`);
  args[key] = value;
}
for (const key of requiredNames)
  if (!args[key]) throw new Error(`옵션 필요: --${key}`);
if (!/^[a-f0-9]{64}$/.test(args["baseline-hash"]!))
  throw new Error("기준 지문은 SHA256입니다.");
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(file, "utf8")) as T;
const baselinePath = resolve(args.baseline!);
const baseline = read<{
  sourceCommit: string;
  parts: Record<string, ConceptBlankBank>;
}>(baselinePath);
const sourceFiles = [baselinePath];
const scopes: ApplicationScope[] = [];
for (const [scope, ledger] of [
  ["e3e4", "final-editorial-ledger.json"],
  ["e5e6", "codex-final-editorial.json"],
  ["middle", "final-editorial.json"],
] as const) {
  const directory = resolve(args[scope]!);
  const proposalPath = canonicalProposalFile(directory, scope === "middle");
  const ledgerPath = resolve(directory, ledger);
  sourceFiles.push(proposalPath, ledgerPath);
  scopes.push({
    scope,
    proposals: read(proposalPath),
    editorial: read(ledgerPath),
  });
}
const independent = readIndependentEvidence(resolve(args.reviews!));
const exampleCorrectionPath = args["example-corrections"]
  ? resolve(args["example-corrections"]!)
  : undefined;
const exampleCorrections = exampleCorrectionPath
  ? read<unknown>(exampleCorrectionPath)
  : undefined;
if (exampleCorrectionPath) sourceFiles.push(exampleCorrectionPath);
const plan = compileContentApplicationPlan({
  baseline: baseline.parts,
  expectedBaselineHash: args["baseline-hash"]!,
  current: BANK_PARTS,
  scopes,
  independent: independent.evidence,
  exampleCorrections,
});
const capturedSources = sourceFiles.map((file) => ({
  file,
  sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
}));
writeFileSync(
  resolve(args.out!),
  JSON.stringify(
    {
      ...plan,
      sourceCommit: baseline.sourceCommit,
      capturedSources,
      invalidHistoricalReviewPackets: independent.invalidPackets,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log(
  JSON.stringify(
    {
      status: plan.status,
      count: plan.count,
      baselineHash: plan.baselineHash,
      candidateBankHash: plan.candidateBankHash,
      changedDefinitions: plan.definitionChanges.length,
      ...(plan.examplePromptChanges?.length
        ? { changedExamplePrompts: plan.examplePromptChanges.length }
        : {}),
      studentRecordsWritten: false,
      productionBankWritten: false,
    },
    null,
    2,
  ),
);
