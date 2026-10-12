import { afterEach, expect, it, vi } from "vitest";

const { connection, notFound } = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("./ExamBuilderOutput", () => ({ default: () => null }));
import Page from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("awaits a connection then rejects production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  await expect(Page()).rejects.toThrow("NOT_FOUND");
  expect(connection).toHaveBeenCalledOnce();
  expect(notFound).toHaveBeenCalledOnce();
  expect(connection.mock.invocationCallOrder[0]).toBeLessThan(
    notFound.mock.invocationCallOrder[0],
  );
});

it("renders the client only in development", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(await Page()).toBeTruthy();
  expect(notFound).not.toHaveBeenCalled();
});
