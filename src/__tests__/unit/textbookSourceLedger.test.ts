import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUTHORED_EXAMPLES } from "@/lib/textbook/scripts/authoredExamples";
import {
  AUTHORED_EXAMPLE_CLAIMS,
  AUTHORED_EXAMPLE_FINDINGS,
  authoredExampleText,
  reviewAuthoredExamples,
} from "@/lib/textbook/scripts/authoredExampleReview";
import { checkNumericStatements } from "@/lib/textbook/scripts/mathCheck";
import {
  buildSourceLedger,
  readCommittedScripts,
  serializeLedger,
  type SourceLedger,
} from "@/lib/textbook/scripts/sourceLedger";
import {
  TEMPLATE_FRAMES,
  measureTemplateFrames,
  repeatedFrames,
  repeatedOpeningQuestions,
} from "@/lib/textbook/scripts/templateReview";

const scripts = readCommittedScripts();
const committed = readFileSync(
  resolve("src/lib/textbook/scripts/source-ledger.json"),
  "utf8",
).replace(/\r\n/g, "\n");
const ledger = JSON.parse(committed) as SourceLedger;

describe("the numeric checker is able to fail", () => {
  it("reports a wrong statement of every kind it claims to check", () => {
    const wrong = [
      "$123\\times24=2962$",
      "$\\frac12+\\frac13=\\frac25$",
      "$1\\frac45+2\\frac35=4\\frac15$",
      "$180^\\circ-110^\\circ=80^\\circ$",
      "$1\\,\\mathrm{m}^2=100\\,\\mathrm{cm}^2$",
      "$1\\,\\mathrm{km}=100\\,\\mathrm{m}$",
      "$25\\%=\\frac13$",
      "$4<3$",
      "$0.60>0.68$",
      "$\\sqrt{12}=3\\sqrt3$",
      "$(4+0+4)\\div3=\\frac73$",
      "$3^2=6$",
      "$7+5=8+4=13$",
    ];
    for (const statement of wrong) {
      const report = checkNumericStatements(statement);
      expect(report.faults, statement).toHaveLength(1);
      expect(report.checked).toEqual([]);
    }
    const right = [
      "$123\\times24=2952$",
      "$\\frac12+\\frac13=\\frac56$",
      "$1\\frac45+2\\frac35=4\\frac25$",
      "$1\\,\\mathrm{m}^2=10000\\,\\mathrm{cm}^2$",
      "$1\\,\\mathrm{m}^3=1000000\\,\\mathrm{cm}^3$",
      "$25\\%=\\frac14$",
      "$100\\%\\div2=50\\%$",
      "$0.60>0.58$",
      "$\\sqrt{12}=2\\sqrt3$",
      "$\\sqrt{5^2-3^2}=4\\,\\mathrm{cm}$",
      "$(101+99)(101-99)=200\\times2=400$",
      "$7+5=8+4$",
    ];
    for (const statement of right) {
      const report = checkNumericStatements(statement);
      expect(report.faults, statement).toEqual([]);
      expect(report.checked, statement).toHaveLength(1);
    }
    // Symbolic statements are skipped and said to be skipped, never counted as checked.
    for (const statement of ["$x=15$", "$y=(x-2)^2-1$", "$3:5=9:x$"]) {
      const report = checkNumericStatements(statement);
      expect(report.checked).toEqual([]);
      expect(report.faults).toEqual([]);
      expect(report.skipped).toHaveLength(1);
    }
  });
});

