import { vi } from "vitest";

// A future regression must fail here instead of silently spending subscription/API usage.
vi.mock("node:child_process", () => {
  const forbidden = () => {
    throw new Error("live-process-forbidden-in-codex-unit-tests");
  };
  return {
    spawn: forbidden,
    spawnSync: forbidden,
    exec: forbidden,
    execFile: forbidden,
    execSync: forbidden,
    execFileSync: forbidden,
    fork: forbidden,
  };
});
