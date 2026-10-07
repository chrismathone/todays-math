import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { withAssessments } from "@/lib/concept-blank/bank/assessment";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import { attachAssessmentSource } from "../../../scripts/qa/concept-blank/student-clear/bank-source";

describe("reviewed table attachment source plan", () => {
  it("runs the actual attachment after mutable source helpers and preserves every other form", () => {
    const text = `export const bank = { concepts: [], ox: [{id:"unchanged-ox"}], apply:[], figures:[] };
      bank.concepts.push({id:"e3-1-1-1-c1",section:"초3::1-1 덧셈과 뺄셈::1-1-1 덧셈",term:"받아올림",kind:"방법",level:"하",definition:"낱개 열 개를 십 {한} 개로 바꾼다."});
      bank.concepts[0].givenCase = true;`;
    const table = {
      "e3-1-1-1-c1": {
        bQuestion: null,
        clozeQuestion: null,
        questionExclusions: {
          term: "그림 조건을 별도로 확인해야 하므로 제외한다.",
          cloze: "그림 조건을 별도로 확인해야 하므로 제외한다.",
        },
      },
    };
    const compiled = ts.transpileModule(attachAssessmentSource(text, "e3"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const output = { exports: {} as { bank: (typeof BANK_PARTS)[string] } };
    runInNewContext(compiled, {
      exports: output.exports,
      require: (name: string) => {
        if (name === "./assessment") return { withAssessments };
        if (name === "./assessments/e3.json") return table;
        throw Error("Unexpected module " + name);
      },
    });
    expect(output.exports.bank.concepts).toHaveLength(1);
    expect(output.exports.bank.concepts[0]).toMatchObject({
      id: "e3-1-1-1-c1",
      givenCase: true,
      bQuestion: null,
      clozeQuestion: null,
      questionRevision: "student-clear-20261006-v1",
    });
    expect(output.exports.bank.ox).toEqual([{ id: "unchanged-ox" }]);
  });
  it("plans every real part independently and refuses accidental reattachment", () => {
    for (const part of Object.keys(BANK_PARTS)) {
      const text = readFileSync(
        `src/lib/concept-blank/bank/${part.replace(/plus$/, "-plus")}.ts`,
        "utf8",
      );
      const attached = text.includes("attachReviewedQuestions");
      if (attached)
        expect(() => attachAssessmentSource(text, part)).toThrow("기존");
      // Keep exercising the migration against every real source after adoption.
      const parsed = ts.createSourceFile(
        "bank.ts",
        text,
        ts.ScriptTarget.Latest,
        true,
      );
      const attachments = parsed.statements.filter(
        (node) =>
          (ts.isImportDeclaration(node) &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            (node.moduleSpecifier.text === "./assessment" ||
              node.moduleSpecifier.text.startsWith("./assessments/"))) ||
          (ts.isExpressionStatement(node) &&
            node
              .getText(parsed)
              .startsWith("bank.concepts = attachReviewedQuestions(")),
      );
      const original = attached
        ? attachments
            .slice()
            .reverse()
            .reduce(
              (source, node) =>
                source.slice(0, node.getFullStart()) + source.slice(node.end),
              text,
            )
        : text;
      const after = attachAssessmentSource(original, part);
      expect(after).toContain(
        `./assessments/${part.replace(/plus$/, "-plus")}.json`,
      );
      expect(() => attachAssessmentSource(after, part)).toThrow("기존");
    }
    expect(() => attachAssessmentSource("const bank = {};", "e3")).toThrow(
      "내보내기",
    );
    expect(() =>
      attachAssessmentSource("export const bank = {};", "other"),
    ).toThrow("은행 파일");
  });
});