describe("the 210 newly written lesson examples", () => {
  const rows = reviewAuthoredExamples();

  it("recalculates every numeric relation and every stated answer without a fault", () => {
    expect(rows).toHaveLength(210);
    expect(
      Object.fromEntries(
        ["초4", "초5", "초6", "중1", "중2", "중3"].map((grade) => [
          grade,
          rows.filter((row) => row.grade === grade).length,
        ]),
      ),
    ).toEqual({ 초4: 62, 초5: 56, 초6: 56, 중1: 10, 중2: 4, 중3: 22 });
    expect(rows.flatMap((row) => row.faults)).toEqual([]);
    expect(rows.reduce((n, row) => n + row.relationsChecked, 0)).toBe(199);
    expect(rows.reduce((n, row) => n + row.claimsChecked, 0)).toBe(87);
    expect(rows.filter((row) => row.method === "calculated")).toHaveLength(164);
    // The remaining 46 state no number to recalculate: they are read, not calculated.
    const readOnly = rows.filter((item) => item.method === "read-only");
    for (const row of readOnly)
      expect(row.relationsChecked + row.claimsChecked).toBe(0);
    // Only one of them writes a relation at all: a given length, AB = 5 cm and DE = 5 cm.
    expect(
      readOnly
        .filter((row) => row.relationsSkipped)
        .map((row) => [row.key, row.relationsSkipped]),
    ).toEqual([["중1::합동", 2]]);
  });

  it("anchors each claim to words that are in the manuscript, so a changed sentence fails", () => {
    for (const [key, claims] of Object.entries(AUTHORED_EXAMPLE_CLAIMS)) {
      const [grade, name] = key.split("::");
      const example = AUTHORED_EXAMPLES[grade!]?.[name!];
      expect(example, key).toBeDefined();
      for (const claim of claims) {
        expect(
          authoredExampleText(example!),
          `${key}: ${claim.stated}`,
        ).toContain(claim.stated);
        expect(claim.computed, key).toBe(claim.stated);
      }
    }
    // A manuscript answer that disagreed with the calculation would be reported.
    const broken = reviewAuthoredExamplesWith("초5", "1-2-3", (example) => ({
      ...example,
      answer: "최대공약수는 $4$예요.",
    }));
    expect(broken.faults).toEqual(["원고에 없는 인용: 최대공약수는 $6$"]);
    const wrongStep = reviewAuthoredExamplesWith("초4", "1-3-2", (example) => ({
      ...example,
      steps: example.steps.map((step) => step.replace("2460", "2640")),
    }));
    expect(wrongStep.faults).toEqual(["틀린 식: $123\\times20=2640$"]);
  });

  it("records what the reading found instead of a blanket pass", () => {
    expect(
      AUTHORED_EXAMPLE_FINDINGS.map((finding) => [
        finding.key,
        finding.kind,
        finding.status,
      ]),
    ).toEqual([
      ["초5::2-4-6", "wording", "open"],
      ["초4::2-4-3", "condition", "open"],
      ["초6::2-3-1", "condition", "open"],
      ["중3::원의 접선", "wording", "open"],
      ["중3::이차함수와 그래프", "wording", "open"],
    ]);
    for (const finding of AUTHORED_EXAMPLE_FINDINGS) {
      const [grade, name] = finding.key.split("::");
      expect(AUTHORED_EXAMPLES[grade!]?.[name!], finding.key).toBeDefined();
    }
    // The one particle that disagrees with how the number is read is still in the manuscript.
    expect(AUTHORED_EXAMPLES["초5"]!["2-4-6"]!.answer).toBe("곱은 $1.56$예요.");
    expect(AUTHORED_EXAMPLE_FINDINGS.filter((f) => f.kind === "math")).toEqual(
      [],
    );
  });
});

