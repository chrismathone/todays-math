import assert from "node:assert/strict";
import type { DevAiResult } from "@/lib/dev-ai/contracts";
import type { FeatureCase } from "./fixtures";
import { ENGLISH_LINES } from "./fixtures";
import sharp from "sharp";
const compact = (s: string) => s.replace(/\s+/g, " ").trim();
const numbers = (s: string) => s.match(/\d+/g)?.map(Number) ?? [];
export async function cropInkEvidence(item: FeatureCase, result: DevAiResult) {
  const { data, info } = await sharp(item.image)
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Authored source bands, independently fixed before reading model bboxes.
  return [
    [130, 260],
    [420, 565],
  ].map(([top, bottom], index) => {
    const b = result.problems?.[index]?.bbox;
    assert(b);
    let sourceInk = 0,
      retainedInk = 0;
    for (let y = top; y < bottom; y++)
      for (let x = 40; x < 850; x++) {
        if (data[y * info.width + x] >= 128) continue;
        sourceInk++;
        if (
          x >= (b.left / 1000) * info.width &&
          x < ((b.left + b.width) / 1000) * info.width &&
          y >= (b.top / 1000) * info.height &&
          y < ((b.top + b.height) / 1000) * info.height
        )
          retainedInk++;
      }
    assert(sourceInk > 0);
    return {
      problem: index + 1,
      sourceBand: [40, top, 850, bottom],
      sourceInk,
      retainedInk,
      lostInk: sourceInk - retainedInk,
      retainedRatio: retainedInk / sourceInk,
      bbox: b,
    };
  });
}
export async function assertFeature(
  item: FeatureCase,
  result: DevAiResult | string,
) {
  if (item.id === "english-photo-read") {
    assert.equal(typeof result, "string");
    assert.equal(compact(result as string), compact(ENGLISH_LINES.join("\n")));
    return { exactPrintedText: true, printedAnswerPreserved: true };
  }
  assert.equal(typeof result, "object");
  const r = result as DevAiResult;
  switch (item.id) {
    case "ocr-ko-control":
      assert(r.content.replace(/\s+/g, "").includes("다음을계산하시오."));
      assert(
        r.content.includes("18") &&
          r.content.includes("27") &&
          r.content.includes("+"),
      );
      assert.deepEqual(
        numbers(r.content).filter((n) => [35, 40, 45, 50, 55].includes(n)),
        [35, 40, 45, 50, 55],
      );
      assert.equal(r.answer, "");
      assert.equal(r.solution, "");
      assert.equal(r.questionType, "multiple-choice");
      assert.equal(r.figures?.length ?? 0, 0);
      assert(!r.warnings.some((w) => w.includes("보기 누락")));
      return {
        koreanStem: true,
        operandsAndFiveChoices: true,
        printedAnswerBoundary: true,
        noMissingChoiceWarning: true,
        feature: "ocr",
      };
    case "ocr":
      assert(r.content.includes("18") && r.content.includes("27"));
      assert(
        r.content.includes("Calculate"),
        "Printed sentence must remain in the source language",
      );
      assert(r.content.includes("+"));
      assert.deepEqual(
        numbers(r.content).filter((n) => [35, 45, 55, 65].includes(n)),
        [35, 45, 55, 65],
      );
      assert.equal(r.answer, "");
      assert.equal(r.solution, "");
      assert.equal(r.questionType, "multiple-choice");
      assert.equal(r.figures?.length ?? 0, 0);
      return {
        operandsAndChoices: true,
        printedAnswerBoundary: true,
        nativeOcr: !!r.ocr,
      };
    case "page-ocr": {
      assert.equal(r.problems?.length, 2);
      const p = r.problems!;
      for (const problem of p) assert.equal(problem.answer, "");
      assert(p[0].bbox.top < p[1].bbox.top);
      // Independent authored ink anchors: both stem and answer/choices must fit.
      const ink = await cropInkEvidence(item, r);
      for (const measurement of ink)
        assert(
          measurement.retainedRatio >= 0.995,
          `Problem ${measurement.problem} crop loses ${measurement.lostInk}/${measurement.sourceInk} authored dark pixels`,
        );
      assert.equal(r.detectedGrade, undefined);
      if (!r.detectionOnly) {
        assert(p[0].content.includes("18") && p[0].content.includes("27"));
        assert(p[1].content.includes("6") && p[1].content.includes("7"));
      }
      return {
        problemCount: 2,
        regionsContainAuthoredInk: true,
        ink,
        printedAnswerBoundary: true,
        detectionOnly: r.detectionOnly === true,
        transcriptionDeferred: r.detectionOnly === true,
      };
    }
    case "figures": {
      assert.equal(r.figures?.length, 1);
      const b = r.figures![0].bbox;
      for (const [x, y] of [
        [260, 540],
        [660, 540],
        [260, 240],
        [165, 393],
        [685, 561],
        [450, 578],
      ]) {
        assert(x >= b.left - 15 && x <= b.left + b.width + 15);
        const ny = (y / 720) * 1000;
        assert(ny >= b.top - 15 && ny <= b.top + b.height + 15);
      }
      assert(b.top > 100, "Figure crop must exclude the printed question");
      assert.equal(r.content, "");
      assert.equal(r.answer, "");
      assert.equal(r.solution, "");
      return {
        count: 1,
        triangleAndLabelAnchorsInsideCrop: true,
        stemExcluded: true,
      };
    }
    case "solution": {
      assert.deepEqual(numbers(r.answer), [26]);
      const n = numbers(r.solution);
      assert(n.includes(8) && n.includes(5) && n.includes(26));
      assert(!/40\s*(?:cm|\\text|\\mathrm)/.test(r.answer));
      assert(/둘레/.test(r.solution));
      return {
        exactAnswerCm: 2 * (8 + 5),
        operandsPresent: true,
        explanationNeedsDirectReview: true,
      };
    }
    case "figure-edit":
      assert.deepEqual(r.edits, [{ op: "text", target: 3, text: "7 cm" }]);
      return {
        exactCommand: true,
        targetAndOtherElementsPreserved: true,
        editorApplicationNotExecuted: true,
      };
    case "figure-redraw": {
      assert.equal(r.engine, "todays-math-python");
      assert(r.svg?.startsWith("<svg"));
      assert.equal(r.spec?.version, 2);
      assert.equal(r.figureReview?.passed, true);
      const spec = r.spec!;
      const points = spec.points as Record<string, unknown>;
      for (const p of ["A", "B", "C"])
        assert(
          Array.isArray(points[p]),
          `Literal ${p} point needed for independent coordinate check`,
        );
      const [a, b, c] = ["A", "B", "C"].map((k) => points[k] as number[]);
      const ab = [b[0] - a[0], b[1] - a[1]],
        ac = [c[0] - a[0], c[1] - a[1]];
      const lab = Math.hypot(...ab),
        lac = Math.hypot(...ac);
      assert(lab > 0 && lac > 0);
      assert(
        Math.abs(lab / lac - 4 / 3) < 0.02,
        "Source 4:3 legs must match geometry",
      );
      assert(
        Math.abs((ab[0] * ac[0] + ab[1] * ac[1]) / (lab * lac)) < 0.01,
        "A must be a right angle",
      );
      const labels = JSON.stringify([spec.labels, spec.dimensions]);
      for (const label of ["A", "B", "C", "3", "4", "cm"])
        assert(labels.includes(label));
      assert(
        Object.keys((spec.angles ?? {}) as object).length > 0,
        "Right angle mark required",
      );
      return {
        strictRenderer: true,
        normalizedRightAngleDotProduct:
          (ab[0] * ac[0] + ab[1] * ac[1]) / (lab * lac),
        legRatio: lab / lac,
        labelsPresent: true,
        independentReview: r.figureReview,
        comparisonSeam: "native-sharp",
      };
    }
  }
  throw new Error(`Unknown feature ${item.id}`);
}
