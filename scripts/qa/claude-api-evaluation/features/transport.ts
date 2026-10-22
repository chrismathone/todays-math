/** Capture actual runModelApi serialization; replay owner-supplied raw responses only. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import type { FeatureCase } from "./fixtures";

export const evidence = process.env.FEATURES_EVIDENCE!;
export const privateRoot = path.join(evidence, "private");
export const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export function saveImmutable(relative: string, bytes: string | Buffer) {
  const target = path.join(privateRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  if (fs.existsSync(target))
    assert.equal(
      sha(fs.readFileSync(target)),
      sha(bytes),
      `Frozen bytes changed: ${relative}`,
    );
  else fs.writeFileSync(target, bytes, { mode: 0o600, flag: "wx" });
  return target;
}
export function saveReport(relative: string, value: unknown) {
  const target = path.join(privateRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
}
export const state: {
  current?: FeatureCase;
  ordinal: number;
  phase: string;
  pending?: string;
  replayed: {
    id: string;
    responsePath: string;
    responseSha256: string;
    model: string;
    stopReason: string;
    usage: unknown;
  }[];
} = { ordinal: 0, phase: "", replayed: [] };

interface RequestRecord {
  id: string;
  caseId: string;
  phase: string;
  operation: string;
  requestPath: string;
  requestSha256: string;
  inputSha256: string;
  imageSha256: string[];
  promptSha256: string;
  model: string;
  effort: string;
  maxOutputTokens: number;
  expected: Record<string, unknown>;
  modelApplicability: string;
  dependsOn: string[];
}
const records: RequestRecord[] = [];
export function beginCase(item: FeatureCase) {
  state.current = item;
  state.ordinal = 0;
  state.pending = undefined;
  state.replayed = [];
}
export function configureInference(input: {
  maxOutputTokens?: number;
  effort?: "low" | "medium" | "high";
  model: string;
}) {
  const id = state.current?.id;
  if (!id) return input;
  const review = id === "figure-redraw" && input.maxOutputTokens === 3000;
  state.phase = review
    ? "review"
    : id === "figure-redraw"
      ? "generate"
      : state.ordinal
        ? "supplement"
        : "primary";
  return {
    ...input,
    maxOutputTokens: Math.min(
      input.maxOutputTokens ?? Infinity,
      review ? 3000 : ["figure-redraw", "solution"].includes(id) ? 8192 : 4096,
    ),
    effort:
      input.effort ??
      (["figure-redraw", "figure-edit", "solution"].includes(id)
        ? ("medium" as const)
        : ("low" as const)),
  };
}
export function rawEnvelopeIssues(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return ["not-object"];
  const r = raw as Record<string, unknown>;
  const issues: string[] = [];
  if (r.type !== "message" || r.role !== "assistant")
    issues.push("not-assistant-message");
  if (r.stop_reason !== "end_turn") issues.push("not-end-turn");
  if (typeof r.model !== "string" || !r.model) issues.push("no-actual-model");
  if (
    !Array.isArray(r.content) ||
    !r.content.some(
      (p) => p.type === "text" && typeof p.text === "string" && p.text.trim(),
    )
  )
    issues.push("no-text");
  if (
    Array.isArray(r.content) &&
    r.content.some(
      (p) => !["text", "thinking", "redacted_thinking"].includes(p.type),
    )
  )
    issues.push("unexpected-content-or-tool");
  if (!r.usage || typeof r.usage !== "object") issues.push("no-usage");
  return issues;
}
export async function captureFetch(
  url: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  assert.equal(String(url), "https://api.anthropic.com/v1/messages");
  assert.equal(init?.method, "POST");
  const item = state.current;
  assert(item, "No active case");
  assert.equal(typeof init?.body, "string");
  const body = String(init.body);
  const request = JSON.parse(body);
  assert(
    !("tools" in request) &&
      !("stream" in request) &&
      !("temperature" in request),
  );
  assert(request.max_tokens <= 8192);
  const id = `${item.id}.${String(++state.ordinal).padStart(2, "0")}`;
  const requestPath = saveImmutable(`requests/${id}.json`, body);
  const content = request.messages.flatMap(
    (m: {
      content: { type: string; text?: string; source?: { data: string } }[];
    }) => m.content,
  );
  const prompt = content
    .filter((p: { type: string }) => p.type === "text")
    .map((p: { text: string }) => p.text)
    .join("\n");
  const imageHashes = content
    .filter((p: { type: string }) => p.type === "image")
    .map((p: { source: { data: string } }) =>
      sha(Buffer.from(p.source.data, "base64")),
    );
  assert.equal(
    imageHashes.length,
    1,
    "Every representative sends actual image bytes",
  );
  if (state.phase !== "review") assert.equal(imageHashes[0], item.imageSha256);
  const record: RequestRecord = {
    id,
    caseId: item.id,
    phase: state.phase,
    operation: item.request?.action ?? item.id,
    requestPath,
    requestSha256: sha(body),
    inputSha256: sha(
      fs.readFileSync(path.join(privateRoot, `inputs/${item.id}.json`)),
    ),
    imageSha256: imageHashes,
    promptSha256: sha(prompt),
    model: request.model,
    effort: request.output_config.effort,
    maxOutputTokens: request.max_tokens,
    expected: item.expected,
    modelApplicability:
      item.id === "english-photo-read"
        ? "current English READ_MODELS 5.5; explicit Anthropic"
        : "current studio API_MODELS Opus5; explicit Anthropic, no auto Gemini",
    dependsOn: state.replayed.map((r) => r.id),
  };
  records.push(record);
  saveImmutable(
    `requests/${id}.manifest.json`,
    JSON.stringify(record, null, 2),
  );
  flushManifest();
  const mapPath = process.env.FEATURES_RESPONSE_MAP;
  const map = mapPath ? JSON.parse(fs.readFileSync(mapPath, "utf8")) : {};
  const responsePath =
    (map.responses ?? map)[id] ??
    path.join(privateRoot, `responses/${id}.json`);
  if (!fs.existsSync(responsePath)) {
    state.pending = id;
    throw new Error("Offline response pending");
  }
  const responseBytes = fs.readFileSync(responsePath);
  const raw = JSON.parse(responseBytes.toString("utf8"));
  const issues = rawEnvelopeIssues(raw);
  assert.deepEqual(issues, [], `Raw API envelope rejected: ${id}`);
  assert.equal(
    raw.model,
    request.model,
    `Actual model differs from the frozen requested model: ${id}`,
  );
  state.replayed.push({
    id,
    responsePath,
    responseSha256: sha(responseBytes),
    model: raw.model,
    stopReason: raw.stop_reason,
    usage: raw.usage,
  });
  return new Response(responseBytes, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
export function flushManifest() {
  const byId = new Map(records.map((record) => [record.id, record]));
  saveReport("requests.json", {
    version: 1,
    baseCommit: "1f20540ec8bdd6777b498f9692b00f0f3bf1368a",
    captureBoundary:
      "actual executeStudioTask/readEnglishPhoto -> actual runModelApi -> offline fetch",
    injectedOverrides: [
      "bounded maxOutputTokens and explicit effort",
      "native sharp comparison replacing Chromium only",
    ],
    cases: [...byId.values()],
  });
}
