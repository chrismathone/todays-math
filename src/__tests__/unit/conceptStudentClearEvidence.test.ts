import { describe, expect, it } from "vitest";
import { bankNotationFaults } from "@/lib/concept-blank/notation";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  normalizeProposal,
  proposedEntry,
} from "../../../scripts/qa/concept-blank/student-clear/proposals";
import { verifyIndependentRow } from "../../../scripts/qa/concept-blank/student-clear/independent";
import {
  verifyEditorialRow,
  workerFingerprint,
} from "../../../scripts/qa/concept-blank/student-clear/editorial";

const original: ConceptEntry = {
  id: "e3-1-1-1-c1",
  section: "초3::1-1 덧셈과 뺄셈::1-1-1 덧셈",
  term: "받아올림",
  kind: "방법",
  level: "하",
  definition: "낱개 $10$개를 십 {$1$}개로 바꾸어 윗자리에 더한다.",
};
const draft = {
  id: original.id,
  bDecision: "rewrite",
  cDecision: "keep",
  bPrompt: "낱개 $10$개를 십으로 바꾸면 몇 개가 되는지 쓰세요.",
  bAnswer: "십 $1$개이다.",
  bRequiredIdeas: [{ anyOf: ["십 $1$개"] }],
  learningRole: "procedure",
};
const candidate = () => normalizeProposal(draft, original)!;
const blind = (): Parameters<typeof verifyIndependentRow>[1] => [
  [original.id, "B", "십 1개", "pass", ""],
  [original.id, "C", "1", "pass", ""],
];
const keyed = (): Parameters<typeof verifyIndependentRow>[2] => [
  [original.id, "pass", "pass", "none", ""],
];

