/**
 * 오늘의 영어 — 변형 문항끼리의 정답 누출 (D-151 · 25 §12.8 「1」 · §12.9).
 * 한 문항의 정답(빈칸 원문 · 어법의 원래 형태 · 삽입 문장의 원래 자리)이 **다른 변형 문항의 지문**에 그대로 보이는가.
 * 3자 합의: 앞뒤 문맥을 포함한 연속 20자 이상 창으로 대조한다(짧은 어법 형태가 늘 걸리지 않게) · 근거 구절을 같이 낸다.
 * 표본 지문은 우리가 지은 짧은 글이다.
 */
import { describe, expect, it } from "vitest";

import type { EnglishQuestion } from "@/contracts/english.contract";
import { findVariantLeaks } from "@/lib/english/leak";

const S1 = "Many students think that talent decides success.";
const S2 = "However, research shows that steady practice matters more.";
const S3 =
  "A pianist who practices every day improves faster than one who waits for inspiration.";
const S4 = "Small efforts, repeated over time, build real skill.";
const S5 = "Therefore, habits are more important than gifts.";
const passage = [S1, S2, S3, S4, S5].join(" ");

const blank = (body: string): EnglishQuestion => ({
  type: "빈칸 추론",
  prompt: `다음 빈칸에 들어갈 말로 가장 적절한 것은?\n${body}`,
  options: [
    "steady practice",
    "natural talent",
    "good luck",
    "expensive lessons",
    "a quiet room",
  ],
  answer: "1",
  explanation: "정답은 ①.",
  evidence: S3,
});

const grammar = (body: string): EnglishQuestion => ({
  type: "어법",
  prompt: `밑줄 친 ①~⑤ 가운데 어법상 틀린 것은?\n${body}`,
  options: ["think", "shows", "practice", "repeated", "are"],
  answer: "3",
  explanation: "정답은 ③. 주어 A pianist 에 맞춰 practices.",
  evidence: S3,
});

const insert = (body: string): EnglishQuestion => ({
  type: "문장 삽입",
  prompt: `[주어진 문장] ${S4}\n\n글의 흐름으로 보아 주어진 문장이 들어가기에 가장 적절한 곳은?\n${body}`,
  options: ["①", "②", "③", "④", "⑤"],
  answer: "4",
  explanation: "정답은 ④.",
  evidence: S4,
});

const BLANK_FULL = `${S1} However, research shows that ________ matters more. ${S3} ${S4} ${S5}`;
const GRAMMAR_FULL = `Many students ①<u>think</u> that talent decides success. However, research ②<u>shows</u> that steady practice matters more. A pianist who ③<u>practice</u> every day improves faster than one who waits for inspiration. Small efforts, ④<u>repeated</u> over time, build real skill. Therefore, habits ⑤<u>are</u> more important than gifts.`;
const INSERT_FULL = `( ① ) ${S1} ( ② ) ${S2} ( ③ ) ${S3} ( ④ ) ${S5} ( ⑤ )`;

const topic: EnglishQuestion = {
  type: "주제",
  prompt: "윗글의 주제로 가장 적절한 것은?",
  options: ["a", "b", "c", "d", "e"],
  answer: "1",
  explanation: "정답은 ①.",
  evidence: S2,
};

describe("findVariantLeaks — 변형 문항끼리의 정답 누출", () => {
  it("빈칸의 원문이 어법 문항의 지문에 그대로 있으면 누출 — 근거 구절을 같이 낸다", () => {
    const leaks = findVariantLeaks({
      passage,
      questions: [blank(BLANK_FULL), grammar(GRAMMAR_FULL)],
    });
    const leak = leaks.find((l) => l.source === 0 && l.target === 1);
    expect(leak).toBeDefined();
    expect(leak!.kind).toBe("빈칸 추론");
    expect(leak!.snippet).toContain("steady practice");
    expect(leak!.snippet.length).toBeGreaterThanOrEqual(20);
  });

  it("어법의 원래 형태가 빈칸 문항의 지문에 같은 문맥으로 있으면 누출", () => {
    const leaks = findVariantLeaks({
      passage,
      questions: [blank(BLANK_FULL), grammar(GRAMMAR_FULL)],
    });
    const leak = leaks.find((l) => l.source === 1 && l.target === 0);
    expect(leak).toBeDefined();
    expect(leak!.kind).toBe("어법");
    expect(leak!.snippet).toContain("practices");
  });

  it("삽입 문장이 다른 문항의 지문에 원래 자리 그대로 있으면 누출", () => {
    const leaks = findVariantLeaks({
      passage,
      questions: [insert(INSERT_FULL), blank(BLANK_FULL)],
    });
    const leak = leaks.find((l) => l.source === 0 && l.target === 1);
    expect(leak).toBeDefined();
    expect(leak!.kind).toBe("문장 삽입");
    expect(leak!.snippet).toContain("Small efforts");
  });

  it("🔴 짧은 형태가 다른 자리에 있어도 걸리지 않는다 — 앞뒤 문맥까지 같아야 누출이다", () => {
    // 어법의 원래 형태는 S3 의 «than»(→ then). 빈칸 문항의 지문은 S3 없이 S1 · S2 · S5 — «than» 은 S5 에도 있다.
    // 낱말만 보면 걸리고, 문맥(«improves faster than one who»)까지 보면 안 걸린다.
    const grammarMid = `A pianist who ①<u>practices</u> every day ②<u>improves</u> faster ③<u>then</u> one who ④<u>waits</u> for inspiration. Small efforts, ⑤<u>repeated</u> over time, build real skill.`;
    const q1: EnglishQuestion = {
      ...grammar(grammarMid),
      options: ["practices", "improves", "then", "waits", "repeated"],
      answer: "3",
    };
    const q2 = blank(
      `${S1} However, research shows that ________ matters more. ${S5}`,
    );
    expect(findVariantLeaks({ passage, questions: [q1, q2] })).toEqual([]);
  });

  it("발췌 첫머리의 어법 오류도 정답 자리를 찾는다 — 경계 구간이라고 놓치지 않는다", () => {
    // «that» → «what» 이 발췌의 넷째 낱말. 빈칸 문항의 지문이 S1 을 그대로 실으면 누출이다.
    const grammarFront = `Many students ①<u>think</u> ②<u>what</u> talent ③<u>decides</u> success. However, research ④<u>shows</u> that steady practice ⑤<u>matters</u> more.`;
    const q1: EnglishQuestion = {
      ...grammar(grammarFront),
      options: ["think", "what", "decides", "shows", "matters"],
      answer: "2",
    };
    const q2: EnglishQuestion = {
      ...blank(`${S1} ${S3} Small efforts, repeated over time, ________.`),
      options: [
        "build real skill",
        "waste much time",
        "need more talent",
        "hide small gifts",
        "follow new rules",
      ],
    };
    const leak = findVariantLeaks({ passage, questions: [q1, q2] }).find(
      (l) => l.source === 0 && l.target === 1,
    );
    expect(leak).toBeDefined();
    expect(leak!.snippet).toContain("think that talent");
  });

  it("독해형(주제 · 내용 일치 · 서술형)은 대상이 아니다 — 묶음 분리가 맡는다", () => {
    expect(
      findVariantLeaks({ passage, questions: [topic, blank(BLANK_FULL)] }),
    ).toEqual([]);
  });

  it("변형 문항이 하나뿐이면 빈 목록", () => {
    expect(
      findVariantLeaks({ passage, questions: [blank(BLANK_FULL)] }),
    ).toEqual([]);
  });
});
