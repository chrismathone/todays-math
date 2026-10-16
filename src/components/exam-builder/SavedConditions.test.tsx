import "@testing-library/jest-dom/vitest";
import { useMemo, useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import type {
  ExamCondition,
  ExamConditionInput,
} from "@/contracts/examCondition.contract";
import ExamBuilder from "./ExamBuilder";
import type {
  ExamBuilderSource,
  ExamNamedConditions,
  ExamSavedSelection,
} from "./types";
import {
  ExamConditionError,
  type ExamConditionsClient,
} from "./examConditionsClient";

/**
 * W5 «이름 붙인 출제 조건»(Hi-fi 1안 + 4안의 한 줄 — 원장님 2026-10-16).
 * 저장 · 같은 이름 · 적용(빠진 범위 · 모자람) · 이름 바꾸기 · 삭제 확인 · «적용함» 줄.
 */

type Item = { id: string; scope: string; difficulty: string };
const ladder = Object.fromEntries(
  DIFFICULTY_LADDER.map((tier) => [tier, null]),
) as ExamConditionInput["ladder"];
const ALL: ExamSavedSelection = {
  source: {
    group: "",
    books: [],
    kinds: [],
    materials: [],
    label: "전체 출처",
  },
  familyRule: true,
};
const BOOK: ExamSavedSelection = {
  source: {
    group: "school_textbook",
    books: ["b1"],
    kinds: [],
    materials: [],
    label: "교과서 · 중2 비상 · 자료 전부",
  },
  familyRule: false,
};
const keyOf = (selection: ExamSavedSelection) =>
  JSON.stringify([
    selection.source.group,
    selection.source.books,
    selection.familyRule,
  ]);
/** 출처마다 출제 가능 수가 다르다 — 교과서 비상에는 u3 이 비고 u2 는 4갈래뿐. */
function scopesFor(selection: ExamSavedSelection) {
  const book = selection.source.group === "school_textbook";
  return [
    { id: "u1", label: "일차부등식의 해와 성질", group: "중2", count: 9 },
    { id: "u2", label: "일차부등식의 풀이", group: "중2", count: book ? 4 : 9 },
    { id: "u3", label: "일차부등식의 활용", group: "중2", count: book ? 0 : 9 },
  ].map((scope) => ({ ...scope, countUnit: "갈래" }));
}
const saved = (
  id: string,
  name: string,
  lastUsedAt: string,
  patch: Partial<ExamConditionInput> = {},
): ExamCondition => ({
  id,
  revision: 1,
  condition: {
    v: 1,
    name,
    source: ALL.source,
    rows: [
      { unitId: "u1", label: "일차부등식의 해와 성질", count: 3, fixed: false },
    ],
    total: null,
    ladder,
    recent: true,
    familyRule: true,
    lastUsedAt,
    ...patch,
  },
});

function fakeClient(initial: ExamCondition[]) {
  let rows = [...initial];
  const client = {
    list: vi.fn(async () => [...rows]),
    save: vi.fn(
      async (
        condition: ExamConditionInput,
        replace?: { id: string; expectedRevision: number },
      ) => {
        const same = rows.find(
          (row) =>
            row.condition.name === condition.name && row.id !== replace?.id,
        );
        if (same)
          throw new ExamConditionError(
            "같은 이름의 조건이 있습니다.",
            "EXAM_CONDITION_NAME_TAKEN",
            { id: same.id, revision: same.revision },
          );
        const next: ExamCondition = {
          id: replace?.id ?? `new-${rows.length}`,
          revision: replace ? replace.expectedRevision + 1 : 1,
          condition: { ...condition, lastUsedAt: "2026-10-16T09:00:00.000Z" },
        };
        rows = [next, ...rows.filter((row) => row.id !== next.id)];
        return next;
      },
    ),
    rename: vi.fn(async (id: string, name: string, revision: number) => {
      const row = rows.find((item) => item.id === id)!;
      const next = {
        ...row,
        revision: revision + 1,
        condition: { ...row.condition, name },
      };
      rows = rows.map((item) => (item.id === id ? next : item));
      return next;
    }),
    touch: vi.fn(async (id: string) => {
      const row = rows.find((item) => item.id === id)!;
      const next = {
        ...row,
        revision: row.revision + 1,
        condition: { ...row.condition, lastUsedAt: "2026-10-16T09:30:00.000Z" },
      };
      rows = rows.map((item) => (item.id === id ? next : item));
      return next;
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((item) => item.id !== id);
    }),
  } satisfies ExamConditionsClient;
  return client;
}

function Harness({
  client,
  compose = vi.fn().mockResolvedValue([]),
  restore,
}: {
  client?: ExamConditionsClient;
  compose?: ExamBuilderSource<Item>["compose"];
  restore?: (selection: ExamSavedSelection) => void;
}) {
  const [selection, setSelection] = useState<ExamSavedSelection>(ALL);
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("중2 일차부등식 확인");
  const key = keyOf(selection);
  const source = useMemo<ExamBuilderSource<Item>>(
    () => ({
      requireScopeCounts: true,
      conditions: { ladder: DIFFICULTY_LADDER, recentDays: 14 },
      loadScopes: async () => scopesFor(JSON.parse(key)[0] ? BOOK : ALL),
      list: async () => ({ items: [], total: 0 }),
      compose,
      info: (item) => ({
        id: item.id,
        scopeId: item.scope,
        scopeLabel: item.scope,
        difficulty: item.difficulty,
      }),
    }),
    [key, compose],
  );
  const named: ExamNamedConditions | undefined = client && {
    selection,
    restore: (next) => {
      restore?.(next);
      setSelection(next);
    },
    client,
  };
  return (
    <>
      <output aria-label="출처 고르기">{selection.source.label}</output>
      <ExamBuilder
        source={source}
        namedConditions={named}
        questions={items}
        onQuestionsChange={setItems}
        title={title}
        onTitleChange={setTitle}
        difficulties={DIFFICULTY_LADDER}
        maxQuestions={100}
        renderQuestion={(item) => <p>{item.id}</p>}
        renderOutput={() => null}
      />
    </>
  );
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(cleanup);

const line = () =>
  within(document.querySelector("[data-condition-line]") as HTMLElement);
async function pickAllScopes() {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "범위 선택" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "범위 선택" }));
  const dialog = await screen.findByRole("dialog");
  for (const box of dialog.querySelectorAll<HTMLInputElement>(
    "li input[type=checkbox]",
  ))
    if (!box.checked && !box.disabled) fireEvent.click(box);
  fireEvent.click(within(dialog).getByRole("button", { name: /개 범위 적용/ }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
}
async function openList() {
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /^저장한 조건 · \d+$/ }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /^저장한 조건 · \d+$/ }));
  return screen.findByRole("dialog", { name: "저장한 조건" });
}

