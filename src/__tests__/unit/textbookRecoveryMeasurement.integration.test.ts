// @vitest-environment node
/**
 * Recovery measurement: the private canonical recall probes, and the automatic introduction in
 * the production chunk renderer.
 *
 * The first block needs no browser. The rest is real trusted Chromium — not mocked boxes:
 *
 *   TEXTBOOK_PDF_TEST=1 node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts src/__tests__/unit/textbookRecoveryMeasurement.integration.test.ts
 *
 * What is proved: with the study phase off, the canonical rows are still measured in a private
 * document that never reaches the student; the student model, HTML and later documents hold no
 * hidden key or withheld sentence; the common row heights are the measured maximum; no general
 * problem answer enters the probe. All 72 introductions with their PDFs, PNGs and contact sheets
 * are produced by `scripts/qa/textbook/recovery/intro-proof.ts` under real tsx.
 * This is not the source 2-1-1 gate and does not replace it.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { launchExportBrowser } from "@/lib/export/pdfServer";
import {
  measurementHtml,
  recallMeasurementHtml,
} from "@/lib/textbook/render/html";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  recallMeasurementModel,
  recoveryMeasurePlan,
} from "@/lib/textbook/render/recoveryMeasurement";
import { unitOpeningById } from "@/lib/textbook/unitOpenings";
import {
  canonicalRows,
  expectedIntro,
  introBook,
  introNode,
  MEMORY_SECTION_KEY,
  MEMORY_VARIANTS,
  memoryExchange,
  negativeControls,
  partialCases,
  PROBLEM_ANSWER,
  PROBLEM_SOLUTION,
  proveMeasurement,
  renderIntroChunk,
  ROW_DOM_PROBE,
  squash,
  SYNTHETIC_TALL_SECTION,
  verifyIntro,
  verifyRenderModel,
  verifyStudentPrivacy,
  type CapturedRow,
  type IntroCase,
  type MemoryVariant,
} from "../../../scripts/qa/textbook/recovery/intro-proof";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};
const rowsOf = (html: string) =>
  (
    new Function(`return ${ROW_DOM_PROBE}`)() as (
      document: Document,
    ) => CapturedRow[]
  )(new JSDOM(`<body>${html}</body>`).window.document);
const resources = {
  assetUrl: (): string => {
    throw new Error("The memory proof holds no stored asset");
  },
  qrDataUrl: (): string => "data:image/png;base64,AA==",
};
const canonical = canonicalRows(MEMORY_SECTION_KEY);
const STUDY_OFF = MEMORY_VARIANTS[1];
/** The memory section alone: the chunk the renderer measures. */
const chunkModel = (variant: MemoryVariant) => {
  const exchange = memoryExchange(variant);
  const whole = createTextbookRenderModel(exchange, "student");
  return {
    exchange,
    model: { ...whole, sections: [whole.sections[1]] },
    answers: createTextbookRenderModel(exchange, "answers"),
  };
};
const ruleSet = (failures: Array<{ rule: string }>) =>
  [...new Set(failures.map((failure) => failure.rule))].sort();

