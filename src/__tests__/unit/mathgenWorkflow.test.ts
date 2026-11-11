import { describe, expect, it, vi } from "vitest";
import {
  buildDevAiPrompt,
  executeMathgenTask,
  parseDevAiResult,
} from "@/lib/dev-ai/tasks";

const block = (type: string, value: string, rows: string[][] = []) => ({
  type,
  value,
  rows,
});
const native = (patch = {}) => ({
  number: 19,
  contents: [block("text", "다음 표를 보고 물음에 답하시오.")],
  choices: [],
  subQuestions: [],
  score: 4,
  labelType: "서답형",
  topic: "확률",
  images: [],
  figures: [],
  confidence: "high",
  choicesLayout: "auto",
  ...patch,
});
const request = {
  action: "ocr" as const,
  provider: "codex" as const,
  grade: "중1",
  imageDataUrl: "data:image/png;base64,YWJj",
};

describe("source Mathgen OCR and solution workflow", () => {
  it("preserves native tables, subquestions, printed metadata and raw fractions", () => {
    const item = native({
      printedScore: "[4점]",
      contents: [
        block("text", "다음을 구하시오."),
        block("table", "", [
          ["값", "빈칸"],
          ["\\frac{7}{3}", ""],
        ]),
      ],
      subQuestions: [
        {
          number: 1,
          contents: [block("text", "(1) 값을 구하시오.")],
          choices: [],
          score: 2,
          labelType: "단답형",
        },
      ],
    });
    const result = parseDevAiResult(
      JSON.stringify({ items: [item], upsideDown: false }),
      "ocr",
    );
    expect(result.ocr).toMatchObject({
      number: 19,
      score: 4,
      printedScore: "[4점]",
      labelType: "서답형",
      topic: "확률",
      confidence: "high",
    });
    expect(result.ocr?.blocks[1].rows).toEqual(item.contents[1].rows);
    expect(result.content).toContain("\\frac{7}{3}");
    expect(result.content).toContain("(1) 값을 구하시오. [2점]");
    expect(result.content).not.toContain("(1) (1)");
  });

  it("recovers quoted prose without converting a truncated page to success", () => {
    expect(
      parseDevAiResult(
        '{"content":"He said "hello", then left.","answer":""}',
        "ocr",
      ).content,
    ).toBe('He said "hello", then left.');
    expect(() =>
      parseDevAiResult('{"problems":[{"content":"lost', "page-ocr"),
    ).toThrow();
  });

  it("recovers a missing table using the same transport and retains original cells", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({ items: [native()], upsideDown: false }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ content: "다음 표를 보고 물음에 답하시오." }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ content: "| 수 | 횟수 |\n| --- | --- |\n| 1 | 3 |" }),
      );
    const result = await executeMathgenTask(request, invoke);
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(
      result.ocr?.blocks.some(
        (b) => b.type === "table" && b.rows[1][1] === "3",
      ),
    ).toBe(true);
  });

  it("cleans trial-and-error, resolves a value against choices, and preserves the answer", async () => {
    const ocr = parseDevAiResult(
      JSON.stringify({
        items: [
          native({
            choices: [1, 2, 3, 4, 5].map((n) => ({
              number: n,
              contents: [block("equation", String(n))],
            })),
          }),
        ],
      }),
      "ocr",
    ).ocr!;
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          answer: "3",
          solution:
            "잠깐, 다시 계산해야 합니다. 조건에 따라 계산하면 최종 값은 $3$입니다.",
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          solution: "주어진 식에 값을 대입하면 $1+2=3$이므로 조건을 만족한다.",
          answer: "999",
        }),
      );
    const result = await executeMathgenTask(
      { ...request, action: "solution", content: "합을 구하시오.", ocr },
      invoke,
    );
    expect(result.answer).toBe("③");
    expect(result.solution).not.toContain("잠깐");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("re-asks once when the model's reply cannot be read, then uses the second reply", async () => {
    const invoke = vi
      .fn()
      // 2026-11-11 운영 — 보기 배열의 닫는 괄호가 빠진 응답
      .mockResolvedValueOnce('{"answer":"3","solution":"값은 $3$')
      .mockResolvedValueOnce(
        JSON.stringify({
          answer: "3",
          solution: "주어진 식에 값을 대입하면 $1+2=3$이다.",
        }),
      );
    const result = await executeMathgenTask(
      { ...request, action: "solution", content: "합을 구하시오." },
      invoke,
      { retryUnreadable: true },
    );
    expect(result.solution).toContain("1+2=3");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("matches solution answers against visually edited choices", async () => {
    const ocr = parseDevAiResult(
      JSON.stringify({ items: [native()] }),
      "ocr",
    ).ocr!;
    const invoke = vi.fn().mockResolvedValue(
      JSON.stringify({
        answer: "7",
        solution: "주어진 식을 계산하면 $3+4=7$이므로 정답은 7이다.",
      }),
    );
    const result = await executeMathgenTask(
      {
        ...request,
        action: "solution",
        content: "합을 구하시오.\n\n① $5$\n② $6$\n③ $7$\n④ $8$\n⑤ $9$",
        ocr: {
          ...ocr,
          contentEdited: true,
          blocks: [],
          choiceGroups: [],
          subQuestions: [],
        },
      },
      invoke,
    );
    expect(result.answer).toBe("③");
  });

  it("uses the original grade defenses and native crop prompt", () => {
    const prompt = buildDevAiPrompt({
      ...request,
      action: "solution",
      content: "문항",
    });
    expect(prompt).toContain("집합 기호");
    expect(prompt).toContain("서로 다른");
    expect(buildDevAiPrompt(request)).toContain("TYPED BLOCKS");
  });

  it("keeps solutions concise while showing the key transformation and unambiguous fractions", () => {
    const prompt = buildDevAiPrompt({
      ...request,
      action: "solution",
      grade: "고1",
      content: "문항",
    });
    expect(prompt).toContain("고등도 핵심 단계만 대략 2~5 step");
    expect(prompt).toContain(
      "같은 말 반복·검산 나열·일반론 설명은 쓰지 않는다",
    );
    expect(prompt).toContain("인수분해의 묶는 법·완전제곱·치환·경우 나누기");
    expect(prompt).toContain("분수는 항상 \\frac{분자}{분모}");
    expect(prompt).toContain("곱셈 앞 계수 분수는 괄호로 감싸");
    expect(prompt).toContain("step1), step2)");
    expect(prompt).toContain(
      'JSON 객체 {"content":"","answer":"정답","solution":"풀이","warnings":[]}',
    );
    expect(prompt).not.toContain("###ANSWER###");
  });

  it("keeps source choice layout and flags partial choices without inventing missing options", () => {
    const result = parseDevAiResult(
      JSON.stringify({
        items: [
          native({
            contents: [block("text", "다음 중 옳은 것을 고르시오.")],
            labelType: "",
            choicesLayout: "3x2",
            choices: [1, 2, 3, 4].map((n) => ({
              number: n,
              contents: [block("equation", String(n))],
            })),
          }),
        ],
      }),
      "ocr",
    );
    expect(result.ocr).toMatchObject({
      choicesLayout: "3x2",
      choicesMissing: true,
    });
    expect(result.ocr?.choiceGroups).toHaveLength(4);
    expect(result.content).not.toContain("⑤");
  });

  it("allows empty detection crops only under the explicit crop-first contract", () => {
    const problems = [
      {
        number: 19,
        content: "",
        bbox: { left: 10, top: 10, width: 300, height: 200 },
      },
    ];
    expect(() =>
      parseDevAiResult(JSON.stringify({ problems }), "page-ocr"),
    ).toThrow();
    expect(
      parseDevAiResult(
        JSON.stringify({ problems, detectionOnly: true }),
        "page-ocr",
      ).problems?.[0].number,
    ).toBe(19);
  });

  it("preserves initial OCR on a failed supplement and propagates cancellation", async () => {
    const raw = JSON.stringify({
      items: [
        native({
          contents: [block("text", "주어진 조건에 따라 값을 구하시오.")],
        }),
      ],
    });
    const failure = vi
      .fn()
      .mockResolvedValueOnce(raw)
      .mockRejectedValueOnce(new Error("temporary"));
    const retained = await executeMathgenTask(request, failure);
    expect(retained.content).toContain("주어진 조건");
    expect(retained.warnings.join(" ")).toContain("원본 결과는 유지");
    const cancelled = vi
      .fn()
      .mockResolvedValueOnce(raw)
      .mockRejectedValueOnce(new DOMException("cancel", "AbortError"));
    await expect(executeMathgenTask(request, cancelled)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(cancelled).toHaveBeenCalledTimes(2);
  });

  it("regenerates a distinct-tuple violation once then keeps the warning for review", async () => {
    const invoke = vi.fn().mockResolvedValue(
      JSON.stringify({
        answer: "-48",
        solution: "(-50, 1, 1)의 합은 $-48$이다.",
      }),
    );
    const result = await executeMathgenTask(
      {
        ...request,
        action: "solution",
        content: "서로 다른 세 정수의 합을 구하시오.",
      },
      invoke,
    );
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.answer).toBe("-48");
    expect(result.warnings.join(" ")).toContain("중복");
  });
});
