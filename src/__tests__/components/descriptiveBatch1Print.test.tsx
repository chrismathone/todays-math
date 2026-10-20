import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MathText } from "@/components/math/MathText";
import {
  batch1Specimens,
  pickBatch1Specimen,
} from "@/app/dev/descriptive-paper/batch1Specimens";
import { DescriptivePaperPreview } from "@/app/dev/descriptive-paper/DescriptivePaperPreview";
import { DescriptiveRubricPage } from "@/components/print/DescriptiveRubricPage";
import { TestPrint } from "@/components/print/TestPrint";
import { toNativeDescriptivePrint } from "@/lib/print/descriptive";
import { readPaper, leaksOf } from "../helpers/paperView";

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
});
afterAll(() => {
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
});

describe("첫 묶음의 실제 제품 인쇄", () => {
  it("10정의 × 서로 다른 씨앗 5개를 보유하고, 잘못된 선택은 C05 첫 견본으로 돌아간다", () => {
    expect(batch1Specimens.map((entry) => entry.candidateId)).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `C${String(i + 1).padStart(2, "0")}`,
      ),
    );
    const ids = new Set<string>();
    for (const entry of batch1Specimens) {
      expect(entry.specimens).toHaveLength(5);
      expect(new Set(entry.specimens.map((s) => s.problem.seed)).size).toBe(5);
      for (const specimen of entry.specimens) {
        ids.add(specimen.problem.externalId);
        expect(specimen.problem.definitionId).toBe(
          entry.definition.definitionId,
        );
        expect(Boolean(specimen.figureSvg)).toBe(
          Boolean(specimen.problem.figureSpec),
        );
      }
    }
    expect(ids.size).toBe(50);
    const fallback = pickBatch1Specimen("unknown", "99");
    expect(fallback.entry.candidateId).toBe("C05");
    expect(fallback.sampleIndex).toBe(0);
  });

  for (const entry of batch1Specimens) {
    it(`${entry.candidateId}: 답·해설·채점 필드의 누출 검사가 양성 대조군도 찾는다`, () => {
      const specimen = structuredClone(entry.specimens[0]!);
      const canary = "교사용비공개검출문구";
      specimen.problem.answer = canary;
      specimen.problem.solution = canary;
      specimen.problem.modelAnswer = canary;
      specimen.problem.rubric.criteria.forEach((criterion) => {
        criterion.expected = canary;
        criterion.evidence = canary;
      });
      const native = toNativeDescriptivePrint(specimen.problem);
      const data = {
        testId: null,
        testType: "daily" as const,
        testDate: "2026-10-20",
        className: "검수",
        section: entry.definition.title,
        todayGoal: "",
        conceptNote: "",
        problems: [
          {
            id: specimen.problem.externalId,
            orderIndex: 0,
            questionType: "서술형",
            content: specimen.problem.content,
            answer: specimen.problem.answer,
            solution: specimen.problem.solution,
            figureSvg: specimen.figureSvg,
            nativeDescriptive: native,
          },
        ],
      };
      const student = render(<TestPrint data={data} />);
      expect(
        student.container.querySelector("[data-print-page]")!.textContent,
      ).not.toContain(canary);
      cleanup();
      const teacher = render(
        <DescriptiveRubricPage
          title="양성 대조군"
          items={[{ number: 1, data: native }]}
        />,
      );
      expect(
        teacher.container.querySelector("[data-print-page]")!.textContent,
      ).toContain(canary);
      cleanup();
    });

    it(`${entry.candidateId}: 5개 학생지에는 요구만, 교사용에는 모든 기준을 조판한다`, () => {
      for (
        let sampleIndex = 0;
        sampleIndex < entry.specimens.length;
        sampleIndex++
      ) {
        const specimen = entry.specimens[sampleIndex]!;
        const student = render(
          <DescriptivePaperPreview
            candidate={entry.candidateId}
            sample={String(sampleIndex)}
            paper="daily"
            audience="student"
            monochrome={false}
            mixed={false}
          />,
        );
        const paper = student.container.querySelector("[data-print-page]")!;
        expect(paper).not.toBeNull();
        expect(paper.querySelector("[data-writing-area]")).not.toBeNull();
        expect(paper.querySelector("[data-criterion]")).toBeNull();
        for (const requirement of specimen.problem.requirements) {
          const expected = document.createElement("div");
          expected.innerHTML = renderToStaticMarkup(
            <MathText text={requirement.text} />,
          );
          expect(paper.textContent).toContain(expected.textContent);
        }
        expect(paper.textContent).not.toContain(specimen.problem.modelAnswer);
        expect(paper.textContent).not.toContain("선행 오류");
        expect(paper.textContent).not.toContain("허용 다른 풀이");
        const read = readPaper(paper);
        expect(read.errors).toBe(0);
        expect(read.mathRaw).toBe(0);
        expect(leaksOf(read)).toEqual([]);
        cleanup();
        const teacher = render(
          <DescriptiveRubricPage
            title={entry.definition.title}
            items={[
              { number: 1, data: toNativeDescriptivePrint(specimen.problem) },
            ]}
          />,
        );
        expect(
          teacher.container.querySelectorAll("[data-criterion]"),
        ).toHaveLength(specimen.problem.rubric.criteria.length);
        expect(teacher.container.textContent).toContain("부분");
        expect(readPaper(teacher.container).errors).toBe(0);
        expect(readPaper(teacher.container).mathRaw).toBe(0);
        cleanup();
      }
    });
  }
});
