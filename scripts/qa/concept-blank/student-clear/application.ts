/** Builds an offline content application plan; never writes a bank or student record. */
import {
  conceptEntrySchema,
  type ConceptBlankBank,
} from "@/contracts/conceptBlank.contract";
import type { AssessmentTable } from "@/lib/concept-blank/bank/assessment";
import { bankNotationFaults } from "@/lib/concept-blank/notation";
import { blankClashes } from "@/lib/concept-blank/audit";
import { QUESTION_REVISION } from "@/lib/concept-blank/questions";
import {
  editorialRows,
  verifyEditorialRow,
  type EditorialScope,
} from "./editorial";
import type { IndependentEvidence } from "./independent";
import {
  contentHash,
  normalizeProposal,
  proposedEntry,
  proposalRows,
} from "./proposals";

type BankParts = Readonly<Record<string, ConceptBlankBank>>;
export type ApplicationScope = {
  scope: EditorialScope;
  proposals: unknown;
  editorial: unknown;
};
export type ContentApplicationPlan = {
  status: "content-reviewed-plan; print-and-memory-activation-pending";
  revision: typeof QUESTION_REVISION;
  baselineHash: string;
  candidateBankHash: string;
  count: number;
  assessmentTables: Record<string, AssessmentTable>;
  definitionChanges: {
    part: string;
    id: string;
    before: string;
    after: string;
    reason: string;
    contentHash: string;
  }[];
  reviewedRows: {
    id: string;
    part: string;
    contentHash: string;
    independentPackets: string[];
  }[];
};

/** All current contents need both reviews; authoring/model totals cannot stand in for coverage. */
export function compileContentApplicationPlan(input: {
  baseline: BankParts;
  expectedBaselineHash: string;
  current: BankParts;
  scopes: ApplicationScope[];
  independent: IndependentEvidence[];
}): ContentApplicationPlan {
  const baselineHash = contentHash(input.baseline);
  if (baselineHash !== input.expectedBaselineHash)
    throw new Error("원래 은행 지문이 보존된 기준과 다릅니다.");
  if (contentHash(input.current) !== baselineHash)
    throw new Error(
      "현재 은행이 검토 기준 이후 바뀌었습니다. 새 변경을 먼저 대조하세요.",
    );
  const originals = Object.entries(input.baseline).flatMap(([part, bank]) =>
    bank.concepts.map((entry) => ({ part, entry })),
  );
  const byId = new Map(originals.map((row) => [row.entry.id, row]));
  if (byId.size !== originals.length || !originals.length)
    throw new Error("원천 ID가 중복되거나 은행이 비었습니다.");
  const roles = new Set([
    "definition",
    "procedure",
    "reason",
    "application",
    "naming",
  ]);
  const candidates = new Map<string, ReturnType<typeof proposedEntry>>();
  const tables: Record<
    string,
    Record<string, AssessmentTable[string]>
  > = Object.fromEntries(Object.keys(input.baseline).map((part) => [part, {}]));
  const changes: ContentApplicationPlan["definitionChanges"] = [];
  const reviewed: ContentApplicationPlan["reviewedRows"] = [];
  const failures: string[] = [];
  for (const scope of input.scopes) {
    const ledger = new Map(
      editorialRows(scope.editorial).map((row) => [row.id, row]),
    );
    for (const raw of proposalRows(scope.proposals)) {
      const original = byId.get(raw.id);
      if (!original) throw new Error(`알 수 없는 원천 ID: ${raw.id}`);
      if (candidates.has(raw.id))
        throw new Error(`범위 사이 중복 ID: ${raw.id}`);
      const proposal = normalizeProposal(raw, original.entry);
      if (!proposal) throw new Error(`미완 문항: ${raw.id}`);
      const entry = proposedEntry(proposal);
      candidates.set(raw.id, entry);
      const issues = verifyEditorialRow(
        scope.scope,
        raw,
        proposal,
        ledger.get(raw.id),
      );
      if (typeof raw.learningRole !== "string" || !roles.has(raw.learningRole))
        issues.push("학습 역할 미확인");
      const evidence = input.independent.filter(
        (row) =>
          row.id === raw.id &&
          row.contentHash === proposal.hash &&
          row.accepted &&
          row.issues.length === 0 &&
          row.blindProvider === "claude" &&
          row.keyProvider === "claude" &&
          ["opus", "sonnet"].includes(row.blindModel) &&
          ["opus", "sonnet"].includes(row.keyModel),
      );
      if (!evidence.length) issues.push("현재 물음·답·기준의 독립 검토 미완");
      if (
        entry.definition !== original.entry.definition &&
        (typeof proposal.coreReason !== "string" || !proposal.coreReason.trim())
      )
        issues.push("일반 설명의 교정 이유 누락");
      if (issues.length) failures.push(`${raw.id}: ${issues.join("; ")}`);
      tables[original.part]![raw.id] = {
        bQuestion: entry.bQuestion!,
        clozeQuestion: entry.clozeQuestion!,
        ...(entry.questionExclusions
          ? { questionExclusions: entry.questionExclusions }
          : {}),
      };
      if (entry.definition !== original.entry.definition)
        changes.push({
          part: original.part,
          id: raw.id,
          before: original.entry.definition,
          after: entry.definition,
          reason: String(proposal.coreReason),
          contentHash: proposal.hash,
        });
      reviewed.push({
        id: raw.id,
        part: original.part,
        contentHash: proposal.hash,
        independentPackets: [...new Set(evidence.map((row) => row.packet))],
      });
    }
  }
  const missing = originals.filter((row) => !candidates.has(row.entry.id));
  if (missing.length)
    failures.push(
      `미검토 원천 ID ${missing.length}개: ${missing
        .slice(0, 12)
        .map((row) => row.entry.id)
        .join(", ")}`,
    );
  const parts: Record<string, ConceptBlankBank> = {};
  for (const [part, bank] of Object.entries(input.baseline))
    parts[part] = {
      ...bank,
      concepts: bank.concepts.map((entry) => candidates.get(entry.id) ?? entry),
    };
  const bank: ConceptBlankBank = {
    concepts: Object.values(parts).flatMap((part) => part.concepts),
    ox: [],
    apply: [],
    figures: [],
  };
  for (const entry of bank.concepts) conceptEntrySchema.parse(entry);
  const notation = bankNotationFaults(bank);
  if (notation.length) failures.push(`표기 결함 ${notation.length}개`);
  const collisions = blankClashes(bank);
  if (collisions.length) failures.push(`C 문장 충돌 ${collisions.length}묶음`);
  if (failures.length)
    throw new Error(
      `문항 적용 계획을 만들 수 없습니다 (${failures.length}건):\n${failures.slice(0, 30).join("\n")}`,
    );
  return {
    status: "content-reviewed-plan; print-and-memory-activation-pending",
    revision: QUESTION_REVISION,
    baselineHash,
    candidateBankHash: contentHash(parts),
    count: originals.length,
    assessmentTables: tables,
    definitionChanges: changes.sort(
      (a, b) =>
        originals.findIndex((row) => row.entry.id === a.id) -
        originals.findIndex((row) => row.entry.id === b.id),
    ),
    reviewedRows: originals.map((row) =>
      reviewed.find((item) => item.id === row.entry.id)!,
    ),
  };
}