describe("student-clear content-bound evidence", () => {
  it("accepts a directly adopted middle form exclusion only when the actual decision agrees", () => {
    const row = {
      ...draft,
      sourceIndex: 0,
      bDecision: "exclude",
      bQuestion: null,
      bReason:
        "같은 성질을 확인하는 다른 명확한 B 물음이 있어 이 형식만 제외한다.",
      cMarkedSentence: original.definition,
      cAcceptedAnswers: [["$1$"]],
      proposalFingerprint: "",
    };
    row.proposalFingerprint = workerFingerprint("middle", row);
    const ledger = {
      id: row.id,
      sourceIndex: 0,
      learningRole: row.learningRole,
      proposalFingerprint: row.proposalFingerprint,
      bVerdict: "exclude",
      cVerdict: "keep",
      bReason: row.bReason,
      cReason: "십 한 개라는 수를 쓰는 물음은 분명하다.",
      reader: "Codex direct reading",
      readAt: "2026-10-07T05:05:00Z",
    };
    expect(
      verifyEditorialRow(
        "middle",
        row,
        normalizeProposal(row, original)!,
        ledger,
      ),
    ).toEqual([]);
    expect(
      verifyEditorialRow("middle", row, normalizeProposal(row, original)!, {
        ...ledger,
        cVerdict: "exclude",
      }),
    ).toContain("최종 질문·답·기준을 직접 읽고 남긴 개별 채택 기록 없음");
  });

  it("uses assembled current questions and anyOf draft C alternatives", () => {
    const row = normalizeProposal(
      {
        ...draft,
        bQuestion: {
          prompt: "낱개 $20$개를 십으로 바꾸면 몇 개인지 쓰세요.",
          answer: "십 $2$개",
          requiredIdeas: [{ anyOf: ["십 $2$개"] }],
        },
        cAcceptedAnswers: [{ anyOf: ["$1$", "한", "1"] }],
      },
      original,
    )!;
    expect(row.B).toMatchObject({ answer: "십 $2$개" });
    expect(row.C).toMatchObject({ acceptedAnswers: [["$1$", "한", "1"]] });
    expect(row.source).toEqual(original);
    expect(proposedEntry(row).definition).toBe(original.definition);
  });

  it("preserves recorded equivalent answers and binds them to the hash", () => {
    const first = candidate();
    const revised = normalizeProposal(
      { ...draft, cSlotEquivalents: [["한", "1"]] },
      original,
    )!;
    expect(revised.C).toMatchObject({ acceptedAnswers: [["$1$", "한", "1"]] });
    expect(revised.hash).not.toBe(first.hash);
  });

  it("requires actual current decisions instead of falling back to a title", () => {
    expect(
      normalizeProposal({ id: original.id, cDecision: "keep" }, original),
    ).toBeNull();
    expect(() =>
      normalizeProposal({ ...draft, bQuestion: null }, original),
    ).toThrow();
    expect(() =>
      normalizeProposal({ ...draft, bDecision: "exclude" }, original),
    ).toThrow();
  });

  it("keeps a frozen C question separate from a corrected general definition", () => {
    const definition = "낱개 $10$개는 십 {$1$}개와 같으므로 윗자리에 더한다.";
    const revised = normalizeProposal(
      { ...draft, coreAfter: definition },
      original,
    )!;
    expect(proposedEntry(revised).definition).toBe(definition);
    expect(revised.C).toMatchObject({ sentence: original.definition });
  });

  it("rejects changed primary answers and malformed synonym groups", () => {
    expect(() =>
      normalizeProposal({ ...draft, cAcceptedAnswers: [["2"]] }, original),
    ).toThrow();
    expect(() =>
      normalizeProposal(
        { ...draft, cAcceptedAnswers: [{ different: ["$1$"] }] },
        original,
      ),
    ).toThrow();
  });

  it("requires an independently written answer for every visible form", () => {
    expect(verifyIndependentRow(candidate(), blind(), keyed())).toEqual([]);
    expect(
      verifyIndependentRow(candidate(), blind().slice(0, 1), keyed()),
    ).not.toEqual([]);
    const duplicate = blind();
    duplicate[1] = duplicate[0]!;
    expect(verifyIndependentRow(candidate(), duplicate, keyed())).not.toEqual(
      [],
    );
  });

  it("does not accept an empty direct answer or unresolved reviewer concern", () => {
    const empty = blind();
    empty[0]![2] = "";
    expect(verifyIndependentRow(candidate(), empty, keyed())).not.toEqual([]);
    const concern = keyed();
    concern[0]![4] = "물음에 조건이 없다";
    expect(verifyIndependentRow(candidate(), blind(), concern)).not.toEqual([]);
  });

  it("rejects changes made after the Codex reader recorded a fingerprint", () => {
    const raw = {
      ...draft,
      sourceIndex: 0,
      cMarkedSentence: original.definition,
      cAcceptedAnswers: [["$1$"]],
      proposalFingerprint: "",
    };
    raw.proposalFingerprint = workerFingerprint("middle", raw);
    const ledger = {
      id: raw.id,
      sourceIndex: 0,
      proposalFingerprint: raw.proposalFingerprint,
      learningRole: raw.learningRole,
      bVerdict: "keep",
      cVerdict: "keep",
      bReason: "바꾸어 나타낸 십의 개수만 요구한다.",
      cReason: "십 단위 개수를 적는다.",
      reader: "Codex dispatched worker direct reading",
      readAt: "2026-10-07T01:00:00+09:00",
    };
    expect(
      verifyEditorialRow(
        "middle",
        raw,
        normalizeProposal(raw, original)!,
        ledger,
      ),
    ).toEqual([]);
    const changed = { ...raw, bAnswer: "십 $2$개이다." };
    changed.proposalFingerprint = workerFingerprint("middle", changed);
    expect(
      verifyEditorialRow(
        "middle",
        changed,
        normalizeProposal(changed, original)!,
        ledger,
      ),
    ).toContain("최종 읽기 후 질문·답·기준·일반 설명이 바뀜");
    expect(
      verifyEditorialRow(
        "middle",
        { ...raw, learningRole: "naming" },
        candidate(),
        ledger,
      ),
    ).toContain("현재 학습 역할과 직접 읽기 기록이 다름");
  });

  it("cannot carry old read approval into a different assembled prompt", () => {
    const raw = {
      ...draft,
      sourceIndex: 0,
      cMarkedSentence: original.definition,
      cAcceptedAnswers: [["$1$"]],
      proposalFingerprint: "",
      bQuestion: {
        prompt: "낱개 $20$개를 십으로 바꾸면 몇 개인지 쓰세요.",
        answer: "십 $2$개",
        requiredIdeas: [{ anyOf: ["십 $2$개"] }],
      },
    };
    raw.proposalFingerprint = workerFingerprint("middle", raw);
    const ledger = {
      id: raw.id,
      sourceIndex: 0,
      proposalFingerprint: raw.proposalFingerprint,
      learningRole: raw.learningRole,
      bVerdict: "keep",
      cVerdict: "keep",
      bReason: "개수를 쓴다",
      cReason: "개수를 쓴다",
      reader: "Codex direct",
      readAt: "2026-10-07T01:00:00+09:00",
    };
    expect(
      verifyEditorialRow(
        "middle",
        raw,
        normalizeProposal(raw, original)!,
        ledger,
      ),
    ).toContain("읽은 B 질문·답·기준과 실제 assembled 문항이 다름");
  });

  it("keeps reviewed numeric polygon input aliases while checking authored prose", () => {
    const polygon = proposedEntry(
      normalizeProposal(
        {
          ...draft,
          cDecision: "rewrite",
          cAfter: "변이 $12$개인 다각형을 {십이각형}이라 한다.",
          cAcceptedAnswers: [["십이각형", "$12$각형"]],
        },
        original,
      )!,
    );
    const bank = { concepts: [polygon], ox: [], apply: [], figures: [] };
    expect(bankNotationFaults(bank)).toEqual([]);
    expect(polygon.clozeQuestion?.acceptedAnswers).toEqual([
      ["십이각형", "$12$각형"],
    ]);
    const prose = structuredClone(bank);
    prose.concepts[0]!.bQuestion!.prompt = "$12$각형은 변이 몇 개인지 쓰세요.";
    expect(bankNotationFaults(prose)).toContainEqual(
      expect.objectContaining({
        field: "bQuestion.prompt",
        rule: "아라비아 도형 이름",
      }),
    );
  });

  it("continues checking canonical polygon names and math errors in input aliases", () => {
    const polygon = proposedEntry(
      normalizeProposal(
        {
          ...draft,
          cDecision: "rewrite",
          cAfter: "변이 $12$개인 다각형을 {십이각형}이라 한다.",
          cAcceptedAnswers: [["십이각형", "$\\invalidPolygonCommand$"]],
        },
        original,
      )!,
    );
    expect(
      bankNotationFaults({
        concepts: [polygon],
        ox: [],
        apply: [],
        figures: [],
      }),
    ).toContainEqual(
      expect.objectContaining({
        field: "clozeQuestion.acceptedAnswers.0.1",
        rule: "수식 오류",
      }),
    );
    polygon.clozeQuestion = {
      sentence: "변이 $12$개인 다각형을 {$12$각형}이라 한다.",
      acceptedAnswers: [["$12$각형"]],
    };
    expect(
      bankNotationFaults({
        concepts: [polygon],
        ox: [],
        apply: [],
        figures: [],
      }),
    ).toContainEqual(
      expect.objectContaining({
        field: "clozeQuestion.acceptedAnswers.0.0",
        rule: "아라비아 도형 이름",
      }),
    );
  });

  it("requires the separate general-definition correction verdict", () => {
    const corrected = normalizeProposal(
      {
        ...draft,
        coreAfter: "낱개 $10$개는 십 {$1$}개와 같으므로 윗자리에 더한다.",
      },
      original,
    )!;
    expect(verifyIndependentRow(corrected, blind(), keyed())).not.toEqual([]);
    const corePass = keyed();
    corePass[0]![3] = "pass";
    expect(verifyIndependentRow(corrected, blind(), corePass)).toEqual([]);
    expect("sentence" in corrected.C && corrected.C.sentence).toBe(
      original.definition,
    );
  });
});
