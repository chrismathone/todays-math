/**
 * 사진 읽기 측정 — 지시문 판 · 모델 · 생각 강도를 바꿔 가며 구독 CLI 로 읽힌다(유료 API 를 부르지 않는다).
 *
 *   node scripts/qa/english-read-bench/run.mjs --photos <폴더> --out <폴더> --prompt <지시문.txt> --tag <판 이름>
 *                 --arms sonnet,gemini-low --run 1 [--jobs 3] [--only 이름] [--verify <대조 지시문.txt>]
 *
 * 결과: <out>/<arm>@<tag>/run<N>/<사진>.txt (+ .json — 걸린 시간 · 실제로 쓰인 모델).
 * `--verify` — 한 번 읽은 글을 사진과 다시 대조시키는 둘째 호출을 붙인다(값이 두 배). 첫 글은 .pass1.txt 로 남는다.
 *
 * 팔: sonnet(claude CLI 의 Sonnet — 사진을 메시지에 바로 싣는다) · gemini-low|medium|high(Antigravity CLI —
 * 에이전트의 파일 보기 도구로 사진을 연다. 머리말 한 줄이 그 길을 시킨다 — 제품 지시문의 일부가 아니다).
 */
import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const flags = {};
for (let i = 2; i < process.argv.length; i += 2)
  flags[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const {
  photos: photoDir,
  out: outDir,
  prompt: promptFile,
  tag,
  arms: armsArg = "sonnet,gemini-low",
  run: runNo = "1",
  jobs = "3",
  only = "",
  verify: verifyFile = "",
} = flags;
if (!photoDir || !outDir || !promptFile || !tag)
  throw new Error("--photos --out --prompt --tag 가 있어야 한다");
const PROMPT = readFileSync(promptFile, "utf8").trim();
const VERIFY = verifyFile ? readFileSync(verifyFile, "utf8").trim() : "";
const SYSTEM = "사용자의 요청에 답합니다.";

const HOME = os.homedir();
const CLAUDE = path.join(HOME, ".local", "bin", "claude.exe");
const AGY = path.join(
  process.env.LOCALAPPDATA ?? path.join(HOME, "AppData", "Local"),
  "agy",
  "bin",
  "agy.exe",
);

/** 이 세션에 붙는 환경변수는 물려주지 않는다 — 자식 CLI 가 오르카 · 이 대화에 신호를 보내지 않게 */
function childEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env))
    if (!/^(ORCA_|CLAUDE_CODE_|CLAUDECODE$|CLAUDE_PID$)/.test(key))
      env[key] = value;
  return { ...env, NO_COLOR: "1" };
}

function run(file, args, { input, cwd, timeoutMs = 8 * 60_000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      env: childEnv(),
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`시간 초과 ${timeoutMs}ms`));
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
    child.stdin.end(input ?? "", "utf8");
  });
}

async function claude(model, photo, cwd, prompt, effort) {
  const message = {
    type: "user",
    message: {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: readFileSync(photo).toString("base64"),
          },
        },
        { type: "text", text: prompt },
      ],
    },
  };
  const r = await run(
    CLAUDE,
    [
      "-p",
      "--model",
      model,
      ...(effort ? ["--effort", effort] : []),
      "--tools",
      "",
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
      "--disable-slash-commands",
      "--no-session-persistence",
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--verbose",
      "--system-prompt",
      SYSTEM,
    ],
    { input: JSON.stringify(message) + "\n", cwd },
  );
  const result = r.stdout
    .split(/\r?\n/)
    .filter((line) => line.startsWith("{"))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .find((line) => line?.type === "result");
  if (!result || result.is_error !== false || typeof result.result !== "string")
    throw new Error(
      "claude 오류: " + (r.stdout.slice(-600) || r.stderr.slice(-600)),
    );
  return {
    text: result.result,
    models: Object.keys(result.modelUsage ?? {}),
    apiMs: result.duration_api_ms,
  };
}

