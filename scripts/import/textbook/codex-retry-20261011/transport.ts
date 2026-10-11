/** Subscription-only offline transport. Never reads credential files or calls an API directly. */
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";
import sharp from "sharp";
import { z } from "zod";

export interface CodexJsonInput {
  phase: string;
  prompt: string;
  schema: Record<string, unknown>;
  /** Local PNG paths or strict PNG data URLs. Bytes are validated and copied, never URLs fetched. */
  images?: readonly string[];
  outDir: string;
  cwd?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}
export interface CodexUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}
export interface CodexReceipt {
  version: "codex-chatgpt-json-v1";
  id: string;
  phase: string;
  auth: "chatgpt" | null;
  cliVersion: string | null;
  requestedModel: "codex-account-default";
  model: string | null;
  modelObserved: boolean;
  threadId: string | null;
  usage: CodexUsage | null;
  startedAt: string;
  elapsedMs: number;
  exitCode: number | null;
  signal: string | null;
  status: "succeeded" | "failed";
  reason: string | null;
  turnCompleted: boolean;
  schemaValid: boolean;
  promptSha256: string;
  schemaSha256: string;
  images: { sha256: string; bytes: number; width: number; height: number }[];
  outputSha256: string | null;
  stdoutSha256: string | null;
  stderrSha256: string | null;
  receiptPath: string;
  outputPath: string;
}
export interface CodexJsonResult<T = unknown> {
  value: T;
  auth: "chatgpt";
  threadId: string;
  model: string | null;
  usage: CodexUsage | null;
  elapsedMs: number;
  receipt: CodexReceipt;
}
export class CodexTransportError extends Error {
  constructor(
    readonly code: string,
    readonly receipt?: CodexReceipt,
  ) {
    super(code);
    this.name = "CodexTransportError";
  }
}
export interface CodexProcessRequest {
  args: string[];
  stdin: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  signal?: AbortSignal;
}
export interface CodexProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  stopped?: "timeout" | "aborted" | "output-limit" | "spawn-failed";
}
export type CodexProcessRunner = (
  input: CodexProcessRequest,
) => Promise<CodexProcessResult>;
const MAX_OUTPUT = 8 * 1024 * 1024;
const MAX_IMAGE = 16 * 1024 * 1024;
export const codexSha256 = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

/** Keep saved CLI auth location and ordinary OS configuration, strip credentials and API routing. */
export function codexChildEnvironment(
  source: Readonly<Record<string, string | undefined>>,
): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(source).filter(
      ([key]) =>
        !/(?:API_?KEY|(?:^|_)KEY(?:$|_)|TOKEN|SECRET|PASSWORD|DATABASE|POSTGRES|DIRECT_URL|OPENAI_BASE_URL|OPENAI_API_BASE|AZURE_OPENAI_ENDPOINT|NODE_OPTIONS)/i.test(
          key,
        ),
    ),
  ) as NodeJS.ProcessEnv;
}

/** npm's Windows .cmd/.ps1 wrappers need a shell; invoke their JS entrypoint with argv instead. */
function codexExecutable(env: NodeJS.ProcessEnv): {
  command: string;
  prefix: string[];
} {
  const searchPath =
    Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ??
    "";
  for (const dir of searchPath.split(delimiter).filter(Boolean)) {
    const native = join(
      dir,
      process.platform === "win32" ? "codex.exe" : "codex",
    );
    if (existsSync(native)) return { command: native, prefix: [] };
    if (process.platform === "win32") {
      const script = join(
        dir,
        "node_modules",
        "@openai",
        "codex",
        "bin",
        "codex.js",
      );
      if (existsSync(script))
        return { command: process.execPath, prefix: [script] };
    }
  }
  throw new CodexTransportError("codex-executable-missing");
}

