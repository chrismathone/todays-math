import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentCoursePage from "@/app/learn/math-srs/page";
import StudentAlgebraPage from "@/app/learn/math-srs/algebra/page";
import StudentExplorersPage from "@/app/learn/math-explorers/page";
import { getStudentSession } from "@/lib/learn/studentRequest";

vi.mock("@/lib/learn/studentRequest", () => ({ getStudentSession: vi.fn() }));
vi.mock("@/components/math-srs/StudentCourseSrs", () => ({
  default: () => null,
}));
vi.mock("@/components/math-srs/StudentMathSrs", () => ({
  StudentMathSrs: () => null,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
beforeEach(() => vi.clearAllMocks());

describe.each([
  ["elementary course", StudentCoursePage],
  ["legacy algebra", StudentAlgebraPage],
  ["legacy concept entry", StudentExplorersPage],
] as const)("%s route", (_name, Page) => {
  it("requires a student account", async () => {
    vi.mocked(getStudentSession).mockResolvedValue(null);
    await expect(Page()).rejects.toThrow("redirect:/learn/login");
  });
  it("requires the initial password change", async () => {
    vi.mocked(getStudentSession).mockResolvedValue({
      mustChangePassword: true,
    } as NonNullable<Awaited<ReturnType<typeof getStudentSession>>>);
    await expect(Page()).rejects.toThrow("redirect:/learn/password");
  });
  it("opens the same expedition home for authenticated students", async () => {
    vi.mocked(getStudentSession).mockResolvedValue({
      mustChangePassword: false,
    } as NonNullable<Awaited<ReturnType<typeof getStudentSession>>>);
    await expect(Page()).rejects.toThrow("redirect:/learn");
  });
});
