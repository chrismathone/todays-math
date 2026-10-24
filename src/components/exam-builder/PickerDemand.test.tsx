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
      if (body.view === "picker-kind-counts")
        return Response.json({
          ...metadata,
          view: body.view,
          kinds: { "형성 평가": 60 },
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
    // 교과서 전부의 자료 종류 수는 책을 안 고른 동안 한 번만 읽는다
    expect(
      calls.filter((call) => call.view === "picker-kind-counts"),
    ).toHaveLength(1);
    expect(screen.queryByRole("alert")).toBeNull();
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

  it("retries a failed first textbook read with the saved books across grades and material kinds intact", async () => {
    const chosenBooks = books.slice(0, 2).map((book) => book.id);
    const calls: Record<string, string>[] = [];
    let failBooks = true;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, string>;
        calls.push(body);
        if (body.view === "picker-groups")
          return Response.json({
            ...metadata,
            view: body.view,
            sources: {
              total: 60,
              engine: 0,
              school_textbook: 60,
              past_exam: 0,
              other: 0,
            },
          });
        const visible = books.filter(
          (book) =>
            book.grade === body.grade || body.books?.split(",").includes(book.id),
        );
        if (body.view === "picker-books") {
          if (failBooks) {
            failBooks = false;
            return Response.json(
              { error: "출처별 문항 수를 불러오지 못했습니다." },
              { status: 503 },
            );
          }
          return Response.json({
            ...metadata,
            view: body.view,
            grades: books.map((book) => book.grade),
            kinds: ["형성 평가"],
            books: visible,
          });
        }
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
      }),
    );
    const apply = vi.fn();
    render(
      <SourcePicker
        value={{
          group: "school_textbook",
          books: chosenBooks,
          kinds: ["형성 평가"],
        }}
        filterGrade="중1"
        returnFocus={createRef()}
        onApply={apply}
        onCancel={vi.fn()}
        onCatalog={vi.fn()}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "출처별 문항 수를 불러오지 못했습니다.",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("checkbox", { name: /^출판1/ })).toBeChecked();
    const grades = screen.getByRole("group", { name: "과목" });
    fireEvent.click(within(grades).getByRole("button", { name: /^중2/ }));
    expect(await screen.findByRole("checkbox", { name: /^출판2/ })).toBeChecked();
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: /^형성 평가/ }),
      ).toHaveAccessibleName(/40/),
    );
    expect(screen.getByRole("checkbox", { name: /^형성 평가/ })).toBeChecked();
    expect(screen.queryByRole("alert")).toBeNull();
    for (const call of calls.filter((call) => call.view !== "picker-groups"))
      expect(call).toMatchObject({
        identity: "question",
        books: chosenBooks.join(","),
      });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(apply).toHaveBeenCalledWith({
      group: "school_textbook",
      books: chosenBooks,
      kinds: ["형성 평가"],
    });
  });
});

