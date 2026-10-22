import { vi } from "vitest";
// No request may escape, including an unexpected provider or renderer path.
vi.stubGlobal("fetch", () => {
  throw new Error("Offline harness: network forbidden");
});
vi.mock("node:http", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  request: () => {
    throw new Error("Offline harness: HTTP forbidden");
  },
  get: () => {
    throw new Error("Offline harness: HTTP forbidden");
  },
}));
vi.mock("node:https", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  request: () => {
    throw new Error("Offline harness: HTTPS forbidden");
  },
  get: () => {
    throw new Error("Offline harness: HTTPS forbidden");
  },
}));
vi.mock("@/lib/export/pdfServer", () => ({
  launchExportBrowser: () => {
    throw new Error("Offline harness: browser forbidden");
  },
}));
