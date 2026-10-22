import { test, vi, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createFixtures } from "./fixtures";
import {
  beginCase,
  captureFetch,
  configureInference,
  saveReport,
  saveImmutable,
  state,
  sha,
} from "./transport";
import { assertFeature, cropInkEvidence } from "./assertions";

vi.mock("@/lib/dev-ai/figure-comparison", async () => ({
  buildFigureComparisonImage: (await import("./nativeComparison"))
    .buildNativeComparison,
}));
vi.mock("@/lib/studio-ai/api", async (original) => {
  const actual = await original<typeof import("@/lib/studio-ai/api")>();
  return {
    ...actual,
    runModelApi: (input: Parameters<typeof actual.runModelApi>[0]) =>
      actual.runModelApi({ ...input, ...configureInference(input) }),
  };
});

test("capture or replay all seven actual server functions, with separately reported quality", async () => {
  const { executeStudioTask } = await import("@/lib/studio-ai/execute");
  const { readEnglishPhoto } = await import("@/lib/english/readPhoto");
  const { DevAiRequestSchema } = await import("@/lib/dev-ai/tasks");
  vi.stubGlobal("fetch", captureFetch);
  const items = await createFixtures();
  const outcomes: Record<string, unknown>[] = [];
  for (const item of items) {
    beginCase(item);
    let stage = "server-function";
    let functionCompleted = false;
    let parsedSha256: string | undefined;
    try {
      const result =
        item.id === "english-photo-read"
          ? await readEnglishPhoto(
              { mimeType: "image/png", bytes: item.image },
              {
                signal: new AbortController().signal,
                env: {
                  ANTHROPIC_API_KEY: "offline-placeholder",
                  ENGLISH_READ_VENDOR: "anthropic",
                  ENGLISH_READ_MODEL: "claude-opus-5-5",
                },
              },
            )
          : (
              await executeStudioTask(
                DevAiRequestSchema.parse(item.request),
                { mode: "model-api", provider: "anthropic" },
                new AbortController().signal,
              )
            ).result;
      if (state.pending) throw new Error("Additional real response pending");
      functionCompleted = true;
      saveImmutable(`parsed/${item.id}.json`, JSON.stringify(result, null, 2));
      parsedSha256 = sha(JSON.stringify(result, null, 2));
      stage = "quality";
      if (item.id === "page-ocr" && typeof result !== "string") {
        saveReport("page-crop-ink.json", await cropInkEvidence(item, result));
      }
      const checks = await assertFeature(item, result);
      outcomes.push({
        caseId: item.id,
        status: "live-raw-replay-verified",
        functionCompleted,
        imageSha256: item.imageSha256,
        parsedSha256,
        replayed: [...state.replayed],
        checks,
      });
    } catch (error) {
      outcomes.push({
        caseId: item.id,
        status: state.pending
          ? "pending-response"
          : stage === "quality"
            ? "quality-failed"
            : "failed",
        functionCompleted,
        stage,
        parsedSha256,
        pending: state.pending,
        replayed: [...state.replayed],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const codeSha256 = Object.fromEntries(
    fs
      .readdirSync(path.dirname(new URL(import.meta.url).pathname))
      .filter(
        (name) => /\.(ts|mts|mjs)$/.test(name) || name === "tsconfig.json",
      )
      .sort()
      .map((name) => [
        name,
        sha(fs.readFileSync(new URL(name, import.meta.url))),
      ]),
  );
  const summary = {
    mode: process.env.FEATURES_MODE,
    cases: outcomes,
    scope:
      "server functions, parsers, strict renderer only; no routes/auth/DB/UI E2E",
    syntheticResponses: false,
    assertionVersion: 2,
    responseMapSha256: process.env.FEATURES_RESPONSE_MAP
      ? sha(fs.readFileSync(process.env.FEATURES_RESPONSE_MAP))
      : null,
    codeSha256,
  };
  saveReport("replay-summary.json", summary);
  saveImmutable(
    `replay-history/${sha(JSON.stringify(summary))}.json`,
    JSON.stringify(summary, null, 2),
  );
  console.info(
    JSON.stringify(
      outcomes.map(({ caseId, status, pending }) => ({
        caseId,
        status,
        pending,
      })),
    ),
  );
  expect(
    outcomes
      .filter((r) => ["failed", "quality-failed"].includes(String(r.status)))
      .map(({ caseId, status, error }) => ({ caseId, status, error })),
  ).toEqual([]);
  if (process.env.FEATURES_MODE === "replay") {
    expect(
      outcomes.filter((r) => r.status !== "live-raw-replay-verified"),
      "Final replay requires every real response, including dependent phases",
    ).toEqual([]);
  }
}, 120000);
