// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ after: vi.fn(), find: vi.fn(), configs: vi.fn(), request: vi.fn() }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/db", () => ({ db: { test: { findUnique: mocks.find } } }));
vi.mock("@/lib/eywa/managedTransport", () => ({ bindingConfigs: mocks.configs, sourceRequest: mocks.request }));
import { RESULTS_WAKE_PATH, wakeEywaResults } from "@/lib/eywa/resultsWake";

const config = { bindingId: "binding" };
const run = async () => {
  wakeEywaResults("test");
  await mocks.after.mock.calls.at(-1)?.[0]();
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.configs.mockReturnValue([config]);
  mocks.find.mockResolvedValue({ predictionRunId: null, class: { eywaBindingId: "binding" } });
});

describe("aywa results wake (2026-10-17)", () => {
  it("signals the fixed binding after the response, with no result content", async () => {
    await run();
    expect(mocks.request).toHaveBeenCalledWith(config, "control", RESULTS_WAKE_PATH, { bindingId: "binding" });
  });
  it("skips unlinked classes, prediction papers and unconfigured bindings", async () => {
    mocks.find.mockResolvedValueOnce({ predictionRunId: null, class: { eywaBindingId: null } });
    await run();
    mocks.find.mockResolvedValueOnce({ predictionRunId: "run", class: { eywaBindingId: "binding" } });
    await run();
    mocks.configs.mockReturnValueOnce([]);
    await run();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("never throws into grading — outages and calls outside a request are swallowed", async () => {
    mocks.request.mockRejectedValueOnce(new Error("source_unavailable"));
    await expect(run()).resolves.toBeUndefined();
    mocks.after.mockImplementationOnce(() => { throw new Error("outside request scope"); });
    expect(() => wakeEywaResults("test")).not.toThrow();
  });
});
