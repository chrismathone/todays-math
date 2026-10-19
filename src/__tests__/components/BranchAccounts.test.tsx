import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BranchAccounts from "@/components/branch/BranchAccounts";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));
vi.mock("@/components/class/BulkStudentAccountButton", () => ({
  default: () => <button type="button">발급 대상 확인</button>,
}));

const staff = [
  {
    id: "owner",
    name: "김원장",
    email: "owner@example.test",
    branchRole: "owner",
  },
  {
    id: "teacher",
    name: "이강사",
    email: "teacher@example.test",
    branchRole: "teacher",
  },
];
const classes = [
  {
    id: "class-a",
    name: "중등 수학 A반",
    grade: "중1",
    userId: "owner",
    user: { name: "김원장" },
    _count: { students: 101 },
  },
  {
    id: "class-b",
    name: "B반",
    grade: "중2",
    userId: "teacher",
    user: { name: "이강사" },
    _count: { students: 1 },
  },
];
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
    const url = new URL(input, "http://localhost");
    if (init?.method === "PATCH") return Response.json({ data: {} });
    if (url.pathname === "/api/branch/accounts")
      return Response.json({ data: staff });
    if (url.pathname === "/api/branch/classes")
      return Response.json({ data: classes });
    if (url.pathname === "/api/branch/students") {
      const classId = url.searchParams.get("classId");
      const page = Number(url.searchParams.get("page"));
      return Response.json({
        data: [{ id: "student-a", name: "김학생", classId }],
        meta: { page, pageSize: 100, total: classId === "class-a" ? 101 : 1 },
      });
    }
    throw new Error(`Unexpected request: ${input}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("지점 계정과 반 배정 화면", () => {
  it("직원마다 이름·계정 유형·이메일을 같은 열에 표시하고 지점 경로로 학생을 읽는다", async () => {
    render(<BranchAccounts canCreateManagers section="accounts" />);
    const table = await screen.findByRole("table", { name: "지점 직원 목록" });
    await within(table).findByText("김원장");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["이름", "계정 유형", "이메일"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(
      within(rows[0])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["이름김원장", "계정 유형원장", "이메일owner@example.test"]);
    await screen.findByRole("button", { name: "김학생 · 계정 관리" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/branch/students?classId=class-a&page=1&pageSize=100",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).startsWith("/api/students"),
      ),
    ).toBe(false);
  });

  it("페이지 이동과 반 재선택도 지점 학생 경로를 사용한다", async () => {
    const user = userEvent.setup();
    render(<BranchAccounts canCreateManagers={false} section="accounts" />);
    await screen.findByRole("button", { name: "김학생 · 계정 관리" });
    await user.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("2 / 2 페이지");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/branch/students?classId=class-a&page=2&pageSize=100",
      { cache: "no-store" },
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "소속 반" }),
      "class-b",
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/branch/students?classId=class-b&page=1&pageSize=100",
        { cache: "no-store" },
      ),
    );
    await screen.findByText("선택한 반 학생 1명");
  });

  it("담당 강사 목록은 네 열이며 강사 선택은 기존 배정 API로 저장한다", async () => {
    const user = userEvent.setup();
    render(<BranchAccounts canCreateManagers section="classes" />);
    const table = await screen.findByRole("table", {
      name: "반 담당 강사 배정",
    });
    const teacher = await screen.findByRole("combobox", {
      name: "중등 수학 A반 담당 강사",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["반 이름", "학년", "학생 수", "담당 강사"]);
    expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    expect(
      screen.queryByRole("heading", { name: "학생 반 배정" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(teacher, "teacher");
    await screen.findByRole("status");
    expect(fetchMock).toHaveBeenCalledWith("/api/branch/classes/class-a", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: "teacher" }),
    });
  });

  it("학생 반 배정은 별도 영역에서 기존 학생 이동 동작을 유지한다", async () => {
    const user = userEvent.setup();
    render(<BranchAccounts canCreateManagers={false} section="students" />);
    await screen.findByRole("option", { name: "김학생" });
    expect(
      screen.queryByRole("table", { name: "반 담당 강사 배정" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "직원 계정 발급" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "학생" }),
      "student-a",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "옮길 반" }),
      "class-b",
    );
    await user.click(screen.getByRole("button", { name: "학생 배정" }));
    await screen.findByText("학생을 선택한 반에 배정했습니다.");
    expect(fetchMock).toHaveBeenCalledWith("/api/branch/students/student-a", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: "class-b" }),
    });
  });
});
