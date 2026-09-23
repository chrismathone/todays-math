import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentCoursePage from "@/app/learn/math-srs/page";
import StudentAlgebraPage from "@/app/learn/math-srs/algebra/page";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import { StudentMathSrs } from "@/components/math-srs/StudentMathSrs";
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
  ["elementary course", StudentCoursePage, StudentCourseSrs],
  ["legacy algebra", StudentAlgebraPage, StudentMathSrs],
] as const)("%s route", (_name, Page, Component) => {
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
  it("renders the designated practice for authenticated students", async () => {
    vi.mocked(getStudentSession).mockResolvedValue({
      mustChangePassword: false,
    } as NonNullable<Awaited<ReturnType<typeof getStudentSession>>>);
    expect((await Page()).type).toBe(Component);
  });
});
