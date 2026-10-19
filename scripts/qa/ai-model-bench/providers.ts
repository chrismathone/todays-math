/**
 * 팔 하나를 부른다 — 제품 배관(`src/lib/studio-ai/api.ts` `runModelApiOnce`)과 같은 요청 꼴로.
 *
 * 제품 함수를 그대로 부르지 않는 까닭은 둘이다: 제품은 사용량(usage)을 돌려주지 않고, 제품 딥시크 갈래는
 * 이미지를 싣지 않는다(DeepSeek 를 «해설 전용»으로 막아 둠). 그 둘만 다르게 하고 나머지 설정은 같게 맞춘다.
 * 잘림(finish = length)은 제품처럼 오류로 던지지 않고 결과에 적는다 — 하네스가 세야 하니까.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import OpenAI from "openai";
import { KEY_NAMES, type Arm } from "./arms";
import type { Usage } from "./cost";

export interface CallInput {
  prompt: string;
  imageDataUrl?: string;
  signal?: AbortSignal;
}

export interface CallResult {
  text: string;
  usage: Usage;
  ms: number;
  /** stop = 정상 끝 · length = 출력 한도로 잘림 · other = 그 밖 */
  finish: "stop" | "length" | "other";
  /** 공급자가 사용량을 보고했는지. 실측 strict-budget에서는 누락을 0원으로 정산하지 않는다. */
  usageReported?: boolean;
}

export type Caller = (arm: Arm, input: CallInput) => Promise<CallResult>;

const TIMEOUT_MS = 110_000; // 제품과 같다

function key(arm: Arm) {
  const value = process.env[KEY_NAMES[arm.vendor]]?.trim();
  if (!value) throw new MissingKey(arm);
  return value;
}

export class MissingKey extends Error {
  constructor(readonly arm: Arm) {
    super(`${KEY_NAMES[arm.vendor]} 가 없어 ${arm.id} 를 부를 수 없습니다.`);
  }
}

