import { test, expect, vi } from "vitest";
import sharp from "sharp";
import {
  buildDevAiPrompt,
  executeMathgenTask,
  parseDevAiResult,
} from "@/lib/dev-ai/tasks";
import { runModelApi } from "@/lib/studio-ai/api";
const request = {
  provider: "claude" as const,
  action: "ocr" as const,
  grade: "초3",
  imageDataUrl: "data:image/png;base64,YWJj",
};
test("OCR prompt preserves source language instead of blanket Korean translation", () => {
  const prompt = buildDevAiPrompt(request);
  expect(prompt).not.toContain("모든 자연어는 한국어");
  expect(prompt).toContain("원문 언어");
});
test("four visible choices remain held without claiming the original must have five", () => {
  const r = parseDevAiResult(
    JSON.stringify({
      items: [
        {
          number: 1,
          contents: [{ type: "text", value: "Calculate 18 + 27." }],
          choices: [1, 2, 3, 4].map((number) => ({
            number,
            contents: [{ type: "text", value: String(number) }],
          })),
          confidence: "high",
        },
      ],
    }),
    "ocr",
  );
  expect(r.ocr?.choicesMissing).toBe(true);
  expect(r.ocr?.choiceGroups).toHaveLength(4);
  expect(r.warnings.join(" ")).not.toContain("다섯");
  expect(r.warnings.join(" ")).toContain("4개");
});
for (const type of ["tool_use", "server_tool_use", "future_block", null])
  test(`reject unexpected Anthropic block ${type}`, async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            stop_reason: "end_turn",
            content: [{ type: "text", text: "{}" }, { type }],
          }),
        ),
    );
    await expect(
      runModelApi({
        vendor: "anthropic",
        model: "claude-opus-5",
        prompt: "test",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow();
  });
test("valid thinking and redacted thinking preserve text", async () => {
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [
            { type: "thinking", thinking: "reason", signature: "sig" },
            { type: "redacted_thinking", data: "opaque" },
            { type: "text", text: "{}" },
          ],
        }),
      ),
  );
  await expect(
    runModelApi({
      vendor: "anthropic",
      model: "claude-opus-5",
      prompt: "test",
      signal: new AbortController().signal,
    }),
  ).resolves.toBe("{}");
});
for (const shape of ["omitted-row", "overlap", "cut-glyph"])
  test(`source-aware crop warning for ${shape}`, async () => {
    const image = await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="white"/><rect x="50" y="50" width="300" height="20"/><rect x="50" y="150" width="300" height="20"/></svg>',
      ),
    )
      .png()
      .toBuffer();
    const bbox =
      shape === "omitted-row"
        ? { left: 80, top: 80, width: 650, height: 100 }
        : shape === "cut-glyph"
          ? { left: 80, top: 80, width: 650, height: 240 }
          : { left: 80, top: 80, width: 650, height: 300 };
    const problems = [
      { number: 1, content: "", bbox },
      ...(shape === "overlap" ? [{ number: 2, content: "", bbox }] : []),
    ];
    const result = await executeMathgenTask(
      {
        ...request,
        action: "page-ocr",
        imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
      },
      async () => JSON.stringify({ detectionOnly: true, problems }),
    );
    expect(result.warnings.join(" ")).toMatch(/크롭.*확인/);
  });
test("unreadable source never establishes crop completeness", async () => {
  const result = await executeMathgenTask(
    { ...request, action: "page-ocr" },
    async () =>
      JSON.stringify({
        detectionOnly: true,
        problems: [{ bbox: { left: 10, top: 10, width: 200, height: 200 } }],
      }),
  );
  expect(result.warnings.join(" ")).toMatch(/크롭.*확인/);
});

test("a fully swallowed answer key remains a crop review candidate", async () => {
  const image = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="white"/><text x="50" y="80">1. Find x</text><text x="50" y="380">Answer key: 1. 45</text></svg>',
    ),
  )
    .png()
    .toBuffer();
  const result = await executeMathgenTask(
    {
      ...request,
      action: "page-ocr",
      imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
    },
    async () =>
      JSON.stringify({
        detectionOnly: true,
        problems: [{ bbox: { left: 0, top: 0, width: 1000, height: 1000 } }],
      }),
  );
  expect(result.warnings.join(" ")).toContain("정답표");
});
test("decoded blank stays empty without a fabricated crop warning", async () => {
  const image = await sharp({
    create: { width: 500, height: 700, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const result = await executeMathgenTask(
    {
      ...request,
      action: "page-ocr",
      imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
    },
    async () => JSON.stringify({ detectionOnly: true, problems: [] }),
  );
  expect(result.problems).toEqual([]);
  expect(result.warnings).toEqual([]);
});
