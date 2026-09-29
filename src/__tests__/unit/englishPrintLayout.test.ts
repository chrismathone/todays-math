/**
 * 오늘의 영어 지면 — 쪽 나눔 순수 함수 (D-148 · 25 §5 · 브리프 english-print §1).
 *
 * 영어 지면은 1단이고 장당 문항 수가 정해져 있지 않다(수학 D-28 «장당 2문항»을 안 쓴다).
 * 그래서 문단·문항마다 높이를 재어 **순서대로 채우고 안 들어가면 다음 쪽**으로 넘긴다.
 * 재는 쪽(`useEnglishPages`)과 그리는 쪽(`EnglishPaper`)이 같은 블록 순서를 쓰므로,
 * 블록을 만드는 함수와 채우는 함수를 여기서 잠근다.
 */
import { describe, expect, it } from "vitest";

import {
  ENGLISH_BLOCK_GAP,
  ENGLISH_PARAGRAPH_GAP,
  englishPaperBlocks,
  packEnglishBlocks,
  splitPassageParagraphs,
} from "@/components/english/print/englishPaperLayout";

const question = {
  type: "주제" as const,
  prompt: "다음 글의 주제로 가장 적절한 것은?",
  options: ["a", "b", "c", "d", "e"],
  answer: "1",
  explanation: "",
  evidence: "Our town",
};

describe("splitPassageParagraphs — 지문을 빈 줄에서 문단으로 나눈다", () => {
  it("빈 줄이 없으면 문단 하나", () => {
    expect(splitPassageParagraphs("One line.\nSecond line.")).toEqual([
      "One line.\nSecond line.",
    ]);
  });

  it("빈 줄(공백만 있는 줄 포함)마다 문단이 갈리고, CRLF 도 같다", () => {
    expect(splitPassageParagraphs("First.\r\n\r\nSecond.\n  \nThird.")).toEqual(
      ["First.", "Second.", "Third."],
    );
  });

  it("비어 있는 지문도 문단 하나로 돌려 블록 순서가 흔들리지 않는다", () => {
    expect(splitPassageParagraphs("   ")).toEqual([""]);
  });
});

describe("englishPaperBlocks — 지문 문단이 먼저, 문항이 뒤", () => {
  it("문단 수 + 문항 수 만큼의 블록을 순서대로 만든다", () => {
    const blocks = englishPaperBlocks({
      passage: "A.\n\nB.",
      questions: [question, question],
    });
    expect(blocks.map((block) => block.kind)).toEqual([
      "passage",
      "passage",
      "question",
      "question",
    ]);
    expect(blocks[0]).toEqual({ kind: "passage", paragraph: 0, text: "A." });
    expect(blocks[3]).toEqual({ kind: "question", index: 1 });
  });
});

describe("packEnglishBlocks — 순서대로 채우고 넘치면 다음 쪽", () => {
  const avail = { first: 1000, cont: 1100 };

  it("다 들어가면 한 쪽", () => {
    const result = packEnglishBlocks({
      blocks: [
        { kind: "passage", height: 300 },
        { kind: "question", height: 200 },
        { kind: "question", height: 200 },
      ],
      avail,
      passageChrome: 40,
    });
    expect(result.pages).toEqual([[0, 1, 2]]);
    expect(result.oversized).toEqual([]);
  });

  it("문항 사이 간격과 지문 상자 여분까지 세어 넘치는 문항을 다음 쪽으로 보낸다", () => {
    // 지문 300 + 상자 40 = 340 · 간격 14 + 문항 300 = 654 · 간격 14 + 문항 300 = 968 (들어간다)
    // · 간격 14 + 문항 40 = 1022 > 1000 → 다음 쪽
    const result = packEnglishBlocks({
      blocks: [
        { kind: "passage", height: 300 },
        { kind: "question", height: 300 },
        { kind: "question", height: 300 },
        { kind: "question", height: 40 },
      ],
      avail,
      passageChrome: 40,
    });
    expect(result.pages).toEqual([[0, 1, 2], [3]]);
    expect(ENGLISH_BLOCK_GAP).toBe(14);
  });

  it("지문 문단이 쪽을 넘으면 상자 여분을 두 쪽 모두에 센다 (이어지는 상자도 테두리·제목이 있다)", () => {
    // 첫 쪽: 문단 600 + 여분 40 = 640 · 문단 간격 10 + 문단 400 = 1050 > 1000 → 둘째 문단은 다음 쪽
    // 둘째 쪽(1100): 문단 400 + 여분 40 = 440 · 간격 14 + 문항 600 = 1054 (들어간다)
    const result = packEnglishBlocks({
      blocks: [
        { kind: "passage", height: 600 },
        { kind: "passage", height: 400 },
        { kind: "question", height: 600 },
      ],
      avail,
      passageChrome: 40,
    });
    expect(result.pages).toEqual([[0], [1, 2]]);
    expect(ENGLISH_PARAGRAPH_GAP).toBe(10);
  });

  it("한 쪽보다 큰 블록은 혼자 한 쪽을 차지하고 `oversized` 에 적힌다 — 조용히 사라지지 않는다", () => {
    const result = packEnglishBlocks({
      blocks: [
        { kind: "passage", height: 100 },
        { kind: "question", height: 1500 },
        { kind: "question", height: 100 },
      ],
      avail,
      passageChrome: 40,
    });
    expect(result.pages).toEqual([[0], [1], [2]]);
    expect(result.oversized).toEqual([1]);
  });

  it("첫 쪽과 이어지는 쪽의 높이가 다르다 — 머리가 작은 둘째 쪽이 더 많이 담는다", () => {
    const result = packEnglishBlocks({
      blocks: [
        { kind: "question", height: 500 },
        { kind: "question", height: 500 },
        { kind: "question", height: 500 },
        { kind: "question", height: 500 },
        { kind: "question", height: 60 },
      ],
      avail: { first: 1000, cont: 1100 },
      passageChrome: 40,
    });
    // 첫 쪽 500 + 14 + 500 = 1014 > 1000 → 하나씩 · 둘째 쪽 500+14+500 = 1014 ≤ 1100 → 둘
    // 셋째 쪽 500 + 14 + 60 = 574
    expect(result.pages).toEqual([[0], [1, 2], [3, 4]]);
  });

  it("블록이 없어도 빈 쪽 하나는 돌려준다 (지면은 늘 최소 한 장)", () => {
    expect(
      packEnglishBlocks({ blocks: [], avail, passageChrome: 0 }).pages,
    ).toEqual([[]]);
  });
});