describe("the repeated sentence frames", () => {
  it("measures the twelve whole-turn frames and the generator's other frames from the manuscripts", () => {
    const repeated = repeatedFrames(scripts);
    expect(repeated.size).toBe(12);
    expect([...repeated.values()].reduce((a, b) => a + b, 0)).toBe(3147);
    const measured = measureTemplateFrames(scripts);
    const whole = TEMPLATE_FRAMES.filter((frame) => frame.repeatsAsWhole);
    expect(whole.map((frame) => frame.frame).sort()).toEqual(
      [...repeated.keys()].sort(),
    );
    for (const frame of whole)
      expect(measured.find((m) => m.id === frame.id)!.turns, frame.id).toBe(
        repeated.get(frame.frame),
      );
    expect(
      Object.fromEntries(measured.map((frame) => [frame.id, frame.turns])),
    ).toEqual({
      "question-property": 535,
      "question-definition": 502,
      "question-method": 451,
      "question-formula": 123,
      "question-law": 15,
      "question-theorem": 13,
      "question-unit": 18,
      misconception: 392,
      correction: 392,
      "example-apply": 372,
      "example-answer": 372,
      "opening-elementary": 230,
      "opening-middle": 130,
      "check-elementary": 230,
      "check-middle": 130,
      "bare-expression-prompt": 31,
      "v15-board-without-note": 21,
    });
    // The seven concept questions cover every concept exactly once.
    expect(
      measured
        .filter((frame) => frame.id.startsWith("question-"))
        .reduce((n, frame) => n + frame.turns, 0),
    ).toBe(1657);
  });

  it("counts the turns each recorded defect reaches", () => {
    const measured = measureTemplateFrames(scripts);
    const turns = Object.fromEntries(
      measured.flatMap((frame) =>
        frame.findings.map((finding) => [finding.id, finding.turns]),
      ),
    );
    expect(turns).toMatchObject({
      "example-answer:predicate": 27,
      "example-answer:register": 372,
      "example-apply:recitation": 372,
      "correction:register": 392,
      "bare-expression-prompt:no-question": 31,
    });
    expect(
      Object.entries(turns)
        .filter(([id]) => id.endsWith(":clause-term"))
        .reduce((n, [, count]) => n + count, 0),
    ).toBe(47);
    // The broken sentence is real: the bank answer is a predicate and "입니다" follows it.
    const broken = scripts
      .flatMap((script) => script.dialogue)
      .filter((turn) => /다\*\*입니다\.$/.test(turn.markdown));
    expect(broken.length).toBeGreaterThanOrEqual(20);
    expect(broken.map((turn) => turn.markdown)).toContain(
      "이 기준으로 물음에 답하면 **유리수이다**입니다.",
    );
    expect(repeatedOpeningQuestions(scripts)).toBe(360);
  });
});

