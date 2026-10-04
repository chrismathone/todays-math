import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminBranchLearning from "@/components/admin/AdminBranchLearning";
import type { AdminBranchLearningResponse } from "@/contracts/adminBranchLearning.contract";

const id = (n: number) =>
  `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const branchId = id(10);
const date = "2026-10-04T10:00:00.000Z";
const fetchMock = vi.fn<typeof fetch>();
const response = (): AdminBranchLearningResponse => ({
  kind: "students",
  meta: { page: 1, pageSize: 20, total: 1 },
  filters: { classes: [{ id: id(1), name: "수학반" }] },
  data: [
    {
      id: id(2),
      name: "김학생",
      grade: "중2",
      classId: id(1),
      useIndividualProgress: false,
      createdAt: date,
      updatedAt: date,
      sourceManaged: true,
      withdrawn: false,
      login: "enabled",
      account: {
        loginId: "kim",
        status: "enabled",
        issuedAt: date,
        lastLoginAt: null,
      },
      classes: [
        { id: id(1), name: "수학반", membership: "enrolled" },
        { id: id(3), name: "보충반", membership: "on-hold" },
      ],
    },
  ],
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState({}, "", "/");
  fetchMock.mockImplementation(async () => Response.json(response()));
});
afterEach(() => vi.unstubAllGlobals());
describe("branch learning directory", () => {
  it("keeps one student with multiple classes and builds scoped learning link", async () => {
    render(<AdminBranchLearning branchId={branchId} kind="students" />);
    expect(await screen.findByRole("row", { name: /김학생/ })).toBeVisible();
    expect(screen.getAllByRole("row", { name: /김학생/ })).toHaveLength(1);
    expect(screen.getByText("보충반 · 휴원")).toBeVisible();
    expect(screen.getByRole("link", { name: "학습 설정" })).toHaveAttribute(
      "href",
      `/admin/math-srs?branchId=${branchId}&classId=${id(1)}&studentId=${id(2)}`,
    );
  });
  it("starts class-specific navigation scoped and keeps options when search has no matches", async () => {
    window.history.replaceState({}, "", `/?classId=${id(1)}`);
    render(<AdminBranchLearning branchId={branchId} kind="students" />);
    await screen.findByText("김학생");
    expect(
      new URL(
        String(fetchMock.mock.calls[0]![0]),
        "http://localhost",
      ).searchParams.get("classId"),
    ).toBe(id(1));
    fetchMock.mockResolvedValue(
      Response.json({
        ...response(),
        data: [],
        meta: { page: 1, pageSize: 20, total: 0 },
      }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "없음" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText("조건에 맞는 항목이 없습니다.");
    expect(screen.getByRole("combobox", { name: "반" })).toHaveValue(id(1));
    expect(screen.getByRole("option", { name: "수학반" })).toBeInTheDocument();
  });
  it("discards previous search rows if the new query is denied", async () => {
    render(<AdminBranchLearning branchId={branchId} kind="students" />);
    await screen.findByText("김학생");
    fetchMock.mockResolvedValue(
      Response.json({ error: { message: "조회 권한 없음" } }, { status: 403 }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "다른 학생" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("김학생")).not.toBeInTheDocument();
  });
  it("ignores a late response from a canceled query", async () => {
    let resolveOld!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    render(<AdminBranchLearning branchId={branchId} kind="students" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole("combobox", { name: "발급·사용 상태" }), {
      target: { value: "unissued" },
    });
    await screen.findByText("김학생");
    await act(async () =>
      resolveOld(
        Response.json({
          ...response(),
          data: [{ ...response().data[0], name: "이전 응답" }],
        }),
      ),
    );
    expect(screen.queryByText("이전 응답")).not.toBeInTheDocument();
    expect(screen.getByText("김학생")).toBeVisible();
  });
  it("shows server-clamped page after roster size decreases", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        ...response(),
        meta: { page: 1, pageSize: 20, total: 21 },
      }),
    );
    render(<AdminBranchLearning branchId={branchId} kind="students" />);
    await screen.findByText("김학생");
    fetchMock.mockResolvedValueOnce(
      Response.json({
        ...response(),
        meta: { page: 2, pageSize: 20, total: 21 },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("2 / 2");
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    await screen.findByText("1 / 1");
    expect(screen.getByText("1 / 1")).toBeVisible();
    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });
});