async function agy(model, photo, cwd, prompt) {
  const file = path.join(cwd, "photo.jpg");
  if (!existsSync(file)) copyFileSync(photo, file);
  const r = await run(
    AGY,
    [
      "-p",
      `명령(셸)을 실행하지 말고, 파일 보기 도구로 ${file} 를 열어 본 뒤 아래 지시를 따르세요.\n\n${prompt}`,
      "--model",
      model,
      "--output-format",
      "json",
      "--print-timeout",
      "420s",
    ],
    { cwd },
  );
  const start = r.stdout.indexOf("{");
  if (start < 0)
    throw new Error(
      "agy 출력 없음: " + (r.stderr.slice(-600) || r.stdout.slice(-600)),
    );
  const out = JSON.parse(r.stdout.slice(start));
  if (
    out.status !== "SUCCESS" ||
    typeof out.response !== "string" ||
    !out.response.trim() ||
    out.denied_actions?.length
  )
    throw new Error("agy 오류: " + JSON.stringify(out).slice(0, 600));
  return {
    text: out.response,
    models: [model],
    apiMs: Math.round((out.duration_seconds ?? 0) * 1000),
    usage: out.usage,
  };
}

const ARMS = {
  sonnet: (...a) => claude("sonnet", ...a),
  // 운영 API 는 Sonnet 을 생각 없이 부른다(`api.ts` — temperature 0) — 가장 가까운 것이 낮은 강도다
  "sonnet-low": (...a) => claude("sonnet", ...a, "low"),
  opus: (...a) => claude("opus", ...a),
  // 운영 서버의 허용 목록에 이미 있는 Opus(작업실이 쓰던 것) — CLI 의 별칭 opus 는 5.5 다
  opus5: (...a) => claude("claude-opus-5", ...a),
  "opus-low": (...a) => claude("opus", ...a, "low"),
  haiku: (...a) => claude("haiku", ...a),
  "gemini-low": (...a) => agy("gemini-3.8-flash-low", ...a),
  "gemini-medium": (...a) => agy("gemini-3.8-flash-medium", ...a),
  "gemini-high": (...a) => agy("gemini-3.8-flash-high", ...a),
  "gemini-pro-low": (...a) => agy("gemini-3.1-pro-low", ...a),
  "gemini-pro-high": (...a) => agy("gemini-3.1-pro-high", ...a),
};

async function one(arm, photo) {
  const stem = path.basename(photo, ".jpg");
  const dir = path.join(outDir, `${arm}@${tag}`, `run${runNo}`);
  mkdirSync(dir, { recursive: true });
  const textFile = path.join(dir, `${stem}.txt`);
  if (existsSync(textFile)) return `${arm} ${stem} (있음)`;
  const cwd = mkdtempSync(path.join(os.tmpdir(), "readbench-"));
  const started = Date.now();
  try {
    let result = await ARMS[arm](photo, cwd, PROMPT);
    let pass1Ms;
    if (VERIFY) {
      pass1Ms = Date.now() - started;
      writeFileSync(path.join(dir, `${stem}.pass1.txt`), result.text, "utf8");
      result = await ARMS[arm](
        photo,
        cwd,
        `${VERIFY}\n\n[지시문]\n${PROMPT}\n\n[옮긴 글]\n${result.text.trim()}`,
      );
    }
    const ms = Date.now() - started;
    writeFileSync(textFile, result.text, "utf8");
    writeFileSync(
      path.join(dir, `${stem}.json`),
      JSON.stringify({ ...result, text: undefined, ms, pass1Ms }, null, 2),
      "utf8",
    );
    return `${arm} ${stem} ${ms}ms ${result.text.length}자`;
  } catch (error) {
    writeFileSync(
      path.join(dir, `${stem}.error.txt`),
      String(error?.message ?? error),
      "utf8",
    );
    return `${arm} ${stem} 실패: ${String(error?.message ?? error).slice(0, 200)}`;
  } finally {
    // CLI 가 임시 폴더를 잠깐 더 쥐고 있을 때가 있다(EBUSY) — 못 지워도 측정을 죽이지 않는다
    await rm(cwd, { recursive: true, force: true }).catch(() => undefined);
  }
}

const photos = readdirSync(photoDir)
  .filter((name) => name.endsWith(".jpg") && (!only || name.includes(only)))
  .sort()
  .map((name) => path.join(photoDir, name));
const queue = [];
for (const photo of photos)
  for (const arm of armsArg.split(",")) queue.push([arm, photo]);
let next = 0;
await Promise.all(
  Array.from({ length: Number(jobs) }, async () => {
    while (next < queue.length) {
      const [arm, photo] = queue[next++];
      console.log(await one(arm, photo));
    }
  }),
);
console.log("끝");
