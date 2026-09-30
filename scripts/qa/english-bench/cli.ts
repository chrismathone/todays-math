/**
 * 오늘의 영어 모델 벤치 — 구독 CLI 호출 (원장님 2026-09-30 «내부 요금제로 모델별로»).
 *
 * 유료 API 가 아니라 **로그인된 구독 CLI** 네 개를 부른다: codex(ChatGPT) · claude(claude.ai max) · grok(grok.com)
 * · agy(Antigravity — Gemini). 호출 인자는 `src/lib/dev-ai/cli-protocol.ts` 의 격리 결을 따른다(사용자 설정·훅·MCP·
 * 웹 검색·도구 끔). 저장소 파일을 읽지 않게 **빈 작업 폴더**(`cwd`)에서 돈다.
 *
 * ⚠️ `src/lib/dev-ai/**` 는 `server-only` 라 tsx 에서 못 불러 여기서 따로 짠다. 인증 파일은 읽지 않는다.
 */
import { spawn } from "node:child_process";

import OpenAI from "openai";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type Provider =
  "codex" | "claude" | "grok" | "gemini" | "deepseek" | "openai";

export interface CliCall {
  provider: Provider;
  model: string;
  system: string;
  prompt: string;
  /** 추론 강도 — CLI 마다 받는 글자가 다르다(codex low|medium|high|xhigh · claude low|medium|high · grok · agy 는 모델 이름에 들어 있다) */
  effort?: string;
  timeoutMs?: number;
  cwd: string;
}

/**
 * 토큰 사용량 — 비용 계산용(원장님 2026-09-30 «비용까지 계산해서 우선도»). `output` 은 생각(추론) 토큰을 **포함**한
 * 출력 토큰. 구독 CLI 는 자기 에이전트 지시문을 입력에 더하므로 `input` 은 API 로 부를 때보다 크다 — 비용은 우리
 * 요청문 크기로 따로 잰다(usage.ts).
 */
export interface CliUsage {
  input?: number;
  output: number;
  reasoning?: number;
}

export interface CliResult {
  text: string;
  ms: number;
  usage?: CliUsage;
}

export class CliCallError extends Error {
  constructor(
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = "CliCallError";
  }
}

const AGY_BIN = path.join(
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
  "agy",
  "bin",
  "agy.exe",
);

const HOME = os.homedir();
const APPDATA = process.env.APPDATA ?? path.join(HOME, "AppData", "Roaming");

/**
 * 실행 파일 — 🔴 shell 을 거치지 않는다(cmd 가 여러 줄 한글 인자를 깨뜨린다). codex 는 npm `.cmd` 심이라
 * 그 속의 `node codex.js` 를 바로 띄운다.
 */
function exe(provider: Provider): { file: string; pre: string[] } {
  if (provider === "gemini") return { file: AGY_BIN, pre: [] };
  if (provider === "claude")
    return { file: path.join(HOME, ".local", "bin", "claude.exe"), pre: [] };
  if (provider === "grok")
    return { file: path.join(HOME, ".grok", "bin", "grok.exe"), pre: [] };
  return {
    file: process.execPath,
    pre: [
      path.join(
        APPDATA,
        "npm",
        "node_modules",
        "@openai",
        "codex",
        "bin",
        "codex.js",
      ),
    ],
  };
}

