// @vitest-environment node
import { expect, it } from "vitest";
import {
  CONCEPT_BLANK_FORMS,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";
import {
  readScanPageWithName,
  SCAN_READ_PROMPT_VERSION,
  SCAN_READ_LINES_PROMPT_VERSION,
} from "@/lib/concept-blank/scan/read";
import {
  SCAN_READ_OUTPUT_SCHEMA,
  SCAN_READ_LINES_OUTPUT_SCHEMA,
} from "@/lib/concept-blank/scan/output";
import type { ScanModel } from "@/lib/concept-blank/scan/model";

const selection: ConceptBlankSelection = {
  sections: [...new Set(FIXTURE_BANK.concepts.map((c) => c.section))],
  forms: CONCEPT_BLANK_FORMS.map((form) => ({
    form,
    counts: { 하: 40, 중: 40, 상: 40 },
    extras: { 하: 40, 중: 40, 상: 40 },
  })),
};
const page = () =>
  createScanSnapshot(selection, FIXTURE_BANK).pages.find(
    (p) => p.form === "term",
  )!;
const image = "data:image/png;base64,YQ==";

function run(rows: Record<string, unknown>[], lines?: boolean) {
  const p = { ...page(), number: 2 };
  const requests: Parameters<ScanModel>[0][] = [];
  const model: ScanModel = async (r) => {
    requests.push(r);
    return JSON.stringify({ slots: rows, written_name: null });
  };
  return readScanPageWithName(
    { page: p, imageDataUrl: image, ...(lines ? { lines: true } : {}) },
    model,
  ).then((result) => ({ result, requests, page: p }));
}

it("asks exactly as before when line breaks are not requested", async () => {
  const { requests, result } = await run([]);
  expect(requests[0]!.promptVersion).toBe(SCAN_READ_PROMPT_VERSION);
  expect(requests[0]!.jsonSchema).toBe(SCAN_READ_OUTPUT_SCHEMA);
  expect(requests[0]!.prompt).not.toContain("lines");
  expect(result).not.toHaveProperty("lines");
});

it("keeps physical lines only when they join back to the read text", async () => {
  const ids = page().slots.map((s) => s.id);
  const [a, b, c, d] = ids;
  const { requests, result } = await run(
    [
      {
        id: a,
        status: "read",
        text: "합동이 아니다. 넓이는 같지만",
        lines: ["합동이 아니다.", "넓이는  같지만"],
      },
      // 이어 붙인 글이 판독과 다르면 줄을 믿지 않는다 — 판독은 그대로 남는다.
      { id: b, status: "read", text: "대응변", lines: ["대응각"] },
      { id: c, status: "blank", text: "", lines: [] },
      { id: d, status: "uncertain", text: "모양", lines: ["모양"] },
    ],
    true,
  );
  expect(requests[0]!.promptVersion).toBe(SCAN_READ_LINES_PROMPT_VERSION);
  expect(requests[0]!.jsonSchema).toBe(SCAN_READ_LINES_OUTPUT_SCHEMA);
  expect(requests[0]!.prompt).toContain("lines");
  expect(result.readings.find((r) => r.id === b)).toMatchObject({
    status: "read",
    text: "대응변",
  });
  expect(result.lines).toMatchObject({
    [a!]: ["합동이 아니다.", "넓이는 같지만"],
    [b!]: null,
    [c!]: null,
    [d!]: null,
  });
});

it("never takes lines from an empty line, a multi-line cell or a duplicate row", async () => {
  const [a, b] = page().slots.map((s) => s.id);
  const { result } = await run(
    [
      { id: a, status: "read", text: "가 나", lines: ["가", "", "나"] },
      { id: b, status: "read", text: "다", lines: ["다\n"] },
      { id: b, status: "read", text: "다", lines: ["다"] },
    ],
    true,
  );
  expect(result.lines![a!]).toBeNull();
  expect(result.lines![b!]).toBeNull();
});
