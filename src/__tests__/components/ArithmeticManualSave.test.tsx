import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import GradeWorkbench from "@/components/arithmetic/GradeArithmeticWorkbench";
import LegacyWorkbench from "@/components/arithmetic/LegacyArithmeticWorkbench";
import {
  PrivateCloudClient,
  PrivateCloudError,
} from "@/components/unified/privateCloudClient";
import type { PrivateDocument } from "@/contracts/privateWorkspace.contract";
import {
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
} from "@/contracts/arithmetic.contract";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
} from "@/contracts/arithmeticV2.contract";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import { defaultArithmeticPresentation } from "@/contracts/arithmeticPresentation.contract";
import type { ArithmeticOutputSheet } from "@/lib/arithmeticOutput";

vi.mock("next/dynamic", () => ({
  default: () =>
    function Editor(
      props: ComponentProps<
        typeof import("@/components/unified/WorksheetEditor").default
      >,
    ) {
      return (
        <section aria-label="공통 출력 편집기">
          {props.stepNavigation?.items.map((item) => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={item.onSelect}
            >
              {item.label}
            </button>
          ))}
          <input
            aria-label="출력 학습지 제목"
            value={props.title}
            onChange={(event) => props.setTitle(event.target.value)}
          />
          <select
            aria-label="공통 양식"
            value={props.printOptions?.template}
            onChange={(event) =>
              props.setPrintOptions?.({
                template: event.target.value as "modern",
              })
            }
          >
            <option value="yuhyung">유형</option>
            <option value="modern">모던</option>
            <option value="workbook">워크북</option>
          </select>
          <select
            aria-label="공통 단 수"
            value={props.printOptions?.columns}
            onChange={(event) =>
              props.setPrintOptions?.({
                columns: Number(event.target.value) as 1 | 2,
              })
            }
          >
            <option value="1">1단</option>
            <option value="2">2단</option>
          </select>
          <input
            aria-label="공통 정답지 포함"
            type="checkbox"
            checked={props.printOptions?.showAnswers ?? false}
            onChange={(event) =>
              props.setPrintOptions?.({ showAnswers: event.target.checked })
            }
          />
          <input
            aria-label="공통 강사명"
            value={props.printMeta?.instructorName ?? ""}
            onChange={(event) =>
              props.setPrintMeta?.({ instructorName: event.target.value })
            }
          />
          <output aria-label="출력 문항과 정답">
            {JSON.stringify(props.selected)}
          </output>
          <output aria-label="출력 설정">
            {JSON.stringify({
              printOptions: props.printOptions,
              printMeta: props.printMeta,
            })}
          </output>
          {props.outputNotice}
        </section>
      );
    },
}));

