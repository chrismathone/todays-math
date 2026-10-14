import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
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
          <input
            aria-label="공통 강사명"
            value={props.printMeta?.instructorName ?? ""}
            onChange={(event) =>
              props.setPrintMeta?.({ instructorName: event.target.value })
            }
          />
          {props.outputNotice}
        </section>
      );
    },
}));

let writer = true;
let generated = 0;
const advance = async (time = 1201) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(time);
  });
};
const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};
beforeEach(() => {
  vi.useFakeTimers();
  writer = true;
  generated = 0;
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
        generated++;
        return Response.json({
          data: grade
            ? buildArithmeticV2Sheet(JSON.parse(String(init?.body)))
            : buildArithmeticSheet(JSON.parse(String(init?.body))),
        });
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
        seed: "autosave-v2",
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
        seed: "autosave-v1",
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
describe.each(versions)("$name autosave", ({ Component, build }) => {
  it("debounces generation and format changes, then reopens the exact snapshot and format without a write or reroll", async () => {
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
    await click("연습지 만들기");
    expect(save).not.toHaveBeenCalled();
    await advance();
    expect(save).toHaveBeenCalledTimes(1);
    expect(stored?.payload.presentation).toMatchObject({
      version: 1,
      step: "review",
    });
    const rounds = structuredClone(stored!.payload.rounds);
    await click("3 양식 구성·출력");
    fireEvent.change(screen.getByLabelText("공통 양식"), {
      target: { value: "modern" },
    });
    fireEvent.change(screen.getByLabelText("공통 강사명"), {
      target: { value: "김선생" },
    });
    await advance();
    expect(save).toHaveBeenCalledTimes(2);
    expect(stored?.payload.presentation).toMatchObject({
      step: "output",
      printOptions: { template: "modern", quickAnswerOnly: true },
      printMeta: { instructorName: "김선생" },
    });
    expect(stored?.payload.rounds).toEqual(rounds);
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
    await advance(5000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(generated).toBe(1);
  });
  it("serializes in-flight format edits using the returned revision and stops after conflicts", async () => {
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
      .mockRejectedValue(
        new PrivateCloudError("다른 창에서 변경했습니다.", 409),
      );
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
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("공통 강사명"), {
      target: { value: "다음 변경" },
    });
    await advance(5000);
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ ...stored, revision: 5 });
    });
    await advance();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][4]).toBe(5);
    expect(save.mock.calls[1][3]).toMatchObject({
      presentation: { printMeta: { instructorName: "다음 변경" } },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "자동 저장을 멈췄습니다",
    );
    await advance(10000);
    expect(save).toHaveBeenCalledTimes(2);
    await click("내 시험지에 저장");
    expect(save.mock.calls[2][4]).toBe(5);
  });
  it("never writes merely reopening an old snapshot, with writer off or in preview", async () => {
    const save = vi.spyOn(PrivateCloudClient.prototype, "save");
    vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue(
      documentFor(build()),
    );
    const old = render(
      <Component
        canOutput
        storageScope="teacher"
        initialDocumentId="stored-arithmetic"
        initialStep="output"
      />,
    );
    await act(async () => {});
    await advance(5000);
    expect(save).not.toHaveBeenCalled();
    old.unmount();
    writer = false;
    const closed = render(<Component canOutput storageScope="teacher" />);
    await act(async () => {});
    await click("연습지 만들기");
    await advance(5000);
    expect(save).not.toHaveBeenCalled();
    closed.unmount();
    render(<Component canOutput storageScope="teacher" preview />);
    await click("연습지 만들기");
    await advance(5000);
    expect(save).not.toHaveBeenCalled();
  });
});
