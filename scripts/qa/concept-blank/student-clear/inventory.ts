/** Offline draft inventory. A zero schema-error count is not content approval. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  conceptEntrySchema,
  type ConceptBlankBank,
} from "@/contracts/conceptBlank.contract";
import { readIndependentEvidence } from "./independent";
import { bankNotationFaults } from "@/lib/concept-blank/notation";
import { blankClashes } from "@/lib/concept-blank/audit";
import { canonicalProposalFile } from "./files";
import {
  editorialRows,
  verifyEditorialRow,
  type EditorialScope,
} from "./editorial";
import {
  contentHash,
  normalizeProposal,
  proposedEntry,
  proposalRows,
} from "./proposals";

function options(): Record<string, string> {
  const allowed = new Set([
    "baseline",
    "e3e4",
    "e5e6",
    "middle",
    "reviews",
    "out",
  ]);
  const values: Record<string, string> = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index]?.replace(/^--/, "");
    const value = process.argv[index + 1];
    if (
      !key ||
      !allowed.has(key) ||
      values[key] ||
      !value ||
      value.startsWith("--")
    )
      throw new Error(`명령행 옵션을 확인하세요: ${process.argv[index]}`);
    values[key] = resolve(value);
  }
  for (const key of allowed)
    if (!values[key]) throw new Error(`옵션 필요: --${key}`);
  return values;
}
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;
const paths = options();
const baseline = read<{
  sourceCommit: string;
  parts: Record<string, ConceptBlankBank>;
}>(paths.baseline!);
const originals = Object.entries(baseline.parts).flatMap(([part, bank]) =>
  bank.concepts.map((entry) => ({ part, entry })),
);
const byId = new Map(originals.map((row) => [row.entry.id, row]));
if (byId.size !== originals.length) throw new Error("원천의 중복 문항 ID");
for (const { entry } of originals) conceptEntrySchema.parse(entry);
const reviews = readIndependentEvidence(paths.reviews!);
const accepted = new Map<string, typeof reviews.evidence>();
for (const evidence of reviews.evidence.filter((row) => row.accepted)) {
  const key = `${evidence.id}:${evidence.contentHash}`;
  accepted.set(key, [...(accepted.get(key) ?? []), evidence]);
}
const candidates = [];
const incomplete: string[] = [];
const failures: { id: string; scope: string; reason: string }[] = [];
const seen = new Set<string>();
const roles = new Set([
  "definition",
  "procedure",
  "reason",
  "application",
  "naming",
]);
for (const [scope, directory] of [
  ["e3e4", paths.e3e4!],
  ["e5e6", paths.e5e6!],
  ["middle", paths.middle!],
]) {
  const editorialFile =
    scope === "e3e4"
      ? "final-editorial-ledger.json"
      : scope === "e5e6"
        ? "codex-final-editorial.json"
        : "final-editorial.json";
  const ledgerPath = resolve(directory!, editorialFile);
  const ledger = new Map(
    (existsSync(ledgerPath) ? editorialRows(read(ledgerPath)) : []).map(
      (row) => [row.id, row],
    ),
  );
  for (const row of proposalRows(
    read(canonicalProposalFile(directory!, scope === "middle")),
  )) {
    try {
      const original = byId.get(row.id);
      if (!original) throw new Error("존재하지 않는 원천 ID");
      if (seen.has(row.id)) throw new Error("초안 사이의 중복 ID");
      seen.add(row.id);
      const proposal = normalizeProposal(row, original.entry);
      if (!proposal) {
        incomplete.push(row.id);
        continue;
      }
      const evidence = accepted.get(`${row.id}:${proposal.hash}`) ?? [];
      const editorialIssues = verifyEditorialRow(
        scope as EditorialScope,
        row,
        proposal,
        ledger.get(row.id),
      );
      candidates.push({
        id: row.id,
        part: original.part,
        scope,
        currentHash: proposal.hash,
        workerFingerprint: row.proposalFingerprint ?? null,
        learningRole: row.learningRole ?? null,
        roleRecorded:
          typeof row.learningRole === "string" && roles.has(row.learningRole),
        independentCandidate: evidence.length > 0,
        independentEvidence: evidence,
        finalDirectReadingCandidate: editorialIssues.length === 0,
        editorialIssues,
        editorialEvidence: ledger.get(row.id) ?? null,
        proposal,
        entry: proposedEntry(proposal),
      });
    } catch (error) {
      failures.push({
        id: row.id,
        scope: scope!,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
const missing = originals
  .filter((row) => !seen.has(row.entry.id))
  .map((row) => row.entry.id);
const candidateBank: ConceptBlankBank = {
  concepts: candidates.map((row) => row.entry),
  ox: [],
  apply: [],
  figures: [],
};
const notationFailures = bankNotationFaults(candidateBank);
const clozeCollisions = blankClashes(candidateBank).map((group) =>
  group.map((entry) => ({
    id: entry.id,
    section: entry.section,
    question: entry.clozeQuestion,
  })),
);
const summary = {
  status: "draft-inventory; not editorial approval or production activation",
  sourceCommit: baseline.sourceCommit,
  originalBankHash: contentHash(baseline.parts),
  originalCount: originals.length,
  providedCount: seen.size,
  validCandidateCount: candidates.length,
  missingCount: missing.length,
  incompleteCount: incomplete.length,
  contractFailureCount: failures.length,
  notationFailureCount: notationFailures.length,
  clozeCollisionCandidateCount: clozeCollisions.length,
  roleMissingCount: candidates.filter((row) => !row.roleRecorded).length,
  currentHashIndependentCandidateCount: candidates.filter(
    (row) => row.independentCandidate,
  ).length,
  currentHashDirectReadingCandidateCount: candidates.filter(
    (row) => row.finalDirectReadingCandidate,
  ).length,
  currentHashBothReviewCandidateCount: candidates.filter(
    (row) => row.finalDirectReadingCandidate && row.independentCandidate,
  ).length,
  invalidHistoricalReviewPackets: reviews.invalidPackets.length,
  releaseReady: false,
  releaseStatus:
    "최종 Codex 직접 읽기와 현재 지문 독립 검토, 복습·교재·인쇄 검증이 모두 완료되어야 합니다.",
};
writeFileSync(
  paths.out!,
  JSON.stringify(
    {
      ...summary,
      failures,
      notationFailures,
      clozeCollisions,
      missing,
      incomplete,
      invalidPackets: reviews.invalidPackets,
      candidates,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
