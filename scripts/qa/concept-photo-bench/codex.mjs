import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Subscription-only invocation: uses existing ChatGPT login, never an API key. */
export async function callCodex({
  model,
  effort = "medium",
  prompt,
  imagePath,
  workDir,
  outputPrefix,
  timeoutMs = 180000,
}) {
  await mkdir(workDir, { recursive: true });
  await mkdir(path.dirname(outputPrefix), { recursive: true });
  const cli =
    process.env.PHOTO_BENCH_CODEX_CLI ||
    path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData/Roaming"),
      "npm/node_modules/@openai/codex/bin/codex.js",
    );
  const last = `${outputPrefix}.last.txt`;
  const args = [
    cli,
    "exec",
    "-m",
    model,
    "-c",
    `model_reasoning_effort="${effort}"`,
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
    last,
  ];
  if (imagePath) args.push("--image", imagePath);
  args.push("-");
  const env = { ...process.env, NO_COLOR: "1" };
  delete env.OPENAI_API_KEY;
  const start = performance.now();
  const raw = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: workDir,
      windowsHide: true,
      env,
    });
    let stdout = "",
      stderr = "",
      timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (d) => {
      stdout += d;
    });
    child.stderr.setEncoding("utf8").on("data", (d) => {
      stderr += d;
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut });
    });
    child.stdin.end(prompt, "utf8");
  });
  const ms = Math.round(performance.now() - start);
  await writeFile(`${outputPrefix}.events.jsonl`, raw.stdout);
  await writeFile(`${outputPrefix}.stderr.txt`, raw.stderr);
  if (raw.timedOut || raw.code !== 0)
    throw new Error(
      `Codex ${raw.timedOut ? "timeout" : `exit ${raw.code}`}; see ${outputPrefix}.stderr.txt`,
    );
  const events = raw.stdout.split(/\r?\n/).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  const usage = events.findLast((e) => e.type === "turn.completed")?.usage;
  return {
    text: await readFile(last, "utf8"),
    ms,
    usage,
    model,
    effort,
    transport:
      "codex exec with initial image attachment; existing ChatGPT subscription",
    modelVerification:
      "requested CLI model; backend identity not independently observable",
  };
}
