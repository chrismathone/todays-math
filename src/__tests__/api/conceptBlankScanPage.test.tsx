import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mock.auth }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
import Page from "@/app/(main)/concept-blank/scan/page";
import ScanApp from "@/components/concept-blank/scan/ScanApp";
const query = {
  p: "00000000-0000-4000-8000-000000000001",
  page: "3",
  part: "student",
};
const call = (params: Record<string, string | string[]> = query) =>
  Page({ searchParams: Promise.resolve(params) });
beforeEach(() => mock.auth.mockResolvedValue(null));
describe("public QR landing and authenticated scan page", () => {
  it("shows login with an exact return destination without looking up questions", async () => {
    const html = renderToStaticMarkup(await call());
    expect(html).toContain("로그인 후 촬영");
    expect(html).toContain("returnTo=");
    expect(html).toContain("page%3D3");
    expect(html).not.toContain("답안 주인");
  });
  it("rejects answer-key and old/unissued links without mounting the student app", async () => {
    expect(
      renderToStaticMarkup(await call({ ...query, part: "key" })),
    ).toContain("채점표");
    expect(renderToStaticMarkup(await call({ code: "old" }))).toContain(
      "새로 발행",
    );
    expect(
      renderToStaticMarkup(await call({ ...query, p: [query.p, query.p] })),
    ).toContain("새로 발행");
  });
  it("preserves the QR through mandatory password change", async () => {
    mock.auth.mockResolvedValue({
      student: { studentId: "student", mustChangePassword: true },
    });
    await expect(call()).rejects.toThrow("REDIRECT /learn/password?returnTo=");
  });
  it("mounts authenticated students and approved teachers with the existing menu", async () => {
    mock.auth.mockResolvedValue({
      student: { studentId: "student", mustChangePassword: false },
    });
    expect((await call()).type).toBe(ScanApp);
    mock.auth.mockResolvedValue({
      user: {
        id: "teacher",
        role: "director",
        approvalStatus: "approved",
        menus: ["conceptBlank"],
      },
    });
    expect((await call()).type).toBe(ScanApp);
    mock.auth.mockResolvedValue({
      user: {
        id: "teacher",
        role: "director",
        approvalStatus: "approved",
        menus: [],
      },
    });
    await expect(call()).rejects.toThrow("NOT_FOUND");
  });
});
