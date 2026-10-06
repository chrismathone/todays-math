import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AI_READING_REVIEW,
  AUTHORED_EXAMPLE_READINGS,
  REST_BAND_READINGS,
} from "@/lib/textbook/scripts/aiReadings";
import { AUTHORED_EXAMPLES } from "@/lib/textbook/scripts/authoredExamples";
import {
  STATIC_CORRECTIONS,
  withoutStaticCorrections,
} from "@/lib/textbook/scripts/corrections";
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
      ["초5::2-4-6", "wording", "fixed"],
      ["초4::2-4-3", "condition", "fixed"],
      ["초6::2-3-1", "condition", "fixed"],
      ["중3::원의 접선", "wording", "fixed"],
      ["중3::이차함수와 그래프", "wording", "fixed"],
      ["초6::1-2-3", "condition", "fixed"],
      ["초6::2-3-2", "condition", "fixed"],
    ]);
    for (const finding of AUTHORED_EXAMPLE_FINDINGS) {
      const [grade, name] = finding.key.split("::");
      expect(AUTHORED_EXAMPLES[grade!]?.[name!], finding.key).toBeDefined();
      // A fixed finding has its corrected turns in the corrections ledger; an open one has none.
      expect(
        STATIC_CORRECTIONS.some(
          (correction) =>
            correction.source.kind === "authored-example" &&
            correction.source.key === finding.key,
        ),
        finding.key,
      ).toBe(finding.status === "fixed");
    }
    // The five corrected examples read as corrected in the authoring notes.
    expect(AUTHORED_EXAMPLES["초5"]!["2-4-6"]!.answer).toBe(
      "곱은 $1.56$이에요.",
    );
    expect(AUTHORED_EXAMPLES["초4"]!["2-4-3"]!.question).toBe(
      "평행선 사이를 수직으로 재면 $3\\,\\mathrm{cm}$, 비스듬히 재면 $5\\,\\mathrm{cm}$일 때 $5\\,\\mathrm{cm}$를 거리라고 해도 될까?",
    );
    expect(AUTHORED_EXAMPLES["초4"]!["2-4-3"]!.answer).toContain(
      "거리는 $3\\,\\mathrm{cm}$이고",
    );
    expect(AUTHORED_EXAMPLES["초6"]!["2-3-1"]!.question).toBe(
      "높이 $1$인 기둥이 앞에, 높이 $3$인 기둥이 뒤에 겹쳐 있다면 앞에서 몇 층으로 보일까?",
    );
    expect(AUTHORED_EXAMPLES["초6"]!["2-3-1"]!.steps[1]).toContain(
      "뒤 기둥이 더 높아",
    );
    expect(AUTHORED_EXAMPLES["중3"]!["원의 접선"]!.question).toContain(
      "두 접선을 그었고",
    );
    expect(AUTHORED_EXAMPLES["중3"]!["이차함수와 그래프"]!.question).toContain(
      "왜 높이가 같을까?",
    );
    expect(AUTHORED_EXAMPLES["중3"]!["이차함수와 그래프"]!.steps[0]).toContain(
      "두 점의 높이가 같아",
    );
    expect(AUTHORED_EXAMPLE_FINDINGS.filter((f) => f.kind === "math")).toEqual(
      [],
    );
    // The two conditions found by the reading: each question now states the premise
    // its own solution and answer already used, and nothing else in the example changed.
    const prism = AUTHORED_EXAMPLES["초6"]!["1-2-3"]!;
    expect(prism.question).toBe(
      "밑면 삼각형의 변이 $3,4,5\\,\\mathrm{cm}$이고 높이가 $6\\,\\mathrm{cm}$인 삼각기둥 전개도의 옆면 직사각형 폭은 마음대로 정해도 될까?",
    );
    expect(prism.steps[1]).toBe(
      "삼각형 변이 $3,4,5\\,\\mathrm{cm}$이고 높이가 $6\\,\\mathrm{cm}$면 세 직사각형 높이는 모두 $6\\,\\mathrm{cm}$야.",
    );
    expect(prism.answer).toBe("폭은 각각 $3,4,5\\,\\mathrm{cm}$로 맞춰요.");
    const tower = AUTHORED_EXAMPLES["초6"]!["2-3-2"]!;
    expect(tower.question).toBe(
      "공중에 뜬 블록 없이 쌓은 세 층짜리 기둥에서 꼭대기 한 블록만 보인다고 한 개라 세도 될까?",
    );
    expect(tower.steps[0]).toContain("공중에 뜬 블록 없이 쌓았다고 정했으므로");
    expect(tower.answer).toBe("이 기둥에는 $3$개가 있어요.");
  });

  it("leaves no confirmed defect open: only the corrected manuscripts pass", () => {
    expect(
      AUTHORED_EXAMPLE_FINDINGS.filter((finding) => finding.status === "open"),
    ).toEqual([]);
    expect(rows.flatMap((row) => row.faults)).toEqual([]);
    expect(
      ledger.authoredExamples.filter((row) => row.state === "수정 필요"),
    ).toEqual([]);
    expect(
      ledger.sections.filter(
        (section) =>
          section.status.newExample === "수정 필요" ||
          section.status.idsAndSources === "수정 필요",
      ),
    ).toEqual([]);
    // Every corrected lesson example is in the manuscripts as corrected, twice: once as
    // the opening question and once in the worked example.
    for (const finding of AUTHORED_EXAMPLE_FINDINGS) {
      const turns = STATIC_CORRECTIONS.filter(
        (correction) =>
          correction.source.kind === "authored-example" &&
          correction.source.key === finding.key,
      );
      expect(turns.length, finding.key).toBe(
        finding.key === "초5::2-4-6" ? 1 : 2,
      );
      const script = scripts.find(
        (item) => item.sectionKey === turns[0]!.sectionKey,
      )!;
      for (const turn of turns) {
        expect(script.dialogue[turn.turnIndex]!.markdown).toBe(turn.new);
        expect(script.dialogue.map((item) => item.markdown)).not.toContain(
          turn.old,
        );
      }
    }
  });

  it("records an AI reading, with what it could not settle, for each of the 46 examples it cannot recalculate", () => {
    const readOnly = rows
      .filter((row) => row.method === "read-only")
      .map((row) => row.key);
    expect(readOnly).toHaveLength(46);
    expect(Object.keys(AUTHORED_EXAMPLE_READINGS).sort()).toEqual(
      [...readOnly].sort(),
    );
    for (const [key, reading] of Object.entries(AUTHORED_EXAMPLE_READINGS)) {
      expect(reading.basis.length, key).toBeGreaterThan(15);
      if (reading.unverified !== undefined)
        expect(reading.unverified.length, key).toBeGreaterThan(15);
    }
    // No two examples share a basis: each was read on its own text.
    expect(
      new Set(Object.values(AUTHORED_EXAMPLE_READINGS).map((r) => r.basis))
        .size,
    ).toBe(46);
    expect(
      Object.entries(AUTHORED_EXAMPLE_READINGS)
        .filter(([, reading]) => reading.unverified)
        .map(([key]) => key),
    ).toEqual([
      "초4::1-2-1",
      "초4::1-2-2",
      "초4::2-4-1",
      "초4::2-4-4",
      "초4::2-6-1",
      "중3::원의 접선",
    ]);
    expect(AI_READING_REVIEW.reviewer).toMatch(/^AI 정독/);
    expect(AI_READING_REVIEW.reviewer).toContain("사람이 읽은 검수가 아니다");
    // An open finding is never hidden behind an AI reading.
    for (const finding of AUTHORED_EXAMPLE_FINDINGS.filter(
      (item) => item.status === "open",
    ))
      expect(
        AUTHORED_EXAMPLE_READINGS[finding.key]?.unverified,
        finding.key,
      ).toContain("열린 지적");
  });
});

