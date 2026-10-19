import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import SavedLayouts from "@/components/unified/print/SavedLayouts";
import { PrintOptionsPanel } from "@/components/unified/print/PrintOptionsPanel";
import {
  PrintPresetError,
  type PrintPresetsClient,
} from "@/components/unified/print/printPresetsClient";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import type {
  PrintPreset,
  PrintPresetInput,
} from "@/contracts/printPreset.contract";

/**
 * 3단계 «내 양식»(W6 · Hi-fi 1안 — 원장님 2026-10-16).
 * 띠 한 줄(적용함 / 직접 정함) · 세 줄 목록(기본 딱지) · 적용은 통째로 덮는다 · 담는 칸을 바꾸면 «직접 정함» ·
 * 저장 창(담는 서식 / 담는 머리 정보 / 담지 않음 · 같은 이름이면 묻는다 · 기본 체크) · 삭제는 그 줄에서 묻는다.
 */

const head = (patch: Partial<PrintPresetInput["head"]> = {}) => ({
  schoolName: "인재원학원",
  subject: "수학",
  examDuration: "20분",
  examiner: "박선생",
  totalScore: 100,
  academyName: "",
  instructorName: "",
  ...patch,
});
const saved = (
  id: string,
  name: string,
  lastUsedAt: string,
  options: Partial<PrintOptions>,
  isDefault = false,
  headPatch: Partial<PrintPresetInput["head"]> = {},
): PrintPreset => ({
  id,
  revision: 1,
  preset: {
    v: 1,
    name,
    options: { ...DEFAULT_PRINT_OPTIONS, ...options },
    head: head(headPatch),
    isDefault,
    lastUsedAt,
    savedAt: lastUsedAt,
  },
});
const DAILY = saved(
  "l1",
  "일일TEST 2단",
  "2026-10-15T01:00:00.000Z",
  { columns: 2, layoutMode: "count", showAnswers: true, quickAnswerOnly: true },
  true,
);
const WEEKLY = saved(
  "l2",
  "주간 확인 풀이칸",
  "2026-10-11T01:00:00.000Z",
  { template: "workbook", solvingArea: "ruled", showDate: false },
  false,
  { schoolName: "", examDuration: "50분", academyName: "인재원학원" },
);

function fakeClient(initial: PrintPreset[]) {
  let rows = [...initial];
  const client = {
    list: vi.fn(async () => [...rows]),
    save: vi.fn(
      async (
        preset: PrintPresetInput,
        options: {
          makeDefault?: boolean;
          replace?: { id: string; expectedRevision: number };
        } = {},
      ) => {
        const same = rows.find(
          (row) =>
            row.preset.name === preset.name && row.id !== options.replace?.id,
        );
        if (same)
          throw new PrintPresetError(
            "같은 이름의 양식이 있습니다.",
            "PRINT_PRESET_NAME_TAKEN",
            { id: same.id, revision: same.revision },
          );
        const next: PrintPreset = {
          id: options.replace?.id ?? `new-${rows.length}`,
          revision: options.replace ? options.replace.expectedRevision + 1 : 1,
          preset: {
            ...preset,
            isDefault: Boolean(options.makeDefault),
            lastUsedAt: "2026-10-16T09:00:00.000Z",
            savedAt: "2026-10-16T09:00:00.000Z",
          },
        };
        rows = [next, ...rows.filter((row) => row.id !== next.id)];
        return next;
      },
    ),
    rename: vi.fn(async (id: string, name: string, revision: number) => {
      const row = rows.find((item) => item.id === id)!;
      return {
        ...row,
        revision: revision + 1,
        preset: { ...row.preset, name },
      };
    }),
    touch: vi.fn(async (id: string) => {
      const row = rows.find((item) => item.id === id)!;
      return {
        ...row,
        revision: row.revision + 1,
        preset: { ...row.preset, lastUsedAt: "2026-10-16T09:30:00.000Z" },
      };
    }),
    setDefault: vi.fn(async (id: string, isDefault: boolean) => {
      const row = rows.find((item) => item.id === id)!;
      return {
        ...row,
        revision: row.revision + 1,
        preset: { ...row.preset, isDefault },
      };
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
    }),
  } satisfies PrintPresetsClient;
  return client;
}