describe("자료 종류 · 교과서 전부 · 걸리는 문항 — 고른 책들의 합, 안 고르면 교과서 전부", () => {
  // 문항 하나는 자료 하나에만 든다 — 책 × 자료 종류의 수를 더하면 정확하다(bankSourcePick.ts 머리말).
  // «수업 자료»는 중2 책에만 있다 — 중1 을 펼친 채 책을 안 골라도 막히면 안 된다(적용 범위는 교과서 전부).
  const shelf = [
    {
      id: id(11),
      grade: "중1",
      publisher: "가출판",
      author: "가",
      title: "가",
    },
    {
      id: id(12),
      grade: "중1",
      publisher: "나출판",
      author: "나",
      title: "나",
    },
    {
      id: id(13),
      grade: "중2",
      publisher: "다출판",
      author: "다",
      title: "다",
    },
  ];
  const tally: Record<
    string,
    { count: number; kinds: Record<string, number> }
  > = {
    [id(11)]: { count: 9, kinds: { "형성 평가": 7, 기타: 2 } },
    [id(12)]: { count: 5, kinds: { "형성 평가": 5 } },
    [id(13)]: { count: 9, kinds: { 기타: 4, "수업 자료": 5 } },
  };
  function serve(
    hold: "none" | "bookCountsAfterFirst" | "kindTotals" | "kindTotalsFailOnce",
  ) {
    let answered = 0;
    let kindFailures = hold === "kindTotalsFailOnce" ? 1 : 0;
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, string>;
        calls.push(body.view);
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
        if (body.view === "picker-kind-counts") {
          if (hold === "kindTotals") return new Promise<Response>(() => {});
          if (kindFailures-- > 0)
            return Response.json(
              { error: "자료 종류 수를 불러오지 못했습니다." },
              { status: 503 },
            );
          const kinds: Record<string, number> = {};
          for (const book of Object.values(tally))
            for (const [kind, count] of Object.entries(book.kinds))
              kinds[kind] = (kinds[kind] ?? 0) + count;
          return Response.json({ ...metadata, view: body.view, kinds });
        }
        const selected = body.books?.split(",") ?? [];
        const visible = shelf.filter(
          (book) => book.grade === body.grade || selected.includes(book.id),
        );
        if (body.view === "picker-books")
          return Response.json({
            ...metadata,
            view: body.view,
            grades: ["중1", "중2"],
            kinds: ["형성 평가", "기타", "수업 자료"],
            books: visible,
          });
        if (hold === "bookCountsAfterFirst" && answered++ > 0)
          return new Promise<Response>(() => {});
        return Response.json({
          ...metadata,
          view: body.view,
          books: visible.map((book) => ({
            id: book.id,
            open: tally[book.id].count,
            ...tally[book.id],
          })),
        });
      }),
    );
    return calls;
  }
  async function open(books: string[] = []) {
    render(
      <SourcePicker
        value={{ group: "", books, kinds: [] }}
        filterGrade="중1"
        returnFocus={createRef()}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        onCatalog={vi.fn()}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /교과서/ }));
    await screen.findByRole("checkbox", { name: /^가출판/ });
  }
  /** 칸마다 오른쪽 끝의 수 — «미확인»이면 그 글. */
  const countOf = (name: RegExp) =>
    screen.getByRole("checkbox", { name }).closest("label")!.lastElementChild!
      .textContent;
  const kindCounts = () => [
    countOf(/^형성 평가/),
    countOf(/^기타/),
    countOf(/^수업 자료/),
  ];
  const footer = () => screen.getByText(/걸리는 문항/).closest("span")!;

  it("0권 → 교과서 전부의 종류별 수(펼친 과목이 아니다) · 1권 → 그 책 · 여러 권(다른 과목 책 포함) → 고른 책들의 합", async () => {
    const calls = serve("none");
    await open();
    await waitFor(() => expect(kindCounts()).toEqual(["12", "6", "5"]));
    expect(calls.filter((view) => view === "picker-kind-counts")).toHaveLength(
      1,
    );
    // 중2 에만 있는 종류도 막지 않는다 — 책을 안 고르면 교과서 전부에 걸린다
    expect(screen.getByRole("checkbox", { name: /^수업 자료/ })).toBeEnabled();
    expect(countOf(/^중1 교과서 전부/)).toBe("14");
    expect(footer()).toHaveTextContent("걸리는 문항 60개 / 교과서 60");
    fireEvent.click(screen.getByRole("checkbox", { name: /^기타/ }));
    expect(footer()).toHaveTextContent("걸리는 문항 6개");
    fireEvent.click(screen.getByRole("checkbox", { name: /^기타/ }));

    fireEvent.click(screen.getByRole("checkbox", { name: /^가출판/ }));
    await waitFor(() => expect(kindCounts()).toEqual(["7", "2", "0"]));
    expect(screen.getByRole("checkbox", { name: /^수업 자료/ })).toBeDisabled();
    expect(footer()).toHaveTextContent("걸리는 문항 9개");

    const grades = screen.getByRole("group", { name: "과목" });
    fireEvent.click(within(grades).getByRole("button", { name: "중2" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /^다출판/ }));
    await waitFor(() => expect(kindCounts()).toEqual(["7", "6", "5"]));
    expect(footer()).toHaveTextContent("걸리는 문항 18개");
    fireEvent.click(screen.getByRole("checkbox", { name: /^기타/ }));
    expect(footer()).toHaveTextContent("걸리는 문항 6개");
    expect(screen.queryByText("미확인")).toBeNull();
    // 교과서 전부의 수는 한 번만 받는다(책을 고른 동안은 안 받는다)
    expect(calls.filter((view) => view === "picker-kind-counts")).toHaveLength(
      1,
    );
  });

  it("책 수가 아직 안 왔으면 그때만 미확인 — 0 으로 지어내지 않고 막지도 않는다", async () => {
    serve("bookCountsAfterFirst");
    await open();
    await waitFor(() => expect(kindCounts()).toEqual(["12", "6", "5"]));
    // 책을 고르면 그 고르기의 수를 새로 받는다 — 오기 전까지는 모른다
    fireEvent.click(screen.getByRole("checkbox", { name: /^가출판/ }));
    expect(kindCounts()).toEqual(["미확인", "미확인", "미확인"]);
    expect(countOf(/^중1 교과서 전부/)).toBe("미확인");
    expect(screen.getByRole("checkbox", { name: /^수업 자료/ })).toBeEnabled();
    expect(footer()).toHaveTextContent("걸리는 문항 미확인");
  });

  it("책을 안 고른 때 교과서 전부의 수가 아직 안 왔으면 미확인 — 막지 않는다", async () => {
    serve("kindTotals");
    await open();
    await waitFor(() => expect(countOf(/^중1 교과서 전부/)).toBe("14"));
    expect(kindCounts()).toEqual(["미확인", "미확인", "미확인"]);
    expect(screen.getByRole("checkbox", { name: /^수업 자료/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /^형성 평가/ }));
    expect(footer()).toHaveTextContent("걸리는 문항 미확인");
  });

  it("교과서 전부의 수를 못 받은 오류는 책을 안 고른 동안만 보인다 — 책을 다 풀면 다시 읽는다", async () => {
    serve("kindTotalsFailOnce");
    await open();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "자료 종류 수를 불러오지 못했습니다.",
    );
    expect(kindCounts()).toEqual(["미확인", "미확인", "미확인"]);
    // 책을 고르면 그 책의 수로 센다 — 이제 상관없는 오류는 걷힌다
    fireEvent.click(screen.getByRole("checkbox", { name: /^가출판/ }));
    await waitFor(() => expect(kindCounts()).toEqual(["7", "2", "0"]));
    expect(screen.queryByRole("alert")).toBeNull();
    // 책을 다 풀면 교과서 전부의 수를 다시 읽는다
    fireEvent.click(screen.getByRole("checkbox", { name: /^가출판/ }));
    await waitFor(() => expect(kindCounts()).toEqual(["12", "6", "5"]));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("수가 온 뒤에도 없는 책(사라진 책 — 저장한 조건이 되살린 옛 id)은 0 이다 — 미확인으로 남지 않는다", async () => {
    serve("none");
    await open([id(11), id(99)]);
    await waitFor(() => expect(kindCounts()).toEqual(["7", "2", "0"]));
    expect(footer()).toHaveTextContent("걸리는 문항 9개");
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