export const spawnCodex: CodexProcessRunner = async (input) => {
  const executable = codexExecutable(input.env);
  if (input.signal?.aborted)
    return {
      stdout: "",
      stderr: "",
      exitCode: null,
      signal: null,
      stopped: "aborted",
    };
  return new Promise((done) => {
    const child = spawn(
      executable.command,
      [...executable.prefix, ...input.args],
      {
        cwd: input.cwd,
        env: input.env,
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "",
      size = 0;
    let stopped: CodexProcessResult["stopped"];
    const stop = (reason: NonNullable<CodexProcessResult["stopped"]>) => {
      if (stopped) return;
      stopped = reason;
      if (!child.pid) return;
      if (process.platform === "win32") {
        // Kill the npm launcher and its CLI descendant as one tree, using an argv array.
        const killer = spawn(
          "taskkill.exe",
          ["/PID", String(child.pid), "/T", "/F"],
          { shell: false, windowsHide: true, stdio: "ignore" },
        );
        killer.on("error", () => child.kill("SIGKILL"));
      } else {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      }
    };
    const abort = () => stop("aborted");
    const timer = setTimeout(() => stop("timeout"), input.timeoutMs);
    input.signal?.addEventListener("abort", abort, { once: true });
    const collect = (chunk: string, channel: "stdout" | "stderr") => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_OUTPUT) {
        stop("output-limit");
        return;
      }
      if (channel === "stdout") stdout += chunk;
      else stderr += chunk;
    };
    child.stdout
      .setEncoding("utf8")
      .on("data", (chunk: string) => collect(chunk, "stdout"))
      .on("error", () => stop("spawn-failed"));
    child.stderr
      .setEncoding("utf8")
      .on("data", (chunk: string) => collect(chunk, "stderr"))
      .on("error", () => stop("spawn-failed"));
    child.stdin.on("error", () => {
      /* Early CLI failure is recorded by close. */
    });
    child.on("error", () => stop("spawn-failed"));
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      input.signal?.removeEventListener("abort", abort);
      done({ stdout, stderr, exitCode, signal, stopped });
    });
    child.stdin.end(input.stdin, "utf8");
  });
};

// Restrict to the subset locally validated by the installed Zod converter; unknown keywords fail closed.
function validateSchemaKeywords(schema: unknown): void {
  if (typeof schema === "boolean") return;
  if (!schema || typeof schema !== "object" || Array.isArray(schema))
    throw new CodexTransportError("codex-schema-invalid");
  const allowed = new Set([
    "$schema",
    "$ref",
    "$defs",
    "definitions",
    "title",
    "description",
    "type",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "minItems",
    "maxItems",
    "enum",
    "const",
    "anyOf",
    "allOf",
    "minLength",
    "maxLength",
    "pattern",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
  ]);
  for (const [key, value] of Object.entries(schema)) {
    if (!allowed.has(key))
      throw new CodexTransportError("codex-schema-unsupported");
    if (["properties", "$defs", "definitions"].includes(key))
      Object.values(value as object).forEach(validateSchemaKeywords);
    if (["items", "additionalProperties"].includes(key))
      validateSchemaKeywords(value);
    if (["anyOf", "allOf"].includes(key))
      (value as unknown[]).forEach(validateSchemaKeywords);
  }
}
async function materializeImages(
  inputs: readonly string[],
  dir: string,
): Promise<{ paths: string[]; evidence: CodexReceipt["images"] }> {
  if (inputs.length > 72) throw new CodexTransportError("codex-image-count");
  const paths: string[] = [],
    evidence: CodexReceipt["images"] = [];
  for (const [index, input] of inputs.entries()) {
    let bytes: Buffer;
    if (input.startsWith("data:")) {
      const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        input,
      );
      if (!match || match[1].length > (MAX_IMAGE * 4) / 3 + 4)
        throw new CodexTransportError("codex-image-format");
      bytes = Buffer.from(match[1], "base64");
      if (bytes.toString("base64") !== match[1])
        throw new CodexTransportError("codex-image-format");
    } else {
      const file = resolve(input);
      if ((await stat(file)).size > MAX_IMAGE)
        throw new CodexTransportError("codex-image-size");
      bytes = await readFile(file);
    }
    if (
      !bytes.length ||
      bytes.length > MAX_IMAGE ||
      !bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    )
      throw new CodexTransportError("codex-image-format");
    const decoded = await sharp(bytes, {
      limitInputPixels: 16 * 1024 * 1024,
      failOn: "warning",
    })
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (decoded.info.width > 8192 || decoded.info.height > 8192)
      throw new CodexTransportError("codex-image-size");
    const path = join(dir, `image-${index + 1}.png`);
    await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
    paths.push(path);
    evidence.push({
      sha256: codexSha256(bytes),
      bytes: bytes.length,
      width: decoded.info.width,
      height: decoded.info.height,
    });
  }
  return { paths, evidence };
}
const failProcess = (result: CodexProcessResult) => {
  if (result.stopped) throw new CodexTransportError(`codex-${result.stopped}`);
  if (result.exitCode !== 0 || result.signal)
    throw new CodexTransportError("codex-exit-failed");
};