const SHEET_META: PrintMeta = {
  ...DEFAULT_PRINT_META,
  title: "중2 일차부등식",
  examDate: "2026-10-16",
  grade: "중2",
};

function Harness({
  client,
  start,
  onDefaultChange,
}: {
  client: PrintPresetsClient;
  start: { options: PrintOptions; meta: PrintMeta };
  onDefaultChange?: (preset: PrintPreset | null) => void;
}) {
  const [options, setOptions] = useState(start.options);
  const [meta, setMeta] = useState(start.meta);
  return (
    <>
      <PrintOptionsPanel
        title={meta.title}
        setTitle={() => {}}
        options={options}
        meta={meta}
        onOptions={(patch) => setOptions((o) => ({ ...o, ...patch }))}
        onMeta={(patch) => setMeta((m) => ({ ...m, ...patch }))}
        slots={{
          top: (
            <SavedLayouts
              client={client}
              options={options}
              meta={meta}
              onDefaultChange={onDefaultChange}
              onApply={(next) => {
                setOptions(next.options);
                setMeta(next.meta);
              }}
            />
          ),
        }}
      />
      <output data-testid="state">{JSON.stringify({ options, meta })}</output>
    </>
  );
}
const state = () =>
  JSON.parse(screen.getByTestId("state").textContent!) as {
    options: PrintOptions;
    meta: PrintMeta;
  };
