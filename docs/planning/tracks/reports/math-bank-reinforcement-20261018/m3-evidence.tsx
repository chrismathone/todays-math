/** Local evidence builder, called from pure Vitest; never imports the DB loader. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownRenderer } from "../../../../../src/components/math/MarkdownRenderer";
import { ProblemBody } from "../../../../../src/components/print/templates/ProblemBody";
import { expandFamily } from "../../../../../src/lib/engine/expandEngine";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../../../../src/lib/middle/generate";
import { M3_REINFORCEMENT_20261018 as entries } from "../../../../../src/lib/middle/m3Reinforcement20261018";
import { renderMathHtml } from "../../../../../src/lib/math/renderMathHtml";
import { parseProblemContent } from "../../../../../src/lib/problem/parseProblemContent";
import { solveBlind } from "./m3-independent";

export const FINAL_SEED = 20261020;
const reportDir =
  "docs/planning/tracks/reports/math-bank-reinforcement-20261018";
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const writeJson = (name: string, value: unknown) => {
  const bytes = JSON.stringify(value, null, 2) + "\n";
  writeFileSync(path.join(reportDir, name), bytes, "utf8");
  return sha(bytes);
};
const units = new Map([
  ["무리수와 실수", "28032bdd-3db3-4788-9e7a-2f1909233fdb"],
  ["인수분해", "068bcc39-0927-4f43-a919-24b61ca425f9"],
  ["이차방정식의 활용", "f7cf8f63-e727-4923-b46b-091804472a32"],
  ["대푯값과 산포도", "468b8d96-7097-4ef3-8ccf-42c53d90b45f"],
]);

const visible = (s: string) =>
  s.replace(/<annotation[\s\S]*?<\/annotation>/g, "").replace(/<[^>]*>/g, "");
function renderProof(text: string) {
  const markdown = renderToStaticMarkup(
    createElement(MarkdownRenderer, { content: text }),
  );
  const mathHtml = renderMathHtml(text);
  for (const html of [markdown, mathHtml]) {
    if (
      /katex-error|<merror|#cc0000|color:\s*red/i.test(html) ||
      /\$|\\[a-zA-Z]+/.test(visible(html))
    ) {
      throw new Error("실제 렌더 경로에서 날문자/붉은 글씨 발견: " + text);
    }
  }
  return {
    markdownSha256: sha(markdown),
    mathHtmlSha256: sha(mathHtml),
    raw: 0,
    red: 0,
    merror: 0,
  };
}

export async function writeM3Evidence() {
  const numericIds = new Set(["F01", "F03", "Q03", "S02"]);
  const stems = entries.flatMap((entry) =>
    [0, 1, 2].map((variant) => {
      const p = generateMiddleProblem(entry.key, FINAL_SEED, variant);
      const blind = solveBlind(entry.key, p.content);
      if (blind.expected !== p.answer)
        throw new Error("최종 후보 독립 풀이 불일치");
      const payload = { ...p, facts: undefined };
      return {
        key: entry.key,
        familyKey: "mid:" + entry.key,
        unitId: units.get(entry.unitSection)!,
        seed: FINAL_SEED,
        variant,
        source: "manual",
        authoringProvenance:
          "original deterministic authoring engine; not an RPM transfer",
        ...payload,
        blind,
        questionFingerprint: sha(
          parseProblemContent(p.content).question.replace(/\s+/g, " ").trim(),
        ),
        render: {
          content: renderProof(p.content),
          answer: renderProof(p.answer),
          solution: renderProof(p.solution),
        },
      };
    }),
  );
  if (
    stems.length !== 36 ||
    new Set(stems.map((p) => p.questionFingerprint)).size !== 36
  ) {
    throw new Error("보기 제거 후 서로 다른 36발문을 충족하지 못함");
  }

  const rows = entries.flatMap((entry) => {
    const expanded = expandFamily((variant) => {
      const p = generateMiddleProblem(entry.key, FINAL_SEED, variant);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        ...(p.distractors === undefined ? {} : { distractors: p.distractors }),
        familyKey: "mid:" + entry.key,
        problemType: p.difficulty === "기본" ? "계산" : "활용", // existing loader contract
        difficulty: p.difficulty,
        figureSpec: null,
        variant,
      };
    }, 3);
    if (expanded.shortBy || expanded.skippedMcq)
      throw new Error("형식 파생 누락");
    return expanded.items.map((item) => {
      const p = item as typeof item & { variant: number; difficulty: string };
      const externalId = `engine-mid:${entry.key}|s${FINAL_SEED}|v${p.variant}|${p.questionType}`;
      const payload = {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        figureSvg: null,
      };
      const proof = {
        content: renderProof(p.content),
        answer: renderProof(p.answer),
        solution: renderProof(p.solution),
      };
      const studentHtml = renderToStaticMarkup(
        createElement(ProblemBody, {
          problem: {
            id: externalId,
            orderIndex: p.variant + 1,
            ...payload,
            solution: p.solution + "\nM3_TEACHER_ONLY_20261018",
          },
        }),
      );
      if (studentHtml.includes("M3_TEACHER_ONLY_20261018"))
        throw new Error("학생 DOM에 해설 노출");
      return {
        externalId,
        unitId: units.get(entry.unitSection)!,
        familyKey: p.familyKey,
        grade: entry.grade,
        unitSection: entry.unitSection,
        source: "manual",
        seed: FINAL_SEED,
        variant: p.variant,
        key: entry.key,
        questionType: p.questionType,
        difficulty: p.difficulty,
        problemType: p.problemType,
        ...payload,
        payloadSha256: sha(
          JSON.stringify([p.content, p.answer, p.solution, null]),
        ),
        render: proof,
        studentBodySha256: sha(studentHtml),
      };
    });
  });

  const manifest = rows
    .map(
      ({
        externalId,
        unitId,
        familyKey,
        questionType,
        difficulty,
        payloadSha256,
      }) => ({
        externalId,
        unitId,
        familyKey,
        questionType,
        difficulty,
        payloadSha256,
      }),
    )
    .sort((a, b) =>
      a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0,
    );
  const manifestSha = writeJson("m3-proposed-manifest.json", manifest);
  const candidatesSha = writeJson("m3-candidates.json", {
    scope: "R2 B only; proposed candidates, not final Claude/batch approval",
    finalSeed: FINAL_SEED,
    variants: [0, 1, 2],
    source: "manual",
    stems,
    rows,
  });
  writeJson("m3-selectors.json", {
    planningOnly: true,
    sharedDbAuthorized: false,
    requiresRootFrozenTypeKeySelector: true,
    planSha256:
      "15ecaf3edcea3e018f1e5b20e6e2108654122bb249b4e38e3a5713b7f84211a3",
    planApprovalCommit: "eb5d6e285",
    seedBase: FINAL_SEED,
    variants: 3,
    typeKeys: entries.map((entry) => entry.key),
    families: entries.map((entry) => ({
      typeKey: entry.key,
      familyKey: "mid:" + entry.key,
      unitId: units.get(entry.unitSection)!,
      finalSeed: FINAL_SEED,
      exactVariants: [0, 1, 2],
      source: "manual",
      formatPolicy: numericIds.has(entry.rpmType)
        ? "short plus validated numeric MCQ"
        : "native objective MCQ only",
    })),
    targets: [...units].map(([unitSection, unitId]) => ({
      engine: "middle",
      grade: "중3",
      unitSection,
      unitId,
      variants: 3,
      typeKeys: entries
        .filter((entry) => entry.unitSection === unitSection)
        .map((entry) => entry.key),
    })),
    externalIds: manifest.map((row) => row.externalId),
    proposedBManifestSha256: manifestSha,
    note: "No UUIDs or apply authorization. Root must integrate, bind the final A/B/C manifest and obtain final candidate/batch approval.",
  });

  const checks = entries.map((entry) => {
    let checked = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      for (let variant = 0; variant < 3; variant += 1) {
        const p = generateMiddleProblem(entry.key, seed, variant);
        if (solveBlind(entry.key, p.content).expected !== p.answer)
          throw new Error("100씨앗 검산 실패");
        checked += 1;
      }
    }
    const hi = 1 - Number.EPSILON;
    const streams = [
      () => 0,
      () => hi,
      (() => {
        let i = 0;
        return () => (i++ % 2 ? hi : 0);
      })(),
      (() => {
        let i = 0;
        return () => (i++ % 2 ? 0 : hi);
      })(),
    ];
    for (const rng of streams) {
      const p = entry.handler(rng);
      if (solveBlind(entry.key, p.content).expected !== p.answer)
        throw new Error("경계 검산 실패");
    }
    return {
      key: entry.key,
      seeds: { from: 0, to: 99, count: 100 },
      variants: [0, 1, 2],
      checked,
      boundaryStreams: 4,
      passed: true,
    };
  });
  const baselineSha256 =
    "ec367b64d06941f760a4dac0f8047794f8be274f5df8c55af7e07cb1dcbffb99";
  const oldKeys = registeredTypes()
    .filter(
      (entry) => entry.grade === "중3" && entry.rpmBook !== "manual-20261018",
    )
    .map((entry) => entry.key);
  const oldHash = createHash("sha256");
  for (const key of oldKeys)
    for (let seed = 0; seed < 100; seed += 1) {
      oldHash.update(
        JSON.stringify([key, seed, generateMiddleProblem(key, seed)]) + "\n",
      );
    }
  const actualOldSha = oldHash.digest("hex");
  if (oldKeys.length !== 299 || actualOldSha !== baselineSha256)
    throw new Error("기존 중3 출력 변경");

  const summary = {
    scope:
      "Implementation, original authoring, local memory verification only; no DB connection or write",
    approvalState: {
      planExecution: "approved",
      actualCandidates: "not yet approved",
      batchSha: "not yet approved",
      dbWrite: "closed",
    },
    finalSeed: FINAL_SEED,
    newTypes: entries.length,
    distinctParsedQuestions: new Set(stems.map((p) => p.questionFingerprint))
      .size,
    stemCount: stems.length,
    proposedRows: rows.length,
    formats: {
      short: rows.filter((p) => p.questionType === "단답형").length,
      mcq: rows.filter((p) => p.questionType === "객관식").length,
      descriptive: 0,
    },
    source: "manual",
    independentChecks: checks,
    totalBlindChecks: checks.reduce((n, c) => n + c.checked, 0),
    totalBoundaryChecks: checks.length * 4,
    oldM3: {
      types: 299,
      seeds: 100,
      outputs: 29900,
      beforeSha256: baselineSha256,
      afterSha256: actualOldSha,
      unchanged: true,
    },
    sourceSha256: Object.fromEntries(
      [
        "src/lib/middle/generate.ts",
        "src/lib/middle/m3Reinforcement20261018.ts",
        "docs/planning/tracks/reports/math-bank-reinforcement-20261018/m3-independent.ts",
      ].map((file) => [file, sha(readFileSync(file, "utf8"))]),
    ),
    candidatesSha256: candidatesSha,
    proposedBManifestSha256: manifestSha,
    rendering: {
      baseStemsBothPaths: 36,
      allRowsBothPaths: rows.length,
      fieldsPerRow: ["content", "answer", "solution"],
      markdownRenderer: true,
      renderMathHtml: true,
      studentProblemBody: true,
      raw: 0,
      red: 0,
      merror: 0,
      teacherSolutionLeak: 0,
    },
    fullBrowserAndA4Layout:
      "root owns the integrated Chromium/TestPrint check; not claimed by this worker",
    database: {
      connected: false,
      written: false,
      loadedRows: 0,
      reportedEligibleBaseline: 115425,
      beforeFamiliesPerUnit: 11,
      localRegistryTypesPerUnit: 14,
      actualAfterLoad: "root must verify",
    },
    physicalPrintCheck: "not performed; no pass claim",
    remaining: [
      "Root integration and exact-key loader gates",
      "Claude review of actual candidates and final combined manifest SHA",
      "DB baseline reread/write/idempotency/capacity verification by root only",
    ],
  };
  writeJson("m3-verification.json", summary);
  return summary;
}
