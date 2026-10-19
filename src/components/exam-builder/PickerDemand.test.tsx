import { createRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import SourcePicker from "./SourcePicker";
import DemandMaterialPicker from "./DemandMaterialPicker";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const id = (value: number) =>
  `20000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const metadata = { version: 2, countUnit: "question", queryKey: "fixture" };
const books = [1, 2, 3].map((value) => ({
  id: id(value),
  grade: `중${value}`,
  publisher: `출판${value}`,
  author: `저자${value}`,
  title: `교과서${value}`,
}));

describe("source picker demand reads", () => {
  it("loads groups first, then only the open textbook grade plus selected books and preserves the draft", async () => {
    const calls: Record<string, string>[] = [];
    const fetcher = vi.fn<typeof fetch>(async (_, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, string>;
      calls.push(body);
      if (body.view === "picker-groups")
        return Response.json({
          ...metadata,
          view: body.view,
          sources: {
            total: 90,
            engine: 30,
            school_textbook: 60,
            past_exam: 0,
            other: 0,
          },
        });
      const selected = body.books?.split(",") ?? [];
      const visible = books.filter(
        (book) => book.grade === body.grade || selected.includes(book.id),
      );
      if (body.view === "picker-books")
        return Response.json({
          ...metadata,
          view: body.view,
          grades: books.map((book) => book.grade),
          kinds: ["형성 평가", "기타"],
          books: visible,
        });
      if (body.view === "picker-book-counts")
        return Response.json({
          ...metadata,
          view: body.view,
          books: visible.map((book) => ({
            id: book.id,
            count: 20,
            open: 18,
            kinds: { "형성 평가": 20 },
          })),
        });
      throw new Error(`Unexpected view: ${body.view}`);
    });
    vi.stubGlobal("fetch", fetcher);
    const apply = vi.fn();
    render(
      <SourcePicker
        value={{ group: "", books: [], kinds: [] }}
        filterGrade="중1"
        returnFocus={createRef()}
        onApply={apply}
        onCancel={vi.fn()}
        onCatalog={vi.fn()}
      />,
    );
    await screen.findByRole("button", { name: /엔진/ });
    expect(calls.map((call) => call.view)).toEqual(["picker-groups"]);
    fireEvent.click(screen.getByRole("button", { name: /엔진/ }));
    expect(calls).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /교과서/ }));
    const first = await screen.findByRole("checkbox", { name: /^출판1/ });
    expect(first).toHaveAccessibleName(/출제 가능 18/);
    expect(
      calls.find((call) => call.view === "picker-books"),
    ).not.toHaveProperty("grade");
    expect(
      calls
        .filter((call) => call.view === "picker-book-counts")
        .map((call) => call.grade),
    ).toEqual(["중1"]);
    fireEvent.click(first);
    await waitFor(() =>
      expect(calls.at(-1)).toMatchObject({ books: books[0].id, grade: "중1" }),
    );
    const grades = screen.getByRole("group", { name: "과목" });
    fireEvent.click(within(grades).getByRole("button", { name: "중2" }));
    const second = await screen.findByRole("checkbox", { name: /^출판2/ });
    await waitFor(() => expect(second).toHaveAccessibleName(/출제 가능 18/));
    expect(calls.at(-1)).toMatchObject({ grade: "중2", books: books[0].id });
    expect(screen.queryByRole("checkbox", { name: /^출판3/ })).toBeNull();
    fireEvent.click(second);
    await waitFor(() =>
      expect(calls.at(-1)?.books.split(",")).toEqual([
        books[0].id,
        books[1].id,
      ]),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /^형성 평가/ }));
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(apply).toHaveBeenCalledWith({
      group: "school_textbook",
      books: [books[0].id, books[1].id],
      kinds: ["형성 평가"],
    });
    expect(calls.every((call) => call.view.startsWith("picker-"))).toBe(true);
  });

  it("keeps a failed source draft and supports retry/cancellation without reading hidden panes", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error: "출처 연결 실패" }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ...metadata,
          view: "picker-groups",
          sources: {
            total: 1,
            engine: 1,
            school_textbook: 0,
            past_exam: 0,
            other: 0,
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const apply = vi.fn();
    const mounted = render(
      <SourcePicker
        value={{ group: "engine", books: [], kinds: [] }}
        filterGrade=""
        returnFocus={createRef()}
        onApply={apply}
        onCancel={vi.fn()}
        onCatalog={vi.fn()}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "출처 연결 실패",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByRole("button", { name: /엔진/ });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(apply).toHaveBeenCalledWith({
      group: "engine",
      books: [],
      kinds: [],
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    mounted.unmount();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => new Promise(() => {})),
    );
    const next = render(
      <SourcePicker
        value={{ group: "", books: [], kinds: [] }}
        filterGrade=""
        returnFocus={createRef()}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        onCatalog={vi.fn()}
      />,
    );
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    next.unmount();
    expect(signal?.aborted).toBe(true);
  });
});

describe("material picker page reads", () => {
  it("keeps selections across remote pages and search, removes confirmed empty selections and applies native material IDs", async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      id: id(100 + index),
      bookId: books[0].id,
      kind: "형성 평가",
      kindRaw: "형성 평가",
      title: `자료 ${index + 1}`,
      chapterNo: null,
      middleNo: null,
      sectionNo: null,
      unitRaw: "단원",
      semester: null,
      round: null,
      levelRaw: null,
      sequence: index,
      held: 10,
      available: index === 0 ? 0 : 4,
    }));
    const calls: Record<string, string>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, string>;
        calls.push(body);
        const filtered = rows.filter(
          (row) => !body.q || row.title.includes(body.q),
        );
        const page = Number(body.page);
        return Response.json({
          ...metadata,
          view: "materials-page",
          total: filtered.length,
          page,
          pageSize: 20,
          materials: filtered.slice((page - 1) * 20, page * 20),
          selectedAvailable:
            body.materials
              ?.split(",")
              .filter((value) => value !== rows[0].id) ?? [],
        });
      }),
    );
    const apply = vi.fn();
    render(
      <DemandMaterialPicker
        books={[books[0].id]}
        kinds={["형성 평가"]}
        selected={[rows[0].id, rows[1].id]}
        bookNames={{ [books[0].id]: "중1 출판1" }}
        onClose={vi.fn()}
        onApply={apply}
      />,
    );
    expect(
      await screen.findByRole("checkbox", { name: /^자료 1 / }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /^자료 1 / }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^자료 2 / })).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: /^자료 25 / })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /^자료 25 / }));
    expect(calls.at(-1)).toMatchObject({
      page: "2",
      materials: rows[1].id,
      materialKinds: "형성 평가",
      pageSize: "20",
    });
    fireEvent.change(screen.getByLabelText("자료 검색"), {
      target: { value: "자료 3" },
    });
    fireEvent.click(await screen.findByRole("checkbox", { name: /^자료 3 / }));
    expect(calls.at(-1)).toMatchObject({
      q: "자료 3",
      page: "1",
      materials: [rows[1].id, rows[24].id].join(","),
    });
    fireEvent.click(screen.getByRole("button", { name: "3개 자료 적용" }));
    expect(apply).toHaveBeenCalledWith([rows[1].id, rows[24].id, rows[2].id]);
    expect(calls.every((call) => call.view === "materials-page")).toBe(true);
  });

  it("retains selected materials on a failed read and retries the same page", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error: "자료 연결 실패" }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ...metadata,
          view: "materials-page",
          total: 0,
          page: 1,
          pageSize: 20,
          materials: [],
          selectedAvailable: [id(200)],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(
      <DemandMaterialPicker
        books={[books[0].id]}
        kinds={[]}
        selected={[id(200)]}
        bookNames={{}}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("선택은 유지");
    expect(
      screen.getByRole("button", { name: "1개 자료 적용" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "다시 확인" }));
    expect(
      await screen.findByText("조건에 맞는 자료가 없습니다."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "1개 자료 적용" })).toBeEnabled();
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
      materials: id(200),
      page: "1",
    });
  });
});