let writer = true;
const generated: ArithmeticOutputSheet[] = [];
const advance = async (time = 10000) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(time);
  });
};
const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};
const reviewItems = () =>
  within(screen.getByRole("region", { name: "생성한 문항 검토" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);
beforeEach(() => {
  vi.useFakeTimers();
  writer = true;
  generated.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (url, init) => {
      const grade = String(url).includes("/v2/");
      if (String(url).endsWith("/catalog"))
        return Response.json({
          data: {
            engineVersion: grade
              ? ARITHMETIC_V2_ENGINE_VERSION
              : ARITHMETIC_ENGINE_VERSION,
            catalogVersion: grade
              ? ARITHMETIC_V2_CATALOG_VERSION
              : ARITHMETIC_CATALOG_VERSION,
            writerEnabled: writer,
          },
        });
      if (String(url).endsWith("/generate")) {
        const sheet = grade
          ? buildArithmeticV2Sheet(JSON.parse(String(init?.body)))
          : buildArithmeticSheet(JSON.parse(String(init?.body)));
        generated.push(structuredClone(sheet));
        return Response.json({ data: sheet });
      }
      return Response.json({ error: "unavailable" }, { status: 503 });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function documentFor(
  payload: Record<string, unknown>,
  revision = 4,
): PrivateDocument {
  return {
    id: "stored-arithmetic",
    kind: "arithmeticSheet",
    title: "저장된 연산",
    revision,
    payload,
    problemCount: 3,
    createdAt: "2026-10-14",
    updatedAt: "2026-10-14",
  };
}
const versions = [
  {
    name: "grade",
    Component: GradeWorkbench,
    build: () =>
      buildArithmeticV2Sheet({
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        seed: "manual-save-v2",
        rounds: [
          {
            allocations: [{ typeId: listArithmeticV2Types()[0].id, count: 3 }],
          },
        ],
      }),
  },
  {
    name: "legacy",
    Component: LegacyWorkbench,
    build: () =>
      buildArithmeticSheet({
        engineVersion: ARITHMETIC_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_CATALOG_VERSION,
        seed: "manual-save-v1",
        rounds: [
          {
            skills: [
              {
                skillId: "times-table",
                count: 3,
                constraints: { dans: [3], multiplier: { min: 1, max: 9 } },
              },
            ],
          },
        ],
      }),
  },
];
describe.each(versions)("$name manual output save", ({ Component, build }) => {
  it("writes only on output save, reopens identical questions, answers and format, and explicitly updates with the saved revision", async () => {
    let stored: PrivateDocument | undefined;
    const save = vi
      .spyOn(PrivateCloudClient.prototype, "save")
      .mockImplementation(async (id, kind, title, payload, revision) => {
        expect(revision).toBe(stored?.revision ?? null);
        stored = {
          ...documentFor(structuredClone(payload), (stored?.revision ?? 0) + 1),
          id,
          kind,
          title,
        };
        return stored;
      });
    const view = render(<Component canOutput storageScope="teacher" />);
    await act(async () => {});
    expect(
      screen.queryByRole("button", { name: "내 시험지에 저장" }),
    ).toBeNull();
    await advance();
    expect(save).not.toHaveBeenCalled();
    await click("연습지 만들기");
    expect(generated).toHaveLength(1);
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "내 시험지에 저장" }),
    ).toBeNull();
    await advance();
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("학습지 제목"), {
      target: { value: "수동 저장 연습지" },
    });
    const questions = reviewItems();
    await click("정답 보기");
    expect(screen.getAllByLabelText("정답")).not.toHaveLength(0);
    const questionsAndAnswers = reviewItems();
    await click("정답 숨기기");
    await advance();
    expect(save).not.toHaveBeenCalled();
    await click("3 양식 구성·출력");
    fireEvent.change(screen.getByLabelText("공통 양식"), {
      target: { value: "modern" },
    });
    fireEvent.change(screen.getByLabelText("공통 강사명"), {
      target: { value: "김선생" },
    });
    fireEvent.change(screen.getByLabelText("공통 단 수"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByLabelText("공통 정답지 포함"));
    await advance();
    expect(save).not.toHaveBeenCalled();
    const output = screen.getByLabelText("출력 문항과 정답").textContent;
    const format = screen.getByLabelText("출력 설정").textContent;
    await click("내 시험지에 저장");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]).toEqual([
      stored!.id,
      "arithmeticSheet",
      "수동 저장 연습지",
      expect.objectContaining(generated[0]),
      null,
    ]);
    expect(stored?.payload.presentation).toMatchObject({
      version: 1,
      step: "output",
      printOptions: {
        template: "modern",
        columns: 1,
        showAnswers: true,
        quickAnswerOnly: true,
      },
      printMeta: { instructorName: "김선생" },
    });
    expect(stored?.payload.presentation).toEqual({
      version: 1,
      step: "output",
      ...JSON.parse(format!),
    });
    await advance();
    expect(save).toHaveBeenCalledTimes(1);
    view.unmount();
    vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue(stored!);
    render(
      <Component
        canOutput
        storageScope="teacher"
        initialDocumentId={stored!.id}
      />,
    );
    await act(async () => {});
    expect(screen.getByLabelText("공통 양식")).toHaveValue("modern");
    expect(screen.getByLabelText("공통 강사명")).toHaveValue("김선생");
    expect(screen.getByLabelText("출력 학습지 제목")).toHaveValue(
      "수동 저장 연습지",
    );
    expect(screen.getByLabelText("출력 문항과 정답").textContent).toBe(output);
    expect(screen.getByLabelText("출력 설정").textContent).toBe(format);
    await advance();
    expect(save).toHaveBeenCalledTimes(1);
    expect(generated).toHaveLength(1);
    await click("2 문항 검토");
    expect(reviewItems()).toEqual(questions);
    await click("정답 보기");
    expect(reviewItems()).toEqual(questionsAndAnswers);
    expect(
      screen.queryByRole("button", { name: "내 시험지에 저장" }),
    ).toBeNull();
    await advance();
    expect(save).toHaveBeenCalledTimes(1);
    await click("3 양식 구성·출력");
    fireEvent.change(screen.getByLabelText("출력 학습지 제목"), {
      target: { value: "수동 저장 연습지 수정" },
    });
    fireEvent.change(screen.getByLabelText("공통 양식"), {
      target: { value: "workbook" },
    });
    await advance();
    expect(save).toHaveBeenCalledTimes(1);
    await click("내 시험지에 저장");
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]).toEqual([
      save.mock.calls[0][0],
      "arithmeticSheet",
      "수동 저장 연습지 수정",
      expect.objectContaining({
        ...generated[0],
        presentation: expect.objectContaining({
          step: "output",
          printOptions: expect.objectContaining({ template: "workbook" }),
        }),
      }),
      1,
    ]);
    await advance();
    expect(save).toHaveBeenCalledTimes(2);
    expect(generated).toHaveLength(1);
  });
  it("does not queue in-flight format edits and retries a conflict only on another explicit save with the last revision", async () => {
    const stored = documentFor({
      ...build(),
      presentation: { ...defaultArithmeticPresentation(), step: "output" },
    });
    vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue(stored);
    let finish!: (document: PrivateDocument) => void;
    const save = vi
      .spyOn(PrivateCloudClient.prototype, "save")
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockRejectedValueOnce(
        new PrivateCloudError("다른 창에서 변경했습니다.", 409),
      )
      .mockImplementation(async (id, kind, title, payload) => ({
        ...stored,
        id,
        kind,
        title,
        payload,
        revision: 6,
      }));
    render(
      <Component
        canOutput
        storageScope="teacher"
        initialDocumentId={stored.id}
      />,
    );
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("공통 양식"), {
      target: { value: "modern" },
    });
    await advance();
    expect(save).not.toHaveBeenCalled();
    await click("내 시험지에 저장");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][4]).toBe(4);
    expect(
      screen.getByRole("button", { name: "내 시험지에 저장" }),
    ).toBeDisabled();
    await click("내 시험지에 저장");
    fireEvent.change(screen.getByLabelText("공통 강사명"), {
      target: { value: "다음 변경" },
    });
    await advance();
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ ...stored, payload: save.mock.calls[0][3], revision: 5 });
    });
    await advance();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][3]).toMatchObject({
      presentation: { printMeta: { instructorName: "" } },
    });
    expect(screen.getByLabelText("공통 강사명")).toHaveValue("다음 변경");
    await click("내 시험지에 저장");
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][4]).toBe(5);
    expect(save.mock.calls[1][3]).toMatchObject({
      presentation: { printMeta: { instructorName: "다음 변경" } },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/다른 창|충돌/);
    fireEvent.change(screen.getByLabelText("공통 양식"), {
      target: { value: "workbook" },
    });
    await advance(60000);
    expect(save).toHaveBeenCalledTimes(2);
    await click("내 시험지에 저장");
    expect(save).toHaveBeenCalledTimes(3);
    expect(save.mock.calls.map((call) => call[0])).toEqual([
      stored.id,
      stored.id,
      stored.id,
    ]);
    expect(save.mock.calls[2][4]).toBe(5);
    expect(save.mock.calls[2][3]).toMatchObject({
      rounds: stored.payload.rounds,
      presentation: {
        printOptions: { template: "workbook" },
        printMeta: { instructorName: "다음 변경" },
      },
    });
    expect(screen.queryByRole("alert")).toBeNull();
    await advance(60000);
    expect(save).toHaveBeenCalledTimes(3);
    expect(generated).toHaveLength(0);
  });

  it("retries a failed first save only on demand, keeping the new document id and null revision", async () => {
    const save = vi
      .spyOn(PrivateCloudClient.prototype, "save")
      .mockRejectedValueOnce(
        new PrivateCloudError("저장 서버에 연결할 수 없습니다.", 503),
      )
      .mockImplementation(async (id, kind, title, payload) => ({
        ...documentFor(payload, 1),
        id,
        kind,
        title,
      }));
    render(<Component canOutput storageScope="teacher" />);
    await act(async () => {});
    await click("연습지 만들기");
    await click("3 양식 구성·출력");
    await click("내 시험지에 저장");
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("공통 강사명"), {
      target: { value: "재시도 전 수정" },
    });
    await advance(60000);
    expect(save).toHaveBeenCalledTimes(1);
    await click("내 시험지에 저장");
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toBe(save.mock.calls[0][0]);
    expect(save.mock.calls.map((call) => call[4])).toEqual([null, null]);
    expect(save.mock.calls[1][3]).toMatchObject({
      ...generated[0],
      presentation: {
        step: "output",
        printMeta: { instructorName: "재시도 전 수정" },
      },
    });
    expect(screen.queryByRole("alert")).toBeNull();
    await advance(60000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it.each(["review", "output"] as const)(
    "never writes or regenerates when reopening an old snapshot at %s",
    async (initialStep) => {
      const save = vi
        .spyOn(PrivateCloudClient.prototype, "save")
        .mockRejectedValue(new Error("Unexpected save"));
      vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue(
        documentFor(build()),
      );
      render(
        <Component
          canOutput
          storageScope="teacher"
          initialDocumentId="stored-arithmetic"
          initialStep={initialStep}
        />,
      );
      await act(async () => {});
      expect(screen.getByRole("button", { name: "2 문항 검토" })).toBeEnabled();
      await advance();
      expect(save).not.toHaveBeenCalled();
      expect(generated).toHaveLength(0);
      await click("3 양식 구성·출력");
      fireEvent.change(screen.getByLabelText("공통 양식"), {
        target: { value: "modern" },
      });
      await advance();
      expect(save).not.toHaveBeenCalled();
      expect(generated).toHaveLength(0);
    },
  );

  it.each([
    { mode: "writer disabled", writerEnabled: false, preview: false },
    { mode: "preview", writerEnabled: true, preview: true },
  ])(
    "denies even an explicit output save in $mode",
    async ({ writerEnabled, preview }) => {
      writer = writerEnabled;
      const save = vi
        .spyOn(PrivateCloudClient.prototype, "save")
        .mockRejectedValue(new Error("Unexpected save"));
      render(<Component canOutput storageScope="teacher" preview={preview} />);
      await act(async () => {});
      await click("연습지 만들기");
      expect(
        screen.queryByRole("button", { name: "내 시험지에 저장" }),
      ).toBeNull();
      await advance();
      expect(save).not.toHaveBeenCalled();
      await click("3 양식 구성·출력");
      fireEvent.change(screen.getByLabelText("공통 양식"), {
        target: { value: "modern" },
      });
      expect(
        screen.getByRole("button", { name: "내 시험지에 저장" }),
      ).toBeDisabled();
      await click("내 시험지에 저장");
      await advance();
      expect(save).not.toHaveBeenCalled();
      expect(generated).toHaveLength(preview ? 0 : 1);
      if (preview) expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("keeps review available without output permission and never saves in the background", async () => {
    const save = vi
      .spyOn(PrivateCloudClient.prototype, "save")
      .mockRejectedValue(new Error("Unexpected save"));
    render(<Component canOutput={false} storageScope="teacher" />);
    await act(async () => {});
    await click("연습지 만들기");
    expect(
      screen.getByRole("region", { name: "생성한 문항 검토" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "내 시험지에 저장" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "3 양식 구성·출력" }),
    ).toBeDisabled();
    await click("3 양식 구성·출력");
    expect(
      screen.queryByRole("region", { name: "공통 출력 편집기" }),
    ).toBeNull();
    await advance();
    expect(save).not.toHaveBeenCalled();
  });
});
