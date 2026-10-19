import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readAiJson } from "@/components/unified/aiResponse";
import { CLIENT_LOG_ENDPOINT } from "@/contracts/errorLogValues";
import {
  CLIENT_REPORT_FLUSH_MS,
  installClientErrorLog,
  reportClientError,
} from "@/lib/errorLog/clientReporter";

const PREVIEW = "/dev/workspace-alignment?view=teacher#arithmetic";
let uninstall: () => void;
let network: ReturnType<typeof vi.fn>;
let beacon: ReturnType<typeof vi.fn>;
const originalFetch = window.fetch;

const report = (message: string) =>
  reportClientError({ kind: "client-exception", message });
const flush = () => vi.advanceTimersByTimeAsync(CLIENT_REPORT_FLUSH_MS + 10);
const messages = (body: string) =>
  (JSON.parse(body) as { events: { message: string }[] }).events.map(
    (event) => event.message,
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NODE_ENV", "development");
  window.history.replaceState(null, "", "/studio");
  network = vi.fn(async () => new Response(null, { status: 204 }));
  beacon = vi.fn(() => true);
  vi.stubGlobal("navigator", { sendBeacon: beacon });
  window.fetch = network as typeof fetch;
  uninstall = installClientErrorLog();
});

afterEach(() => {
  uninstall();
  window.fetch = originalFetch;
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("development workspace preview client logs", () => {
  it.each(["before preview", "on preview"])(
    "never queues fixture errors when installed %s; reporting resumes after navigation",
    async (installation) => {
      window.history.replaceState(null, "", PREVIEW);
      if (installation === "on preview") {
        uninstall();
        uninstall = installClientErrorLog();
      }
      // Preview replaces fetch after the root logger has captured the transport.
      const loggerFetch = window.fetch;
      const previewFetch = vi.fn(async () =>
        Response.json({ error: "예시 데이터가 없습니다." }, { status: 503 }),
      );
      window.fetch = previewFetch;
      await expect(readAiJson(await fetch("/api/studio/ai"))).rejects.toThrow();
      report("preview direct report");
      window.dispatchEvent(
        new ErrorEvent("error", { message: "preview error" }),
      );
      const rejection = new Event("unhandledrejection");
      Object.assign(rejection, { reason: "preview rejection" });
      window.dispatchEvent(rejection);

      expect(vi.getTimerCount()).toBe(0);
      await flush();
      window.dispatchEvent(new Event("pagehide"));
      expect(network).not.toHaveBeenCalled();
      expect(beacon).not.toHaveBeenCalled();

      // The root layout survives client navigation; do not permanently stop it.
      window.fetch = loggerFetch;
      window.history.replaceState(null, "", "/studio");
      report("real report after preview");
      await flush();
      expect(network).toHaveBeenCalledTimes(1);
      expect(network).toHaveBeenCalledWith(
        CLIENT_LOG_ENDPOINT,
        expect.objectContaining({ method: "POST", keepalive: true }),
      );
      expect(messages(network.mock.calls[0][1].body)).toEqual([
        "real report after preview",
      ]);
    },
  );

  it("defers a pending real-page batch while the timer fires in preview", async () => {
    report("real report before preview");
    window.history.replaceState(null, "", PREVIEW);
    await flush();
    expect(network).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    window.history.replaceState(null, "", "/studio");
    report("real report after preview");
    await flush();
    expect(network).toHaveBeenCalledTimes(1);
    expect(messages(network.mock.calls[0][1].body)).toEqual([
      "real report before preview",
      "real report after preview",
    ]);
  });

  it.each([
    ["pagehide", true],
    ["pagehide", false],
    ["visibilitychange", true],
    ["visibilitychange", false],
  ])(
    "blocks %s in preview (beacon accepts: %s), then resumes",
    (event, accepts) => {
      beacon.mockReturnValue(accepts);
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      const leave = () =>
        (event === "pagehide" ? window : document).dispatchEvent(
          new Event(event),
        );
      report("real report queued before navigation");
      window.history.replaceState(null, "", PREVIEW);
      leave();
      expect(beacon).not.toHaveBeenCalled();
      expect(network).not.toHaveBeenCalled();

      window.history.replaceState(null, "", "/studio");
      leave();
      expect(beacon).toHaveBeenCalledTimes(1);
      expect(messages(beacon.mock.calls[0][1])).toEqual([
        "real report queued before navigation",
      ]);
      expect(network).toHaveBeenCalledTimes(accepts ? 0 : 1);
      if (!accepts)
        expect(network).toHaveBeenCalledWith(
          CLIENT_LOG_ENDPOINT,
          expect.objectContaining({ method: "POST", keepalive: true }),
        );
    },
  );

  it.each([
    ["production", PREVIEW],
    ["test", PREVIEW],
    ["development", "/dev/workspace-alignment-other"],
    ["development", "/dev/other-preview"],
  ])("preserves reporting in %s on %s", async (environment, path) => {
    vi.stubEnv("NODE_ENV", environment);
    window.history.replaceState(null, "", path);
    report("normal report");
    await flush();
    expect(network).toHaveBeenCalledTimes(1);
    expect(messages(network.mock.calls[0][1].body)).toEqual(["normal report"]);
  });
});
