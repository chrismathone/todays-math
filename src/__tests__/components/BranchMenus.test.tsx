import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BranchMenus from "@/components/branch/BranchMenus";
import { branchOwnerMenuItems } from "@/contracts/branchOwnerMenus.contract";

const branchId = "20000000-0000-4000-8000-000000000002";
const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const data = (revision: number, owner: string[] = []) => ({
  revision,
  items: branchOwnerMenuItems(["textbook"], owner, branchId),
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("지점관리 → 사용 메뉴", () => {
  it("열리지 않은 메뉴는 켤 수 없고, 바꾼 것만 저장한다", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: data(3) }));
    render(<BranchMenus />);
    const textbook = await screen.findByLabelText("교재 제작");
    expect(textbook).toBeDisabled();
    expect(screen.getAllByText("열리지 않음")).toHaveLength(1);
    const save = screen.getByRole("button", { name: "사용 메뉴 저장" });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByLabelText("문제 추출"));
    expect(
      screen.getByText(/저장하지 않은 변경이 있습니다/),
    ).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(json({ data: data(4, ["studio"]) }));
    fireEvent.click(save);
    await screen.findByText("지점 사용 메뉴를 저장했습니다.");
    const body = JSON.parse(String(fetchMock.mock.calls[1]![1]!.body));
    expect(body.expectedMenuRevision).toBe(3);
    expect(body.menus).not.toContain("studio");
    expect(body.menus).not.toContain("textbook");
  });

  it("다른 곳(에이와 포함)에서 먼저 바꿨으면 409를 알리고 최신 설정을 불러온다", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: data(3) }));
    render(<BranchMenus />);
    fireEvent.click(await screen.findByLabelText("연산대장"));
    fetchMock.mockResolvedValueOnce(
      json(
        { error: { message: "다른 곳에서 지점 메뉴를 변경했습니다." } },
        409,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "사용 메뉴 저장" }));
    const reload = await screen.findByRole("button", {
      name: "최신 설정 불러오기",
    });
    fetchMock.mockResolvedValueOnce(json({ data: data(5, ["bank"]) }));
    fireEvent.click(reload);
    await screen.findByText("최신 지점 설정을 불러왔습니다.");
    await waitFor(() =>
      expect(screen.getByLabelText("시험지 만들기")).not.toBeChecked(),
    );
  });
});
