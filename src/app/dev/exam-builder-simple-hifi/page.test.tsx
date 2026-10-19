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
import { SimpleHifi } from "./SimpleHifi";

afterEach(() => vi.clearAllMocks());

it("connection 뒤 directorOnly 가드가 거절하면 화면을 반환하지 않는다", async () => {
  visible.mockResolvedValue(false);
  await expect(Page()).rejects.toThrow("NOT_FOUND");
  expect(visible).toHaveBeenCalledWith({ directorOnly: true });
  expect(connection.mock.invocationCallOrder[0]).toBeLessThan(
    visible.mock.invocationCallOrder[0],
  );
  expect(notFound).toHaveBeenCalledOnce();
});

it("가드가 허용하면 독립 Hi-fi만 반환한다", async () => {
  visible.mockResolvedValue(true);
  expect((await Page()).type).toBe(SimpleHifi);
  expect(notFound).not.toHaveBeenCalled();
});
