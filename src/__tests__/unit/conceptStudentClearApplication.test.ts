import { describe, expect, it } from "vitest";
import type {
  ConceptBlankBank,
  ConceptEntry,
} from "@/contracts/conceptBlank.contract";
import { compileContentApplicationPlan } from "../../../scripts/qa/concept-blank/student-clear/application";
import { workerFingerprint } from "../../../scripts/qa/concept-blank/student-clear/editorial";
import {
  contentHash,
  normalizeProposal,
  type ProposalRecord,
} from "../../../scripts/qa/concept-blank/student-clear/proposals";
import type { IndependentEvidence } from "../../../scripts/qa/concept-blank/student-clear/independent";

const original: ConceptEntry = {
  id: "e5-1-1-1-c1",
  section: "초5::1-1 자연수의 혼합 계산::1-1-1 덧셈과 뺄셈",
  term: "계산 순서",
  kind: "방법",
  level: "하",
  definition: "괄호가 없는 덧셈과 뺄셈은 {왼쪽}부터 차례로 계산한다.",
};
function fixture() {
  const bank: ConceptBlankBank = {
    concepts: [original],
    ox: [],
    apply: [],
    figures: [],
  };
  const raw: ProposalRecord = {
    id: original.id,
    sourceIndex: 0,
    learningRole: "procedure",
    bDecision: "rewrite",
    cDecision: "keep",
    bPrompt: "괄호가 없는 $12-3+4$의 계산 순서와 값을 쓰세요.",
    bAnswer: "왼쪽부터 계산하며 값은 $13$이다.",
    bRequiredIdeas: [{ anyOf: ["왼쪽부터 계산"] }, { anyOf: ["$13$"] }],
    clozeQuestion: {
      sentence: original.definition,
      acceptedAnswers: [["왼쪽"]],
    },
  };
  raw.bQuestion = {
    prompt: raw.bPrompt,
    answer: raw.bAnswer,
    requiredIdeas: raw.bRequiredIdeas,
  };
  raw.proposalFingerprint = workerFingerprint("e5e6", raw);
  const proposal = normalizeProposal(raw, original)!;
  const ledger = {
    id: raw.id,
    sourceIndex: 0,
    learningRole: raw.learningRole,
    proposalFingerprintReviewed: raw.proposalFingerprint,
    bVerdict: "adopt",
    cVerdict: "adopt",
    reason: "실제 식의 계산 순서와 값이 물음·기준에 대응한다.",
    inputEvidence: "evidence/read-01.json",
    recordedAfterDirectReading: "2026-10-07T05:00:00Z",
    bSourceDecision: raw.bDecision,
    cSourceDecision: raw.cDecision,
  };
  const evidence: IndependentEvidence = {
    id: raw.id,
    contentHash: proposal.hash,
    packet: "fixture-two-stage",
    inputHash: "packet-hash",
    blindProvider: "claude",
    blindModel: "sonnet",
    keyProvider: "claude",
    keyModel: "sonnet",
    accepted: true,
    issues: [],
  };
  const input = {
    baseline: { e5: bank },
    current: { e5: bank },
    expectedBaselineHash: contentHash({ e5: bank }),
    scopes: [
      {
        scope: "e5e6" as const,
        proposals: { rows: [raw] },
        editorial: { rows: [ledger] },
      },
    ],
    independent: [evidence],
  };
  return { input, raw, ledger, evidence };
}

describe("all-content application gate", () => {
  it("keeps source IDs and other bank forms while producing explicitly pending activation", () => {
    const { input } = fixture();
    const before = JSON.stringify(input);
    const plan = compileContentApplicationPlan(input);
    expect(plan.count).toBe(1);
    expect(Object.keys(plan.assessmentTables.e5!)).toEqual([original.id]);
    expect(plan.definitionChanges).toEqual([]);
    expect(plan.status).toBe(
      "content-reviewed-plan; print-and-memory-activation-pending",
    );
    expect(plan.reviewedRows[0]?.independentPackets).toEqual([
      "fixture-two-stage",
    ]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("refuses a newer source bank or altered original rather than overwriting another session", () => {
    const { input } = fixture();
    const current = structuredClone(input.current);
    current.e5.concepts[0]!.definition =
      "괄호가 없는 덧셈과 뺄셈은 {앞쪽}부터 계산한다.";
    expect(() => compileContentApplicationPlan({ ...input, current })).toThrow(
      "현재 은행",
    );
    expect(() =>
      compileContentApplicationPlan({
        ...input,
        expectedBaselineHash: "changed",
      }),
    ).toThrow("원래 은행");
  });

  it("refuses missing source IDs and duplicate report rows", () => {
    const { input } = fixture();
    input.scopes[0]!.proposals.rows = [];
    expect(() => compileContentApplicationPlan(input)).toThrow(
      "미검토 원천 ID",
    );
    const duplicate = fixture();
    duplicate.input.scopes[0]!.proposals.rows.push(duplicate.raw);
    expect(() => compileContentApplicationPlan(duplicate.input)).toThrow(
      "중복 ID",
    );
  });

  it("rejects a changed accepted-answer alias, criterion or current direct-reading verdict", () => {
    const changed = fixture();
    (
      changed.raw.clozeQuestion as { acceptedAnswers: string[][] }
    ).acceptedAnswers[0]!.push("왼편");
    expect(() => compileContentApplicationPlan(changed.input)).toThrow(
      "독립 검토",
    );
    const criterion = fixture();
    (criterion.raw.bRequiredIdeas as { anyOf: string[] }[])[0]!.anyOf.push(
      "오른쪽부터 계산",
    );
    expect(() => compileContentApplicationPlan(criterion.input)).toThrow(
      "독립 검토",
    );
    const rejected = fixture();
    rejected.ledger.bVerdict = "revise";
    expect(() => compileContentApplicationPlan(rejected.input)).toThrow(
      "개별 채택",
    );
  });

  it("rejects non-independent or unresolved evidence even if its cached accepted flag is true", () => {
    const unresolved = fixture();
    unresolved.evidence.issues = ["물음이 모호함"];
    expect(() => compileContentApplicationPlan(unresolved.input)).toThrow(
      "독립 검토",
    );
    const authored = fixture();
    authored.evidence.blindProvider = "codex";
    expect(() => compileContentApplicationPlan(authored.input)).toThrow(
      "독립 검토",
    );
  });
});