function run(
  provider: Provider,
  args: string[],
  input: string | null,
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const { file, pre } = exe(provider);
  return new Promise((resolve, reject) => {
    const child = spawn(file, [...pre, ...args], {
      cwd,
      windowsHide: true,
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new CliCallError("시간 초과", `${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (d) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d) => (stderr += d));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
    if (input !== null) child.stdin.end(input, "utf8");
    else child.stdin.end();
  });
}

function jsonOf(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  if (start < 0) throw new CliCallError("JSON 출력 없음", text.slice(-400));
  return JSON.parse(text.slice(start)) as Record<string, unknown>;
}

export async function runCli(call: CliCall): Promise<CliResult> {
  const timeoutMs = call.timeoutMs ?? 12 * 60_000;
  const started = Date.now();
  const joined = `${call.system}\n\n---\n\n${call.prompt}`;
  let text: string;
  let usage: CliUsage | undefined;

  if (call.provider === "deepseek") {
    // 유일한 유료 API — 제품 `callAi`(src/lib/ai/client.ts) 와 같은 호출(추론 예산 하한 64,000). 모델만 고른다.
    // 키는 환경변수로만 받는다(원장님 2026-09-30 «다른 데서 찾아 써 봐» — eywa `.env.local` 의 키를 실행할 때 넘긴다).
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new CliCallError("DEEPSEEK_API_KEY 없음", "");
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
      timeout: timeoutMs,
    });
    // 추론 강도(원장님 2026-09-30 «딥시크 effort 별로도 비교») — `low|high|max` 는 reasoning_effort, `off` 는 생각 끄기.
    // 지정하지 않으면 제품과 같은 기본값(생각 켬 · high).
    const tuning =
      call.effort === "off"
        ? { thinking: { type: "disabled" } }
        : call.effort
          ? { reasoning_effort: call.effort }
          : {};
    const response = await client.chat.completions.create({
      model: call.model,
      max_tokens: 64000,
      messages: [
        { role: "system", content: call.system },
        { role: "user", content: call.prompt },
      ],
      ...(tuning as object),
    });
    const u = response.usage as
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        }
      | undefined;
    return {
      text: response.choices[0]?.message?.content ?? "",
      ms: Date.now() - started,
      usage: u
        ? {
            input: u.prompt_tokens,
            output: u.completion_tokens ?? 0,
            reasoning: u.completion_tokens_details?.reasoning_tokens,
          }
        : undefined,
    };
  }
  if (call.provider === "openai") {
    // 유료 API — 제품의 영어 luna 경로(`src/lib/ai/openai.ts`)와 같은 호출. 원장님 2026-09-30 «luna 로» · 키는 main `.env` 의 OPENAI_API_KEY.
    // 추론 모델은 `max_tokens` 대신 `max_completion_tokens` 를 받는다. 강도는 `reasoning_effort`(비우면 API 기본값).
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new CliCallError("OPENAI_API_KEY 없음", "");
    const client = new OpenAI({ apiKey, timeout: timeoutMs });
    const response = await client.chat.completions.create({
      model: call.model,
      max_completion_tokens: 64000,
      messages: [
        { role: "system", content: call.system },
        { role: "user", content: call.prompt },
      ],
      ...(call.effort ? { reasoning_effort: call.effort } : {}),
    } as Parameters<typeof client.chat.completions.create>[0]);
    const u = (response as { usage?: unknown }).usage as
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        }
      | undefined;
    return {
      text:
        (response as { choices: { message?: { content?: string | null } }[] })
          .choices[0]?.message?.content ?? "",
      ms: Date.now() - started,
      usage: u
        ? {
            input: u.prompt_tokens,
            output: u.completion_tokens ?? 0,
            reasoning: u.completion_tokens_details?.reasoning_tokens,
          }
        : undefined,
    };
  }
  if (call.provider === "codex") {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "ebench-codex-"));
    const out = path.join(tmp, "last.txt");
    try {
      const args = [
        "exec",
        "-m",
        call.model,
        ...(call.effort
          ? ["-c", `model_reasoning_effort="${call.effort}"`]
          : []),
        "--ignore-user-config",
        "--ignore-rules",
        "--skip-git-repo-check",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "-c",
        'forced_login_method="chatgpt"',
        "-c",
        'web_search="disabled"',
        "-c",
        "project_doc_max_bytes=0",
        "--disable",
        "hooks",
        "--disable",
        "shell_tool",
        "--json",
        "-o",
        out,
        "-",
      ];
      const r = await run("codex", args, joined, call.cwd, timeoutMs);
      if (r.code !== 0)
        throw new CliCallError(`codex 종료 ${r.code}`, r.stderr.slice(-800));
      text = readFileSync(out, "utf8");
      for (const line of r.stdout.split(/\r?\n/)) {
        if (!line.includes('"turn.completed"')) continue;
        try {
          const event = JSON.parse(line) as {
            usage?: {
              input_tokens?: number;
              output_tokens?: number;
              reasoning_output_tokens?: number;
            };
          };
          if (event.usage)
            usage = {
              input: event.usage.input_tokens,
              output:
                (event.usage.output_tokens ?? 0) +
                (event.usage.reasoning_output_tokens ?? 0),
              reasoning: event.usage.reasoning_output_tokens,
            };
        } catch {
          /* 사용량 줄이 아니면 건너뛴다 */
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  } else if (call.provider === "claude") {
    const args = [
      "-p",
      "--model",
      call.model,
      ...(call.effort ? ["--effort", call.effort] : []),
      "--tools",
      "",
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
      "--disable-slash-commands",
      "--no-session-persistence",
      "--output-format",
      "json",
      "--system-prompt",
      call.system,
    ];
    const r = await run("claude", args, call.prompt, call.cwd, timeoutMs);
    const out = jsonOf(r.stdout);
    if (out.is_error !== false || typeof out.result !== "string")
      throw new CliCallError("claude 오류", r.stdout.slice(-800));
    text = out.result;
    const cu = out.usage as
      | {
          input_tokens?: number;
          output_tokens?: number;
          output_tokens_details?: { thinking_tokens?: number };
        }
      | undefined;
    if (cu)
      usage = {
        input: cu.input_tokens,
        output: cu.output_tokens ?? 0,
        reasoning: cu.output_tokens_details?.thinking_tokens,
      };
  } else if (call.provider === "grok") {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "ebench-grok-"));
    const promptFile = path.join(tmp, "prompt.md");
    // 🔴 `--system-prompt-override` 로 넘긴 규칙은 모델에 닿지 않았다(2026-09-30 실측 — 답 형식을 모르고 제 스키마를
    // 지어냄). codex·agy 처럼 규칙을 요청 본문 앞에 붙인다. 도구를 빼도 머리말 한 턴을 먼저 쓰는 일이 있어 턴은 4.
    writeFileSync(promptFile, joined, "utf8");
    try {
      const args = [
        "--prompt-file",
        promptFile,
        "-m",
        call.model,
        ...(call.effort ? ["--reasoning-effort", call.effort] : []),
        "--output-format",
        "json",
        "--disable-web-search",
        "--no-subagents",
        "--no-plan",
        "--tools",
        "",
        "--max-turns",
        "4",
      ];
      const r = await run("grok", args, null, call.cwd, timeoutMs);
      const out = jsonOf(r.stdout);
      if (typeof out.text !== "string")
        throw new CliCallError(
          "grok 오류",
          r.stdout.slice(-800) + r.stderr.slice(-400),
        );
      text = out.text;
      const gu = out.usage as
        | {
            input_tokens?: number;
            output_tokens?: number;
            reasoning_tokens?: number;
          }
        | undefined;
      // grok 의 output_tokens 는 reasoning 을 포함한다(스모크: output 41 · reasoning 36)
      if (gu)
        usage = {
          input: gu.input_tokens,
          output: gu.output_tokens ?? 0,
          reasoning: gu.reasoning_tokens,
        };
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  } else {
    const args = [
      "-p",
      joined,
      "--model",
      call.model,
      "--output-format",
      "json",
      "--mode",
      "plan",
      "--disable-slash-commands",
    ];
    const r = await run("gemini", args, null, call.cwd, timeoutMs);
    const out = jsonOf(r.stdout);
    if (out.status !== "SUCCESS" || typeof out.response !== "string")
      throw new CliCallError(
        "agy 오류",
        r.stdout.slice(-800) + r.stderr.slice(-400),
      );
    text = out.response;
    const au = out.usage as
      | {
          input_tokens?: number;
          output_tokens?: number;
          thinking_tokens?: number;
        }
      | undefined;
    if (au)
      usage = {
        input: au.input_tokens,
        output: (au.output_tokens ?? 0) + (au.thinking_tokens ?? 0),
        reasoning: au.thinking_tokens,
      };
  }
  return { text, ms: Date.now() - started, usage };
}
