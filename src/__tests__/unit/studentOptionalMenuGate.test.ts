// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  auth: vi.fn(),
  menus: vi.fn(),
  listening: vi.fn(),
}));
vi.mock("@/lib/english/listening/runtime/http", () => ({
  handleListeningHttp: f.listening,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: f.auth }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, run: unknown) => run,
}));
vi.mock("@/lib/learn/studentLearningMenusStore", () => ({
  getStudentLearningMenus: f.menus,
}));
import { requireStudent } from "@/lib/learn/studentRequest";
import { GET as lectures } from "@/app/api/learn/lectures/route";
import {
  GET as listening,
  POST as listeningWrite,
  HEAD as listeningHead,
} from "@/app/api/english/learn/listening/[[...path]]/route";
const student = {
  studentId: "student-a",
  accountId: "account-a",
  name: "학생",
  mustChangePassword: false,
};
beforeEach(() => {
  vi.resetAllMocks();
  f.auth.mockResolvedValue({ student });
  f.menus.mockResolvedValue({ enabled: [], updatedAt: null });
  f.listening.mockResolvedValue(Response.json({ data: "allowed" }));
});
describe("추가 메뉴의 라우트 자체 관문", () => {
  it("proxy를 거치지 않는 실제 강의 라우트도 기본 미허용 학생의 데이터는 읽지 않는다", async () => {
    expect((await lectures()).status).toBe(403);
  });
  it("영어 듣기는 기본으로 닫히며 별도로 허용한 학생만 기존 재생기에 도달한다", async () => {
    const request = new Request(
      "https://example.test/api/english/learn/listening",
    );
    const context = { params: Promise.resolve({ path: [] }) };
    f.menus.mockResolvedValue({ enabled: ["lectures", "textbook"] });
    for (const handler of [listening, listeningWrite, listeningHead])
      expect((await handler(request, context)).status).toBe(403);
    expect(f.listening).not.toHaveBeenCalled();
    f.menus.mockResolvedValue({ enabled: ["english-listening"] });
    expect((await listening(request, context)).status).toBe(200);
    expect(f.listening).toHaveBeenCalledWith(request, [], "student");
    f.auth.mockResolvedValue(null);
    expect((await listening(request, context)).status).toBe(401);
  });
  it("미허용 메뉴는 403이고 탐험은 설정을 읽지 않는다", async () => {
    const core = await requireStudent({ active: true });
    expect(core.response).toBeNull();
    expect(f.menus).not.toHaveBeenCalled();
    for (const menu of ["lectures", "textbook", "english-listening"] as const)
      expect(
        (await requireStudent({ active: true, menu })).response?.status,
      ).toBe(403);
  });
  it("학생별로 허용된 메뉴만 이용하고 설정을 삭제하면 다음 요청에서 닫힌다", async () => {
    f.menus.mockImplementation(async (id: string) => ({
      enabled: id === "student-a" ? ["lectures"] : [],
      updatedAt: null,
    }));
    expect(
      (await requireStudent({ active: true, menu: "lectures" })).response,
    ).toBeNull();
    expect(
      (await requireStudent({ active: true, menu: "textbook" })).response
        ?.status,
    ).toBe(403);
    f.auth.mockResolvedValue({
      student: { ...student, studentId: "student-b" },
    });
    expect(
      (await requireStudent({ active: true, menu: "lectures" })).response
        ?.status,
    ).toBe(403);
    f.auth.mockResolvedValue({ student });
    f.menus.mockResolvedValue({ enabled: [] });
    expect(
      (await requireStudent({ active: true, menu: "lectures" })).response
        ?.status,
    ).toBe(403);
  });
  it("로그인 전·교사·비밀번호 변경 전에는 설정을 읽지 않는다", async () => {
    for (const session of [
      null,
      { user: { id: "teacher" } },
      { student: { ...student, mustChangePassword: true } },
    ]) {
      f.auth.mockResolvedValue(session);
      expect(
        (await requireStudent({ active: true, menu: "lectures" })).response
          ?.status,
      ).toBe(session && "student" in session ? 403 : 401);
    }
    expect(f.menus).not.toHaveBeenCalled();
  });
  it("설정 저장소 장애 중에는 추가 메뉴를 허용하지 않는다", async () => {
    f.menus.mockRejectedValue(new Error("offline"));
    expect(
      (await requireStudent({ active: true, menu: "lectures" })).response
        ?.status,
    ).toBe(403);
  });
});
