/** Synthetic approvals below are TEST DATA, never actual independent review or activation. */
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import { plusSection, joinBanks, RETIRED } from "@/lib/concept-blank/bank/plus";
import { withAssessments } from "@/lib/concept-blank/bank/assessment";
import {
  blankKeywords,
  type ConceptBlankBank,
} from "@/contracts/conceptBlank.contract";
import { josaFaults } from "@/lib/elementary/rules";
import { compileContentApplicationPlan } from "../../../scripts/qa/concept-blank/student-clear/application";
import { prepareBankSourceChanges } from "../../../scripts/qa/concept-blank/student-clear/source-plan";
import {
  validateExampleParticleChange,
  validateExamplePromptChanges,
  type ExamplePromptChange,
} from "../../../scripts/qa/concept-blank/student-clear/example-corrections";
import {
  examplePromptLiterals,
  replaceExamplePrompts,
} from "../../../scripts/qa/concept-blank/student-clear/example-source";
import { definitionLiterals } from "../../../scripts/qa/concept-blank/student-clear/definition-source";
import { workerFingerprint } from "../../../scripts/qa/concept-blank/student-clear/editorial";
import {
  contentHash,
  normalizeProposal,
  type ProposalRecord,
} from "../../../scripts/qa/concept-blank/student-clear/proposals";
import type { IndependentEvidence } from "../../../scripts/qa/concept-blank/student-clear/independent";

// The isolated harness points reads at Root; ordinary repository tests use their cwd.
const root = process.env.CONCEPT_EXAMPLE_SOURCE_ROOT ?? process.cwd();
// The correction compiler tests its immutable input, even after production adoption.
const originalParts = JSON.parse(readFileSync(resolve(root,
  "docs/planning/tracks/reports/concept-student-clear-20261006/baseline.json"), "utf8"))
  .parts as Record<string, ConceptBlankBank>;
const genuine = originalParts.m2plus!.concepts.find(
  (entry) => entry.id === "m2-01-01-xc20",
)!;
const correction: ExamplePromptChange = {
  part: "m2plus",
  id: genuine.id,
  before: String.raw`$\frac{3}{2\times a}$가 유한소수인 한 자리 자연수 $a$`,
  after: String.raw`$\frac{3}{2\times a}$이 유한소수인 한 자리 자연수 $a$`,
  reason: "분수는 분모 다음 분자를 읽으므로 마지막 삼 뒤 조사 이가 맞다.",
};
const bank = (concepts = [genuine]): ConceptBlankBank => ({
  concepts,
  ox: [],
  apply: [],
  figures: [],
});
function fixture(correctedOriginal = false) {
  const entry = structuredClone(genuine);
  if (correctedOriginal) entry.example!.prompt = correction.after;
  const baseline = { m2plus: bank([entry]) };
  const raw: ProposalRecord = {
    id: entry.id,
    sourceIndex: 0,
    learningRole: "procedure",
    bDecision: "rewrite",
    cDecision: "keep",
    bPrompt: "분모에 미지수가 있을 때 유한소수가 되는 조건을 설명하세요.",
    bAnswer: "약분한 뒤의 분모에 남는 소인수가 조건에 맞아야 한다.",
    bRequiredIdeas: [{ anyOf: ["약분한 뒤의 분모"] }],
    cMarkedSentence: entry.definition,
    cAcceptedAnswers: blankKeywords(entry.definition).map((key) => [key]),
  };
  raw.proposalFingerprint = workerFingerprint("middle", raw);
  const normalized = normalizeProposal(raw, entry)!;
  const evidence: IndependentEvidence = {
    id: entry.id,
    contentHash: normalized.hash,
    packet: "TEST-ONLY-SYNTHETIC-APPROVAL",
    inputHash: "fixture",
    blindProvider: "claude",
    blindModel: "sonnet",
    keyProvider: "claude",
    keyModel: "sonnet",
    accepted: true,
    issues: [],
  };
  const input = {
    baseline,
    current: baseline,
    expectedBaselineHash: contentHash(baseline),
    scopes: [
      {
        scope: "middle" as const,
        proposals: { rows: [raw] },
        editorial: {
          rows: [
            {
              id: entry.id,
              sourceIndex: 0,
              learningRole: "procedure",
              proposalFingerprint: raw.proposalFingerprint,
              bVerdict: "keep",
              cVerdict: "keep",
              bReason: "TEST DATA",
              cReason: "TEST DATA",
              reader: "Codex TEST FIXTURE",
              readAt: "2026-10-07T00:00:00Z",
            },
          ],
        },
      },
    ],
    independent: [evidence],
  };
  return { input, raw, normalized, entry };
}