describe("the 360-section source ledger", () => {
  it("is the committed file, rebuilt from the manuscripts without writing", () => {
    expect(serializeLedger(buildSourceLedger(scripts)) === committed).toBe(
      true,
    );
  });

  it("accounts for every section, concept and turn by source, and for all fourteen books", () => {
    expect(ledger.sections).toHaveLength(360);
    expect(new Set(ledger.sections.map((section) => section.id)).size).toBe(
      360,
    );
    expect(ledger.totals).toMatchObject({
      sections: 360,
      concepts: 1657,
      lessons: 2401,
      turns: {
        total: 7792,
        bankConcept: 4766,
        bankExample: 894,
        bankOx: 784,
        authoredExample: 1050,
        v15: 298,
      },
      boards: {
        sections: { "authored-v15": 7, "derived-bank": 80, absent: 273 },
        turns: { v15: 24, derived: 163 },
      },
      workedExample: { "bank-example": 150, "authored-example": 210 },
    });
    const semesters = (
      ledger.totals as { semesters: { sections: number; concepts: number }[] }
    ).semesters;
    expect(semesters).toHaveLength(14);
    expect(semesters.reduce((n, row) => n + row.sections, 0)).toBe(360);
    expect(semesters.reduce((n, row) => n + row.concepts, 0)).toBe(1657);
    for (const section of ledger.sections) {
      const { turns } = section;
      expect(
        turns.bankConcept +
          turns.bankExample +
          turns.bankOx +
          turns.authoredExample +
          turns.v15,
      ).toBe(turns.total);
      for (const match of Object.values(section.matches)) {
        const [found, expected] = match.split("/");
        expect(found, `${section.id} ${match}`).toBe(expected);
      }
    }
  });

  it("lists the 72 chapters with the names that exist for a chapter opening and nothing inferred", () => {
    expect(ledger.chapters).toHaveLength(72);
    expect(
      ledger.chapters.reduce((n, chapter) => n + chapter.sections.length, 0),
    ).toBe(360);
    expect(
      ledger.chapters.reduce((n, chapter) => n + chapter.concepts, 0),
    ).toBe(1657);
    expect(
      ledger.chapters.flatMap((chapter) =>
        chapter.sections.flatMap((section) => section.conceptTerms),
      ),
    ).toHaveLength(1657);
    expect(
      Object.fromEntries(
        ["초3", "초4", "초5", "초6", "중1", "중2", "중3"].map((grade) => [
          grade,
          ledger.chapters.filter((chapter) => chapter.grade === grade).length,
        ]),
      ),
    ).toEqual({ 초3: 12, 초4: 12, 초5: 12, 초6: 12, 중1: 8, 중2: 9, 중3: 7 });
    for (const chapter of ledger.chapters)
      expect(chapter.unitOpening).toEqual({
        sectionNames: "bank",
        conceptTerms: "bank",
        question: "absent",
        keyPhrase: "absent",
        goals: "absent",
        prerequisites: "absent",
      });
    // The only chapter with original v15 material is 중2 「1. 수와 식」, units U01–U06.
    expect(
      ledger.chapters
        .filter((chapter) => chapter.referenceUnits)
        .map((chapter) => [
          chapter.grade,
          chapter.chapter,
          chapter.referenceUnits,
        ]),
    ).toEqual([
      ["중2", "1. 수와 식", ["U01", "U02", "U03", "U04", "U05", "U06"]],
    ]);
  });

  it("claims no editorial approval and keeps unreviewed, calculated and defective apart", () => {
    expect(ledger.reviewers.editor).toMatch(/^없음/);
    expect(committed).not.toContain("편집 확인");
    expect(ledger.totals).toMatchObject({
      status: {
        idsAndSources: { "자동 확인": 360 },
        bankMathematics: { 미검수: 360 },
        newExample: { "해당 없음": 150, "자동 확인": 164, 미검수: 46 },
        wordingAndFlow: { 미검수: 335, "수정 필요": 25 },
        printedPage: { 미검수: 360 },
      },
    });
    expect(ledger.authoredExamples).toHaveLength(210);
    expect(
      ledger.authoredExamples.filter((row) => row.state === "수정 필요"),
    ).toHaveLength(3);
    expect(ledger.templateFrames).toHaveLength(17);
    expect(ledger.restShortages.reduce((n, row) => n + row.shortage, 0)).toBe(
      15,
    );
    expect(ledger.restStories.flatMap((story) => story.faults)).toEqual([]);
    // The G0b section itself carries a broken frame sentence: it is not hidden by a total.
    expect(
      ledger.sections.find(
        (section) => section.id === "중2::1. 수와 식::유리수와 소수",
      ),
    ).toMatchObject({
      status: { wordingAndFlow: "수정 필요" },
      findings: [{ id: "example-answer:predicate", turns: 1 }],
      boards: { status: "authored-v15", count: 6 },
    });
  });
});

/** The review of one example with its manuscript changed in memory. */
function reviewAuthoredExamplesWith(
  grade: string,
  name: string,
  change: (
    example: (typeof AUTHORED_EXAMPLES)[string][string],
  ) => (typeof AUTHORED_EXAMPLES)[string][string],
) {
  const original = AUTHORED_EXAMPLES[grade]![name]!;
  AUTHORED_EXAMPLES[grade]![name] = change(original);
  try {
    return reviewAuthoredExamples().find(
      (row) => row.key === `${grade}::${name}`,
    )!;
  } finally {
    AUTHORED_EXAMPLES[grade]![name] = original;
  }
}
