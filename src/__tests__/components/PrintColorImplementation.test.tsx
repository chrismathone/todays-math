import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  INITIAL_META,
  PROBLEMS,
  PROPOSED_FIELDS,
  FIELDS,
} from "@/app/dev/print-color-hifi/fixtures";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import { PrintOptionsPanel } from "@/components/unified/print/PrintOptionsPanel";
import { COLORS, TEMPLATES } from "@/components/unified/print/settings";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
  type PrintMeta,
} from "@/components/unified/print/types";
import { inkOnColor } from "@/components/unified/print/readableColor";

function paper(
  template: PrintTemplate,
  color: string,
  meta: PrintMeta = INITIAL_META,
  showDate = true,
) {
  const Template = TEMPLATE_COMPONENTS[template];
  return new DOMParser().parseFromString(
    renderToStaticMarkup(
      <Template
        page={1}
        totalPages={1}
        totalProblems={PROBLEMS.length}
        columns={1}
        meta={meta}
        options={{ ...DEFAULT_PRINT_OPTIONS, template, color, showDate }}
        problems={PROBLEMS}
        startingNumber={1}
      />,
    ),
    "text/html",
  );
}

describe("approved C2 real paper composition", () => {
  it("matches the approved mockup's fields in all six templates and nine colors without mutating saved values", () => {
    const savedMeta = { ...INITIAL_META, patternName: "유형명 전용 검증값" };
    const before = JSON.stringify(savedMeta);
    for (const { value: template } of TEMPLATES)
      for (const [, color] of [
        ["남색", DEFAULT_PRINT_OPTIONS.color],
        ...COLORS,
      ]) {
        const doc = paper(template, color, {
          ...savedMeta,
          sheetTag: "주간TEST",
        });
        expect(
          [...doc.querySelectorAll("[data-meta-field]")]
            .map((node) => node.getAttribute("data-meta-field"))
            .sort(),
        ).toEqual([...PROPOSED_FIELDS[template]].sort());
        expect(doc.querySelector("[data-exam-type]")?.textContent).toBe(
          "주간TEST",
        );
        expect(doc.querySelectorAll("[data-problem-body]")).toHaveLength(4);
        const head = doc.querySelector<HTMLElement>("[data-print-header]")!;
        expect(head.style.getPropertyValue("--head-accent")).toBe(color);
        expect(head.style.getPropertyValue("--head-ink")).toBe(
          inkOnColor(color),
        );
        for (const number of doc.querySelectorAll<HTMLElement>(
          "[data-question-number]",
        )) {
          expect(number.style.background).not.toBe("");
          expect(number.style.color).not.toBe("");
        }
        // Disallowed metadata must not escape through a footer or another old information line.
        for (const [key] of FIELDS.filter(
          ([key]) => !PROPOSED_FIELDS[template].includes(key),
        )) {
          const value = String(savedMeta[key]);
          if (value && key !== "totalScore")
            expect(doc.body.textContent).not.toContain(
              value.replace(/\*/g, ""),
            );
        }
      }
    expect(JSON.stringify(savedMeta)).toBe(before);
  });

  it("omits an absent tag and the hidden date in every form, including old saved sheets", () => {
    for (const { value: template } of TEMPLATES) {
      const doc = paper(
        template,
        DEFAULT_PRINT_OPTIONS.color,
        INITIAL_META,
        false,
      );
      expect(doc.querySelector("[data-exam-type]")).toBeNull();
      expect(doc.body.textContent).not.toContain(INITIAL_META.examDate);
    }
  });
});

describe("P1 real input panel", () => {
  it("shows all fields and disables only those omitted by the selected form without writing data on render", () => {
    const onMeta = vi.fn();
    const onOptions = vi.fn();
    const props = {
      title: INITIAL_META.title,
      setTitle: vi.fn(),
      meta: INITIAL_META,
      onMeta,
      onOptions,
    };
    const view = render(
      <PrintOptionsPanel {...props} options={DEFAULT_PRINT_OPTIONS} />,
    );
    for (const { value: template } of TEMPLATES) {
      view.rerender(
        <PrintOptionsPanel
          {...props}
          options={{ ...DEFAULT_PRINT_OPTIONS, template }}
        />,
      );
      for (const [key, label] of FIELDS) {
        const input = screen.getByLabelText(label, { exact: true });
        if (PROPOSED_FIELDS[template].includes(key))
          expect(input).toBeEnabled();
        else {
          expect(input).toBeDisabled();
          expect(input).toHaveAccessibleDescription(/이 양식에는 찍히지 않음/);
        }
      }
    }
    expect(onMeta).not.toHaveBeenCalled();
    expect(onOptions).not.toHaveBeenCalled();
  });

  it("retains entered school and workbook strategy values while switching templates and back", () => {
    function Harness() {
      const [meta, setMeta] = useState(INITIAL_META);
      const [options, setOptions] = useState(DEFAULT_PRINT_OPTIONS);
      return (
        <PrintOptionsPanel
          title={meta.title}
          setTitle={() => {}}
          meta={meta}
          options={options}
          onMeta={(patch) => setMeta((value) => ({ ...value, ...patch }))}
          onOptions={(patch) => setOptions((value) => ({ ...value, ...patch }))}
        />
      );
    }
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("학교/기관명"), {
      target: { value: "보존 학교" },
    });
    const templates = screen.getByRole("group", { name: "템플릿" });
    fireEvent.click(within(templates).getByRole("button", { name: /^워크북/ }));
    expect(screen.getByLabelText("학교/기관명")).toBeDisabled();
    expect(screen.getByLabelText("학교/기관명")).toHaveValue("보존 학교");
    fireEvent.change(screen.getByLabelText("핵심 전략"), {
      target: { value: "보존 전략" },
    });
    fireEvent.click(within(templates).getByRole("button", { name: /^정통/ }));
    expect(screen.getByLabelText("학교/기관명")).toHaveValue("보존 학교");
    expect(screen.getByLabelText("핵심 전략")).toBeDisabled();
    fireEvent.click(within(templates).getByRole("button", { name: /^워크북/ }));
    expect(screen.getByLabelText("핵심 전략")).toHaveValue("보존 전략");
  });
});