describe("bounded source-example grammar corrections", () => {
  it("uses the genuine original example, preserves answer/math, and does not weaken the guard", () => {
    expect(genuine.example).toEqual({
      prompt: correction.before,
      answer: "$1$, $2$, $3$, $4$, $5$, $6$, $8$",
    });
    expect(josaFaults(correction.before)).toEqual([
      String.raw`$\frac{3}{2\times a}$가`,
    ]);
    expect(josaFaults(correction.after)).toEqual([]);
    expect(
      validateExamplePromptChanges({ m2plus: bank() }, [correction]),
    ).toEqual([correction]);
    expect(josaFaults(String.raw`$\frac12$는 같은 수입니다.`)).toEqual([
      String.raw`$\frac12$는`,
    ]);
  });

  it.each([
    ["stale before", { before: correction.after }],
    ["wrong ID", { id: "m2-01-01-xc19" }],
    ["wrong part", { part: "m2" }],
    ["empty reason", { reason: " " }],
    ["answer override", { answer: "$9$" }],
    [
      "nonparticle wording",
      { after: correction.after.replace("한 자리", "두 자리") },
    ],
    ["changed math", { after: correction.after.replace("{3}", "{6}") }],
    ["changed variable", { after: correction.after.replace("$a$", "$b$") }],
    [
      "wrong particle family",
      { after: correction.after.replace("$이 ", "$은 ") },
    ],
    ["added whitespace", { after: correction.after.replace("$이 ", "$ 이 ") }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      validateExamplePromptChanges({ m2plus: bank() }, [
        { ...correction, ...override },
      ]),
    ).toThrow();
  });

  it("rejects duplicate IDs, malformed containers, zero/two initial errors, and an error left after", () => {
    expect(() =>
      validateExamplePromptChanges({ m2plus: bank() }, [
        correction,
        correction,
      ]),
    ).toThrow("중복");
    expect(() =>
      validateExamplePromptChanges({ m2plus: bank() }, null),
    ).toThrow("배열");
    expect(() =>
      validateExampleParticleChange(correction.after, correction.after),
    ).toThrow("하나");
    expect(() =>
      validateExampleParticleChange(
        correction.before + " $3$로 나눈다.",
        correction.after + " $3$으로 나눈다.",
      ),
    ).toThrow("하나");
    expect(() =>
      validateExampleParticleChange(correction.before, correction.before),
    ).toThrow("하나");
  });

  it("corrects before whole-bank notation/hash, preserving baseline and proposal/review hashes", () => {
    const { input, raw, normalized } = fixture();
    const before = JSON.stringify(input);
    expect(() => compileContentApplicationPlan(input)).toThrow("표기 결함");
    const plan = compileContentApplicationPlan({
      ...input,
      exampleCorrections: [correction],
    });
    expect(plan.examplePromptChanges).toEqual([correction]);
    expect(plan.baselineHash).toBe(input.expectedBaselineHash);
    expect(plan.reviewedRows[0]!.contentHash).toBe(normalized.hash);
    expect(
      normalizeProposal(raw, input.baseline.m2plus.concepts[0]!)!.hash,
    ).toBe(normalized.hash);
    expect(JSON.stringify(input)).toBe(before);
    const candidate = withAssessments(
      bank([
        {
          ...genuine,
          example: { ...genuine.example!, prompt: correction.after },
        },
      ]),
      plan.assessmentTables.m2plus!,
    );
    expect(plan.candidateBankHash).toBe(contentHash({ m2plus: candidate }));
    expect(candidate.concepts[0]!.example!.answer).toBe(
      genuine.example!.answer,
    );
  });

  it("omits corrections and gives identical plan/hash for absent or empty option", () => {
    const { input } = fixture(true);
    const absent = compileContentApplicationPlan(input);
    expect(
      compileContentApplicationPlan({ ...input, exampleCorrections: [] }),
    ).toEqual(absent);
    expect(Object.hasOwn(absent, "examplePromptChanges")).toBe(false);
  });

  it("source-plan produces the exact compiler hash and refuses tampered correction/hash/source", () => {
    const { input } = fixture();
    const plan = compileContentApplicationPlan({
      ...input,
      exampleCorrections: [correction],
    });
    const tuple = JSON.stringify([
      genuine.level,
      genuine.term,
      genuine.kind,
      genuine.definition,
      [genuine.example!.prompt, genuine.example!.answer],
    ]);
    const sources = {
      m2plus: `import {plusSection,joinBanks,RETIRED} from "./plus";\nexport const bank = joinBanks([plusSection(${JSON.stringify(genuine.section)},"m2-01-01",{concepts:[${Array(19).fill("RETIRED").join(",")},${tuple}],ox:[],apply:[]})]);\n// retained helper\n`,
    };
    const saved = JSON.stringify({ plan, baseline: input.baseline, sources });
    const result = prepareBankSourceChanges({
      plan,
      baseline: input.baseline,
      sources,
    });
    expect(contentHash(result.candidateParts)).toBe(plan.candidateBankHash);
    expect(result.candidateParts.m2plus!.concepts[0]!.example).toEqual({
      ...genuine.example!,
      prompt: correction.after,
    });
    expect(JSON.stringify({ plan, baseline: input.baseline, sources })).toBe(
      saved,
    );
    const plannedSource = result.changes.find((change) =>
      change.file.endsWith("/m2-plus.ts"),
    )!.after;
    expect(
      examplePromptLiterals(plannedSource, "m2", [genuine.id]).get(genuine.id)!
        .value,
    ).toBe(correction.after);
    expect(() =>
      prepareBankSourceChanges({
        plan: { ...plan, examplePromptChanges: [correction, correction] },
        baseline: input.baseline,
        sources,
      }),
    ).toThrow("중복");
    expect(() =>
      prepareBankSourceChanges({
        plan: {
          ...plan,
          examplePromptChanges: [{ ...correction, before: correction.after }],
        },
        baseline: input.baseline,
        sources,
      }),
    ).toThrow("before");
    expect(() =>
      prepareBankSourceChanges({
        plan: { ...plan, examplePromptChanges: [] },
        baseline: input.baseline,
        sources,
      }),
    ).toThrow("후보 은행");
    expect(() =>
      prepareBankSourceChanges({
        plan,
        baseline: input.baseline,
        sources: {
          m2plus: sources.m2plus.replace(genuine.example!.answer, "$9$"),
        },
      }),
    ).toThrow("prompt·answer");
  });

  it("still requires independent evidence after a valid source correction", () => {
    const { input } = fixture();
    expect(() =>
      compileContentApplicationPlan({
        ...input,
        independent: [],
        exampleCorrections: [correction],
      }),
    ).toThrow("독립 검토");
  });
});