describe("이름 붙인 출제 조건 (W5 · Hi-fi 1)", () => {
  it("shows the line «출제 조건 — 직접 정함» and the list button with the count", async () => {
    const client = fakeClient([
      saved("c1", "중2 확인 · 부등식 18", "2026-10-14T01:00:00.000Z"),
    ]);
    render(<Harness client={client} />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "저장한 조건 · 1" }),
      ).toBeInTheDocument(),
    );
    expect(line().getByText("출제 조건")).toBeInTheDocument();
    expect(line().getByText(/직접 정함/)).toBeInTheDocument();
  });

  it("saves only the conditions (source · rows · total · ladder · recent · family rule) under a trimmed name", async () => {
    const client = fakeClient([]);
    render(<Harness client={client} />);
    await pickAllScopes();
    fireEvent.click(screen.getByRole("button", { name: "조건 저장" }));
    const name = screen.getByRole("textbox", { name: "조건 이름" });
    expect(name).toHaveValue("중2 일차부등식 확인");
    expect(screen.getByText(/담는 것:/)).toHaveTextContent("전체 출처");
    fireEvent.change(name, { target: { value: "  일일 15문항  " } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(client.save).toHaveBeenCalledTimes(1));
    const [input, replace] = client.save.mock.calls[0];
    expect(replace).toBeUndefined();
    expect(input).toEqual({
      v: 1,
      name: "일일 15문항",
      source: ALL.source,
      rows: [
        {
          unitId: "u1",
          label: "일차부등식의 해와 성질",
          count: 5,
          fixed: false,
        },
        { unitId: "u2", label: "일차부등식의 풀이", count: 5, fixed: false },
        { unitId: "u3", label: "일차부등식의 활용", count: 5, fixed: false },
      ],
      total: null,
      ladder,
      recent: true,
      familyRule: true,
    });
    expect(input).not.toHaveProperty("problems");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "저장한 조건 · 1" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("textbox", { name: "조건 이름" }),
    ).not.toBeInTheDocument();
  });

  it("asks before replacing a condition of the same name, then replaces it with its revision", async () => {
    const client = fakeClient([
      saved("c1", "중2 확인 · 부등식 18", "2026-10-14T01:00:00.000Z"),
    ]);
    render(<Harness client={client} />);
    await pickAllScopes();
    fireEvent.click(screen.getByRole("button", { name: "조건 저장" }));
    fireEvent.change(screen.getByRole("textbox", { name: "조건 이름" }), {
      target: { value: "중2 확인 · 부등식 18" },
    });
    expect(screen.getByText(/같은 이름이 있습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const confirm = await screen.findByRole("alert");
    expect(confirm).toHaveTextContent(
      "«중2 확인 · 부등식 18»을 지금 조건으로 바꿀까요?",
    );
    expect(client.save).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole("button", { name: "바꾸기" }));
    await waitFor(() =>
      expect(client.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "중2 확인 · 부등식 18" }),
        { id: "c1", expectedRevision: 1 },
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "저장한 조건 · 1" }),
      ).toBeInTheDocument(),
    );
  });

  it("lists by last use with three lines per condition and the restore rule", async () => {
    const client = fakeClient([
      saved("old", "단원 마무리 25", "2026-09-30T01:00:00.000Z", {
        recent: false,
        total: 25,
        ladder: { ...ladder, 응용: 15, 심화하: 10 },
      }),
      saved("new", "일일 8문항 · 쉬운 쪽", "2026-10-13T01:00:00.000Z", {
        rows: [
          {
            unitId: "u1",
            label: "일차부등식의 해와 성질",
            count: 8,
            fixed: true,
          },
        ],
      }),
    ]);
    render(<Harness client={client} />);
    const dialog = await openList();
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("일일 8문항 · 쉬운 쪽");
    expect(rows[0]).toHaveTextContent("마지막 사용 10/13");
    expect(rows[0]).toHaveTextContent(
      "지정 없음(행의 합 8) · 난이도 지정 없음 · 최근 출제 뺌",
    );
    expect(rows[0]).toHaveTextContent(
      "전체 출처 · 범위 1 — 일차부등식의 해와 성질 8(고정)",
    );
    expect(rows[1]).toHaveTextContent(
      "25문항 · 응용 15 · 심화하 10 · 최근 출제 포함",
    );
    expect(dialog).toHaveTextContent(/조건만 가져옵니다/);
    expect(
      within(rows[0])
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["적용", "이름 바꾸기", "삭제"]);
  });

  it("applies conditions only, after re-counting the restored source, and reports dropped and short scopes", async () => {
    const compose = vi.fn().mockResolvedValue([]);
    const restore = vi.fn();
    const client = fakeClient([
      saved("c3", "단원 마무리 25", "2026-09-30T01:00:00.000Z", {
        source: BOOK.source,
        familyRule: false,
        total: null,
        ladder: { ...ladder, 기본: 3 },
        rows: [
          {
            unitId: "u1",
            label: "일차부등식의 해와 성질",
            count: 6,
            fixed: false,
          },
          { unitId: "u2", label: "일차부등식의 풀이", count: 7, fixed: true },
          { unitId: "u3", label: "일차부등식의 활용", count: 6, fixed: false },
          { unitId: "gone", label: "식의 대입과 변형", count: 6, fixed: false },
        ],
      }),
    ]);
    render(<Harness client={client} compose={compose} restore={restore} />);
    const dialog = await openList();
    fireEvent.click(within(dialog).getByRole("button", { name: "적용" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "저장한 조건" }),
      ).not.toBeInTheDocument(),
    );
    expect(restore).toHaveBeenCalledWith({
      source: BOOK.source,
      familyRule: false,
    });
    expect(client.touch).toHaveBeenCalledWith("c3");
    const report = await screen.findByText(
      /«단원 마무리 25»의 조건을 가져왔습니다/,
    );
    const box = report.closest("[data-apply-report]") as HTMLElement;
    expect(box).toHaveTextContent("[문항 구성 →]을 누르면 새로 고릅니다");
    expect(box).toHaveTextContent(
      "일차부등식의 활용 — 범위에서 뺐습니다(지금 출제 가능 문항이 없음)",
    );
    expect(box).toHaveTextContent(
      "식의 대입과 변형 — 범위에서 뺐습니다(차시를 찾지 못함)",
    );
    expect(box).toHaveTextContent(
      "모자람: 일차부등식의 풀이 — 최근 출제를 빼면 4갈래뿐(7 필요). 다른 범위에서 채우지 않습니다.",
    );
    // 표에는 남은 두 행 — 모자란 행은 출제 가능 수까지, 고정은 그대로.
    expect(
      screen.getByRole("spinbutton", {
        name: "일차부등식의 해와 성질 구성 수",
      }),
    ).toHaveValue(6);
    expect(
      screen.getByRole("spinbutton", { name: "일차부등식의 풀이 구성 수" }),
    ).toHaveValue(4);
    expect(
      screen.queryByRole("spinbutton", { name: "일차부등식의 활용 구성 수" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("기본 3")).toBeInTheDocument();
    expect(line().getByText("단원 마무리 25")).toBeInTheDocument();
    expect(line().getByText(/적용함/)).toBeInTheDocument();
    // 문항은 [문항 구성 →]을 눌러야 고른다.
    expect(compose).not.toHaveBeenCalled();
  });

  it("drops the «적용함» line as soon as the conditions are edited", async () => {
    const client = fakeClient([
      saved("c1", "일일 3문항", "2026-10-14T01:00:00.000Z"),
    ]);
    render(<Harness client={client} />);
    const dialog = await openList();
    fireEvent.click(within(dialog).getByRole("button", { name: "적용" }));
    await waitFor(() => expect(line().getByText(/적용함/)).toBeInTheDocument());
    expect(
      screen.getByText(/«일일 3문항»의 조건을 가져왔습니다/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "일차부등식의 해와 성질 문항 수 늘리기",
      }),
    );
    expect(line().queryByText(/적용함/)).not.toBeInTheDocument();
    expect(line().getByText(/직접 정함/)).toBeInTheDocument();
    expect(
      screen.queryByText(/«일일 3문항»의 조건을 가져왔습니다/),
    ).not.toBeInTheDocument();
  });

  it("renames in the row and refuses a name already in use", async () => {
    const client = fakeClient([
      saved("c1", "일일 3문항", "2026-10-14T01:00:00.000Z"),
      saved("c2", "단원 마무리", "2026-10-01T01:00:00.000Z"),
    ]);
    render(<Harness client={client} />);
    const dialog = await openList();
    const first = within(dialog).getAllByRole("listitem")[0];
    fireEvent.click(within(first).getByRole("button", { name: "이름 바꾸기" }));
    const input = within(first).getByRole("textbox", { name: "새 이름" });
    fireEvent.change(input, { target: { value: "단원 마무리" } });
    expect(
      within(first).getByText("같은 이름이 있습니다."),
    ).toBeInTheDocument();
    expect(
      within(first).getByRole("button", { name: "이름 저장" }),
    ).toBeDisabled();
    fireEvent.change(input, { target: { value: "일일 3문항 · 쉬운 쪽" } });
    fireEvent.click(within(first).getByRole("button", { name: "이름 저장" }));
    await waitFor(() =>
      expect(client.rename).toHaveBeenCalledWith(
        "c1",
        "일일 3문항 · 쉬운 쪽",
        1,
      ),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText("일일 3문항 · 쉬운 쪽"),
      ).toBeInTheDocument(),
    );
  });

  it("deletes only after the one confirmation, and cancel keeps it", async () => {
    const client = fakeClient([
      saved("c1", "일일 3문항", "2026-10-14T01:00:00.000Z"),
    ]);
    render(<Harness client={client} />);
    const dialog = await openList();
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
    const confirm = within(dialog).getByRole("alert");
    expect(confirm).toHaveTextContent(
      "«일일 3문항»을 지울까요? 이 조건으로 만든 시험지와 문항은 그대로입니다.",
    );
    fireEvent.click(within(confirm).getByRole("button", { name: "취소" }));
    expect(client.remove).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
    fireEvent.click(
      within(within(dialog).getByRole("alert")).getByRole("button", {
        name: "지우기",
      }),
    );
    await waitFor(() => expect(client.remove).toHaveBeenCalledWith("c1", 1));
    await waitFor(() =>
      expect(
        within(dialog).getByText(/저장한 조건이 없습니다/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "저장한 조건 · 0" }),
    ).toBeInTheDocument();
  });

  it("explains a refused save (limit) in the save box", async () => {
    const client = fakeClient([]);
    client.save.mockRejectedValueOnce(
      new ExamConditionError(
        "저장한 조건은 50개까지입니다. 쓰지 않는 조건을 지운 뒤 저장해 주세요.",
        "EXAM_CONDITION_LIMIT",
      ),
    );
    render(<Harness client={client} />);
    await pickAllScopes();
    fireEvent.click(screen.getByRole("button", { name: "조건 저장" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("50개까지");
    expect(
      screen.getByRole("textbox", { name: "조건 이름" }),
    ).toBeInTheDocument();
  });

  it("draws nothing of W5 without named conditions (English path)", async () => {
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "범위 선택" })).toBeEnabled(),
    );
    expect(document.querySelector("[data-condition-line]")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /저장한 조건/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "조건 저장" }),
    ).not.toBeInTheDocument();
  });
});
