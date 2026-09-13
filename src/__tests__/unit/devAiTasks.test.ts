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
    expect(() => parseDevAiResult('{"problems":[]}', "page-ocr")).toThrow();
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
});
