import { afterEach, expect, it, vi } from "vitest";

const { connection, notFound } = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/commercial-workbooks/CommercialWorkbookDemo", () => ({
  default: () => null,
}));
import Page from "@/app/dev/commercial-workbooks/page";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("closes the fixture in production even when legacy render QA is enabled", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ENABLE_RENDER_QA", "1");
  await expect(Page()).rejects.toThrow("NOT_FOUND");
  expect(connection).toHaveBeenCalledOnce();
  expect(notFound).toHaveBeenCalledOnce();
});

it("renders the isolated demo in development", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(await Page()).toBeTruthy();
  expect(notFound).not.toHaveBeenCalled();
});