const line = () => document.querySelector<HTMLElement>("[data-layout-line]")!;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("saved print layouts (W6 · Hi-fi 1)", () => {
  it("reads a new sheet opened with the default 양식 as «적용함» and counts the list", async () => {
    const onDefaultChange = vi.fn();
    render(
      <Harness
        client={fakeClient([WEEKLY, DAILY])}
        onDefaultChange={onDefaultChange}
        start={{
          options: DAILY.preset.options,
          meta: { ...SHEET_META, ...DAILY.preset.head },
        }}
      />,
    );
    await screen.findByRole("button", { name: "저장한 양식 · 2" });
    expect(line()).toHaveTextContent("양식일일TEST 2단 적용함");
    expect(onDefaultChange).toHaveBeenLastCalledWith(DAILY);
    // 담지 않는 칸(제목 · 학년 · 시험일)을 바꿔도 그대로.
    fireEvent.change(screen.getByRole("textbox", { name: "학년" }), {
      target: { value: "중3" },
    });
    expect(line()).toHaveTextContent("일일TEST 2단 적용함");
    // 담는 칸 하나 — «직접 정함 — ○○에서 바꿈».
    fireEvent.click(screen.getByRole("button", { name: "1단" }));
    expect(line()).toHaveTextContent("직접 정함 — 일일TEST 2단에서 바꿈");
    fireEvent.click(screen.getByRole("button", { name: "2단" }));
    expect(line()).toHaveTextContent("일일TEST 2단 적용함");
    fireEvent.click(screen.getByRole("checkbox", { name: "날짜 표시" }));
    expect(line()).toHaveTextContent("직접 정함");
  });

  it("shows «직접 정함 — 저장한 양식을 쓰지 않음» when nothing matches", async () => {
    render(
      <Harness
        client={fakeClient([DAILY])}
        start={{ options: DEFAULT_PRINT_OPTIONS, meta: SHEET_META }}
      />,
    );
    await screen.findByRole("button", { name: "저장한 양식 · 1" });
    expect(line()).toHaveTextContent("직접 정함 — 저장한 양식을 쓰지 않음");
  });

  it("lists three lines per 양식 with the default badge, and applying overwrites every carried value only", async () => {
    const client = fakeClient([DAILY, WEEKLY]);
    render(
      <Harness
        client={client}
        start={{ options: DEFAULT_PRINT_OPTIONS, meta: SHEET_META }}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "저장한 양식 · 2" }),
    );
    const dialog = screen.getByRole("dialog", { name: "저장한 양식" });
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(
      "일일TEST 2단새 시험지 기본마지막 사용 10/15",
    );
    expect(rows[0]).toHaveTextContent(
      "서식 · 정통 · 2단 · 보통 여백 · 1단당 3문항 · 보기 자동 · 빠른 정답만",
    );
    expect(rows[0]).toHaveTextContent(
      "머리 정보 · 인재원학원 · 시험 시간 20분 · 출제자 박선생",
    );
    expect(rows[1]).not.toHaveTextContent("새 시험지 기본");
    expect(
      within(rows[0]).getByRole("button", { name: "기본 해제" }),
    ).toBeVisible();
    expect(
      within(rows[1]).getByRole("button", { name: "기본으로" }),
    ).toBeVisible();
    expect(dialog).toHaveTextContent(
      "양식은 서식과 머리 정보의 고정 값만 바꿉니다. 문항 · 순서 · 제목 · 시험일 · 학년 · 학기는 그대로입니다.",
    );
    fireEvent.click(within(rows[1]).getByRole("button", { name: "적용" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const { options, meta } = state();
    expect(options).toEqual(WEEKLY.preset.options);
    expect(meta).toMatchObject({
      ...WEEKLY.preset.head,
      title: "중2 일차부등식",
      examDate: "2026-10-16",
      grade: "중2",
    });
    expect(line()).toHaveTextContent("주간 확인 풀이칸 적용함");
    expect(
      screen.getByText("«주간 확인 풀이칸»을 적용했습니다."),
    ).toHaveAttribute("role", "status");
    expect(client.touch).toHaveBeenCalledWith("l2");
    // 적용하면 목록 맨 위로.
    fireEvent.click(screen.getByRole("button", { name: "저장한 양식 · 2" }));
    expect(
      within(screen.getByRole("dialog")).getAllByRole("listitem")[0],
    ).toHaveTextContent("주간 확인 풀이칸");
  });

  it("[기본으로] moves the badge; delete asks in the row and warns when it is the default", async () => {
    const onDefaultChange = vi.fn();
    const client = fakeClient([DAILY, WEEKLY]);
    render(
      <Harness
        client={client}
        onDefaultChange={onDefaultChange}
        start={{ options: DEFAULT_PRINT_OPTIONS, meta: SHEET_META }}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "저장한 양식 · 2" }),
    );
    const dialog = screen.getByRole("dialog");
    let rows = within(dialog).getAllByRole("listitem");
    fireEvent.click(within(rows[1]).getByRole("button", { name: "기본으로" }));
    await waitFor(() =>
      expect(client.setDefault).toHaveBeenCalledWith("l2", true),
    );
    rows = within(dialog).getAllByRole("listitem");
    await waitFor(() =>
      expect(
        rows.find((row) => row.textContent!.includes("새 시험지 기본")),
      ).toHaveTextContent("주간 확인 풀이칸"),
    );
    expect(within(dialog).getAllByText("새 시험지 기본")).toHaveLength(1);
    expect(onDefaultChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "l2" }),
    );
    const weekly = within(dialog)
      .getAllByRole("listitem")
      .find((row) => row.textContent!.includes("주간 확인 풀이칸"))!;
    fireEvent.click(within(weekly).getByRole("button", { name: "삭제" }));
    const confirm = within(weekly).getByRole("alert");
    expect(confirm).toHaveTextContent(
      "«주간 확인 풀이칸»을 지울까요? 이 양식으로 만든 시험지는 그대로입니다. 새 시험지는 처음 값(정통 · 1단)으로 시작합니다.",
    );
    expect(client.remove).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(client.remove).toHaveBeenCalledWith("l2", 2));
    await screen.findByRole("button", { name: "저장한 양식 · 1" });
    expect(onDefaultChange).toHaveBeenLastCalledWith(null);
  });

  it("saving lists what is and isn't carried, asks before replacing the same name, and can become the default", async () => {
    const onDefaultChange = vi.fn();
    const client = fakeClient([DAILY, WEEKLY]);
    render(
      <Harness
        client={client}
        onDefaultChange={onDefaultChange}
        start={{
          options: DAILY.preset.options,
          meta: { ...SHEET_META, ...DAILY.preset.head },
        }}
      />,
    );
    await screen.findByRole("button", { name: "저장한 양식 · 2" });
    fireEvent.click(screen.getByRole("button", { name: "1단" }));
    fireEvent.click(screen.getByRole("button", { name: "양식 저장" }));
    const dialog = screen.getByRole("dialog", { name: "양식 저장" });
    const name = within(dialog).getByRole("textbox", { name: /양식 이름/ });
    // 적용했던 양식의 이름이 먼저 들어 있다.
    expect(name).toHaveValue("일일TEST 2단");
    expect(dialog).toHaveTextContent(
      "같은 이름이 있습니다 — 저장하면 바꿀지 묻습니다.",
    );
    expect(dialog).toHaveTextContent("담는 서식정통 · 1단 · 보통 여백");
    expect(dialog).toHaveTextContent(
      "담는 머리 정보인재원학원 · 시험 시간 20분 · 출제자 박선생",
    );
    expect(dialog).toHaveTextContent(
      "담지 않음문항 · 문제 순서 · 제목 · 시험일 · 학년 · 학기 · 오늘의 목표 · 개념 정리 · 유형명 · 핵심 전략 · 태그 — 시험지마다 다릅니다.",
    );
    expect(dialog).toHaveTextContent(
      "지금 기본은 «일일TEST 2단» — 고르면 이 양식으로 바뀝니다.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
    const ask = within(dialog).getByRole("alert");
    expect(ask).toHaveTextContent(
      "«일일TEST 2단»을 지금 설정으로 바꿀까요? 지난 저장 10/15의 내용은 남지 않습니다.",
    );
    expect(client.save).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "저장" })).toBeDisabled();
    fireEvent.click(within(ask).getByRole("button", { name: "바꾸기" }));
    await waitFor(() => expect(client.save).toHaveBeenCalledTimes(1));
    expect(client.save.mock.calls[0][0]).toMatchObject({
      v: 1,
      name: "일일TEST 2단",
      options: { ...DAILY.preset.options, columns: 1 },
      head: DAILY.preset.head,
    });
    expect(client.save.mock.calls[0][0]).not.toHaveProperty("title");
    expect(client.save.mock.calls[0][1]).toEqual({
      makeDefault: false,
      replace: { id: "l1", expectedRevision: 1 },
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(line()).toHaveTextContent("일일TEST 2단 적용함");

    fireEvent.click(screen.getByRole("button", { name: "양식 저장" }));
    const again = screen.getByRole("dialog", { name: "양식 저장" });
    fireEvent.change(
      within(again).getByRole("textbox", { name: /양식 이름/ }),
      {
        target: { value: "  오답 1단 " },
      },
    );
    fireEvent.click(
      within(again).getByRole("checkbox", {
        name: /새 시험지의 기본 양식으로/,
      }),
    );
    fireEvent.click(within(again).getByRole("button", { name: "저장" }));
    await waitFor(() => expect(client.save).toHaveBeenCalledTimes(2));
    expect(client.save.mock.calls[1][0].name).toBe("오답 1단");
    expect(client.save.mock.calls[1][1]).toEqual({ makeDefault: true });
    await waitFor(() =>
      expect(onDefaultChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: "new-2" }),
      ),
    );
    expect(line()).toHaveTextContent("오답 1단 적용함");
    fireEvent.click(screen.getByRole("button", { name: "저장한 양식 · 3" }));
    expect(
      within(screen.getByRole("dialog")).getAllByText("새 시험지 기본"),
    ).toHaveLength(1);
  });

  it("renames in the row and refuses a name already used", async () => {
    const client = fakeClient([DAILY, WEEKLY]);
    render(
      <Harness
        client={client}
        start={{ options: DEFAULT_PRINT_OPTIONS, meta: SHEET_META }}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "저장한 양식 · 2" }),
    );
    const row = within(screen.getByRole("dialog")).getAllByRole("listitem")[1];
    fireEvent.click(within(row).getByRole("button", { name: "이름 바꾸기" }));
    const input = within(row).getByRole("textbox", { name: "새 이름" });
    fireEvent.change(input, { target: { value: "일일TEST 2단" } });
    expect(
      within(row).getByRole("button", { name: "이름 저장" }),
    ).toBeDisabled();
    expect(row).toHaveTextContent("같은 이름이 있습니다.");
    fireEvent.change(input, { target: { value: "주간 확인" } });
    fireEvent.click(within(row).getByRole("button", { name: "이름 저장" }));
    await waitFor(() =>
      expect(client.rename).toHaveBeenCalledWith("l2", "주간 확인", 1),
    );
    await screen.findByText("주간 확인");
  });
});
