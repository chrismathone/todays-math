import { describe, expect, it } from "vitest";
import {
  buildDevAiPrompt,
  DevAiRequestSchema,
  parseDevAiResult,
} from "@/lib/dev-ai/tasks";

describe("development OCR and solution task boundary", () => {
  const request = {
    provider: "codex",
    action: "ocr",
    grade: "초5",
    imageDataUrl: "data:image/png;base64,YWJj",
  };
  it("requires source images and verified content for their respective actions", () => {
    expect(DevAiRequestSchema.safeParse(request).success).toBe(true);
    expect(
      DevAiRequestSchema.safeParse({ ...request, imageDataUrl: undefined })
        .success,
    ).toBe(false);
    expect(
      DevAiRequestSchema.safeParse({
        ...request,
        imageDataUrl: "https://example.com/image.png",
      }).success,
    ).toBe(false);
    expect(
      DevAiRequestSchema.safeParse({
        ...request,
        action: "solution",
        content: " ",
      }).success,
    ).toBe(false);
    expect(
      DevAiRequestSchema.safeParse({
        ...request,
        command: "powershell",
        apiKey: "not-an-api",
      }).success,
    ).toBe(false);
  });
  it("preserves raw fractions and choices, and discards an unsolicited OCR solution", () => {
    const content = "다음을 계산하세요. $\\frac{9}{4}$\n① $2$ ② $3$";
    const result = parseDevAiResult(
      JSON.stringify({
        content,
        answer: "",
        solution: "OCR에서 풀지 않음",
        warnings: [],
      }),
      "ocr",
    );
    expect(result.content).toBe(content);
    expect(result.solution).toBe("");
  });
  it("rejects malformed, empty, and out-of-page recognition instead of applying it", () => {
    expect(() => parseDevAiResult("not json", "ocr")).toThrow();
    expect(() => parseDevAiResult('{"content":""}', "ocr")).toThrow();
    expect(() => parseDevAiResult("{}", "page-ocr")).toThrow();
    expect(() =>
      parseDevAiResult(
        JSON.stringify({
          problems: [
            {
              content: "문항",
              bbox: { left: 950, top: 100, width: 200, height: 100 },
            },
          ],
        }),
        "page-ocr",
      ),
    ).toThrow();
  });
  it("accepts explicit empty page results without inventing questions or solutions", () => {
    const result = parseDevAiResult(
      JSON.stringify({
        problems: [],
        content: "표지",
        answer: "unrequested",
        solution: "unrequested",
        warnings: ["표지 페이지"],
      }),
      "page-ocr",
    );
    expect(result).toMatchObject({
      problems: [],
      content: "",
      answer: "",
      solution: "",
      warnings: ["표지 페이지"],
    });
    const prompt = buildDevAiPrompt({
      provider: "codex",
      action: "page-ocr",
      grade: "초5",
      imageDataUrl: request.imageDataUrl,
    });
    expect(prompt).toContain("표지·빈 페이지");
    expect(prompt).toContain("반드시 problems: []");
    expect(prompt).toContain("없는 문제를 만들거나 추측하지 않는다");
  });
  it.each([undefined, null, "", {}, [null], [{}], ["question"]])(
    "rejects missing or malformed page results instead of treating them as empty: %j",
    (problems) => {
      expect(() =>
        parseDevAiResult(JSON.stringify({ problems }), "page-ocr"),
      ).toThrow();
    },
  );
  it("retains all recognized source regions without inserting model-generated solutions", () => {
    const problems = [
      {
        content: "계산하세요.",
        answer: "",
        bbox: { left: 20, top: 100, width: 450, height: 200 },
      },
    ];
    const result = parseDevAiResult(
      JSON.stringify({
        problems,
        solution: "unrequested",
        warnings: ["도형 확인"],
      }),
      "page-ocr",
    );
    expect(result.problems).toEqual(problems);
    expect(result.warnings).toEqual(["도형 확인"]);
    expect(result.solution).toBe("");
  });
  it("requires complete answer and explanation without rewriting reviewed source text", () => {
    expect(() => parseDevAiResult('{"answer":"2"}', "solution")).toThrow();
    expect(
      parseDevAiResult(
        '{"content":"changed","answer":"2","solution":"1+1=2"}',
        "solution",
      ),
    ).toMatchObject({ content: "", answer: "2", solution: "1+1=2" });
  });
  it("scopes math prompts to supplied data and supersedes the original secondary fraction rule", () => {
    const prompt = buildDevAiPrompt({
      provider: "grok",
      action: "solution",
      grade: "중1",
      content: "$\\frac{9}{4}$",
    });
    expect(prompt).toContain("중등·고등 가분수는 전환하지 않는다");
    expect(prompt).toContain(
      "파일 편집, 명령 실행, 웹 검색, 외부 도구를 사용하지 않는다",
    );
    expect(prompt).toContain(JSON.stringify("$\\frac{9}{4}$"));
  });

  it("accepts only an image-backed explicit figures request and requires a figures result", () => {
    expect(
      DevAiRequestSchema.safeParse({ ...request, action: "figures" }).success,
    ).toBe(true);
    expect(
      DevAiRequestSchema.safeParse({
        ...request,
        action: "figures",
        imageDataUrl: undefined,
      }).success,
    ).toBe(false);
    expect(() => parseDevAiResult("{}", "figures")).toThrow("그림 영역 결과");
    expect(
      parseDevAiResult(
        JSON.stringify({
          figures: [],
          content: "overwrite",
          answer: "overwrite",
          solution: "overwrite",
        }),
        "figures",
      ),
    ).toMatchObject({ figures: [], content: "", answer: "", solution: "" });
  });

  it.each([
    { left: -1, top: 0, width: 10, height: 10 },
    { left: 0, top: -1, width: 10, height: 10 },
    { left: 999, top: 0, width: 2, height: 10 },
    { left: 0, top: 999, width: 10, height: 2 },
    { left: 0, top: 0, width: 0, height: 10 },
    { left: 0, top: 0, width: 10, height: -1 },
    { left: null, top: 0, width: 10, height: 10 },
    { left: "1", top: 0, width: 10, height: 10 },
  ])("drops invalid figure coordinates with a warning: %j", (bbox) => {
    const valid = { bbox: { left: 750, top: 750, width: 250, height: 250 } };
    const result = parseDevAiResult(
      JSON.stringify({ figures: [{ bbox }, valid] }),
      "figures",
    );
    expect(result.figures).toEqual([valid]);
    expect(result.warnings.join(" ")).toContain("1개를 제외");
  });

  it("retains page-coordinate figures and raw OCR even when another optional figure is invalid", () => {
    const figures = [
      { bbox: { left: 400, top: 500, width: 100, height: 100 } },
    ];
    const content = String.raw`$\frac{9}{4}$ ① 1 ② 2`;
    const result = parseDevAiResult(
      JSON.stringify({
        problems: [
          {
            content,
            bbox: { left: 200, top: 300, width: 500, height: 500 },
            figures: [
              ...figures,
              { bbox: { left: -2, top: 0, width: 5, height: 5 } },
            ],
          },
        ],
      }),
      "page-ocr",
    );
    expect(result.problems?.[0]).toMatchObject({ content, figures });
    expect(result.warnings).toHaveLength(1);
  });

  it("bounds figure array sizes and makes page and crop coordinate rules explicit in prompts", () => {
    expect(() =>
      parseDevAiResult(
        JSON.stringify({ figures: Array(31).fill({}) }),
        "figures",
      ),
    ).toThrow();
    const base = {
      provider: "codex" as const,
      grade: "초5",
      imageDataUrl: request.imageDataUrl,
    };
    const cropPrompt = buildDevAiPrompt({ ...base, action: "figures" });
    expect(cropPrompt).toContain("INPUT 이미지 전체");
    expect(cropPrompt).toContain("손글씨 풀이·낙서");
    expect(cropPrompt).toContain("figures: []");
    expect(cropPrompt).toContain("보기 텍스트는 제외");
    expect(buildDevAiPrompt({ ...base, action: "page-ocr" })).toContain(
      "부모 문제 bbox에 상대적인 좌표가 아니다",
    );
  });
});
