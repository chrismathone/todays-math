import { describe, expect, it } from "vitest";
import type { ConceptTeachingScript } from "@/lib/textbook/scripts/types";
import type { StaticCorrection } from "@/lib/textbook/scripts/corrections";
import { planManuscriptCorrections } from "../../../scripts/qa/concept-blank/student-clear/manuscript";

const script: ConceptTeachingScript = {
  version: 1,
  sectionKey: "초5::1-1 혼합 계산::1-1-1 순서",
  grade: "초5",
  chapter: "1-1 혼합 계산",
  title: "1-1-1 순서",
  conceptIds: ["e5-1-1-1-c1"],
  provenance: { bank: "original-concept-blank", sourceFiles: ["e5.ts"] },
  dialogue: [
    {
      role: "teacher",
      expression: "question",
      purpose: "opening",
      markdown: "다른 세션이 다듬은 도입 대화입니다.",
      conceptIds: [],
      source: { kind: "authored-example", key: "opening" },
    },
    {
      role: "teacher",
      expression: "neutral",
      purpose: "explanation",
      markdown: "검토 전 은행 설명입니다.",
      conceptIds: ["e5-1-1-1-c1"],
      source: { kind: "bank-concept", entryId: "e5-1-1-1-c1" },
    },
  ],
};
const desired = () => {
  const next = structuredClone(script);
  next.dialogue[0]!.markdown = "생성기의 옛 도입 문장입니다.";
  next.dialogue[1]!.markdown = "검토를 마친 명확한 은행 설명입니다.";
  return next;
};
const change = {
  part: "e5",
  id: "e5-1-1-1-c1",
  before: "원래 정의",
  after: "교정 정의",
  reason: "분모가 같고 나누는 수가 0이 아니라는 조건을 명시한다.",
  contentHash: "current-content",
};

describe("selective manuscript synchronization", () => {
  it("updates only an approved bank source and preserves another session's introduction", () => {
    const result = planManuscriptCorrections({
      current: [script],
      materialized: [desired()],
      corrections: [],
      changes: [change],
    });
    expect(result.scripts[0]!.dialogue[0]!.markdown).toBe(
      script.dialogue[0]!.markdown,
    );
    expect(result.scripts[0]!.dialogue[1]!.markdown).toBe(
      desired().dialogue[1]!.markdown,
    );
    expect(result.corrections[0]!.old).toBe(script.dialogue[1]!.markdown);
    expect(result.turnChanges).toHaveLength(1);
    expect(script.dialogue[1]!.markdown).toBe("검토 전 은행 설명입니다.");
  });
  it("keeps the first manuscript baseline while extending a matched correction chain", () => {
    const prior: StaticCorrection = {
      id: "SC-001",
      sectionKey: script.sectionKey,
      turnIndex: 1,
      source: script.dialogue[1]!.source,
      kind: "bank-definition",
      old: "맨 처음 대본",
      new: script.dialogue[1]!.markdown,
      reason: "앞서 승인된 문장 교정 기록이다.",
    };
    const result = planManuscriptCorrections({
      current: [script],
      materialized: [desired()],
      corrections: [prior],
      changes: [change],
    });
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0]!.old).toBe("맨 처음 대본");
    expect(result.corrections[0]!.new).toBe(desired().dialogue[1]!.markdown);
    expect(prior.new).toBe(script.dialogue[1]!.markdown);
  });
  it("refuses a stale correction or relocated source before generating replacements", () => {
    const moved = desired();
    moved.dialogue[1]!.source = {
      kind: "bank-concept",
      entryId: "e5-1-1-1-c2",
    };
    expect(() =>
      planManuscriptCorrections({
        current: [script],
        materialized: [moved],
        corrections: [],
        changes: [change],
      }),
    ).toThrow("출처·배치");
    const prior: StaticCorrection = {
      id: "SC-001",
      sectionKey: script.sectionKey,
      turnIndex: 1,
      source: script.dialogue[1]!.source,
      kind: "bank-definition",
      old: "처음",
      new: "다른 세션 수정",
      reason: "이전 교정",
    };
    expect(() =>
      planManuscriptCorrections({
        current: [script],
        materialized: [desired()],
        corrections: [prior],
        changes: [change],
      }),
    ).toThrow("현재 대본");
  });
});
