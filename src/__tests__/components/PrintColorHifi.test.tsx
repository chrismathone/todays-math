import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ColorPaper } from "@/app/dev/print-color-hifi/ColorPaper";
import { PrintColorHifi } from "@/app/dev/print-color-hifi/PrintColorHifi";
import {
  COLOR_CASES,
  CURRENT_FIELDS,
  displayValue,
  INITIAL_META,
  PROPOSED_FIELDS,
  VARIANTS,
} from "@/app/dev/print-color-hifi/fixtures";
import { TEMPLATES } from "@/components/unified/print/settings";

beforeAll(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  ),
);
afterAll(() => vi.unstubAllGlobals());

describe("print color and information Hi-fi", () => {
  it("renders all proposed sheets with their own information and the same four questions", () => {
    for (const { value: template } of TEMPLATES)
      for (const { id: variant } of VARIANTS.filter(({ id }) => id !== "C5"))
        for (const { value: color } of COLOR_CASES) {
          const doc = new DOMParser().parseFromString(
            renderToStaticMarkup(
              <ColorPaper
                template={template}
                variant={variant}
                color={color}
                meta={INITIAL_META}
              />,
            ),
            "text/html",
          );
          const fields = [...doc.querySelectorAll("[data-meta-field]")];
          expect(
            fields.map((node) => node.getAttribute("data-meta-field")).sort(),
          ).toEqual([...PROPOSED_FIELDS[template]].sort());
          for (const field of PROPOSED_FIELDS[template]) {
            const text = doc.querySelector(
              `[data-meta-field="${field}"]`,
            )!.textContent!;
            expect(text.replace(/\*/g, "")).toContain(
              displayValue(INITIAL_META, field).replace(/\*/g, ""),
            );
          }
          expect(doc.querySelectorAll("[data-demo-sheet]")).toHaveLength(1);
          expect(doc.querySelectorAll("[data-problem-body]")).toHaveLength(4);
          expect(doc.querySelector("[data-exam-type]")?.textContent).toBe(
            "일일TEST",
          );
        }
  });

  it("keeps the previous product snapshot and common information line for C5", () => {
    for (const { value: template } of TEMPLATES) {
      const doc = new DOMParser().parseFromString(
        renderToStaticMarkup(
          <ColorPaper
            template={template}
            variant="C5"
            color="#0EA5E9"
            meta={INITIAL_META}
          />,
        ),
        "text/html",
      );
      expect(doc.querySelectorAll("[data-exam-details]")).toHaveLength(
        template === "jeongtong" ? 0 : 1,
      );
      expect(doc.querySelector("[data-exam-type]")).toBeNull();
      for (const field of CURRENT_FIELDS[template]) {
        expect(doc.body.textContent!.replace(/\*/g, "")).toContain(
          (field === "totalScore" && template === "jeongtong"
            ? "100"
            : displayValue(INITIAL_META, field)
          ).replace(/\*/g, ""),
        );
      }
    }
  });

  it("omits the exam type only when None is selected in every proposed template", () => {
    for (const { value: template } of TEMPLATES) {
      const doc = new DOMParser().parseFromString(
        renderToStaticMarkup(
          <ColorPaper
            template={template}
            variant="C4"
            color="#0EA5E9"
            meta={INITIAL_META}
            examType="없음"
          />,
        ),
        "text/html",
      );
      expect(doc.querySelector("[data-exam-type]")).toBeNull();
      expect(doc.querySelectorAll("[data-problem-body]")).toHaveLength(4);
    }
  });

  it("compares two input panels, preserves hidden inputs and updates only the proposed printed fields", () => {
    render(<PrintColorHifi />);
    const panel = screen.getByRole("region", { name: "입력 패널 2안" });
    expect(
      screen.getByRole("button", { name: "P1 · 미사용 칸 비활성" }),
    ).toHaveAttribute("aria-pressed", "true");
    const school = within(panel).getByRole("textbox", { name: /학교\/기관명/ });
    expect(school).toBeDisabled();
    expect(school).toHaveAccessibleDescription(
      "이 양식에는 찍히지 않음 · 유형·전략 중심 양식입니다.",
    );
    fireEvent.click(screen.getByRole("button", { name: /^정통/ }));
    const activeSchool = within(panel).getByRole("textbox", {
      name: "학교/기관명",
    });
    expect(activeSchool).toBeEnabled();
    fireEvent.change(activeSchool, { target: { value: "입력 보존 학교" } });
    fireEvent.click(screen.getByRole("button", { name: /^유형/ }));
    expect(
      within(panel).getByRole("textbox", { name: /학교\/기관명/ }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "P2 · 쓰는 칸만 표시" }),
    );
    expect(
      within(panel).queryByRole("textbox", { name: /학교\/기관명/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^정통/ }));
    expect(
      within(panel).getByRole("textbox", { name: "학교/기관명" }),
    ).toHaveValue("입력 보존 학교");
    expect(
      screen
        .getByRole("region", { name: "정통 · C1 머리띠 · 구획선" })
        .querySelector('[data-meta-field="schoolName"]'),
    ).toHaveTextContent("입력 보존 학교");
    fireEvent.click(screen.getByRole("button", { name: /^자습/ }));
    expect(
      within(panel).getByRole("textbox", { name: "개념 정리" }),
    ).toBeVisible();
    expect(within(panel).queryByRole("textbox", { name: "유형명" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "날짜 표시" }));
    expect(document.querySelector('[data-meta-field="examDate"]')).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "시험 종류" }), {
      target: { value: "없음" },
    });
    expect(document.querySelector("[data-exam-type]")).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "시험 종류" }), {
      target: { value: "주간TEST" },
    });
    const tags = [...document.querySelectorAll("[data-exam-type]")];
    expect(tags).toHaveLength(17);
    for (const tag of tags) expect(tag).toHaveTextContent("주간TEST");
  });
});