describe("private measurement material, without a browser", () => {
  it("uses six real bank rows, every one with a hidden key", () => {
    expect(canonical).toHaveLength(6);
    expect(canonical.every((row) => row.keys.length > 0)).toBe(true);
    expect(canonical.reduce((sum, row) => sum + row.keys.length, 0)).toBe(13);
    // Ten of the keys are plain text with enough text beside them to be searched for as text.
    expect(canonical.reduce((sum, row) => sum + row.windows.length, 0)).toBe(
      10,
    );
  });

  it("builds canonical probes for every enabled phase, also with the study phase off", () => {
    const probes: Record<string, [number, number, number]> = {};
    for (const variant of MEMORY_VARIANTS) {
      const { model, answers } = chunkModel(variant);
      const probe = recallMeasurementModel(answers, model);
      const blocks = probe.sections.flatMap((section) => section.blocks);
      expect(blocks.every((block) => block.kind === "recall")).toBe(true);
      const rows = rowsOf(recallMeasurementHtml(probe, resources));
      expect(rows.every((row) => row.probe)).toBe(true);
      // Each probe row is the whole sentence with its keys in place: the text that must fit.
      const whole = rows.filter(
        (row) =>
          row.body ===
          squash(canonical.find((item) => item.rowKey === row.rowKey)!.plain),
      );
      probes[variant.name] = [blocks.length, rows.length, whole.length];
    }
    expect(probes).toEqual({
      "all-three": [3, 18, 18],
      "study-off": [2, 12, 12],
      "sentences-only": [1, 6, 6],
      "keywords-only": [1, 6, 6],
    });
  });

  it("selects probes by the memory group of the student chunk and nothing else", () => {
    const { model, answers } = chunkModel(STUDY_OFF);
    const groups = (target: typeof model) =>
      recoveryMeasurePlan(target).blocks.flatMap((block) =>
        block.memoryGroup ? [block.memoryGroup] : [],
      );
    expect([...new Set(groups(model))]).toEqual([
      "synthetic-unit:concept-memory-proof.memory-0",
    ]);
    expect(groups(recallMeasurementModel(answers, model))).toEqual(
      groups(model),
    );
    // A chunk without memory rows asks for no probe at all.
    const general = { ...model, sections: [answers.sections[0]] };
    expect(recallMeasurementModel(answers, general).sections).toEqual([]);
  });

  it("keeps general problem answers out of the probe and refuses a model that holds them", () => {
    const { model, answers } = chunkModel(STUDY_OFF);
    // The answers model does hold them: the marker is real.
    expect(JSON.stringify(answers)).toContain(PROBLEM_ANSWER);
    expect(JSON.stringify(answers)).toContain(PROBLEM_SOLUTION);
    const probe = recallMeasurementModel(answers, model);
    expect(JSON.stringify(probe)).not.toContain(PROBLEM_ANSWER);
    expect(JSON.stringify(probe)).not.toContain(PROBLEM_SOLUTION);
    const html = recallMeasurementHtml(probe, resources);
    expect(html).not.toContain(PROBLEM_ANSWER);
    expect(html).not.toContain("data-measure-id=");
    expect(html.match(/data-recall-probe-id=/g)).toHaveLength(2);
    expect(() => recallMeasurementHtml(answers, resources)).toThrow(
      "Canonical measurement probes must contain recall rows only",
    );
  });

  it("hands a student no hidden key, withheld sentence or problem answer in the model or its markup", () => {
    for (const variant of MEMORY_VARIANTS) {
      const { exchange, model } = chunkModel(variant);
      expect(
        verifyRenderModel(
          createTextbookRenderModel(exchange, "student"),
          canonical,
          variant.phases,
        ),
      ).toEqual([]);
      const html = measurementHtml(model, resources);
      const rows = rowsOf(html);
      expect(rows).toHaveLength(6 * variant.phases.length);
      expect(
        verifyStudentPrivacy(canonical, variant.phases, {
          rows,
          text: html,
          label: "학생 측정 문서",
        }),
      ).toEqual([]);
    }
  });

  it("negative control: the same judges fail the answers model, its markup and the private probe", () => {
    const { model, answers } = chunkModel(STUDY_OFF);
    expect(
      ruleSet(verifyRenderModel(answers, canonical, STUDY_OFF.phases)),
    ).toEqual(["hidden-key", "problem-answer", "whole-sentence"]);
    const answersHtml = measurementHtml(answers, {
      ...resources,
      qrDataUrl: () => "data:image/png;base64,AA==",
    });
    expect(
      ruleSet(
        verifyStudentPrivacy(canonical, STUDY_OFF.phases, {
          rows: rowsOf(answersHtml),
          text: answersHtml,
          label: "답지 측정 문서",
        }),
      ),
    ).toEqual(["hidden-key", "problem-answer", "whole-sentence"]);
    const probeHtml = recallMeasurementHtml(
      recallMeasurementModel(answers, model),
      resources,
    );
    expect(
      ruleSet(
        verifyStudentPrivacy(canonical, STUDY_OFF.phases, {
          rows: rowsOf(probeHtml),
          text: probeHtml,
          label: "비공개 측정 문서",
        }),
      ),
    ).toEqual(["hidden-key", "private-probe", "whole-sentence"]);
    // One key put back into one student row is enough.
    const studentHtml = measurementHtml(model, resources);
    const leaked = studentHtml.replace(
      /<span class="tb-blank tb-blank-keyword"[^>]*><\/span>/,
      canonical[0].keys[0],
    );
    expect(leaked).not.toBe(studentHtml);
    expect(
      ruleSet(
        verifyStudentPrivacy(canonical, STUDY_OFF.phases, {
          rows: rowsOf(leaked),
          text: leaked,
          label: "핵심어를 되돌린 학생 문서",
        }),
      ),
    ).toEqual(["hidden-key"]);
  });
});