describe("the repeated sentence frames", () => {
  it("measures the whole-turn frames and the generator's other frames from the manuscripts", () => {
    // Before the corrections: 12 frames, 3,147 turns. The 32 sentence answers left the
    // "…입니다." frame; 29 of them now share the frame "…답하면 **B**." and 3 end inside the bold.
    const repeated = repeatedFrames(scripts);
    expect(repeated.size).toBe(13);
    expect([...repeated.values()].reduce((a, b) => a + b, 0)).toBe(3144);
    const before = repeatedFrames(withoutStaticCorrections(scripts));
    expect(before.size).toBe(12);
    expect([...before.values()].reduce((a, b) => a + b, 0)).toBe(3147);
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
      "example-answer": 340,
      "example-answer-sentence": 29,
      "example-answer-sentence-closed": 3,
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
      // Corrected: no sentence answer is followed by "입니다" any more.
      "example-answer:predicate": 0,
      "example-answer:register": 340,
      "example-answer-sentence:register": 29,
      "example-answer-sentence-closed:register": 3,
      "example-apply:recitation": 372,
      "correction:register": 392,
      "bare-expression-prompt:no-question": 31,
    });
    expect(
      Object.entries(turns)
        .filter(([id]) => id.endsWith(":clause-term"))
        .reduce((n, [, count]) => n + count, 0),
    ).toBe(47);
    // The same guard on the manuscripts as first committed finds all 32, not the 27 first
    // reported: five answers end with a bracket after the predicate ("된다 (…)").
    const before = Object.fromEntries(
      measureTemplateFrames(withoutStaticCorrections(scripts)).flatMap(
        (frame) => frame.findings.map((finding) => [finding.id, finding.turns]),
      ),
    );
    expect(before["example-answer:predicate"]).toBe(32);
    const all = scripts.flatMap((script) => script.dialogue);
    expect(
      all.filter((turn) => /\*\*입니다\.$/.test(turn.markdown)),
    ).toHaveLength(340);
    expect(all.map((turn) => turn.markdown)).toContain(
      "이 기준으로 물음에 답하면 **유리수이다**.",
    );
    expect(all.map((turn) => turn.markdown)).not.toContain(
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

  it("claims no person's approval and keeps unreviewed, calculated, AI-read and defective apart", () => {
    expect(ledger.reviewers.editor).toMatch(/^없음/);
    expect(ledger.reviewers.reading).toMatch(/^AI 정독/);
    expect(ledger.reviewers.corrections).toMatch(/^AI 편집 검수/);
    expect(committed).not.toContain("편집 확인");
    expect(committed).not.toContain("사람 검수 완료");
    expect(ledger.totals).toMatchObject({
      status: {
        idsAndSources: { "자동 확인": 360 },
        bankMathematics: { 미검수: 360 },
        newExample: {
          "해당 없음": 150,
          "자동 확인": 164,
          "AI 검수": 46,
        },
        // The wrong sentences are corrected; nobody has read the lessons for flow.
        wordingAndFlow: { 미검수: 360 },
        printedPage: { 미검수: 360 },
      },
      corrections: {
        total: 145,
        byKind: {
          "sentence-answer-copula": 32,
          particle: 1,
          "missing-condition": 8,
          "ambiguous-wording": 4,
          "bank-definition": 100,
        },
        sections: 80,
      },
      aiReadings: {
        examples: 46,
        examplesWithUnverified: 6,
        restBands: 18,
        restBandsWithUnverified: 9,
      },
    });
    expect(ledger.authoredExamples).toHaveLength(210);
    expect(
      ledger.authoredExamples
        .filter((row) => row.state === "수정 필요")
        .map((row) => row.key),
    ).toEqual([]);
    expect(
      ledger.authoredExamples.filter((row) => row.state === "AI 검수"),
    ).toHaveLength(46);
    for (const row of ledger.authoredExamples)
      expect(row.reading !== undefined, row.key).toBe(
        row.method === "read-only",
      );
    expect(ledger.templateFrames).toHaveLength(19);
    expect(ledger.restShortages.reduce((n, row) => n + row.shortage, 0)).toBe(
      15,
    );
    expect(ledger.restStories.flatMap((story) => story.faults)).toEqual([]);
    expect(
      ledger.sections.reduce((n, section) => n + section.corrections.length, 0),
    ).toBe(145);
    // The G0b section: its three sentence answers are corrected and no open defect remains.
    expect(
      ledger.sections.find(
        (section) => section.id === "중2::1. 수와 식::유리수와 소수",
      ),
    ).toMatchObject({
      status: { wordingAndFlow: "미검수" },
      findings: [],
      corrections: ["SC-021", "SC-022", "SC-023"],
      boards: { status: "authored-v15", count: 6 },
    });
  });

  it("records an AI reading for each of the 18 age-band verdicts of the rest stories", () => {
    const cells = ledger.restStories.flatMap((story) =>
      Object.entries(story.readings).map(([band, reading]) => ({
        story,
        band,
        reading,
      })),
    );
    expect(cells).toHaveLength(18);
    expect(new Set(cells.map((cell) => cell.reading.basis)).size).toBe(18);
    for (const { story, band, reading } of cells) {
      expect(Object.keys(story.ageBands)).toContain(band);
      expect(reading.basis.length, `${story.id} ${band}`).toBeGreaterThan(15);
      // The reading agrees with every stored verdict; a disagreement would have to be resolved first.
      expect(reading.agrees, `${story.id} ${band}`).toBe(true);
    }
    expect(REST_BAND_READINGS.sharing["middle1-3"].unverified).toContain(
      "판단이 갈릴 수 있다",
    );
    expect(cells.filter((cell) => cell.reading.unverified)).toHaveLength(9);
    expect(ledger.restStories.map((story) => story.state)).toEqual(
      Array(6).fill("AI 검수"),
    );
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
