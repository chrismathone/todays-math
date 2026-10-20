import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import type { StudioProblem } from "@/components/unified/types";
import ExamBuilder from "./ExamBuilder";
import { createMathExamBuilderSource } from "./mathSource";
import type { ExamBuilderSource } from "./types";

const unitId = (index: number) =>
  `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const units = Array.from({ length: 23 }, (_, index) => ({
  id: unitId(index + 1),
  grade: "중1",
  chapter: "수와 연산",
  section: `차시 ${index + 1}`,
  orderIndex: index + 1,
}));
const other = {
  id: unitId(100),
  grade: "초3",
  chapter: "다른 단원",
  section: "다른 차시",
  orderIndex: 100,
};
const emptyQuestions: StudioProblem[] = [];
const scrollDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  }),
);
afterAll(() => {
  if (scrollDescriptor)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      scrollDescriptor,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function fixture(
  options: {
    failCounts?: boolean;
    distinctFamilies?: boolean;
    filters?: string;
    initialQuestions?: StudioProblem[];
    holdCounts?: boolean;
    families?: number;
    allFamilies?: number;
  } = {},
) {
  let failCounts = options.failCounts ?? false;
  let holdCounts = options.holdCounts ?? false;
  const pendingCounts: (() => void)[] = [];
  const requests = vi.fn<typeof fetch>(async (url, init) => {
    const params =
      init?.method === "POST"
        ? new URLSearchParams(JSON.parse(String(init.body)))
        : new URL(String(url), "http://localhost").searchParams;
    if (params.get("view") === "scope-counts") {
      if (holdCounts)
        await new Promise<void>((resolve) => pendingCounts.push(resolve));
      if (failCounts)
        return Response.json({ error: "수량 확인 실패" }, { status: 503 });
      const ids = params.get("unitIds")!.split(",");
      return Response.json({
        view: "scope-counts",
        version: 2,
        countUnit: "question",
        queryKey: "fixture",
        unitCounts: Object.fromEntries(ids.map((id) => [id, 20])),
        unitFamilies: Object.fromEntries(
          ids.map((id) => [
            id,
            params.get("recent") === "1"
              ? (options.families ?? 6)
              : (options.allFamilies ?? 9),
          ]),
        ),
      });
    }
    if (params.get("view") !== "curriculum")
      throw new Error(`Unexpected request: ${params}`);
    const grade = params.get("grade");
    const chapter = params.get("chapter");
    const ids = params.get("unitIds")?.split(",");
    const all = [...units, other];
    return Response.json({
      view: "curriculum",
      grades: !grade && !ids ? ["초3", "중1"] : [],
      chapters:
        grade && !chapter
          ? [
              ...new Set(
                all
                  .filter((unit) => unit.grade === grade)
                  .map((unit) => unit.chapter),
              ),
            ]
          : [],
      units: ids
        ? all.filter((unit) => ids.includes(unit.id))
        : chapter
          ? all.filter(
              (unit) => unit.grade === grade && unit.chapter === chapter,
            )
          : [],
    });
  });
  const source = createMathExamBuilderSource({
    deferScopes: true,
    fetch: requests,
    distinctFamilies: options.distinctFamilies,
    filters: options.filters,
  });
  function Harness({
    activeSource = source,
  }: { activeSource?: ExamBuilderSource<StudioProblem> } = {}) {
    const [questions, setQuestions] = useState(
      options.initialQuestions ?? emptyQuestions,
    );
    return (
      <ExamBuilder
        source={activeSource}
        questions={questions}
        onQuestionsChange={setQuestions}
        title="시험지"
        onTitleChange={() => {}}
        difficulties={DIFFICULTY_LADDER}
        maxQuestions={100}
        renderQuestion={(item) => <p>{item.content}</p>}
        renderOutput={() => null}
      />
    );
  }
  const countQueries = () =>
    requests.mock.calls.flatMap(([, init]) =>
      init?.method === "POST"
        ? [JSON.parse(String(init.body)) as Record<string, string>]
        : [],
    );
  return {
    source,
    requests,
    Harness,
    countQueries,
    pauseCounts: () => {
      holdCounts = true;
    },
    releaseCounts: () => {
      holdCounts = false;
      pendingCounts.splice(0).forEach((resolve) => resolve());
    },
    recover: () => {
      failCounts = false;
    },
  };
}

async function openLessons() {
  fireEvent.click(await screen.findByRole("button", { name: "중1" }));
  fireEvent.click(await screen.findByRole("button", { name: "수와 연산" }));
  return screen.findByRole("checkbox", { name: "차시 1 출제 가능 6갈래" });
}

describe("S2 demand-loaded scope inventory", () => {
  it("restores legacy saved allocations from their selected curriculum path without global counts or changing saved questions", async () => {
    const question: StudioProblem = {
      id: unitId(200),
      questionId: "saved-question-one",
      content: "저장 문제",
      answer: "1",
      solution: "풀이",
      grade: units[0].grade,
      chapter: units[0].chapter,
      section: units[0].section,
      difficulty: "기본",
      problemCode: "SAVED-1",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
    };
    const initialQuestions = [
      question,
      { ...question, id: unitId(201), questionId: "saved-question-two" },
    ];
    const { Harness, countQueries, requests } = fixture({ initialQuestions });
    render(<Harness />);
    const count = await screen.findByRole("spinbutton", {
      name: "차시 1 구성 수",
    });
    await waitFor(() => expect(count).toHaveAttribute("max", "6"));
    expect(count).toHaveValue(2);
    expect(initialQuestions[0]).toBe(question);
    expect(question).not.toHaveProperty("unitId");
    expect(
      countQueries().every((query) => query.unitIds.split(",").length <= 20),
    ).toBe(true);
    expect(
      requests.mock.calls.every(([url]) => !String(url).includes("bootstrap")),
    ).toBe(true);
  });
  it("requests only grade names initially and only chapters after choosing a grade", async () => {
    const { Harness, requests, countQueries } = fixture();
    render(<Harness />);
    expect(await screen.findByRole("button", { name: "중1" })).toBeEnabled();
    expect(requests).toHaveBeenCalledTimes(1);
    expect(countQueries()).toEqual([]);
    expect(
      new URL(
        String(requests.mock.calls[0][0]),
        "http://localhost",
      ).searchParams.toString(),
    ).toBe("identity=question&view=curriculum");
    fireEvent.click(screen.getByRole("button", { name: "중1" }));
    expect(
      await screen.findByRole("button", { name: "수와 연산" }),
    ).toBeEnabled();
    expect(countQueries()).toEqual([]);
    expect(requests).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("checkbox", { name: /차시 1/ })).toBeNull();
  });

  it("counts only uncached visible lessons and preserves manual allocations through search, pages and grade changes", async () => {
    const { Harness, countQueries } = fixture();
    render(<Harness />);
    const first = await openLessons();
    expect(countQueries().at(-1)?.unitIds.split(",")).toEqual(
      units.slice(0, 20).map((unit) => unit.id),
    );
    fireEvent.click(first);
    expect(countQueries()).toHaveLength(1);
    const count = await screen.findByRole("spinbutton", {
      name: "차시 1 구성 수",
    });
    expect(count).toHaveAttribute("max", "6");
    fireEvent.change(count, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 차시" }));
    await screen.findByRole("checkbox", { name: "차시 23 출제 가능 6갈래" });
    expect(countQueries().at(-1)?.unitIds.split(",")).toEqual(
      units.slice(20).map((unit) => unit.id),
    );
    expect(
      screen.getByRole("spinbutton", { name: "차시 1 구성 수" }),
    ).toHaveValue(2);
    fireEvent.change(screen.getByRole("searchbox", { name: "차시 검색" }), {
      target: { value: "차시 23" },
    });
    expect(countQueries()).toHaveLength(2);
    await screen.findByRole("checkbox", { name: "차시 23 출제 가능 6갈래" });
    fireEvent.click(screen.getByRole("button", { name: "학년·과정 변경" }));
    fireEvent.click(await screen.findByRole("button", { name: "초3" }));
    fireEvent.click(await screen.findByRole("button", { name: "다른 단원" }));
    expect(
      await screen.findByRole("checkbox", {
        name: "다른 차시 출제 가능 6갈래",
      }),
    ).toBeEnabled();
    expect(countQueries().at(-1)?.unitIds.split(",")).toEqual([other.id]);
    expect(
      screen.getByRole("spinbutton", { name: "차시 1 구성 수" }),
    ).toHaveValue(2);
    expect(
      countQueries().every(
        (query) => query.view === "scope-counts" && !!query.unitIds,
      ),
    ).toBe(true);
  });

  it("shows lesson names before counts resolve, then checks and unchecks without hiding the list or requesting counts again", async () => {
    const { Harness, countQueries, releaseCounts } = fixture({
      holdCounts: true,
    });
    render(<Harness />);
    fireEvent.click(await screen.findByRole("button", { name: "중1" }));
    fireEvent.click(await screen.findByRole("button", { name: "수와 연산" }));
    expect(
      await screen.findByRole("checkbox", {
        name: /차시 1 출제 범위를 불러오는 중/,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("region", { name: "차시 목록" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /출제 범위를/ })).toBeNull();
    expect(countQueries()).toHaveLength(1);
    await act(async () => releaseCounts());
    const first = await screen.findByRole("checkbox", {
      name: "차시 1 출제 가능 6갈래",
    });
    fireEvent.click(first);
    expect(first).toBeChecked();
    fireEvent.click(first);
    expect(first).not.toBeChecked();
    expect(
      screen.getByRole("region", { name: "차시 목록" }),
    ).toBeInTheDocument();
    expect(countQueries()).toHaveLength(1);
  });

  it("retains confirmed counts during a new page request and does not restart it when a cached selection is removed", async () => {
    const { Harness, countQueries, requests, pauseCounts, releaseCounts } =
      fixture();
    render(<Harness />);
    fireEvent.click(await openLessons());
    const count = screen.getByRole("spinbutton", { name: "차시 1 구성 수" });
    pauseCounts();
    fireEvent.click(screen.getByRole("button", { name: "다음 차시" }));
    expect(
      await screen.findByRole("checkbox", {
        name: /차시 23 출제 범위를 불러오는 중/,
      }),
    ).toBeDisabled();
    expect(count).toHaveAttribute("max", "6");
    expect(countQueries()).toHaveLength(2);
    expect(countQueries()[1].unitIds.split(",")).toEqual(
      units.slice(20).map((unit) => unit.id),
    );
    const signal = requests.mock.calls.find(
      ([, init]) =>
        init?.method === "POST" &&
        JSON.parse(String(init.body)).unitIds === countQueries()[1].unitIds,
    )![1]!.signal;
    fireEvent.click(screen.getByRole("button", { name: "이전 차시" }));
    const first = screen.getByRole("checkbox", {
      name: "차시 1 출제 가능 6갈래",
    });
    expect(first).toBeChecked();
    fireEvent.click(first);
    expect(countQueries()).toHaveLength(2);
    expect(signal?.aborted).toBe(false);
    await act(async () => releaseCounts());
    fireEvent.click(screen.getByRole("button", { name: "다음 차시" }));
    expect(
      await screen.findByRole("checkbox", { name: "차시 23 출제 가능 6갈래" }),
    ).toBeEnabled();
    expect(countQueries()).toHaveLength(2);
  });

  it("keeps recent and all counts separate and reuses each after toggling back", async () => {
    const { Harness, countQueries } = fixture();
    render(<Harness />);
    fireEvent.click(await openLessons());
    const recent = screen.getByRole("checkbox", {
      name: "최근 14일 출제 빼기",
    });
    fireEvent.click(recent);
    expect(
      await screen.findByRole("checkbox", { name: "차시 1 출제 가능 9갈래" }),
    ).toBeEnabled();
    expect(countQueries()).toHaveLength(2);
    expect(countQueries().map((query) => query.recent)).toEqual([
      "1",
      undefined,
    ]);
    fireEvent.click(recent);
    expect(
      screen.getByRole("checkbox", { name: "차시 1 출제 가능 6갈래" }),
    ).toBeChecked();
    fireEvent.click(recent);
    expect(
      screen.getByRole("checkbox", { name: "차시 1 출제 가능 9갈래" }),
    ).toBeChecked();
    expect(countQueries()).toHaveLength(2);
  });

  it("isolates counts by source and reuses a previously confirmed source without sharing pending counts", async () => {
    const original = fixture();
    const changed = fixture({
      holdCounts: true,
      families: 3,
      filters: "sourceGroup=engine",
    });
    const mounted = render(<original.Harness />);
    await openLessons();
    mounted.rerender(<original.Harness activeSource={changed.source} />);
    expect(
      await screen.findByRole("checkbox", {
        name: /차시 1 출제 범위를 불러오는 중/,
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("checkbox", { name: "차시 1 출제 가능 6갈래" }),
    ).toBeNull();
    await act(async () => changed.releaseCounts());
    expect(
      await screen.findByRole("checkbox", { name: "차시 1 출제 가능 3갈래" }),
    ).toBeEnabled();
    expect(changed.countQueries()[0]).toMatchObject({
      sourceGroup: "engine",
      recent: "1",
    });
    mounted.rerender(<original.Harness />);
    expect(
      await screen.findByRole("checkbox", { name: "차시 1 출제 가능 6갈래" }),
    ).toBeEnabled();
    expect(original.countQueries()).toHaveLength(1);
    expect(changed.countQueries()).toHaveLength(1);
  });

  it("retains a failed selection and retries only the requested scope with unchanged source and recent conditions", async () => {
    const filters = "sourceGroup=engine";
    const { Harness, countQueries, recover } = fixture({
      failCounts: true,
      filters,
    });
    render(<Harness />);
    fireEvent.click(await screen.findByRole("button", { name: "중1" }));
    fireEvent.click(await screen.findByRole("button", { name: "수와 연산" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "수량 확인 실패",
    );
    const before = countQueries().at(-1);
    expect(before).toMatchObject({
      sourceGroup: "engine",
      recent: "1",
      families: "1",
    });
    recover();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(
      await screen.findByRole("checkbox", { name: "차시 1 출제 가능 6갈래" }),
    ).toBeEnabled();
    expect(countQueries().at(-1)).toEqual(before);
    expect(countQueries()).toHaveLength(2);
  });

  it("uses confirmed question counts when the family rule is off and never reads unselected inventory", async () => {
    const { source, requests } = fixture({ distinctFamilies: false });
    const signal = new AbortController().signal;
    expect(await source.loadScopes(signal, { scopeIds: [] })).toEqual([]);
    expect(requests).not.toHaveBeenCalled();
    const scopes = await source.loadScopes(signal, {
      scopeIds: [units[0].id],
      excludeRecent: true,
    });
    expect(scopes).toMatchObject([{ id: units[0].id, count: 20 }]);
    expect(scopes[0].countUnit).toBeUndefined();
    expect(
      requests.mock.calls.every(([url]) => !String(url).includes("bootstrap")),
    ).toBe(true);
  });

  it("cancels an abandoned navigation request", async () => {
    const requests = vi.fn<typeof fetch>(() => new Promise(() => {}));
    const source = createMathExamBuilderSource({
      deferScopes: true,
      fetch: requests,
    });
    const mounted = render(
      <ExamBuilder
        source={source}
        questions={emptyQuestions}
        onQuestionsChange={() => {}}
        title="시험지"
        onTitleChange={() => {}}
        difficulties={DIFFICULTY_LADDER}
        maxQuestions={100}
        renderQuestion={() => null}
        renderOutput={() => null}
      />,
    );
    await waitFor(() => expect(requests).toHaveBeenCalledTimes(1));
    const signal = requests.mock.calls[0][1]?.signal;
    mounted.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
