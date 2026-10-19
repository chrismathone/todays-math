import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaperProblemView } from "@/components/print/PaperProblemView";
import NativeProblem from "@/components/unified/NativeProblem";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import { ProblemBody } from "@/components/unified/print/templates/ProblemBody";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";

import {
  PROOF_CHOICE_CASES,
  withCircledChoices,
} from "./__fixtures__/proofChoiceBoundary";

describe("FLOW-F01: screen and print keep proof markers outside the choice grid", () => {
  for (const fixture of PROOF_CHOICE_CASES) {
    const problem: StudioProblem = {
      id: `synthetic-proof-${fixture.name}`,
      content: withCircledChoices(fixture.stem, fixture.choices),
      answer: "",
      solution: "",
      grade: "중2",
      chapter: "",
      section: "",
      difficulty: "",
      problemCode: "",
      figureUrls: ["/figures/synthetic-proof.png"],
      choiceFigureIndex: [0],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
    };
    const cases: [string, ReactElement, boolean][] = [
      ["bank screen", <UnifiedProblem key="bank" problem={problem} />, true],
      [
        "paper screen",
        <PaperProblemView key="paper-screen" {...problem} />,
        true,
      ],
      [
        "paper print",
        <PaperProblemView key="paper-print" {...problem} framed={false} />,
        false,
      ],
      [
        "shared print template body",
        <ProblemBody
          key="template"
          problem={{ ...problem, topic: "합성 표시 검증" }}
          options={DEFAULT_PRINT_OPTIONS}
        />,
        false,
      ],
      [
        "unstructured native fallback",
        <NativeProblem key="native" problem={problem} print />,
        false,
      ],
    ];

    it.each(cases)(`${fixture.observed.code}: %s`, (name, element, lazy) => {
      const { container } = render(element);
      const grid = container.querySelector("[data-hwpx-grid]");
      expect(grid).not.toBeNull();
      expect(grid!.children).toHaveLength(5);
      Array.from(grid!.children).forEach((cell, i) => {
        expect(cell.querySelector("span")?.textContent).toBe(
          String.fromCharCode(0x2460 + i),
        );
        const choice = fixture.choices[i];
        if (choice.startsWith("$")) {
          expect(cell.querySelector("annotation")?.textContent).toBe(
            `\\displaystyle ${choice.slice(1, -1)}`,
          );
        } else {
          expect(cell).toHaveTextContent(choice);
        }
      });

      const figure = container.querySelector("img");
      expect(container.querySelectorAll("img")).toHaveLength(1);
      expect(figure).toHaveAttribute("src", "/figures/synthetic-proof.png");
      expect(grid!.contains(figure)).toBe(false);
      expect(figure!.compareDocumentPosition(grid!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      if (lazy) expect(figure).toHaveAttribute("loading", "lazy");
      else expect(figure).not.toHaveAttribute("loading");
      // Native's existing fallback keeps this unnumbered marker as text.
      if (name === "unstructured native fallback")
        expect(container).toHaveTextContent("[그림]");
      else expect(container).not.toHaveTextContent("[그림]");
      expect(container.querySelectorAll(".katex-error")).toHaveLength(0);

      // Read stem text independently of KaTeX's duplicated MathML/visual text.
      const stem = container.cloneNode(true) as HTMLElement;
      stem.querySelector("[data-hwpx-grid]")!.remove();
      for (const mark of ["①", "②", "③", "④", "⑤"])
        expect(stem).toHaveTextContent(mark);
      expect(stem).toHaveTextContent(
        fixture.name === "empty fifth reasoning marker"
          ? "마지막 검토 표시를 남긴다."
          : "이라고 끝맺었다.",
      );
    });
  }
});
