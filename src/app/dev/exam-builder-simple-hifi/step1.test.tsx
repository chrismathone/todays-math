import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";
import { StepOneScreen, StepOneVariants } from "./StepOneVariants";
import { STEP1_GRADES, STEP1_SCOPES, STEP1_VARIANTS } from "./step1Fixtures";

type Stage = "grade" | "chapter" | "lesson";
const stageName = { grade: "학년·과정", chapter: "단원", lesson: "차시" };
const getFrame = () =>
  document.querySelector<HTMLElement>("[data-step1-screen]")!;
const browser = (frame: HTMLElement) =>
  frame.querySelector<HTMLElement>("[data-scope-browser]")!;
const selected = (frame: HTMLElement) =>
  frame.querySelectorAll<HTMLElement>("[data-selected-scope]");

function openPicker(frame: HTMLElement, stage: Stage) {
  if (frame.dataset.step1Screen !== "S4") return;
  fireEvent.click(
    within(frame).getByRole("button", { name: `${stageName[stage]} 고르기` }),
  );
}
function choose(frame: HTMLElement, stage: "grade" | "chapter", value: string) {
  openPicker(frame, stage);
  const button = [
    ...frame.querySelectorAll<HTMLElement>(`[data-scope-${stage}]`),
  ].find((node) => node.getAttribute(`data-scope-${stage}`) === value);
  expect(button).toBeDefined();
  fireEvent.click(button!);
}
function edit(frame: HTMLElement, stage: "grade" | "chapter") {
  if (frame.dataset.step1Screen === "S2") {
    fireEvent.click(
      within(browser(frame)).getByRole("button", {
        name: `${stageName[stage]} 변경`,
      }),
    );
  } else if (frame.dataset.step1Screen === "S3") {
    const path = within(frame).getByRole("navigation", { name: "범위 경로" });
    fireEvent.click(
      within(path).getAllByRole("button")[stage === "grade" ? 0 : 1],
    );
  }
}
function pickFirst(frame: HTMLElement) {
  openPicker(frame, "lesson");
  const row = frame.querySelector<HTMLElement>("[data-scope-lesson]")!;
  const checkbox = within(row).getByRole("checkbox");
  fireEvent.click(checkbox);
  const scopeId = row.dataset.scopeLesson!;
  if (frame.dataset.step1Screen === "S4") {
    fireEvent.click(
      within(within(frame).getByRole("dialog")).getByRole("button", {
        name: "닫기",
      }),
    );
  }
  return scopeId;
}

