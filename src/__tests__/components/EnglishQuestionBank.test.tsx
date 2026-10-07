import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EnglishQuestionBank from "@/components/english/EnglishQuestionBank";
import { server } from "@/mocks/server";
import { bankUiItem } from "../fixtures/englishBankUi";

vi.mock("@/components/english/print/EnglishBankPrint", () => ({
  default: ({ items }: { items: unknown[] }) => (
    <div role="dialog">Resolved {items.length} questions</div>
  ),
}));
const rows = [bankUiItem(), bankUiItem(2)];
beforeEach(() => {
  server.use(
    http.get("/api/english/questions", () =>
      HttpResponse.json({
        data: { items: rows, total: 2, page: 1, pageSize: 20 },
      }),
    ),
  );
});
afterEach(() => vi.restoreAllMocks());
const mount = (props = {}) =>
  render(
    <EnglishQuestionBank
      exams={[]}
      refreshKey={0}
      onOpenSet={vi.fn()}
      {...props}
    />,
  );
describe("English bank search and composition", () => {
  it("reads actual source and answers, opens the correct original set, and enters the maker through navigation", async () => {
    const onOpenSet = vi.fn(),
      onMake = vi.fn();
    mount({ onOpenSet, onMake });
    const detail = within(screen.getByRole("region", { name: "문항 상세" }));
    expect(await detail.findByText(rows[0]!.question.evidence)).toBeVisible();
    expect(detail.getByText(/세트 검토 상태: 검토 완료/)).toBeVisible();
    fireEvent.click(detail.getByRole("button", { name: "원본 세트 편집 →" }));
    expect(onOpenSet).toHaveBeenCalledWith(rows[0]);
    fireEvent.click(screen.getByRole("button", { name: "AI 문제 제작" }));
    expect(onMake).toHaveBeenCalledOnce();
  });
  it("keeps chosen order through reordering and resolves exact revisions before preview", async () => {
    let sent: unknown;
    server.use(
      http.post("/api/english/questions/resolve", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: [rows[1], rows[0]] });
      }),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "현재 페이지 전체 선택" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /선택 담기/ }));
    expect(screen.getByRole("button", { name: "2번 위로" })).not.toBeVisible();
    fireEvent.click(screen.getByText("목록·순서 확인"));
    fireEvent.click(screen.getByRole("button", { name: "2번 위로" }));
    fireEvent.click(screen.getByRole("button", { name: "시험지 미리보기" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Resolved 2 questions",
    );
    expect(sent).toEqual({
      items: [rows[1], rows[0]].map((item) => ({
        setId: item!.setId,
        revision: item!.revision,
        questionIndex: item!.questionIndex,
      })),
    });
  });
  it("does not open an outdated paper after a revision conflict and keeps the tray for correction", async () => {
    server.use(
      http.post("/api/english/questions/resolve", () =>
        HttpResponse.json({ error: { message: "Changed" } }, { status: 409 }),
      ),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "이 문항 담기" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "시험지 미리보기" }));
    expect(await screen.findByText(/담은 문항의 원본이 변경/)).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("목록·순서 확인"));
    expect(
      within(
        screen.getByRole("complementary", { name: "담은 문제" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(1);
  });
  it("sends combined filters and retains the tray when a search has no results", async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get("/api/english/questions", ({ request }) => {
        const query = new URL(request.url).searchParams;
        queries.push(query);
        return HttpResponse.json({
          data: {
            items: query.get("q") ? [] : rows,
            total: query.get("q") ? 0 : 2,
            page: 1,
            pageSize: 20,
          },
        });
      }),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "이 문항 담기" }),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "학년" }), {
      target: { value: "중3" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "문제 검색" }), {
      target: { value: "no match" },
    });
    expect(
      await screen.findByText("조건에 맞는 문항이 없습니다"),
    ).toBeVisible();
    expect(queries.at(-1)?.get("q")).toBe("no match");
    expect(queries.at(-1)?.get("grade")).toBe("중3");
    fireEvent.click(screen.getByText("목록·순서 확인"));
    expect(
      within(
        screen.getByRole("complementary", { name: "담은 문제" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(1);
  });
  it("shows read failures and allows retry without silently showing a sample bank", async () => {
    server.use(
      http.get("/api/english/questions", () =>
        HttpResponse.json(
          { error: { message: "목록 읽기 실패" } },
          { status: 503 },
        ),
      ),
    );
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "목록 읽기 실패",
    );
    server.use(
      http.get("/api/english/questions", () =>
        HttpResponse.json({
          data: { items: rows, total: 2, page: 1, pageSize: 20 },
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getByText("2문항")).toBeVisible());
  });
});