export const callArm: Caller = async (arm, input) => {
  const started = Date.now();
  const signal = AbortSignal.any([
    ...(input.signal ? [input.signal] : []),
    AbortSignal.timeout(TIMEOUT_MS),
  ]);
  const image = input.imageDataUrl?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  const maxTokens = arm.maxOutputTokens ?? 16000;

  if (arm.vendor === "agy") return callAgy(arm, input, started);

  if (arm.vendor === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${arm.model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key(arm) },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: input.prompt },
                ...(image ? [{ inlineData: { mimeType: image[1], data: image[2] } }] : []),
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            ...(arm.model === "gemini-3.8-flash"
              ? { thinkingConfig: { thinkingLevel: "LOW" } }
              : { temperature: 0 }),
          },
        }),
        signal,
      },
    );
    if (!response.ok) throw new Error(`gemini HTTP ${response.status}`);
    const result = await response.json();
    const candidate = result.candidates?.[0];
    const meta = result.usageMetadata ?? {};
    return {
      text: (candidate?.content?.parts ?? [])
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text ?? "")
        .join(""),
      usage: {
        input: meta.promptTokenCount ?? 0,
        cachedInput: meta.cachedContentTokenCount ?? 0,
        output: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
        reasoning: meta.thoughtsTokenCount,
      },
      usageReported: Number.isFinite(meta.promptTokenCount) && Number.isFinite(meta.candidatesTokenCount),
      ms: Date.now() - started,
      finish:
        candidate?.finishReason === "STOP"
          ? "stop"
          : candidate?.finishReason === "MAX_TOKENS"
            ? "length"
            : "other",
    };
  }

  if (arm.vendor === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key(arm),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: arm.model,
        max_tokens: maxTokens,
        ...(/^claude-(opus|sonnet)-5-5$/.test(arm.model)
          ? { output_config: { effort: "low" } }
          : arm.model === "claude-opus-5"
            ? { output_config: { effort: "medium" } }
            : { temperature: 0 }),
        messages: [
          {
            role: "user",
            content: [
              ...(image
                ? [{ type: "image", source: { type: "base64", media_type: image[1], data: image[2] } }]
                : []),
              { type: "text", text: input.prompt },
            ],
          },
        ],
      }),
      signal,
    });
    if (!response.ok) throw new Error(`anthropic HTTP ${response.status}`);
    const result = await response.json();
    return {
      text: (result.content ?? [])
        .filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join(""),
      usage: {
        input:
          (result.usage?.input_tokens ?? 0) + (result.usage?.cache_read_input_tokens ?? 0),
        cachedInput: result.usage?.cache_read_input_tokens ?? 0,
        output: result.usage?.output_tokens ?? 0,
      },
      usageReported: Number.isFinite(result.usage?.input_tokens) && Number.isFinite(result.usage?.output_tokens),
      ms: Date.now() - started,
      finish:
        result.stop_reason === "end_turn"
          ? "stop"
          : result.stop_reason === "max_tokens"
            ? "length"
            : "other",
    };
  }

  // deepseek · openai — OpenAI 호환 chat.completions(제품과 같은 갈래)
  const client = new OpenAI({
    apiKey: key(arm),
    maxRetries: 0,
    timeout: TIMEOUT_MS,
    baseURL: arm.vendor === "deepseek" ? "https://api.deepseek.com" : "https://api.openai.com/v1",
  });
  const content =
    input.imageDataUrl && arm.vision
      ? [
          { type: "text" as const, text: input.prompt },
          {
            type: "image_url" as const,
            image_url: { url: input.imageDataUrl, detail: "high" as const },
          },
        ]
      : input.prompt;
  const result = await client.chat.completions.create(
    {
      model: arm.model,
      messages: [{ role: "user", content }],
      ...(arm.vendor === "deepseek"
        ? { max_tokens: maxTokens, reasoning_effort: "low" as const }
        : /^(?:gpt-5(?:[.-]|$)|o[134](?:-|$))/.test(arm.model)
          ? { max_completion_tokens: maxTokens }
          : { max_tokens: maxTokens, temperature: 0.1 }),
    },
    { signal },
  );
  const usage = result.usage as
    | (OpenAI.CompletionUsage & { prompt_cache_hit_tokens?: number })
    | undefined;
  const finish = result.choices[0]?.finish_reason;
  return {
    text: result.choices[0]?.message?.content ?? "",
    usage: {
      input: usage?.prompt_tokens ?? 0,
      cachedInput:
        usage?.prompt_cache_hit_tokens ?? usage?.prompt_tokens_details?.cached_tokens ?? 0,
      output: usage?.completion_tokens ?? 0,
      reasoning: usage?.completion_tokens_details?.reasoning_tokens,
    },
    usageReported: Number.isFinite(usage?.prompt_tokens) && Number.isFinite(usage?.completion_tokens),
    ms: Date.now() - started,
    finish: finish === "stop" ? "stop" : finish === "length" ? "length" : "other",
  };
};

/**
 * 구독 CLI(agy)로 부른다 — `scripts/qa/english-read-bench/run.mjs` 의 `agy()` 와 같은 꼴(빈 작업 폴더 · 사진은 파일로
 * 두고 «파일 보기 도구로 열라»는 머리말 한 줄). 사용량은 CLI 가 주는 대로, 비용은 0 이다.
 */
async function callAgy(arm: Arm, input: CallInput, started: number): Promise<CallResult> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "ai-bench-agy-"));
  try {
    let prompt = input.prompt;
    const image = input.imageDataUrl?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (image) {
      const file = path.join(cwd, `input.${image[1] === "jpeg" ? "jpg" : image[1]}`);
      await writeFile(file, Buffer.from(image[2]!, "base64"));
      prompt = `명령(셸)을 실행하지 말고, 파일 보기 도구로 ${file} 를 열어 본 뒤 아래 지시를 따르세요.\n\n${prompt}`;
    }
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn("agy", ["-p", prompt, "--model", arm.model, "--output-format", "json", "--print-timeout", "420s"], { cwd });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`agy 종료 ${code}: ${err.slice(-300)}`))));
    });
    const json = JSON.parse(stdout.slice(stdout.indexOf("{")));
    const ok = json.status === "SUCCESS" && typeof json.response === "string" && json.response.trim();
    return {
      text: ok ? json.response : "",
      usage: { input: json.usage?.input_tokens ?? 0, cachedInput: 0, output: json.usage?.output_tokens ?? 0 },
      ms: Date.now() - started,
      finish: ok ? "stop" : "other",
    };
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}
