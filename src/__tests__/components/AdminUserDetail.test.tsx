import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import AdminDocumentPreview from "@/components/admin/AdminDocumentPreview";
import { adminIdentity, pendingAccount } from "./adminFixtures";

const fetchMock = vi.fn<typeof fetch>();
const draft = {
  id: "draft-1",
  kind: "draft" as const,
  title: "중1 방정식 연습",
  revision: 2,
  createdAt: pendingAccount.createdAt,
  updatedAt: pendingAccount.updatedAt,
  payload: {
    problems: [
      {
        content: "다음 식을 계산하시오. $2+3$",
        answer: "5",
        solution: "두 수를 더합니다.",
        grade: "중1",
      },
    ],
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("administrator user detail", () => {
  it("shows the account immediately while detail requests are pending", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(
      <AdminUserDetail
        userId={pendingAccount.id}
        identity={adminIdentity}
        initialAccount={pendingAccount}
      />,
    );
    expect(
      screen.getByRole("heading", { name: pendingAccount.name, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("계정 정보를 불러오는 중입니다."),
    ).not.toBeInTheDocument();
  });

  it("focuses a selected document preview and closes it back to the document", async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes("/api/admin/branches"))
        return Response.json({ data: [] });
      if (String(url).includes("/documents/"))
        return Response.json({ data: draft });
      if (String(url).includes("/documents?"))
        return Response.json({
          data: [draft],
          meta: { page: 1, pageSize: 20, total: 1 },
        });
      return Response.json({ data: pendingAccount });
    });
    render(
      <AdminUserDetail userId={pendingAccount.id} identity={adminIdentity} />,
    );
    const trigger = await screen.findByRole("button", {
      name: /중1 방정식 연습/,
    });
    fireEvent.click(trigger);
    await screen.findByRole("heading", { name: "문항 1 중1" });
    const preview = screen.getByRole("region", { name: "자료 미리보기" });
    expect(preview).toHaveFocus();
    fireEvent.keyDown(preview, { key: "Escape" });
    expect(screen.getByText("살펴볼 자료를 선택하세요")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("reads private worksheets, renders math and switches to paginated audit records", async () => {
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes("/api/admin/branches"))
        return Response.json({ data: [] });
      if (path.includes("/documents/")) return Response.json({ data: draft });
      if (path.includes("/documents?"))
        return Response.json({
          data: [draft],
          meta: { page: 1, pageSize: 20, total: 21 },
        });
      if (path.includes("/audit?"))
        return Response.json({
          data: [
            {
              id: "audit-1",
              action: "material.saved",
              outcome: "success",
              actorName: "김하늘",
              createdAt: draft.updatedAt,
              details: { title: draft.title, revision: 2 },
            },
          ],
          meta: { page: 1, pageSize: 30, total: 31 },
        });
      return Response.json({ data: pendingAccount });
    });
    render(
      <AdminUserDetail userId={pendingAccount.id} identity={adminIdentity} />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /중1 방정식 연습/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "문항 1 중1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("두 수를 더합니다.")).toBeInTheDocument();
    expect(document.querySelector(".katex")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain(
        "documents?page=2",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 기록" }));
    await screen.findByText("자료 저장");
    expect(screen.getByText("완료")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain("audit?page=2"),
    );
    expect(
      fetchMock.mock.calls.every(
        ([, init]) => !init?.method || init.method === "GET",
      ),
    ).toBe(true);
  });

  it("previews extraction crops through protected admin assets and exposes image failures", () => {
    render(
      <AdminDocumentPreview
        userId={pendingAccount.id}
        document={{
          ...draft,
          kind: "extraction",
          payload: {
            data: {
              crops: [
                {
                  content: "추출한 문제",
                  image: "/api/library/assets/asset-1",
                  answer: "정답",
                  page: 3,
                },
              ],
            },
          },
        }}
      />,
    );
    const image = screen.getByRole("img", { name: "문항 1 원본" });
    expect(image).toHaveAttribute(
      "src",
      `/api/admin/users/${pendingAccount.id}/assets/asset-1`,
    );
    fireEvent.error(image);
    expect(
      screen.getByText(/이미지를 불러오지 못했습니다/),
    ).toBeInTheDocument();
    expect(screen.getByText("추출한 문제")).toBeInTheDocument();
    expect(screen.queryByText(/payload|crops/)).not.toBeInTheDocument();
  });

  // 26 §9 ⑾ — 개념 백지는 고르기만 담는다. «시험지 · 0문항»으로 읽히지 않게 소단원과 형식을 보인다.
  it("previews a saved concept blank as its sections and forms, not as an empty worksheet", () => {
    render(
      <AdminDocumentPreview
        userId={pendingAccount.id}
        document={{
          ...draft,
          kind: "conceptBlank",
          title: "합동 백지",
          payload: {
            selection: {
              sections: [
                "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기",
                "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
              ],
              forms: [
                {
                  form: "term",
                  counts: { 하: 10, 중: 10, 상: 10 },
                  extras: { 하: 10, 중: 0, 상: 0 },
                },
              ],
            },
          },
        }}
      />,
    );
    expect(screen.getByText(/개념 백지 · 읽기 전용/)).toBeInTheDocument();
    expect(screen.getByText("2-3-1 도형의 합동 알아보기")).toBeInTheDocument();
    expect(screen.getByText(/용어 → 뜻/)).toBeInTheDocument();
    expect(
      screen.queryByText("이 자료에 저장된 문항이 없습니다."),
    ).not.toBeInTheDocument();
  });

  it("does not inject SVG markup and defers long document rendering", () => {
    const problems = Array.from({ length: 21 }, () => ({
      content: "문제",
      figureSvg:
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    }));
    const { container } = render(
      <AdminDocumentPreview
        userId={pendingAccount.id}
        document={{ ...draft, payload: { problems } }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "문항 21" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "다음 문항 보기 (20 / 21)" }),
    );
    expect(
      screen.getByRole("heading", { name: "문항 21" }),
    ).toBeInTheDocument();
  });

  it("reports account read failures and retries", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: { message: "사용자를 찾지 못했습니다." } },
        { status: 404 },
      ),
    );
    render(
      <AdminUserDetail userId={pendingAccount.id} identity={adminIdentity} />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "사용자를 찾지 못했습니다.",
    );
    expect(
      screen.getByRole("link", { name: "← 계정 관리로 돌아가기" }),
    ).toHaveAttribute("href", "/admin");
  });
});
