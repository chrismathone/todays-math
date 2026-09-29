/**
 * 오늘의 영어 검증기 · 원문 복원 (D-148 · 25 §4.2 · §4.4) — 세 길이 같은 규칙을 지난다.
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { describe, expect, it } from "vitest";

import type { EnglishDraft } from "@/contracts/english.contract";
import { makeCloze, splitEnglishSentences } from "@/lib/english/cloze";
import { validateEnglishDraft } from "@/lib/english/validate";

const passage =
  "Students worked together to build a small garden behind their school. They learned that cooperation makes difficult tasks easier. Now the garden is a quiet place where everyone can rest.";

const good: EnglishDraft = {
  title: "협력",
  source: "chatgpt",
  passage,
  questions: [
    {
      type: "주제",
      prompt: "윗글의 주제로 가장 적절한 것은?",
      options: ["Cooperation", "A city", "A season", "A festival", "A journey"],
      answer: "1",
      explanation: "협력을 설명하는 글입니다.",
      evidence: "cooperation makes difficult tasks easier",
    },
    {
      type: "서술형",
      prompt: "학생들이 배운 점을 우리말로 쓰시오.",
      options: [],
      answer: "협력하면 어려운 일이 쉬워진다.",
      explanation: "협력(1점) · 어려운 일(1점) · 쉬워짐(1점)",
      evidence: "They learned that cooperation makes difficult tasks easier.",
    },
  ],
};

describe("validateEnglishDraft — 모양 · 뜻", () => {
  it("올바른 초안은 통과한다", () => {
    const verdict = validateEnglishDraft(good);
    expect(verdict.ok).toBe(true);
  });

  it("모양이 틀리면 계약 오류를 문항 번호와 함께 돌려준다", () => {
    const verdict = validateEnglishDraft({
      ...good,
      questions: [{ ...good.questions[0], answer: "" }],
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.issues[0]?.question).toBe(0);
  });

  it.each([
    ["정답 번호 범위 밖", { ...good.questions[0], answer: "6" }, "1~5"],
    [
      "보기가 넷",
      { ...good.questions[0], options: good.questions[0].options.slice(0, 4) },
      "5개",
    ],
    [
      "같은 보기 둘",
      {
        ...good.questions[0],
        options: ["A city", "A  city", "A season", "A festival", "A journey"],
      },
      "같은 보기",
    ],
    [
      "근거가 지문 밖",
      { ...good.questions[0], evidence: "invented evidence" },
      "찾지 못했습니다",
    ],
    [
      "서술형에 보기",
      { ...good.questions[1], options: ["a", "b", "c", "d", "e"] },
      "보기가 없어야",
    ],
  ])("%s 은 막는다", (_name, question, fragment) => {
    const verdict = validateEnglishDraft({ ...good, questions: [question] });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok)
      expect(verdict.issues.map((i) => i.message).join(" ")).toContain(
        fragment,
      );
  });

  it("근거 대조는 공백을 접어 본다 — 줄바꿈이 섞여도 같은 인용이면 통과", () => {
    const verdict = validateEnglishDraft({
      ...good,
      passage: passage.replace("cooperation makes", "cooperation\n  makes"),
      questions: [good.questions[0]],
    });
    expect(verdict.ok).toBe(true);
  });
});

describe("validateEnglishDraft — 생성 요청과 견주기", () => {
  const expectation = {
    mode: "new" as const,
    passage: "",
    count: 2,
    types: ["주제", "서술형"] as ("주제" | "서술형")[],
  };

  it("요청과 맞으면 통과", () => {
    expect(validateEnglishDraft(good, expectation).ok).toBe(true);
  });

  it("문항 수 · 고르지 않은 유형 · 빠진 유형 · 원문 유지 위반을 각각 잡는다", () => {
    const fewer = validateEnglishDraft(
      { ...good, questions: [good.questions[0]] },
      expectation,
    );
    expect(fewer.ok).toBe(false);
    if (!fewer.ok)
      expect(fewer.issues.map((i) => i.message).join(" ")).toMatch(
        /문항 수.*빠졌습니다: 서술형|빠졌습니다: 서술형.*문항 수/s,
      );

    const wrongType = validateEnglishDraft(good, {
      ...expectation,
      types: ["주제", "어법"],
    });
    expect(wrongType.ok).toBe(false);
    if (!wrongType.ok)
      expect(wrongType.issues.map((i) => i.message).join(" ")).toContain(
        "고르지 않은 유형입니다: 서술형",
      );

    const changed = validateEnglishDraft(good, {
      ...expectation,
      mode: "original",
      passage: passage + " Extra sentence.",
    });
    expect(changed.ok).toBe(false);
    if (!changed.ok)
      expect(changed.issues.map((i) => i.message).join(" ")).toContain(
        "원문 유지",
      );
  });
});

describe("makeCloze — 규칙 기반 원문 복원", () => {
  it("문장을 나누고 7단어 이상 문장에서 6글자 이상 가장 긴 단어를 빈칸으로 만든다", () => {
    expect(splitEnglishSentences(passage)).toHaveLength(3);
    const result = makeCloze(passage, 3, "침산중 · 원문 복원 연습");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.source).toBe("cloze");
    expect(result.draft.questions).toHaveLength(3);
    const first = result.draft.questions[0];
    expect(first.type).toBe("원문 복원");
    expect(first.options).toEqual([]);
    // 8글자가 둘(Students · together) — 같은 길이면 먼저 나온 단어(안정 정렬)
    expect(first.answer).toBe("Students");
    expect(first.prompt).toContain("________ worked together");
    expect(first.prompt).toContain("(첫 글자: S, 8글자)");
    expect(first.evidence).toBe(
      "Students worked together to build a small garden behind their school.",
    );
    // 만든 초안은 검증기도 통과한다(근거 = 그 문장)
    expect(validateEnglishDraft(result.draft).ok).toBe(true);
  });

  it("문항 수 상한을 지키고, 쓸 문장이 없으면 실패 문구를 돌려준다", () => {
    const two = makeCloze(passage, 2);
    expect(two.ok && two.draft.questions.length).toBe(2);
    const none = makeCloze("Too short. Also short.", 3);
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.message).toContain("7단어");
  });
});
