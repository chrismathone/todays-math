/** Prepare reviewable file contents from a freshly compiled plan; writes nothing. */
import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";
import { withAssessments } from "@/lib/concept-blank/bank/assessment";
import type { ContentApplicationPlan } from "./application";
import { attachAssessmentSource } from "./bank-source";
import { definitionLiterals, replaceDefinitions } from "./definition-source";
import { contentHash } from "./proposals";

export type BankSourceChange = {
  file: string;
  /** null means a newly generated assessment table; existing tables must be investigated. */
  before: string | null;
  after: string;
};

/** The caller compiles the evidence afresh, then compares all `before` values before writing. */
export function prepareBankSourceChanges(input: {
  plan: ContentApplicationPlan;
  baseline: Readonly<Record<string, ConceptBlankBank>>;
  sources: Readonly<Record<string, string>>;
}): {
  changes: BankSourceChange[];
  candidateParts: Record<string, ConceptBlankBank>;
} {
  const { plan, baseline, sources } = input;
  if (
    plan.status !==
      "content-reviewed-plan; print-and-memory-activation-pending" ||
    contentHash(baseline) !== plan.baselineHash
  )
    throw new Error("적용 계획의 기준 은행이 바뀌었습니다.");
  const parts = Object.keys(baseline);
  const sameKeys = (keys: string[]) =>
    keys.length === parts.length && keys.every((key) => parts.includes(key));
  if (
    !sameKeys(Object.keys(sources)) ||
    !sameKeys(Object.keys(plan.assessmentTables))
  )
    throw new Error("은행 파일과 질문 표의 범위가 다릅니다.");
  const originals = Object.entries(baseline).flatMap(([part, bank]) =>
    bank.concepts.map((entry) => ({ part, entry })),
  );
  const originalById = new Map(originals.map((row) => [row.entry.id, row]));
  const reviewIds = new Set(plan.reviewedRows.map((row) => row.id));
  if (
    originalById.size !== originals.length ||
    plan.count !== originals.length ||
    plan.reviewedRows.length !== originals.length ||
    reviewIds.size !== originals.length ||
    originals.some((row) => !reviewIds.has(row.entry.id)) ||
    plan.reviewedRows.some(
      (row) =>
        originalById.get(row.id)?.part !== row.part ||
        !row.contentHash ||
        !row.independentPackets.length,
    )
  )
    throw new Error("전 ID의 적용 계획 대응이 없습니다.");
  const definitions = new Map(
    plan.definitionChanges.map((row) => [row.id, row]),
  );
  if (definitions.size !== plan.definitionChanges.length)
    throw new Error("중복 일반 설명 변경");
  for (const change of definitions.values()) {
    const original = originalById.get(change.id);
    if (
      !original ||
      original.part !== change.part ||
      original.entry.definition !== change.before ||
      !change.reason.trim()
    )
      throw new Error(`일반 설명의 출처가 다릅니다: ${change.id}`);
  }
  const candidateParts: Record<string, ConceptBlankBank> = {};
  for (const [part, bank] of Object.entries(baseline)) {
    candidateParts[part] = withAssessments(
      {
        ...bank,
        concepts: bank.concepts.map((entry) => ({
          ...entry,
          definition: definitions.get(entry.id)?.after ?? entry.definition,
        })),
      },
      plan.assessmentTables[part]!,
    );
  }
  if (contentHash(candidateParts) !== plan.candidateBankHash)
    throw new Error("질문 표·일반 설명이 검토 후보 은행과 다릅니다.");
  const changes: BankSourceChange[] = [];
  for (const part of parts) {
    const grade = part.replace(/plus$/, "");
    const name = part.replace(/plus$/, "-plus");
    const before = sources[part]!;
    const locations = definitionLiterals(before, grade);
    const bank = baseline[part]!;
    if (
      locations.size !== bank.concepts.length ||
      bank.concepts.some(
        (entry) => locations.get(entry.id)?.value !== entry.definition,
      )
    )
      throw new Error(`원천 일반 설명 코드가 검토 기준과 다릅니다: ${part}`);
    const definitionsForPart = plan.definitionChanges.filter(
      (row) => row.part === part,
    );
    changes.push({
      file: `src/lib/concept-blank/bank/${name}.ts`,
      before,
      after: attachAssessmentSource(
        replaceDefinitions(before, grade, definitionsForPart),
        part,
      ),
    });
    changes.push({
      file: `src/lib/concept-blank/bank/assessments/${name}.json`,
      before: null,
      after: JSON.stringify(plan.assessmentTables[part], null, 2) + "\n",
    });
  }
  return { changes, candidateParts };
}
