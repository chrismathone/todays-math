/**
 * Run ONLY with the m3 pure config in the report directory.
 * No .env, repository setup, DB, auth, or paid API is read or called.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { ProblemBody } from "@/components/print/templates/ProblemBody";
import { expandFamily } from "@/lib/engine/expandEngine";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { M3_REINFORCEMENT_20261018 as entries } from "@/lib/middle/m3Reinforcement20261018";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { answerIsChoiceNumber } from "@/lib/problem/provenance";
import { solveBlind } from "../../../docs/planning/tracks/reports/math-bank-reinforcement-20261018/m3-independent";
import { writeM3Evidence } from "../../../docs/planning/tracks/reports/math-bank-reinforcement-20261018/m3-evidence";
import type { MidProblem } from "@/lib/middle/types";

const REPORT = "docs/planning/tracks/reports/math-bank-reinforcement-20261018/";
const FINAL_SEED = 20261020;
const seeds = Array.from({ length: 100 }, (_, i) => i);
const marks = ["①", "②", "③", "④", "⑤"];
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const numeric = (s: string) => {
  if (!/^\$-?\d+\$$/.test(s))
    throw new Error("Expected an integer answer: " + s);
  return Number(s.slice(1, -1));
};
const visible = (s: string) =>
  s.replace(/<annotation[\s\S]*?<\/annotation>/g, "").replace(/<[^>]*>/g, "");
const defects = (s: string) =>
  /katex-error|<merror|#cc0000|color:\s*red/i.test(s) ||
  /\$|\\[a-zA-Z]+|[\u0000-\u0008]/.test(visible(s));

function verify(key: string, p: MidProblem) {
  const { expected } = solveBlind(key, p.content);
  expect(p.answer, key + " / " + p.content).toBe(expected);
  const parsed = parseProblemContent(p.content);
  if (answerIsChoiceNumber(p.answer)) {
    expect(parsed.choices).toHaveLength(5);
    expect(p.distractors).toBeUndefined();
  } else {
    const five = [p.answer, ...p.distractors!].map(numeric);
    expect(five).toHaveLength(5);
    expect(new Set(five).size).toBe(5);
    expect(five.filter((n) => n === numeric(expected))).toHaveLength(1);
  }
  expect(["기본", "응용"]).toContain(p.difficulty);
  expect(p.figureSpec).toBeNull();
}

beforeAll(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("Network/paid API is prohibited in this pure suite");
  });
});
afterAll(() => vi.unstubAllGlobals());

describe("R2 scope, registration and unchanged existing output", () => {
  it("is bound to the approved plan and exact manual keys", () => {
    expect(
      sha(
        readFileSync(
          REPORT.replace(
            "reports/math-bank-reinforcement-20261018/",
            "math-bank-reinforcement-20261018.md",
          ),
          "utf8",
        ),
      ),
    ).toBe("15ecaf3edcea3e018f1e5b20e6e2108654122bb249b4e38e3a5713b7f84211a3");
    const review = JSON.parse(
      readFileSync(REPORT + "claude-plan-review-r2.json", "utf8"),
    );
    expect(review.verdict).toBe("approved");
    expect(entries).toHaveLength(12);
    expect(new Set(entries.map((e) => e.key)).size).toBe(12);
    for (const entry of entries) {
      expect(entry.rpmBook).toBe("manual-20261018");
      expect(registeredTypes().filter((e) => e.key === entry.key)).toHaveLength(
        1,
      );
    }
    const groups = Map.groupBy(entries, (e) => e.unitSection);
    expect(groups.size).toBe(4);
    for (const group of groups.values()) expect(group).toHaveLength(3);
  });

  it("preserves all 299 old m3 types across exactly the baseline's 100 seeds", () => {
    const old = registeredTypes().filter(
      (e) => e.grade === "중3" && e.rpmBook !== "manual-20261018",
    );
    expect(old).toHaveLength(299);
    const h = createHash("sha256");
    for (const entry of old) {
      for (const seed of seeds) {
        h.update(
          JSON.stringify([
            entry.key,
            seed,
            generateMiddleProblem(entry.key, seed),
          ]) + "\n",
        );
      }
    }
    expect(h.digest("hex")).toBe(
      "ec367b64d06941f760a4dac0f8047794f8be274f5df8c55af7e07cb1dcbffb99",
    );
    for (const section of [
      "무리수와 실수",
      "인수분해",
      "이차방정식의 활용",
      "대푯값과 산포도",
    ]) {
      expect(
        registeredTypes().filter(
          (e) => e.grade === "중3" && e.unitSection === section,
        ),
      ).toHaveLength(14);
    }
  });
});

describe.each(entries)("blind content-only solver: $key", (entry) => {
  it("independently solves 100 seeds x 3 variants and verifies five distinct alternatives", () => {
    for (const seed of seeds) {
      for (let variant = 0; variant < 3; variant += 1) {
        const p = generateMiddleProblem(entry.key, seed, variant);
        verify(entry.key, p);
      }
    }
  });

  it("solves lower/upper/mixed parameter boundaries without using facts", () => {
    const hi = 1 - Number.EPSILON;
    const streams = [
      () => 0,
      () => hi,
      (() => {
        let i = 0;
        return () => (i++ % 2 === 0 ? 0 : hi);
      })(),
      (() => {
        let i = 0;
        return () => (i++ % 2 === 0 ? hi : 0);
      })(),
    ];
    for (const rng of streams) {
      const p = entry.handler(rng);
      verify(entry.key, { ...p, facts: {} });
    }
  });

  it("keeps every derived answer aligned with the product choice parser", () => {
    for (const seed of seeds) {
      const expanded = expandFamily((variant) => {
        const p = generateMiddleProblem(entry.key, seed, variant);
        return { ...p, familyKey: "mid:" + entry.key, problemType: "활용" };
      }, 3);
      expect(expanded.shortBy).toBe(0);
      expect(expanded.skippedMcq).toBe(0);
      const isNativeMcq = answerIsChoiceNumber(
        generateMiddleProblem(entry.key, seed).answer,
      );
      expect(expanded.items).toHaveLength(isNativeMcq ? 3 : 6);
      for (const item of expanded.items) {
        expect(item.questionType).not.toBe("서술형");
        const parsed = parseProblemContent(item.content);
        if (item.questionType === "객관식" && !isNativeMcq) {
          const correctValue = numeric(
            solveBlind(entry.key, parsed.question).expected,
          );
          const choices = parsed.choices.map(numeric);
          expect(new Set(choices).size).toBe(5);
          expect(choices[marks.indexOf(item.answer)]).toBe(correctValue);
          expect(choices.filter((n) => n === correctValue)).toHaveLength(1);
        } else {
          expect(item.answer).toBe(
            solveBlind(entry.key, item.content).expected,
          );
        }
      }
    }
  });
});

describe("final exact seed 20261020 and both real rendering paths", () => {
  it("provides 36 distinct parsed questions even after all options are removed", () => {
    const fingerprints: string[] = [];
    for (const entry of entries) {
      for (let variant = 0; variant < 3; variant += 1) {
        const p = generateMiddleProblem(entry.key, FINAL_SEED, variant);
        const parsed = parseProblemContent(p.content);
        fingerprints.push(parsed.question.replace(/\s+/g, " ").trim());
      }
    }
    expect(fingerprints).toHaveLength(36);
    expect(new Set(fingerprints).size).toBe(36);
  });

  it("renders all 36 content/answer/solutions with MarkdownRenderer and renderMathHtml", () => {
    let count = 0;
    for (const entry of entries) {
      for (let variant = 0; variant < 3; variant += 1) {
        const p = generateMiddleProblem(entry.key, FINAL_SEED, variant);
        for (const text of [p.content, p.answer, p.solution]) {
          const markdown = renderToStaticMarkup(
            createElement(MarkdownRenderer, { content: text }),
          );
          const mathHtml = renderMathHtml(text);
          expect(defects(markdown), text).toBe(false);
          expect(defects(mathHtml), text).toBe(false);
        }
        const paper = renderToStaticMarkup(
          createElement(PaperProblemView, { content: p.content }),
        );
        const sentinel = "M3_TEACHER_ONLY_20261018";
        const solution = p.solution + "\n" + sentinel;
        const student = renderToStaticMarkup(
          createElement(ProblemBody, {
            problem: {
              id: "local-review-only",
              orderIndex: count + 1,
              ...p,
              solution,
            },
          }),
        );
        const teacher = renderToStaticMarkup(
          createElement(MarkdownRenderer, { content: solution }),
        );
        expect(defects(paper)).toBe(false);
        expect(defects(student)).toBe(false);
        expect(student).not.toContain(sentinel);
        expect(teacher).toContain(sentinel);
        count += 1;
      }
    }
    expect(count).toBe(36);
  });

  it("the blind oracle detects edited math and the render detector detects real bad TeX", () => {
    const key = entries.find((e) => e.rpmType === "Q03")!.key;
    const p = generateMiddleProblem(key, FINAL_SEED);
    const stock = Number(p.content.match(/공책 \$(\d+)\$권/)![1]);
    const currentRemainder = numeric(p.answer);
    const alteredStock = stock + (currentRemainder === 4 ? -1 : 1);
    const altered = p.content.replace(
      "공책 $" + stock + "$권",
      "공책 $" + alteredStock + "$권",
    );
    expect(solveBlind(key, altered).expected).not.toBe(p.answer);
    const bad = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "$\\DefinitelyNotValidTeX{3}$",
      }),
    );
    expect(defects(bad)).toBe(true);
  });

  it("records all proposed rows and both renderer paths without accessing the DB", async () => {
    const summary = await writeM3Evidence();
    expect(summary.stemCount).toBe(36);
    expect(summary.proposedRows).toBe(48);
    expect(summary.totalBlindChecks).toBe(3600);
    expect(summary.totalBoundaryChecks).toBe(48);
    expect(summary.rendering.allRowsBothPaths).toBe(48);
    expect(summary.formats).toEqual({ short: 12, mcq: 36, descriptive: 0 });
  });
});
