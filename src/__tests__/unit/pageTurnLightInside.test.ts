import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import postcss from "postcss";

const css = readFileSync(
  resolve(__dirname, "../../components/math-srs/question-page-turn.module.css"),
  "utf8",
);
const feedback = readFileSync(
  resolve(
    __dirname,
    "../../components/math-srs/answer-feedback-effect.module.css",
  ),
  "utf8",
);

describe("paper transitions preserve the scroll container", () => {
  it("uses a short opacity transition without a light strip or moving/scaling the scroll pane", () => {
    expect(css).toMatch(/animation:\s*\w+\s+1[2-8]0ms/);
    expect(css).not.toMatch(/rotateY|perspective|::after|--paper-light/);
    expect(css).not.toMatch(/\b(transform|translate|scale|rotate)\s*:/);
    expect(css).toMatch(/opacity:\s*1/);
  });
  it("has the same motion-free final state for OS and app reduction", () => {
    for (const sheet of [css, feedback]) {
      expect(sheet).toContain("prefers-reduced-motion: reduce");
      expect(sheet).toContain('[data-learning-motion="reduce"]');
      expect(sheet).not.toMatch(/none\s*!important/);
    }
  });
  it("keeps feedback in document flow and never hides the result at the end of decoration", () => {
    expect(feedback).not.toMatch(
      /position:\s*(absolute|fixed)|radial-gradient|1150ms/,
    );
    const durations = [...feedback.matchAll(/(\d+)ms/g)].map((match) =>
      Number(match[1]),
    );
    expect(durations.every((value) => value <= 420)).toBe(true);
    expect(feedback).toMatch(/to\s*\{\s*opacity:\s*1/);
  });
});

describe("practice motion and workshop visual contracts", () => {
  it.each([
    "authenticated",
    "elementary-practice",
    "practice",
    "question-page-turn",
    "answer-feedback-effect",
  ])(
    "preserves every OS reduction final declaration for app reduction: %s",
    (name) => {
      const root = postcss.parse(
        readFileSync(
          resolve(__dirname, `../../components/math-srs/${name}.module.css`),
          "utf8",
        ),
      );
      root.walkAtRules("media", (media) => {
        if (media.params !== "(prefers-reduced-motion: reduce)") return;
        media.walkRules((rule) => {
          for (const selector of rule.selectors) {
            const app = `:global([data-learning-motion="reduce"]) ${selector}`;
            let declarations: string[] | undefined;
            root.walkRules((candidate) => {
              if (
                candidate.selectors.some(
                  (value) =>
                    value.replace(/\s+/g, " ") === app.replace(/\s+/g, " "),
                )
              )
                declarations = candidate.nodes.map((node) => node.toString());
            });
            expect(declarations, app).toEqual(
              rule.nodes.map((node) => node.toString()),
            );
          }
        });
      });
    },
  );

  it("marks shaded parts with a pattern and keeps the original ordinary/slim dock minimums", () => {
    const root = postcss.parse(
      readFileSync(
        resolve(
          __dirname,
          "../../components/math-explorers/math-explorers.module.css",
        ),
        "utf8",
      ),
    );
    for (const selector of [
      ".fractionStrip > span[data-filled]",
      '.paintGrid button[aria-pressed="true"]',
    ]) {
      const rule = root.nodes.find(
        (node) => node.type === "rule" && node.selector === selector,
      );
      expect(rule?.toString()).toContain("repeating-linear-gradient");
    }
    const dock = root.nodes.find(
      (node) => node.type === "rule" && node.selector === ".answerDock",
    );
    expect(dock?.toString()).toMatch(/min-height:\s*274px/);
    const slim = root.nodes.find(
      (node) =>
        node.type === "rule" &&
        node.selector === '.answerDock[data-dock-size="slim"]',
    );
    expect(slim?.toString()).toMatch(/min-height:\s*0/);
  });
});
