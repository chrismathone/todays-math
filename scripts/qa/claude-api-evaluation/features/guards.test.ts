/** Synthetic boundaries are explicitly separate from owner-run live evidence. */
import { afterEach, expect, test, vi } from "vitest";
import { runModelApi } from "@/lib/studio-ai/api";
import { resolveApiModel } from "@/lib/studio-ai/routing";
import {
  cleanEnglishReadText,
  readEnglishPhoto,
  resolveEnglishReadModel,
} from "@/lib/english/readPhoto";
import { DevAiRequestSchema, parseDevAiResult } from "@/lib/dev-ai/tasks";
import { parseFigureEditResult } from "@/lib/dev-ai/figure-edit";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { rawEnvelopeIssues } from "./transport";
import { createFixtures, ENGLISH_LINES } from "./fixtures";
import { assertFeature } from "./assertions";

const message = (text = "ok", extra: Record<string, unknown> = {}) => ({
  id: "synthetic-not-live",
  type: "message",
  role: "assistant",
  model: "claude-opus-5",
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
  usage: { input_tokens: 1, output_tokens: 1 },
  ...extra,
});
const input = () => ({
  vendor: "anthropic" as const,
  model: "claude-opus-5",
  prompt: "synthetic test",
  signal: new AbortController().signal,
});
const respond = (body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body)),
  );
afterEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", () => {
    throw new Error("Offline network forbidden");
  });
});

test("actual wrapper returns only text for a complete response", async () => {
  respond(
    message("first", {
      content: [
        { type: "thinking", thinking: "hidden" },
        { type: "text", text: "first" },
        { type: "text", text: "second" },
      ],
    }),
  );
  expect(await runModelApi(input())).toBe("firstsecond");
});
test.each(["max_tokens", "tool_use", "refusal", "pause_turn", null])(
  "actual wrapper rejects incomplete stop %s",
  async (stop_reason) => {
    respond(message("partial", { stop_reason }));
    await expect(runModelApi(input())).rejects.toThrow();
  },
);
test.each(["", " ".repeat(5), "x".repeat(1_000_001)])(
  "actual wrapper rejects empty/oversize text %#",
  async (text) => {
    respond(message(text));
    await expect(runModelApi(input())).rejects.toThrow();
  },
);
test("actual wrapper rejects response stream over four million bytes", async () => {
  vi.stubGlobal("fetch", async () => new Response("x".repeat(4_000_001)));
  await expect(runModelApi(input())).rejects.toThrow(/너무 큽니다/);
});
test("actual wrapper rejects invalid JSON without exposing its body", async () => {
  vi.stubGlobal("fetch", async () => new Response("invalid-synthetic-marker"));
  await expect(runModelApi(input())).rejects.toThrow(
    "모델 API 요청에 실패했습니다",
  );
});
test("actual wrapper propagates abort and timeout instead of returning partial text", async () => {
  vi.stubGlobal(
    "fetch",
    (_url: unknown, options: RequestInit) =>
      new Promise((_resolve, reject) => {
        options.signal!.addEventListener(
          "abort",
          () => reject(options.signal!.reason),
          { once: true },
        );
      }),
  );
  const realTimeout = AbortSignal.timeout.bind(AbortSignal);
  const deadline = vi
    .spyOn(AbortSignal, "timeout")
    .mockImplementation((ms) => realTimeout(ms === 110000 ? 10 : ms));
  await expect(runModelApi(input())).rejects.toHaveProperty(
    "name",
    "TimeoutError",
  );
  expect(deadline).toHaveBeenCalledWith(110000);
  const controller = new AbortController();
  controller.abort();
  await expect(
    runModelApi({ ...input(), signal: controller.signal }),
  ).rejects.toHaveProperty("name", "AbortError");
});
test("external evidence guard rejects mixed tool content even with end_turn", async () => {
  const mixed = message("ok", {
    content: [
      { type: "text", text: "ok" },
      { type: "tool_use", id: "x", name: "synthetic", input: {} },
    ],
  });
  expect(rawEnvelopeIssues(mixed)).toContain("unexpected-content-or-tool");
  // Observed product limitation: actual wrapper filters this block, rather than rejecting it.
  respond(mixed);
  expect(await runModelApi(input())).toBe("ok");
});
test("external evidence guard requires assistant/model/usage and completed text", () => {
  expect(rawEnvelopeIssues(message())).toEqual([]);
  for (const mutation of [
    { type: "error" },
    { role: "user" },
    { model: "" },
    { usage: null },
    { content: [] },
  ]) {
    expect(rawEnvelopeIssues(message("ok", mutation)).length).toBeGreaterThan(
      0,
    );
  }
});
test("current studio rejects 5.5 while current English allows explicit 5.5", () => {
  expect(() =>
    resolveApiModel("anthropic", "ocr", {
      NODE_ENV: "test",
      STUDIO_AI_ANTHROPIC_MODEL: "claude-opus-5-5",
    }),
  ).toThrow();
  expect(
    resolveEnglishReadModel({
      ANTHROPIC_API_KEY: "synthetic",
      ENGLISH_READ_MODEL: "claude-opus-5-5",
    }),
  ).toEqual({ vendor: "anthropic", model: "claude-opus-5-5" });
});
test("actual input contracts require image, content and figure appropriately", () => {
  for (const action of [
    "ocr",
    "page-ocr",
    "figures",
    "figure-redraw",
    "figure-edit",
  ]) {
    expect(
      DevAiRequestSchema.safeParse({ provider: "claude", grade: "초3", action })
        .success,
    ).toBe(false);
  }
  expect(
    DevAiRequestSchema.safeParse({
      provider: "claude",
      grade: "초3",
      action: "solution",
      content: "",
    }).success,
  ).toBe(false);
});
test("actual parsers fail closed or surface invalid optional data, and preserve OCR answer boundary", () => {
  expect(() => parseDevAiResult("not JSON", "ocr")).toThrow();
  expect(() =>
    parseDevAiResult(
      '{"problems":[{"bbox":{"left":999,"top":0,"width":2,"height":1}}]}',
      "page-ocr",
    ),
  ).toThrow();
  expect(() =>
    parseDevAiResult('{"answer":"26","solution":""}', "solution"),
  ).toThrow();
  const ocr = parseDevAiResult(
    '{"content":"18 + 27","answer":"","solution":"invented"}',
    "ocr",
  );
  expect(ocr.answer).toBe("");
  expect(ocr.solution).toBe("");
  const figures = parseDevAiResult(
    '{"figures":[{"bbox":{"left":999,"top":0,"width":2,"height":1}}]}',
    "figures",
  );
  expect(figures.figures).toEqual([]);
  expect(figures.warnings.length).toBeGreaterThan(0);
  expect(() =>
    parseFigureEditResult(
      '{"commands":[{"op":"shell","command":"synthetic"}]}',
    ),
  ).toThrow();
});
test("actual English rejects fake image bytes and preserves text rather than solving", async () => {
  await expect(
    readEnglishPhoto(
      { mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]) },
      { signal: new AbortController().signal },
    ),
  ).rejects.toThrow("사진 자료만");
  expect(cleanEnglishReadText("```text\nAnswer: (C)\n```")).toBe("Answer: (C)");
});
test("actual strict native figure renderer accepts valid geometry and rejects unknown input", async () => {
  const good = await renderFigureSpec(
    {
      version: 2,
      points: { A: [0, 0], B: [120, 0], C: [0, 90] },
      segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
    },
    { strict: true, typeset: false },
  );
  expect(good.ok).toBe(true);
  const bad = await renderFigureSpec(
    { version: 2, forbiddenSyntheticField: true },
    { strict: true },
  );
  expect(bad.ok).toBe(false);
});