/** Tests must inject a runner; they never launch subscription inference. */
export function createCodexJsonRunner(runProcess: CodexProcessRunner) {
  return async function run<T = unknown>(
    input: CodexJsonInput,
  ): Promise<CodexJsonResult<T>> {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(input.phase) || !input.prompt.trim())
      throw new CodexTransportError("codex-input-invalid");
    const timeoutMs = input.timeoutMs ?? 600_000;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 1_800_000)
      throw new CodexTransportError("codex-timeout-invalid");
    const start = Date.now(),
      id = randomUUID();
    const dir = resolve(input.outDir, `${input.phase}-${id}`);
    await mkdir(dir, { recursive: true });
    const schemaText = JSON.stringify(input.schema);
    const receipt: CodexReceipt = {
      version: "codex-chatgpt-json-v1",
      id,
      phase: input.phase,
      auth: null,
      cliVersion: null,
      requestedModel: "codex-account-default",
      model: null,
      modelObserved: false,
      threadId: null,
      usage: null,
      startedAt: new Date(start).toISOString(),
      elapsedMs: 0,
      exitCode: null,
      signal: null,
      status: "failed",
      reason: null,
      turnCompleted: false,
      schemaValid: false,
      promptSha256: codexSha256(input.prompt),
      schemaSha256: codexSha256(schemaText),
      images: [],
      outputSha256: null,
      stdoutSha256: null,
      stderrSha256: null,
      receiptPath: join(dir, "receipt.json"),
      outputPath: join(dir, "output.json"),
    };
    try {
      validateSchemaKeywords(input.schema);
      const validator = z.fromJSONSchema(input.schema);
      const env = codexChildEnvironment(process.env);
      const cwd = input.cwd ? resolve(input.cwd) : dir;
      const base = { cwd, env, signal: input.signal };
      const auth = await runProcess({
        ...base,
        args: ["login", "status"],
        stdin: "",
        timeoutMs: Math.min(timeoutMs, 30_000),
      });
      failProcess(auth);
      if (
        !/^Logged in using ChatGPT\s*$/m.test(
          `${auth.stdout}\n${auth.stderr}`,
        ) ||
        /API key/i.test(`${auth.stdout}\n${auth.stderr}`)
      )
        throw new CodexTransportError("codex-chatgpt-auth-required");
      receipt.auth = "chatgpt";
      const version = await runProcess({
        ...base,
        args: ["--version"],
        stdin: "",
        timeoutMs: Math.min(timeoutMs, 30_000),
      });
      failProcess(version);
      receipt.cliVersion =
        /\bcodex-cli \d+\.\d+\.\d+(?:[-+][\w.-]+)?\b/.exec(
          version.stdout,
        )?.[0] ?? null;
      if (!receipt.cliVersion)
        throw new CodexTransportError("codex-version-missing");
      const images = await materializeImages(input.images ?? [], dir);
      receipt.images = images.evidence;
      const schemaPath = join(dir, "schema.json");
      await writeFile(schemaPath, schemaText, { flag: "wx", mode: 0o600 });
      const args = [
        "exec",
        "--json",
        "--ephemeral",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--color",
        "never",
        "-c",
        'forced_login_method="chatgpt"',
        "-c",
        'model_provider="openai"',
        "-c",
        'approval_policy="never"',
        "-c",
        "project_doc_max_bytes=0",
        "-c",
        'web_search="disabled"',
        "--disable",
        "shell_tool",
        "--disable",
        "unified_exec",
        "--disable",
        "apps",
        "--disable",
        "hooks",
        "--disable",
        "multi_agent",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        receipt.outputPath,
      ];
      for (const path of images.paths) args.push("--image", path);
      args.push("-");
      const result = await runProcess({
        ...base,
        args,
        stdin: input.prompt,
        timeoutMs,
      });
      receipt.exitCode = result.exitCode;
      receipt.signal = result.signal;
      receipt.stdoutSha256 = codexSha256(result.stdout);
      receipt.stderrSha256 = codexSha256(result.stderr);
      failProcess(result);
      let failedTurn = false,
        unexpectedTool = false;
      for (const line of result.stdout.split(/\r?\n/).filter((s) => s.trim())) {
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line);
        } catch {
          throw new CodexTransportError("codex-events-invalid");
        }
        if (
          event.type === "thread.started" &&
          typeof event.thread_id === "string" &&
          /^[\w-]{1,100}$/.test(event.thread_id)
        )
          receipt.threadId = event.thread_id;
        if (
          typeof event.model === "string" &&
          /^[\w./:-]{1,120}$/.test(event.model)
        ) {
          receipt.model = event.model;
          receipt.modelObserved = true;
        }
        if (event.type === "turn.failed" || event.type === "error")
          failedTurn = true;
        if (event.type === "item.completed" || event.type === "item.started") {
          const item = event.item as { type?: string } | undefined;
          if (item?.type && !["agent_message", "reasoning"].includes(item.type))
            unexpectedTool = true;
        }
        if (event.type === "turn.completed") {
          receipt.turnCompleted = true;
          const usage = event.usage as Record<string, unknown> | undefined;
          if (
            usage &&
            [
              usage.input_tokens,
              usage.cached_input_tokens,
              usage.output_tokens,
            ].every(
              (n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0,
            )
          ) {
            receipt.usage = {
              inputTokens: usage.input_tokens as number,
              cachedInputTokens: usage.cached_input_tokens as number,
              outputTokens: usage.output_tokens as number,
            };
          }
        }
      }
      if (failedTurn || !receipt.turnCompleted || !receipt.threadId)
        throw new CodexTransportError("codex-turn-incomplete");
      if (unexpectedTool)
        throw new CodexTransportError("codex-unexpected-tool-use");
      if ((await stat(receipt.outputPath)).size > MAX_OUTPUT)
        throw new CodexTransportError("codex-output-limit");
      const output = await readFile(receipt.outputPath, "utf8");
      receipt.outputSha256 = codexSha256(output);
      let value: unknown;
      try {
        value = JSON.parse(output);
      } catch {
        throw new CodexTransportError("codex-json-invalid");
      }
      if (!validator.safeParse(value).success)
        throw new CodexTransportError("codex-output-schema");
      receipt.schemaValid = true;
      receipt.status = "succeeded";
      receipt.elapsedMs = Date.now() - start;
      await writeFile(receipt.receiptPath, JSON.stringify(receipt, null, 2), {
        mode: 0o600,
      });
      return {
        value: value as T,
        auth: "chatgpt",
        threadId: receipt.threadId,
        model: receipt.model,
        usage: receipt.usage,
        elapsedMs: receipt.elapsedMs,
        receipt,
      };
    } catch (error) {
      receipt.elapsedMs = Date.now() - start;
      receipt.reason =
        error instanceof CodexTransportError
          ? error.code
          : "codex-operation-failed";
      await writeFile(receipt.receiptPath, JSON.stringify(receipt, null, 2), {
        mode: 0o600,
      });
      throw new CodexTransportError(receipt.reason, receipt);
    }
  };
}

export const runCodexJson = createCodexJsonRunner(spawnCodex);