describe("ID-bound source prompt editing", () => {
  const installedSource = readFileSync(
    resolve(root, "src/lib/concept-blank/bank/m2-plus.ts"),
    "utf8",
  );
  // Reconstruct only the pre-adoption prompt literal; production remains corrected.
  const installedLocation = examplePromptLiterals(installedSource, "m2", [genuine.id]).get(genuine.id)!;
  const realSource = installedLocation.value === correction.after
    ? installedSource.slice(0, installedLocation.start) + "r`" + correction.before + "`" + installedSource.slice(installedLocation.end)
    : installedSource;
  const sourceChange = { ...correction, answer: genuine.example!.answer };
  it("edits the exact real plusSection tuple and retains every byte outside its prompt literal", () => {
    const location = examplePromptLiterals(realSource, "m2", [genuine.id]).get(
      genuine.id,
    )!;
    const expected =
      realSource.slice(0, location.start) +
      "r`" +
      correction.after +
      "`" +
      realSource.slice(location.end);
    const after = replaceExamplePrompts(realSource, "m2", [sourceChange]);
    expect(after).toBe(expected);
    expect(definitionLiterals(after, "m2")).toEqual(
      new Map(
        [...definitionLiterals(realSource, "m2")].map(([id, loc]) => [
          id,
          { ...loc, start: loc.start, end: loc.end },
        ]),
      ),
    );
    const beforeSibling = examplePromptLiterals(realSource, "m2", [
      "m2-01-01-xc19",
    ]);
    const afterSibling = examplePromptLiterals(after, "m2", ["m2-01-01-xc19"]);
    expect(afterSibling).toEqual(beforeSibling);
    const emitted = ts.transpileModule(after, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const exports = {} as { bank: ConceptBlankBank };
    runInNewContext(emitted, {
      exports,
      require: (name: string) => {
        if (name === "./plus") return { plusSection, joinBanks, RETIRED };
        if (name === "./assessment") return { withAssessments };
        if (name === "./assessments/m2-plus.json") return { default: JSON.parse(readFileSync(resolve(root,
          "src/lib/concept-blank/bank/assessments/m2-plus.json"), "utf8")) };
        throw Error("Unexpected dependency " + name);
      },
    });
    const expectedBank = structuredClone(BANK_PARTS.m2plus!);
    expectedBank.concepts.find(
      (entry) => entry.id === genuine.id,
    )!.example!.prompt = correction.after;
    expect(exports.bank).toEqual(expectedBank);
  });
  it("keeps retired indices and identical sibling text, even when another ID has the same prompt", () => {
    const tuple = `["상","이름","방법","설명 {값}",[${JSON.stringify(correction.before)},"$1$"]]`;
    const text = `const r=String.raw; plusSection("단원","m2-01-01",{concepts:[${tuple},RETIRED,${tuple}],ox:[],apply:[]});`;
    const after = replaceExamplePrompts(text, "m2", [
      { ...sourceChange, id: "m2-01-01-xc3", answer: "$1$" },
    ]);
    const prompts = examplePromptLiterals(after, "m2", [
      "m2-01-01-xc1",
      "m2-01-01-xc3",
    ]);
    expect([...definitionLiterals(after, "m2").keys()]).toEqual([
      "m2-01-01-xc1",
      "m2-01-01-xc3",
    ]);
    expect(prompts.get("m2-01-01-xc1")!.value).toBe(correction.before);
    expect(prompts.get("m2-01-01-xc3")!.value).toBe(correction.after);
    expect(after).toContain("RETIRED");
  });
  it("refuses stale literals, unknown/duplicate IDs, dynamic examples and changed answers", () => {
    expect(() =>
      replaceExamplePrompts(realSource, "m2", [
        { ...sourceChange, before: correction.after },
      ]),
    ).toThrow();
    expect(() =>
      replaceExamplePrompts(realSource, "m2", [
        { ...sourceChange, id: "m2-01-01-xc999" },
      ]),
    ).toThrow();
    expect(() =>
      replaceExamplePrompts(realSource, "m2", [sourceChange, sourceChange]),
    ).toThrow("중복");
    expect(() =>
      replaceExamplePrompts(realSource, "m2", [
        { ...sourceChange, answer: "$9$" },
      ]),
    ).toThrow("answer");
    const text = `export const bank = {concepts:[{id:"m2-01-01-c1",definition:"설명",example:getExample()}]};`;
    expect(() =>
      replaceExamplePrompts(text, "m2", [
        { ...sourceChange, id: "m2-01-01-c1" },
      ]),
    ).toThrow("리터럴");
    expect(replaceExamplePrompts(realSource, "m2", [])).toBe(realSource);
  });
  it("retains every required CLI flag while the correction flag remains optional", () => {
    const helper = process.cwd();
    const compile = resolve(
      helper,
      "scripts/qa/concept-blank/student-clear/compile.ts",
    );
    const run = (args: string[]) =>
      spawnSync(
        process.execPath,
        [
          resolve(root, "node_modules/tsx/dist/cli.mjs"),
          "--tsconfig",
          resolve(helper, "tsconfig.json"),
          compile,
          ...args,
        ],
        { cwd: helper, encoding: "utf8" },
      );
    const required = [
      "baseline",
      "baseline-hash",
      "e3e4",
      "e5e6",
      "middle",
      "reviews",
      "out",
    ];
    for (const missing of required) {
      const args = required
        .filter((key) => key !== missing)
        .flatMap((key) => [
          "--" + key,
          key === "baseline-hash" ? "0".repeat(64) : "unused-test-path",
        ]);
      const result = run(args);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("옵션 필요: --" + missing);
    }
    const args = required.flatMap((key) => [
      "--" + key,
      key === "baseline-hash" ? "0".repeat(64) : "unused-test-path",
    ]);
    expect(run(args).stderr).toContain("ENOENT");
    expect(
      run([...args, "--example-corrections", "unused-test-corrections"]).stderr,
    ).toContain("ENOENT");
    expect(
      run([...args, "--example-corrections", "a", "--example-corrections", "b"])
        .stderr,
    ).toContain("명령행 옵션");
  }, 60000);
});