test("independent assertions accept reachable originals and reject changed source facts", async () => {
  const fixtures = await createFixtures();
  const get = (id: string) => fixtures.find((item) => item.id === id)!;
  const empty = { content: "", answer: "", solution: "", warnings: [] };
  const ocr = {
    ...empty,
    content: "Calculate $18 + 27$.\n① 35 ② 45 ③ 55 ④ 65",
    questionType: "multiple-choice" as const,
    figures: [],
  };
  await expect(assertFeature(get("ocr"), ocr)).resolves.toBeTruthy();
  await expect(
    assertFeature(get("ocr"), {
      ...ocr,
      content: ocr.content.replace("Calculate", "계산하시오"),
    }),
  ).rejects.toThrow();
  await expect(
    assertFeature(get("ocr"), {
      ...ocr,
      content: ocr.content.replace("55", "56"),
    }),
  ).rejects.toThrow();
  const page = {
    ...empty,
    detectionOnly: true,
    problems: [
      {
        content: "",
        answer: "",
        bbox: { left: 40, top: 130, width: 500, height: 170 },
      },
      {
        content: "",
        answer: "",
        bbox: { left: 40, top: 460, width: 500, height: 170 },
      },
    ],
  };
  await expect(assertFeature(get("page-ocr"), page)).resolves.toBeTruthy();
  const clipped = structuredClone(page);
  clipped.problems[1].bbox.height = 60;
  await expect(assertFeature(get("page-ocr"), clipped)).rejects.toThrow(
    /crop loses/,
  );
  await expect(
    assertFeature(get("solution"), {
      ...empty,
      answer: "26",
      solution: "둘레: 8+5=13, 13*2=26 cm",
    }),
  ).resolves.toBeTruthy();
  await expect(
    assertFeature(get("solution"), {
      ...empty,
      answer: "40",
      solution: "둘레: 8*5=40 cm",
    }),
  ).rejects.toThrow();
  await expect(
    assertFeature(get("english-photo-read"), ENGLISH_LINES.join("\n")),
  ).resolves.toBeTruthy();
  await expect(
    assertFeature(
      get("english-photo-read"),
      ENGLISH_LINES.join("\n").replace("12 seeds", "21 seeds"),
    ),
  ).rejects.toThrow();
});
