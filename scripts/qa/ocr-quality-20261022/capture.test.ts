import { test, vi, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { fixtures, type Fixture } from "./fixtures";
const sha = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
const root = process.env.OCR_EVIDENCE!;
function freeze(name: string, bytes: string | Buffer) {
  const p = path.join(root, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p)) expect(sha(fs.readFileSync(p)), name).toBe(sha(bytes));
  else fs.writeFileSync(p, bytes, { flag: "wx", mode: 0o600 });
  return p;
}
vi.mock("@/lib/studio-ai/api", async (original) => {
  const actual = await original<typeof import("@/lib/studio-ai/api")>();
  return {
    ...actual,
    runModelApi: (input: Parameters<typeof actual.runModelApi>[0]) =>
      actual.runModelApi({
        ...input,
        maxOutputTokens: process.env.OCR_SHADOW ? 8192 : 4096,
        effort: process.env.OCR_SHADOW ? "high" : "medium",
        ...(process.env.OCR_SHADOW ? { model: "claude-opus-5-5" } : {}),
      }),
  };
});
const canonical = (s: string) => s.replace(/\$|\\(?:text|mathrm)|[{}\s]/g, "");
test("freeze actual requests and replay exact owner replies with independent text/count/pixel checks", async () => {
  const { executeStudioTask } = await import("@/lib/studio-ai/execute");
  const all: Fixture[] = process.env.OCR_INDEPENDENT_MANIFEST
    ? await Promise.all(
        JSON.parse(
          fs.readFileSync(process.env.OCR_INDEPENDENT_MANIFEST, "utf8"),
        ).specs.map(
          async (spec: {
            id: string;
            action: "ocr" | "page-ocr";
            svgPath: string;
            svgSha256: string;
            regions: number[][];
            forbidden: number[][];
            stem?: string;
            count?: number;
            hold?: boolean;
            expectedChoiceLayout?: "auto";
          }) => {
            const source = fs.readFileSync(spec.svgPath);
            expect(sha(source)).toBe(spec.svgSha256);
            const image = await sharp(source).png().toBuffer();
            return {
              ...spec,
              image,
              request: {
                provider: "claude" as const,
                action: spec.action,
                grade: "초3",
                sourceName: `authored-${spec.id}.png`,
                imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
              },
            };
          },
        ),
      )
    : await fixtures();
  const records: unknown[] = [];
  const outcomes: unknown[] = [];
  const map = process.env.OCR_RESPONSE_MAP
    ? JSON.parse(fs.readFileSync(process.env.OCR_RESPONSE_MAP, "utf8"))
    : {};
  for (const item of all) {
    if (root.endsWith("baseline-v2") && item.heldOut) continue;
    freeze(`inputs/${item.id}.png`, item.image);
    freeze(
      `expectations/${item.id}.json`,
      JSON.stringify(
        {
          stem: item.stem,
          count: item.count,
          regions: item.regions,
          forbidden: item.forbidden,
          hold: item.hold,
          heldOut: item.heldOut,
          expectedChoiceLayout: item.expectedChoiceLayout,
        },
        null,
        2,
      ),
    );
    let ordinal = 0,
      pending = false;
    const replayed: unknown[] = [];
    vi.stubGlobal("fetch", async (url: unknown, init: RequestInit) => {
      expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
      expect(init.method).toBe("POST");
      const body = String(init.body);
      const id = `${item.id}.${++ordinal}`;
      const request = JSON.parse(body);
      const requestPath = freeze(`requests/${id}.json`, body);
      records.push({
        id,
        caseId: item.id,
        requestPath,
        requestSha256: sha(body),
        imageSha256: sha(item.image),
        operation: item.request.action,
        model: request.model,
        effort: request.output_config.effort,
        maxOutputTokens: request.max_tokens,
      });
      const responsePath = (map.responses ?? map)[id];
      if (!responsePath) {
        pending = true;
        throw Error("offline response pending");
      }
      const bytes = fs.readFileSync(responsePath),
        raw = JSON.parse(bytes.toString());
      expect(raw.model).toBe(request.model);
      expect(raw.stop_reason).toBe("end_turn");
      replayed.push({ id, responsePath, sha256: sha(bytes) });
      return new Response(bytes, { status: 200 });
    });
    try {
      const { result } = await executeStudioTask(
        item.request,
        { mode: "model-api", provider: "anthropic" },
        new AbortController().signal,
      );
      if (pending) throw Error("dependent response pending");
      freeze(`parsed/${item.id}.json`, JSON.stringify(result, null, 2));
      const issues: string[] = [];
      if (item.request.action === "ocr") {
        if (!canonical(result.content).includes(canonical(item.stem!)))
          issues.push("source-language/text");
        if (
          item.expectedChoiceLayout &&
          result.ocr?.choicesLayout !== item.expectedChoiceLayout
        )
          issues.push("choice-layout");
        if (result.ocr?.choiceGroups.length !== item.count)
          issues.push("choice-count");
        if (result.answer !== "" || result.solution !== "")
          issues.push("unsolicited-answer");
        if (item.hold && !result.ocr?.choicesMissing)
          issues.push("unsafe-completeness");
      } else {
        if (result.problems?.length !== item.regions.length)
          issues.push("problem-count");
        const { data, info } = await sharp(item.image)
          .removeAlpha()
          .greyscale()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const boxes = (result.problems ?? []).map((p) => ({
          l: Math.floor((p.bbox.left * info.width) / 1000),
          t: Math.floor((p.bbox.top * info.height) / 1000),
          r: Math.ceil(((p.bbox.left + p.bbox.width) * info.width) / 1000),
          b: Math.ceil(((p.bbox.top + p.bbox.height) * info.height) / 1000),
        }));
        const inside = (
          b: { l: number; t: number; r: number; b: number },
          x: number,
          y: number,
        ) => x >= b.l && x < b.r && y >= b.t && y < b.b;
        const pixels = item.regions.map((region, i) => {
          let total = 0,
            lost = 0,
            foreign = 0;
          for (let y = region[1]; y < Math.min(region[3], info.height); y++)
            for (let x = region[0]; x < Math.min(region[2], info.width); x++)
              if (data[y * info.width + x] < 128) {
                total++;
                if (!boxes[i] || !inside(boxes[i], x, y)) lost++;
              }
          for (const other of [
            ...item.regions.filter((_, j) => j !== i),
            ...item.forbidden,
          ])
            for (let y = other[1]; y < Math.min(other[3], info.height); y++)
              for (let x = other[0]; x < Math.min(other[2], info.width); x++)
                if (
                  data[y * info.width + x] < 128 &&
                  boxes[i] &&
                  inside(boxes[i], x, y)
                )
                  foreign++;
          return { total, lost, foreign };
        });
        if (pixels.some((p) => p.lost || p.foreign))
          issues.push("crop-ink-or-neighbor");
        outcomes.push({
          id: item.id,
          pixels,
          issues,
          warnings: result.warnings,
          replayed,
          status: issues.length ? "quality-failed" : "quality-pass",
        });
        continue;
      }
      outcomes.push({
        id: item.id,
        issues,
        warnings: result.warnings,
        replayed,
        status: issues.length ? "quality-failed" : "quality-pass",
      });
    } catch (e) {
      outcomes.push({
        id: item.id,
        status: pending ? "pending" : "failed",
        error: String(e),
        replayed,
      });
    }
  }
  freeze(
    "request-manifest.json",
    JSON.stringify(
      {
        version: 1,
        boundary: process.env.OCR_SHADOW
          ? "actual executeStudioTask -> runModelApi -> offline fetch; QA ONLY model Opus5.5/high/8192 override; product route unchanged"
          : "actual executeStudioTask -> runModelApi -> offline fetch; 4096/medium overrides",
        cases: records,
      },
      null,
      2,
    ),
  );
  const summary = JSON.stringify(
    { mode: process.env.OCR_MODE, outcomes },
    null,
    2,
  );
  freeze(`history/${sha(summary)}.json`, summary);
  fs.writeFileSync(path.join(root, "summary.json"), summary);
  console.info(outcomes);
  if (process.env.OCR_MODE === "replay")
    expect(
      outcomes.filter(
        (o) =>
          (o as { status: string }).status === "pending" ||
          (o as { status: string }).status === "failed",
      ),
    ).toEqual([]);
});