describe.skipIf(!run)("recovery measurement in real Chromium", () => {
  let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
  beforeAll(async () => {
    browser = await launchExportBrowser();
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
  });

  it.each(MEMORY_VARIANTS.map((variant) => [variant.name, variant] as const))(
    "%s: probes are measured privately, heights are the common maximum, nothing leaks",
    async (_name, variant) => {
      const proof = await proveMeasurement(browser, variant);
      const phases = variant.phases.length;
      // Document 1 carries the probes; the second measurement and the printed pages do not.
      expect(proof.measurementDocuments).toBe(3);
      expect(proof.probeBlocks).toBe(phases);
      expect(proof.probeRows).toBe(6 * phases);
      expect(proof.probeRowsWithWholeSentence).toBe(6 * phases);
      expect(proof.probeHoldsProblemAnswer).toBe(false);
      expect(proof.laterDocumentsWithProbe).toBe(0);
      expect(proof.evaluatorErrors).toEqual([]);
      expect(proof.evaluatorHasTranspilerHelper).toBe(false);
      expect(Object.keys(proof.rowHeightsMm).sort()).toEqual(
        canonical.map((row) => row.rowKey).sort(),
      );
      expect(proof.heightFailures).toEqual([]);
      expect(proof.studentRows).toHaveLength(6 * phases);
      for (const row of proof.studentRows) {
        expect(row.styleHeight).toBe(`${proof.rowHeightsMm[row.rowKey]}mm`);
        expect(row.keys).toBe(0);
      }
      expect(proof.privacyFailures).toEqual([]);
      expect(proof.modelFailures).toEqual([]);
      expect(proof.blocked).toEqual([]);
      expect(proof.result.html).not.toContain(PROBLEM_ANSWER);
    },
    180_000,
  );

  it.each([
    ["study-off", MEMORY_VARIANTS[1]],
    ["keywords-only", MEMORY_VARIANTS[3]],
  ] as const)(
    "%s: the canonical row decides the height where it is the taller one",
    async (_name, variant) => {
      // The whole-bank scan of intro-proof.ts finds no such row among 1,628; these two are
      // synthetic: the hidden key is a display fraction, taller than the blank that replaces it.
      const proof = await proveMeasurement(
        browser,
        variant,
        "student",
        SYNTHETIC_TALL_SECTION,
      );
      expect(proof.rowCount).toBe(2);
      expect(proof.rowsWhereCanonicalIsTaller.sort()).toEqual([
        "synthetic-tall-c1.definition",
        "synthetic-tall-c2.definition",
      ]);
      for (const rowKey of proof.rowsWhereCanonicalIsTaller) {
        expect(proof.naturalCanonicalMm[rowKey]).toBeGreaterThan(
          proof.naturalStudentMm[rowKey] + 0.1,
        );
        // Without the private probe the common height would be the student sheet's own.
        expect(proof.rowHeightsMm[rowKey]).toBeGreaterThan(
          proof.naturalStudentMm[rowKey] + 0.1,
        );
      }
      expect(proof.heightFailures).toEqual([]);
      expect(proof.privacyFailures).toEqual([]);
      expect(proof.modelFailures).toEqual([]);
      expect(proof.probeHoldsProblemAnswer).toBe(false);
      expect(proof.laterDocumentsWithProbe).toBe(0);
    },
    180_000,
  );

  it("the answers artifact reveals the rows: the privacy judge is not blind", async () => {
    const answers = await proveMeasurement(browser, STUDY_OFF, "answers");
    expect(answers.studentRows.some((row) => row.keys > 0)).toBe(true);
    expect(
      ruleSet(
        verifyStudentPrivacy(canonical, STUDY_OFF.phases, {
          rows: answers.studentRows,
          text: answers.result.html.replace(/data:[^"')]+/g, ""),
          label: "답지 HTML",
        }),
      ),
      // The chunk is the memory section alone: no general problem is printed on it.
    ).toEqual(["hidden-key", "whole-sentence"]);
  }, 180_000);
});

describe.skipIf(!run)("automatic introduction in real Chromium", () => {
  let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
  const longest: IntroCase = {
    caseId: "m1-03",
    opening: unitOpeningById("m1-03")!,
  };
  beforeAll(async () => {
    browser = await launchExportBrowser();
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
  });

  it("the production renderer prints the longest chapter complete: its right face does not fit, so both starts get the single page", async () => {
    const exchange = introBook([longest]);
    const expected = expectedIntro(longest, 1);
    for (const start of [2, 3]) {
      const render = await renderIntroChunk(browser, exchange, [0], start);
      expect(render.measured!.left).toBeCloseTo(254, 1);
      expect(render.measured!.right).toBeGreaterThan(254);
      expect(render.measured!.single).toBeLessThanOrEqual(254);
      expect(render.pages.map((page) => page.part)).toEqual(["single"]);
      expect(render.pages[0].goals).toHaveLength(13);
      expect(render.pages[0].path).toHaveLength(13);
      expect(render.blocked).toEqual([]);
      expect(
        verifyIntro(expected, render.pages, {
          firstPhysicalPageIndex: start,
          issues: render.result.issues,
          node: introNode(exchange, 0),
          measured: render.measured,
        }),
      ).toEqual([]);
    }
  }, 180_000);

  it("the production renderer prints a chapter whose faces fit as the spread on an even start and the single page on an odd start", async () => {
    const first: IntroCase = {
      caseId: "e3-1-1",
      opening: unitOpeningById("e3-1-1")!,
    };
    const exchange = introBook([first]);
    const expected = expectedIntro(first, 1);
    const layouts: string[] = [];
    for (const start of [2, 3]) {
      const render = await renderIntroChunk(browser, exchange, [0], start);
      expect(render.measured!.right).toBeLessThanOrEqual(254);
      layouts.push(render.pages.map((page) => page.part).join("+"));
      expect(
        verifyIntro(expected, render.pages, {
          firstPhysicalPageIndex: start,
          issues: render.result.issues,
          node: introNode(exchange, 0),
          measured: render.measured,
        }),
      ).toEqual([]);
    }
    expect(layouts).toEqual(["left+right", "single"]);
  }, 180_000);

  it("prints exactly the selected range of a partial selection, in both layouts", async () => {
    const failures = [];
    const layouts: string[] = [];
    for (const introCase of partialCases()) {
      const exchange = introBook([introCase]);
      const expected = expectedIntro(introCase, 1);
      for (const start of [2, 3]) {
        const render = await renderIntroChunk(browser, exchange, [0], start);
        expect(render.blocked).toEqual([]);
        layouts.push(render.pages.map((page) => page.part).join("+"));
        failures.push(
          ...verifyIntro(expected, render.pages, {
            firstPhysicalPageIndex: start,
            issues: render.result.issues,
            node: introNode(exchange, 0),
            measured: render.measured,
          }).map((failure) => ({ start, ...failure })),
        );
      }
    }
    expect(failures).toEqual([]);
    expect(layouts).toEqual([
      "left+right",
      "single",
      "left+right",
      "single",
      "left+right",
      "single",
    ]);
  }, 300_000);

  it("negative controls fail: dropped goal, missing art, overheight, privacy, source hash, bounds", async () => {
    const outcomes = await negativeControls(browser);
    expect(outcomes.map((outcome) => outcome.name)).toEqual(CONTROL_NAMES);
    expect(
      outcomes
        .filter((outcome) => !outcome.caught)
        .map((outcome) => `${outcome.name}: ${outcome.detail}`),
    ).toEqual([]);
  }, 600_000);
});

describe.skipIf(!run)("DOM helpers under real tsx", () => {
  it("serialises the production evaluators without a transpiler helper, where a naive helper throws __name", () => {
    const out = mkdtempSync(path.join(os.tmpdir(), "textbook-intro-proof-"));
    try {
      execFileSync(
        process.execPath,
        [
          "--conditions=react-server",
          "--import",
          "tsx",
          "scripts/qa/textbook/recovery/intro-proof.ts",
          out,
          "--self-test",
        ],
        { stdio: "pipe", timeout: 280_000 },
      );
    } catch {
      // The self-test exits 1 while an acceptance failure stands; its report is judged below.
    }
    const report = JSON.parse(
      readFileSync(path.join(out, "self-test.json"), "utf8"),
    ) as {
      runtime: string;
      nameHazard: { sourceHasHelper: boolean; error: string | null };
      measurement: Array<{
        evaluatorHasTranspilerHelper: boolean;
        evaluatorErrors: string[];
        probeRows: number;
        heightFailures: string[];
        privacyFailures: unknown[];
      }>;
    };
    expect(report.runtime).toContain("tsx");
    // The hazard is real in this runtime…
    expect(report.nameHazard.sourceHasHelper).toBe(true);
    expect(report.nameHazard.error).toContain("__name is not defined");
    // …and the renderer's own evaluators do not carry it.
    expect(report.measurement).toHaveLength(1);
    expect(report.measurement[0].evaluatorHasTranspilerHelper).toBe(false);
    expect(report.measurement[0].evaluatorErrors).toEqual([]);
    expect(report.measurement[0].probeRows).toBe(12);
    expect(report.measurement[0].heightFailures).toEqual([]);
    expect(report.measurement[0].privacyFailures).toEqual([]);
  }, 300_000);
});

const CONTROL_NAMES = [
  "dropped-goal@2",
  "dropped-goal@3",
  "dropped-path@2",
  "filler-goal@3",
  "art-removed@2",
  "art-unloaded@2",
  "art-removed@3",
  "art-unloaded@3",
  "overheight-lists@2",
  "overheight-lists@3",
  "overheight-explanation@2",
  "overheight-explanation@3",
  "overheight-question@2",
  "overheight-question@3",
  "left-face-explanation-6x@2",
  "left-face-question-4x@2",
  "source-hash-changed",
  "source-hash-malformed",
  "parent-source-changed",
  "page-limit",
  "nine-sections",
  "six-hundred-blocks",
  "six-hundred-blocks-admitted",
  "thirty-two-pages",
  "manual-even-left@3",
  "privacy-answers-artifact",
  "privacy-private-document",
  "probe-with-general-problems",
];