describe("H2 1단계 · 차근차근", () => {
  it("기존 735차시의 이름·묶음·순서를 빠짐없이 사용한다", () => {
    expect(STEP1_SCOPES).toHaveLength(735);
    expect(new Set(STEP1_SCOPES.map((row) => row.id)).size).toBe(735);
    expect(
      STEP1_SCOPES.map(({ grade, chapter, name }) => ({
        grade,
        chapter,
        section: name,
      })),
    ).toEqual(
      [...CURRICULUM_UNITS]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(({ grade, chapter, section }) => ({ grade, chapter, section })),
    );
    expect(STEP1_GRADES).toHaveLength(16);
    expect(
      new Set(STEP1_SCOPES.map((row) => `${row.grade}:${row.chapter}`)).size,
    ).toBe(117);
  });

  it("새 절과 서로 다른 네 안을 추가하고 문항 검토는 기존 H2로 연결한다", () => {
    const { container } = render(<StepOneVariants />);
    expect(container.querySelector("#H2-step1")).not.toBeNull();
    expect(container.querySelectorAll("[data-step1-option]")).toHaveLength(4);
    expect(container.querySelectorAll('[data-hifi-screen$="-2"]')).toHaveLength(
      0,
    );
    for (const frame of container.querySelectorAll<HTMLElement>(
      "[data-step1-screen]",
    )) {
      expect(
        within(frame).getByRole("link", { name: /2\s*문항 검토/ }),
      ).toHaveAttribute("href", "#H2-2");
    }
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it.each(STEP1_VARIANTS)(
    "$id 처음에는 학년·과정만 고르고 상세 목록은 DOM에 그리지 않는다",
    (variant) => {
      render(<StepOneScreen variant={variant} />);
      const frame = getFrame();
      expect(frame.querySelector("[data-scope-chapter]")).toBeNull();
      expect(frame.querySelector("[data-scope-lesson]")).toBeNull();
      expect(selected(frame)).toHaveLength(0);
      expect(
        within(frame).getByRole("button", { name: "문항 구성" }),
      ).toBeDisabled();
      expect(
        within(frame).getByRole("button", { name: "전체" }),
      ).toHaveAttribute("aria-pressed", "true");
      openPicker(frame, "grade");
      expect(frame.querySelectorAll("[data-scope-grade]")).toHaveLength(16);
      expect(frame.querySelector("[data-scope-chapter]")).toBeNull();
      expect(frame.querySelector("[data-scope-lesson]")).toBeNull();
    },
  );

  it.each(STEP1_VARIANTS)(
    "$id 상위 선택으로 하위 탐색을 초기화하고 담은 범위는 중복 없이 누적한다",
    (variant) => {
      render(<StepOneScreen variant={variant} />);
      const frame = getFrame();
      const chapters = [
        ...new Set(
          STEP1_SCOPES.filter((row) => row.grade === "초3").map(
            (row) => row.chapter,
          ),
        ),
      ];
      choose(frame, "grade", "초3");
      expect(frame.querySelector("[data-scope-lesson]")).toBeNull();
      choose(frame, "chapter", chapters[0]);
      const first = pickFirst(frame);
      expect(selected(frame)).toHaveLength(1);
      const row = selected(frame)[0];
      expect(row.dataset.selectedScope).toBe(first);
      fireEvent.change(within(row).getByRole("spinbutton"), {
        target: { value: "3" },
      });
      expect(within(row).getByRole("spinbutton")).toHaveValue(3);
      expect(
        within(row).getByRole("checkbox", { name: /초3 .* 고정$/ }),
      ).toBeChecked();
      expect(pickFirst(frame)).toBe(first);
      expect(selected(frame)).toHaveLength(0);
      expect(pickFirst(frame)).toBe(first);
      expect(selected(frame)).toHaveLength(1);
      expect(within(selected(frame)[0]).getByRole("spinbutton")).toHaveValue(3);
      edit(frame, "chapter");
      choose(frame, "chapter", chapters[1]);
      openPicker(frame, "lesson");
      expect(frame.querySelector(`[data-scope-lesson="${first}"]`)).toBeNull();
      if (variant.id === "S4")
        fireEvent.click(
          within(within(frame).getByRole("dialog")).getByRole("button", {
            name: "닫기",
          }),
        );
      const second = pickFirst(frame);
      expect(second).not.toBe(first);
      expect(selected(frame)).toHaveLength(2);
      edit(frame, "grade");
      choose(frame, "grade", "중1");
      expect(frame.querySelector("[data-scope-lesson]")).toBeNull();
      expect(selected(frame)).toHaveLength(2);
      openPicker(frame, "chapter");
      const actual = [...frame.querySelectorAll("[data-scope-chapter]")].map(
        (node) => node.getAttribute("data-scope-chapter"),
      );
      expect(actual).toEqual([
        ...new Set(
          STEP1_SCOPES.filter((item) => item.grade === "중1").map(
            (item) => item.chapter,
          ),
        ),
      ]);
    },
  );

  it.each(STEP1_VARIANTS)(
    "$id 범위별 수·조건 창·실패 재시도·빼기를 같은 선택에 반영한다",
    (variant) => {
      render(<StepOneScreen variant={variant} />);
      const frame = getFrame();
      const firstScope = STEP1_SCOPES.find((row) => row.grade === "초3")!;
      choose(frame, "grade", firstScope.grade);
      choose(frame, "chapter", firstScope.chapter);
      pickFirst(frame);
      fireEvent.click(within(frame).getByRole("button", { name: "구성 조건" }));
      const conditions = within(frame).getByRole("dialog", {
        name: "구성 조건",
      });
      expect(conditions).toHaveTextContent(firstScope.name);
      fireEvent.click(within(conditions).getByRole("button", { name: "적용" }));
      expect(within(selected(frame)[0]).getByRole("spinbutton")).toHaveValue(
        40,
      );
      expect(
        within(frame).getByRole("link", { name: "문항 구성" }),
      ).toHaveAttribute("href", "#H2-2");
      if (variant.id === "S4") openPicker(frame, "lesson");
      fireEvent.change(
        within(frame).getByRole("combobox", {
          name: `${variant.id} 1단계 목록 상태`,
        }),
        { target: { value: "error" } },
      );
      expect(frame).toHaveTextContent("선택은 유지됩니다.");
      expect(selected(frame)).toHaveLength(1);
      fireEvent.click(
        within(frame).getAllByRole("button", { name: "다시 불러오기" })[0],
      );
      expect(frame.querySelector('[data-list-state="error"]')).toBeNull();
      expect(within(selected(frame)[0]).getByRole("spinbutton")).toHaveValue(
        40,
      );
      if (variant.id === "S4")
        fireEvent.click(
          within(within(frame).getByRole("dialog")).getByRole("button", {
            name: "닫기",
          }),
        );
      fireEvent.click(
        within(selected(frame)[0]).getByRole("button", { name: /빼기$/ }),
      );
      expect(selected(frame)).toHaveLength(0);
      expect(
        within(frame).getByRole("button", { name: "문항 구성" }),
      ).toBeDisabled();
    },
  );

  it("공용 PickerDialog는 현재 단계만 열고 닫기·Escape 후 연 단추로 초점을 돌린다", () => {
    render(<StepOneScreen variant={STEP1_VARIANTS[3]} />);
    const frame = getFrame();
    const opener = within(frame).getByRole("button", {
      name: "학년·과정 고르기",
    });
    fireEvent.click(opener);
    const dialog = within(frame).getByRole("dialog", {
      name: "학년·과정 고르기",
    });
    expect(dialog.querySelectorAll("[data-step1-stage]")).toHaveLength(1);
    expect(within(dialog).getByRole("button", { name: "닫기" })).toHaveFocus();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(within(frame).queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("여러 학년의 저장 조건을 적용하면 범위·수·출처와 마지막 탐색 경로를 복원한다", () => {
    render(<StepOneScreen variant={STEP1_VARIANTS[2]} />);
    const frame = getFrame();
    const first = STEP1_SCOPES.find((row) => row.grade === "초3")!;
    const last = STEP1_SCOPES.find((row) => row.grade === "중1")!;
    choose(frame, "grade", first.grade);
    choose(frame, "chapter", first.chapter);
    pickFirst(frame);
    fireEvent.change(within(selected(frame)[0]).getByRole("spinbutton"), {
      target: { value: "3" },
    });
    edit(frame, "grade");
    choose(frame, "grade", last.grade);
    choose(frame, "chapter", last.chapter);
    pickFirst(frame);
    fireEvent.change(
      within(frame).getByRole("spinbutton", { name: "총 문항 수" }),
      { target: { value: "4" } },
    );
    fireEvent.click(within(frame).getByRole("button", { name: "교과서만" }));
    fireEvent.click(within(frame).getByRole("button", { name: "조건 저장" }));
    const save = within(frame).getByRole("dialog", { name: "저장한 조건" });
    fireEvent.change(
      within(save).getByRole("textbox", { name: "현재 조건 이름" }),
      { target: { value: "초3·중1 확인" } },
    );
    fireEvent.submit(save.querySelector("form")!);
    fireEvent.click(within(save).getAllByRole("button", { name: "닫기" })[0]);
    for (const row of selected(frame))
      fireEvent.click(within(row).getByRole("button", { name: /빼기$/ }));
    edit(frame, "grade");
    choose(frame, "grade", "공통수학1");
    fireEvent.click(within(frame).getByRole("button", { name: "전체" }));
    fireEvent.click(
      within(frame).getByRole("button", { name: "저장한 조건 · 1" }),
    );
    const saved = within(frame).getByRole("dialog", { name: "저장한 조건" });
    const preset = saved.querySelector("article")!;
    expect(preset).toHaveTextContent("초3 · 중1 · 2범위 · 교과서만");
    fireEvent.click(within(preset).getByRole("button", { name: "적용" }));
    expect(
      [...selected(frame)].map((row) => row.dataset.selectedScope),
    ).toEqual([first.id, last.id]);
    expect(within(selected(frame)[0]).getByRole("spinbutton")).toHaveValue(3);
    expect(within(selected(frame)[0]).getByRole("checkbox")).toBeChecked();
    expect(
      within(frame).getByRole("spinbutton", { name: "총 문항 수" }),
    ).toHaveValue(4);
    expect(
      within(frame).getByRole("button", { name: "교과서만" }),
    ).toHaveAttribute("aria-pressed", "true");
    const path = within(frame).getByRole("navigation", { name: "범위 경로" });
    expect(path).toHaveTextContent(`${last.grade}›${last.chapter}›차시`);
    expect(frame.querySelector("[data-scope-lesson]")).toHaveAttribute(
      "data-scope-lesson",
      last.id,
    );
  });

  it.each(["S2", "S3"])(
    "%s는 이전 목록이 사라지면 새 단계 제목으로 초점을 옮긴다",
    (variantId) => {
      render(
        <StepOneScreen
          variant={STEP1_VARIANTS.find((item) => item.id === variantId)!}
        />,
      );
      const frame = getFrame();
      choose(frame, "grade", "초3");
      expect(
        frame.querySelector('[data-step1-stage="chapter"] h5'),
      ).toHaveFocus();
      const chapter = STEP1_SCOPES.find((row) => row.grade === "초3")!.chapter;
      choose(frame, "chapter", chapter);
      expect(
        frame.querySelector('[data-step1-stage="lesson"] h5'),
      ).toHaveFocus();
    },
  );

  it("차시가 32개인 단원은 20개씩 탐색하고 검색으로 마지막 차시를 고른다", () => {
    render(<StepOneScreen variant={STEP1_VARIANTS[2]} />);
    const frame = getFrame();
    const rows = STEP1_SCOPES.filter(
      (row) =>
        row.grade === "공통수학1" && row.chapter === "2. 방정식과 부등식",
    );
    expect(rows).toHaveLength(32);
    choose(frame, "grade", rows[0].grade);
    choose(frame, "chapter", rows[0].chapter);
    expect(frame.querySelectorAll("[data-scope-lesson]")).toHaveLength(20);
    fireEvent.click(within(frame).getByRole("button", { name: "다음 차시" }));
    expect(frame.querySelectorAll("[data-scope-lesson]")).toHaveLength(12);
    fireEvent.change(
      within(frame).getByRole("searchbox", { name: "차시 검색" }),
      { target: { value: rows.at(-1)!.name } },
    );
    expect(frame.querySelectorAll("[data-scope-lesson]")).toHaveLength(1);
    expect(pickFirst(frame)).toBe(rows.at(-1)!.id);
    fireEvent.change(
      within(frame).getByRole("searchbox", { name: "차시 검색" }),
      { target: { value: "없는 차시 검색" } },
    );
    expect(frame).toHaveTextContent("검색 결과가 없습니다.");
    expect(selected(frame)).toHaveLength(1);
  });
});
