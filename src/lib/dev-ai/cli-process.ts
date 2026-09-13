import { spawn } from "node:child_process";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface CliExecutable {
  command: string;
  prefix: string[];
}

// Child environments are sparse dictionaries. Next's required application
// NODE_ENV declaration does not apply to an isolated external CLI.
export type CliEnvironment = Record<string, string | undefined>;

export class SubscriptionCliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SubscriptionCliError";
  }
}

export function abortError(): SubscriptionCliError {
  return new SubscriptionCliError(
    "cancelled",
    "구독 CLI 요청이 취소되었습니다.",
  );
}

// Allow only OS/runtime necessities and existing credential-store locations.
// In particular: no API keys, OAuth token overrides, custom endpoints, proxies,
// cloud-provider credentials, NODE_OPTIONS, or parent IDE/plugin control env.
const ENV_ALLOW =
  /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|SYSTEMDRIVE|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|COMMONPROGRAMFILES|LANG|LC_ALL|LC_CTYPE|CODEX_HOME|CLAUDE_CONFIG_DIR|XDG_CONFIG_HOME|XDG_DATA_HOME|XDG_RUNTIME_DIR|DBUS_SESSION_BUS_ADDRESS)$/i;

export function subscriptionEnvironment(
  source: CliEnvironment,
): CliEnvironment {
  const env: CliEnvironment = {};
  for (const [key, value] of Object.entries(source)) {
    if (ENV_ALLOW.test(key) && value !== undefined) env[key] = value;
  }
  const codexProfile = source.DEV_AI_CODEX_HOME?.trim();
  if (codexProfile) {
    if (!path.isAbsolute(codexProfile))
      throw new SubscriptionCliError(
        "invalid-config",
        "DEV_AI_CODEX_HOME에는 기존 Codex 로그인 프로필의 절대 경로를 지정해야 합니다.",
      );
    for (const key of Object.keys(env))
      if (key.toUpperCase() === "CODEX_HOME") delete env[key];
    env.CODEX_HOME = codexProfile;
  }
  env.NO_COLOR = "1";
  env.CI = "1";
  env.DISABLE_AUTOUPDATER = "1";
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  return env;
}

export function envValue(
  env: CliEnvironment,
  name: string,
): string | undefined {
  return Object.entries(env).find(
    ([key]) => key.toUpperCase() === name.toUpperCase(),
  )?.[1];
}

/** A bounded FIFO shared by probes and generation, including abortable waiters. */
export class ProcessSlots {
  private active = 0;
  private waiting: Array<() => void> = [];

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) throw abortError();
    if (this.active >= 2) {
      if (this.waiting.length >= 8) {
        throw new SubscriptionCliError(
          "busy",
          "구독 CLI가 다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.",
        );
      }
      await new Promise<void>((resolve, reject) => {
        const resume = () => {
          signal?.removeEventListener("abort", cancel);
          resolve();
        };
        const cancel = () => {
          this.waiting = this.waiting.filter((entry) => entry !== resume);
          reject(abortError());
        };
        this.waiting.push(resume);
        signal?.addEventListener("abort", cancel, { once: true });
      });
      // The released slot is transferred to this waiter, not made available.
    } else {
      this.active++;
    }
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    };
    if (signal?.aborted) {
      release();
      throw abortError();
    }
    return release;
  }
}

const slots = new ProcessSlots();

export function treeKillInvocation(
  pid: number,
  systemRoot: string,
): CliExecutable & { args: string[] } {
  if (!Number.isSafeInteger(pid) || pid <= 0)
    throw new Error("Invalid owned process ID.");
  return {
    command: path.win32.join(systemRoot, "System32", "taskkill.exe"),
    prefix: [],
    args: ["/PID", String(pid), "/T", "/F"],
  };
}

async function killTree(pid: number, env: CliEnvironment): Promise<void> {
  if (process.platform !== "win32") {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
    return;
  }
  const systemRoot = envValue(env, "SYSTEMROOT");
  if (!systemRoot || !path.isAbsolute(systemRoot))
    throw new Error("Missing Windows system path.");
  const invocation = treeKillInvocation(pid, systemRoot);
  await new Promise<void>((resolve, reject) => {
    const killer = spawn(invocation.command, invocation.args, {
      shell: false,
      windowsHide: true,
      stdio: "ignore",
      env: env as NodeJS.ProcessEnv,
    });
    const timer = setTimeout(() => {
      killer.kill();
      reject(new Error("Tree termination timed out."));
    }, 5_000);
    killer.once("error", () => {
      clearTimeout(timer);
      reject(new Error("Tree termination failed."));
    });
    killer.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error("Tree termination was not confirmed."));
    });
  });
}

