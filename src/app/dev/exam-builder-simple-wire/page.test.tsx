import { afterEach, expect, it, vi } from "vitest";

const { visible, connection, notFound } = vi.hoisted(() => ({
  visible: vi.fn(),
  connection: vi.fn(async () => {}),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/devPageAccess", () => ({ devPageVisible: visible }));
import Page from "./page";
import { SimpleWire } from "./SimpleWire";

afterEach(() => vi.clearAllMocks());

it("directorOnly 가드를 통과하지 못하면 시안 대신 notFound로 끝난다", async () => {
  visible.mockResolvedValue(false);
  await expect(Page()).rejects.toThrow("NOT_FOUND");
  expect(visible).toHaveBeenCalledWith({ directorOnly: true });
  expect(connection.mock.invocationCallOrder[0]).toBeLessThan(
    visible.mock.invocationCallOrder[0],
  );
  expect(notFound).toHaveBeenCalledOnce();
});

it("가드가 허용하면 독립 Wire를 반환한다", async () => {
  visible.mockResolvedValue(true);
  expect((await Page()).type).toBe(SimpleWire);
  expect(notFound).not.toHaveBeenCalled();
});
