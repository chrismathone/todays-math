// @vitest-environment node
import { expect, it, vi } from "vitest";
import {
  readScanPageWithName,
  normalizeScanRead,
  normalizeWrittenScanName,
} from "@/lib/concept-blank/scan/read";
import { gradeScanPage } from "@/lib/concept-blank/scan/grade";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import {
  createScanModel,
  scanReservation,
} from "@/lib/concept-blank/scan/model";
import { createMemoryScanUsageStore } from "@/lib/concept-blank/scan/usage";
import type { runModelApi } from "@/lib/studio-ai/api";

const page = createScanSnapshot(
  {
    sections: [FIXTURE_BANK.concepts[0].section],
    forms: [
      {
        form: "term",
        counts: { 하: 1, 중: 0, 상: 0 },
        extras: { 하: 0, 중: 0, 상: 0 },
      },
    ],
  },
  FIXTURE_BANK,
).pages[0];
const slots = page.slots.map((s) => ({
  id: s.id,
  status: "read" as const,
  text: '글 "괄호 }"',
}));
const name = { status: "read", text: "홍길동" };
const data = JSON.stringify({ slots, written_name: name });
const wraps = [
  (s: string) => "```json\n" + s + "\n```",
  (s: string) => "읽은 결과입니다.\n" + s,
  (s: string) => s + "\n이상입니다.",
  (s: string) =>
    s +
    "\n" +
    JSON.stringify({ slots: [], written_name: { status: "blank", text: "" } }),
];
it.each(wraps)(
  "reads only the first JSON, preserving escapes and names",
  (wrap) => {
    expect(
      normalizeScanRead(
        wrap(data),
        slots.map((s) => s.id),
      ),
    ).toEqual(slots);
    expect(normalizeWrittenScanName(wrap(data))).toEqual(name);
  },
);
it.each(wraps)("grades fenced/prefaced/trailed output", async (wrap) => {
  const grades = page.targets.map((t) => ({
    id: t.id,
    label: "correct",
    reason: "뜻이 맞습니다.",
  }));
  const model = vi.fn().mockResolvedValue(wrap(JSON.stringify({ grades })));
  expect(
    await gradeScanPage({ page, readings: slots, corrections: [] }, model),
  ).toEqual(grades.map((g) => ({ ...g, directlyEntered: false })));
  expect(model.mock.calls[0][0].jsonSchema).toMatchObject({
    type: "object",
    additionalProperties: false,
  });
});
it("keeps broken first JSON unreadable/review and reports it without student data", async () => {
  const onMalformedOutput = vi.fn().mockResolvedValue(undefined);
  const raw = '{"slots": broken}\n' + data;
  const model = vi.fn().mockResolvedValue(raw);
  const result = await readScanPageWithName(
    { page, imageDataUrl: "data:image/png;base64,AA==", onMalformedOutput },
    model,
  );
  expect(result.readings.every((s) => s.status === "unreadable")).toBe(true);
  expect(result.writtenName).toEqual({ status: "unreadable", text: "" });
  expect(onMalformedOutput).toHaveBeenCalledOnce();
  expect(String(onMalformedOutput.mock.calls[0][0])).not.toContain("홍길동");
  expect(model.mock.calls[0][0].jsonSchema).toMatchObject({ type: "object" });
  const grades = await gradeScanPage(
    { page, readings: slots, corrections: [], onMalformedOutput },
    model,
  );
  expect(grades.every((g) => g.label === "review")).toBe(true);
  expect(onMalformedOutput).toHaveBeenCalledTimes(2);
});
it("sends scan-only schema and 240s timeout, binds cache and reservation to schema", async () => {
  const transport = vi
    .fn<typeof runModelApi>()
    .mockImplementation(async (input) => {
      input.onAnthropicUsage?.({
        inputTokens: 100,
        outputTokens: 20,
        cachedInputTokens: 0,
        cacheCreationInputTokens: 0,
      });
      return data;
    });
  const model = createScanModel({
    store: createMemoryScanUsageStore(),
    transport,
    requestKey: "schema",
  });
  const signal = new AbortController().signal;
  const request = {
    operation: "read" as const,
    prompt: "이름",
    signal,
    jsonSchema: {
      type: "object",
      properties: { 이름: { type: "string" } },
      additionalProperties: false,
    },
  };
  await model(request);
  expect(transport.mock.calls[0][0]).toMatchObject({
    jsonSchema: request.jsonSchema,
    timeoutMs: 240_000,
    signal,
    singleAttempt: true,
  });
  const withSchema = await scanReservation("claude-opus-5-5", request);
  const withoutSchema = await scanReservation("claude-opus-5-5", {
    prompt: request.prompt,
  });
  expect(withSchema.inputTokens - withoutSchema.inputTokens).toBe(
    Buffer.byteLength(JSON.stringify(request.jsonSchema), "utf8"),
  );
  await model({ ...request, jsonSchema: { type: "object" } });
  expect(transport).toHaveBeenCalledTimes(2);
});