export interface CliProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function runCliProcess(
  executable: CliExecutable,
  args: string[],
  options: {
    cwd: string;
    env: CliEnvironment;
    input?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    maxBytes?: number;
  },
): Promise<CliProcessResult> {
  const release = await slots.acquire(options.signal);
  let unconfirmed = false;
  try {
    if (options.signal?.aborted) throw abortError();
    return await new Promise<CliProcessResult>((resolve, reject) => {
      const child = spawn(executable.command, [...executable.prefix, ...args], {
        cwd: options.cwd,
        env: options.env as NodeJS.ProcessEnv,
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let size = 0;
      let failure: SubscriptionCliError | undefined;
      let termination: Promise<void> | undefined;
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", cancel);
      };
      const fail = (error: SubscriptionCliError) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const stop = (error: SubscriptionCliError) => {
        if (failure || settled) return;
        failure = error;
        if (child.pid) {
          termination = killTree(child.pid, options.env);
          void termination.catch(() =>
            fail(
              new SubscriptionCliError(
                "termination-unconfirmed",
                "CLI 프로세스 종료를 확인하지 못해 임시 파일을 보존했습니다.",
              ),
            ),
          );
        }
      };
      const cancel = () => stop(abortError());
      const timer = setTimeout(
        () =>
          stop(
            new SubscriptionCliError(
              "timeout",
              "구독 CLI 응답 대기 시간이 초과되었습니다.",
            ),
          ),
        options.timeoutMs ?? 120_000,
      );
      options.signal?.addEventListener("abort", cancel, { once: true });
      const collect = (target: Buffer[], chunk: Buffer) => {
        size += chunk.length;
        if (size > (options.maxBytes ?? 2 * 1024 * 1024)) {
          stop(
            new SubscriptionCliError(
              "output-limit",
              "구독 CLI 응답이 허용된 출력 크기를 초과했습니다.",
            ),
          );
        } else if (!failure) target.push(chunk);
      };
      child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
      child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
      // EPIPE is normal when a CLI rejects arguments before consuming stdin.
      child.stdin.on("error", () => {});
      child.once("error", () =>
        fail(
          new SubscriptionCliError(
            "launch-failed",
            "구독 CLI를 실행하지 못했습니다.",
          ),
        ),
      );
      child.once("close", (exitCode) => {
        void (async () => {
          try {
            await termination;
          } catch {
            return;
          }
          if (settled) return;
          if (failure) {
            fail(failure);
            return;
          }
          settled = true;
          cleanup();
          resolve({
            stdout: Buffer.concat(stdout).toString("utf8"),
            stderr: Buffer.concat(stderr).toString("utf8"),
            exitCode,
          });
        })();
      });
      if (options.signal?.aborted) cancel();
      child.stdin.end(options.input ?? "");
    });
  } catch (error) {
    unconfirmed =
      error instanceof SubscriptionCliError &&
      error.code === "termination-unconfirmed";
    throw error;
  } finally {
    // An unconfirmed live tree still consumes capacity; don't exceed the cap.
    if (!unconfirmed) release();
  }
}

/** Only the directory returned by mkdtemp is eligible for recursive cleanup. */
export async function withCliTemp<T>(
  operation: (cwd: string) => Promise<T>,
): Promise<T> {
  const parent = await realpath(tmpdir());
  const cwd = await mkdtemp(path.join(parent, "today-math-subscription-"));
  let preserve = false;
  try {
    return await operation(cwd);
  } catch (error) {
    preserve =
      error instanceof SubscriptionCliError &&
      error.code === "termination-unconfirmed";
    throw error;
  } finally {
    if (
      !preserve &&
      path.dirname(path.resolve(cwd)) === parent &&
      path.basename(cwd).startsWith("today-math-subscription-")
    ) {
      await rm(cwd, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
    }
  }
}
