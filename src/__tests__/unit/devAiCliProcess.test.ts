// @vitest-environment node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ProcessSlots,
  runCliProcess,
  subscriptionEnvironment,
  withCliTemp,
} from "../../lib/dev-ai/cli-process";

const executable = { command: process.execPath, prefix: [] };
const env = subscriptionEnvironment(process.env);

describe("owned subscription subprocess lifecycle", () => {
  it("bounds concurrent processes and removes cancelled queued requests", async () => {
    const slots = new ProcessSlots();
    const first = await slots.acquire();
    const second = await slots.acquire();
    const abort = new AbortController();
    const cancelled = slots
      .acquire(abort.signal)
      .catch((error: Error) => error);
    const waiting = slots.acquire();
    abort.abort();
    expect(await cancelled).toMatchObject({ code: "cancelled" });
    first();
    const third = await waiting;
    first(); // releases are idempotent
    second();
    third();
    const final = await slots.acquire();
    final();
  });
  it("returns byte-safe UTF-8 and deletes only its owned temporary directory", async () => {
    let used = "";
    const output = await withCliTemp(async (cwd) => {
      used = cwd;
      expect(path.dirname(cwd)).not.toBe(process.cwd());
      return runCliProcess(
        executable,
        ["-e", 'process.stdin.on("data", c => process.stdout.write(c))'],
        { cwd, env, input: "수학 2 + 2\n" },
      );
    });
    expect(output.stdout).toBe("수학 2 + 2\n");
    await expect(access(used)).rejects.toThrow();
  });
  it("terminates on output overflow and time limit without leaking raw output", async () => {
    await withCliTemp(async (cwd) => {
      await expect(
        runCliProcess(
          executable,
          [
            "-e",
            'setInterval(() => process.stdout.write("x".repeat(2048)), 10)',
          ],
          { cwd, env, maxBytes: 1000 },
        ),
      ).rejects.toMatchObject({ code: "output-limit" });
      await expect(
        runCliProcess(executable, ["-e", "setInterval(() => {}, 1000)"], {
          cwd,
          env,
          timeoutMs: 300,
        }),
      ).rejects.toMatchObject({ code: "timeout" });
    });
  });
  it("cancels both the owned parent and its live descendant before cleanup", async () => {
    await withCliTemp(async (cwd) => {
      const abort = new AbortController();
      const pidFile = path.join(cwd, "child.pid");
      const script =
        'const {spawn}=require("node:child_process");const fs=require("node:fs");const child=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore",windowsHide:true});fs.writeFileSync(process.argv[1],String(child.pid));setInterval(()=>{},1000);';
      const running = runCliProcess(executable, ["-e", script, pidFile], {
        cwd,
        env,
        signal: abort.signal,
        timeoutMs: 10_000,
      }).catch((error: Error) => error);
      let pid = 0;
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          pid = Number(await readFile(pidFile, "utf8"));
          if (pid) break;
        } catch {
          /* child starting */
        }
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      abort.abort();
      expect(await running).toMatchObject({ code: "cancelled" });
      expect(pid).toBeGreaterThan(0);
      expect(() => process.kill(pid, 0)).toThrow();
    });
  });
  it("does not launch an already-cancelled request", async () => {
    const abort = new AbortController();
    abort.abort();
    await withCliTemp(async (cwd) => {
      await expect(
        runCliProcess({ command: "this-must-not-launch", prefix: [] }, [], {
          cwd,
          env,
          signal: abort.signal,
        }),
      ).rejects.toMatchObject({ code: "cancelled" });
    });
  });
});
